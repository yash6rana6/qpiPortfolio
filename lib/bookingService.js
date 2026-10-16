import crypto from 'crypto'
import { connectDB } from './mongodb'
import Booking from '../models/Booking'
import BookedSeat from '../models/BookedSeat'
import Event from '../models/Event'
import { ApiError } from './api'
import { enqueue } from './queue'
import { markSeatsBooked, releaseSeats } from './seatStore'

const makeBookingCode = () => `QP${crypto.randomBytes(4).toString('hex').toUpperCase()}`
const isDuplicateKey = (err) => err?.code === 11000 || err?.writeErrors?.some?.((e) => e.code === 11000)
const PROCESSING_STALE_MS = 60_000

function summary(b) {
  return {
    status: b.status,
    bookingId: b._id,
    bookingCode: b.bookingCode,
    seatNumbers: b.seatNumbers,
    failureReason: b.failureReason
  }
}


export async function confirmPayment({ orderId, paymentId, userId }) {
  await connectDB()
  await BookedSeat.init() // makes sure the unique index exists before the first insert

  const filter = { razorpayOrderId: orderId }
  if (userId) filter.user = userId
  const booking = await Booking.findOne(filter)
  if (!booking) throw new ApiError(404, 'Booking not found')
  if (booking.status === 'paid') return summary(booking)

  const claimed = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      $or: [
        { status: { $in: ['created', 'expired'] } },
        { status: 'processing', updatedAt: { $lt: new Date(Date.now() - PROCESSING_STALE_MS) } }
      ]
    },
    { $set: { status: 'processing', razorpayPaymentId: paymentId } },
    { new: true }
  )

  // Someone else (webhook / double click) is finishing it, or it is already final.
  if (!claimed) return summary(await Booking.findById(booking._id))

  // Very large shows have no seat map: just a ticket count, guarded atomically.
  if (!claimed.seatNumbers?.length) return finishCountOnly(claimed)

  const docs = claimed.seatNumbers.map((seatId) => ({
    event: claimed.event,
    seatId,
    booking: claimed._id,
    user: claimed.user
  }))

  try {
    await BookedSeat.insertMany(docs, { ordered: true })
  } catch (err) {
    if (!isDuplicateKey(err)) {
      await Booking.updateOne({ _id: claimed._id }, { $set: { status: 'created' } }) // let a retry run
      throw err
    }


    const mine = await BookedSeat.countDocuments({ booking: claimed._id })
    if (mine !== docs.length) {
      await BookedSeat.deleteMany({ booking: claimed._id })
      const failed = await Booking.findByIdAndUpdate(
        claimed._id,
        { $set: { status: 'failed', failureReason: 'Seat was sold to someone else before payment was confirmed' } },
        { new: true }
      )
      await enqueue(
        'refund',
        { bookingId: String(claimed._id), reason: 'seat_unavailable' },
        { jobId: `refund-${claimed._id}`, attempts: 6, backoff: { type: 'exponential', delay: 5000 } }
      )
      await releaseSeats(String(claimed.event), claimed.seatNumbers, claimed.holdId)
      return summary(failed)
    }
  }

  const paid = await Booking.findByIdAndUpdate(
    claimed._id,
    { $set: { status: 'paid', bookingCode: claimed.bookingCode || makeBookingCode() } },
    { new: true }
  )

  // Subtract from availableSeats exactly once per booking (a retried confirm must not do it again),
  // and never go below 0 (admin may have lowered availableSeats by hand).
  const counted = await Booking.updateOne({ _id: claimed._id, seatsCounted: { $ne: true } }, { $set: { seatsCounted: true } })
  if (counted.modifiedCount) {
    await Event.updateOne({ _id: claimed.event }, [
      { $set: { availableSeats: { $max: [0, { $subtract: ['$availableSeats', claimed.seatNumbers.length] }] } } }
    ])
  }

  try {
    await markSeatsBooked(String(claimed.event), claimed.seatNumbers)
  } catch {
    await enqueue(
      'sync-booked',
      { eventId: String(claimed.event), seatIds: claimed.seatNumbers },
      { attempts: 10, backoff: { type: 'exponential', delay: 2000 } }
    )
  }

  return summary(paid)
}

async function finishCountOnly(claimed) {
  // One guarded update: it only matches while enough tickets are left, so it can't oversell.
  const res = await Event.updateOne(
    { _id: claimed.event, availableSeats: { $gte: claimed.seats } },
    { $inc: { availableSeats: -claimed.seats } }
  )

  if (!res.modifiedCount) {
    const failed = await Booking.findByIdAndUpdate(
      claimed._id,
      { $set: { status: 'failed', failureReason: 'Tickets sold out before payment was confirmed' } },
      { new: true }
    )
    await enqueue(
      'refund',
      { bookingId: String(claimed._id), reason: 'seat_unavailable' },
      { jobId: `refund-${claimed._id}`, attempts: 6, backoff: { type: 'exponential', delay: 5000 } }
    )
    return summary(failed)
  }

  const paid = await Booking.findByIdAndUpdate(
    claimed._id,
    { $set: { status: 'paid', bookingCode: claimed.bookingCode || makeBookingCode() } },
    { new: true }
  )
  return summary(paid)
}

/** Checkout closed without paying: close the order and free the held seats right away. */
export async function releaseBooking({ orderId, userId }) {
  await connectDB()
  const booking = await Booking.findOneAndUpdate(
    { razorpayOrderId: orderId, user: userId, status: 'created' },
    { $set: { status: 'expired' } },
    { new: true }
  )
  if (!booking) return { released: false }

  if (booking.seatNumbers?.length) {
    await releaseSeats(String(booking.event), booking.seatNumbers, booking.holdId)
  }
  return { released: true }
}
