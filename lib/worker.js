import { Worker } from 'bullmq'
import { newConnection } from './redis'
import { connectDB } from './mongodb'
import { QUEUE_NAME ,bookingQueue } from './queue'
import { razorpay } from './razorpay'
import { releaseSeats, markSeatsBooked } from './seatStore'
import Booking from '../models/Booking'

/** Hold ran out and nobody paid: close the booking and free the seats. */
async function expireHold({ bookingId }) {
  await connectDB()
  const b = await Booking.findOneAndUpdate(
    { _id: bookingId, status: 'created' },
    { $set: { status: 'expired' } },
    { new: true }
  )
  if (b && b.seatNumbers?.length) await releaseSeats(String(b.event), b.seatNumbers, b.holdId)
}

/** Customer paid but the seat was gone: give the money back. Retried with backoff. */
async function refund({ bookingId, reason }) {
  await connectDB()
  const b = await Booking.findById(bookingId)
  if (!b || !b.razorpayPaymentId || b.refundId) return

  try {
    const r = await razorpay().payments.refund(b.razorpayPaymentId, {
      amount: Math.round(b.amount * 100),
      notes: { reason: reason || 'seat_unavailable', bookingId: String(b._id) }
    })
    b.refundId = r.id
    b.status = 'refunded'
    await b.save()
  } catch (err) {
    if (/fully refunded/i.test(err?.error?.description || err?.message || '')) {
      b.status = 'refunded'
      await b.save()
      return
    }
    throw err
  }
}

async function sweepRefunds() {
  await connectDB()
  const olderThan = new Date(Date.now() - 5 * 60 * 1000) // let the normal retries finish first
  const stuck = await Booking.find({
    status: 'failed',
    razorpayPaymentId: { $type: 'string' },
    refundId: null,
    updatedAt: { $lt: olderThan }
  })
    .select('_id')
    .limit(50)
    .lean()

  for (const b of stuck) {
    try {
      await refund({ bookingId: String(b._id), reason: 'sweeper' })
    } catch (err) {
      console.error('[worker] sweep refund failed for', String(b._id), err.message)
    }
  }
  if (stuck.length) console.log(`[worker] refund sweeper handled ${stuck.length} booking(s)`)
}

/** Redis missed the "seat sold" update — replay it. */
async function syncBooked({ eventId, seatIds }) {
  await markSeatsBooked(eventId, seatIds)
}

async function processor(job) {
  switch (job.name) {
    case 'expire-hold':
      return expireHold(job.data)
    case 'refund':
      return refund(job.data)
    case 'sync-booked':
      return syncBooked(job.data)
    case 'sweep-refunds':
      return sweepRefunds()
    default:
      throw new Error(`Unknown job: ${job.name}`)
  }
}

function scheduleSweeper(attempt = 1) {
  bookingQueue()
    .upsertJobScheduler('sweep-refunds', { every: 10 * 60 * 1000 }, { name: 'sweep-refunds' })
    .catch((err) => {
      if (attempt >= 6) return console.error('[worker] could not schedule refund sweeper:', err.message)
      setTimeout(() => scheduleSweeper(attempt + 1), 5000 * attempt)
    })
}

export function startWorker() {
  if (globalThis._qpieWorker) return

  const worker = new Worker(QUEUE_NAME, processor, {
    connection: newConnection(),
    concurrency: Number(process.env.WORKER_CONCURRENCY) || 20
  })
  worker.on('failed', (job, err) => console.error(`[worker] ${job?.name} failed:`, err.message))
  worker.on('error', () => {})
  globalThis._qpieWorker = worker

  const stop = () => worker.close().catch(() => {})
  process.once('SIGTERM', stop)
  process.once('SIGINT', stop)
  console.log('[worker] booking queue worker started')
  
}
