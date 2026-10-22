import { connectDB } from './mongodb'
import Booking from '../models/Booking'
import BookedSeat from '../models/BookedSeat'
import Event from '../models/Event'
import { ApiError } from './api'
import { razorpay } from './razorpay'
import { enqueue } from './queue'
import { bustCache } from './redis'
import { unmarkSeatsBooked } from './seatStore'
import { refundQuote, toPaise } from './refundPolicy'

const RETRY = { attempts: 6, backoff: { type: 'exponential', delay: 5000 } }

async function loadForRefund(bookingId, by, userId) {
  const filter = { _id: bookingId }
  if (by === 'user') filter.user = userId // a customer can only ever touch their own booking
  const booking = await Booking.findOne(filter)
  if (!booking) throw new ApiError(404, 'Booking not found')
  const event = await Event.findById(booking.event).select('date totalSeats title').lean()
  return { booking, event }
}

/** What would a cancellation refund right now? (customer policy, or 100% for an admin) */
export async function quoteFor({ bookingId, by, userId }) {
  await connectDB()
  const { booking, event } = await loadForRefund(bookingId, by, userId)
  if (by === 'admin') {
    const ok = booking.status === 'paid'
    return {
      allowed: ok,
      percent: ok ? 100 : 0,
      refundAmount: ok ? booking.amount : 0,
      reason: ok ? undefined : 'Only confirmed (paid) bookings can be refunded.',
      hoursLeft: null
    }
  }
  return refundQuote(booking, event)
}

/**
 * Cancels a PAID booking and refunds it through Razorpay, then puts the seats back on sale.
 *
 *  - by 'user'  -> refund follows lib/refundPolicy.js (tiers; not after check-in / show start)
 *  - by 'admin' -> always 100%, any paid booking (manual refund button)
 *
 * paid -> refunding is one atomic update, so a double click or a user+admin race can't refund twice.
 * If Razorpay rejects the refund the booking goes back to 'paid' and the error is thrown, so it can be retried.
 */
export async function cancelAndRefund({ bookingId, by, userId }) {
  await connectDB()
  const { booking, event } = await loadForRefund(bookingId, by, userId)

  const quote =
    by === 'admin'
      ? { allowed: booking.status === 'paid', percent: 100, refundAmount: booking.amount, reason: 'Only confirmed (paid) bookings can be refunded.' }
      : refundQuote(booking, event)
  if (!quote.allowed) throw new ApiError(409, quote.reason || 'This booking cannot be cancelled', { code: 'NOT_REFUNDABLE' })
  if (!booking.razorpayPaymentId) throw new ApiError(409, 'No payment is recorded for this booking')

  const claimFilter = { _id: booking._id, status: 'paid' }
  if (by === 'user') claimFilter.checkedIn = { $ne: true }
  const claimed = await Booking.findOneAndUpdate(claimFilter, { $set: { status: 'refunding' } }, { new: true })
  if (!claimed) throw new ApiError(409, 'This booking was just changed (already cancelled or used). Refresh and check again.')

  let refundId
  try {
    const r = await razorpay().payments.refund(claimed.razorpayPaymentId, {
      amount: toPaise(quote.refundAmount),
      receipt: `rf_${claimed._id}`,
      notes: { reason: `${by}_cancel`, bookingId: String(claimed._id), percent: String(quote.percent) }
    })
    refundId = r.id
  } catch (err) {
    const msg = err?.error?.description || err?.message || ''
    if (!/fully refunded/i.test(msg)) {
      await Booking.updateOne({ _id: claimed._id, status: 'refunding' }, { $set: { status: 'paid' } }) // let them retry
      console.error('[refund] razorpay rejected', String(claimed._id), msg)
      throw new ApiError(502, 'The refund could not be processed right now. Nothing was changed — please try again shortly.')
    }
    // Razorpay says it is already fully refunded (e.g. done from their dashboard): finish our side.
  }

  const done = await Booking.findByIdAndUpdate(
    claimed._id,
    {
      $set: {
        status: 'refunded',
        refundId,
        refundAmount: quote.refundAmount,
        cancelledAt: new Date(),
        cancelledBy: by
      }
    },
    { new: true }
  )

  await releaseSoldSeats(done)
  await enqueue('refund-email', { bookingId: String(done._id) }, { jobId: `refund-email-${done._id}`, ...RETRY })

  return {
    status: done.status,
    bookingId: done._id,
    refundAmount: done.refundAmount,
    refundId: done.refundId || null,
    percent: quote.percent
  }
}

/** Seats of a cancelled booking go back on sale: MongoDB (truth), the counter, then the Redis mirror. */
async function releaseSoldSeats(booking) {
  const named = booking.seatNumbers?.length > 0
  const count = named ? booking.seatNumbers.length : booking.seats

  if (named) await BookedSeat.deleteMany({ booking: booking._id })

  // Named seats: confirmPayment() marked the booking `seatsCounted` when it subtracted them; undo exactly once.
  // Count-only shows never set that flag, and the paid -> refunding claim above already guarantees "once".
  const shouldRestore = named
    ? (await Booking.updateOne({ _id: booking._id, seatsCounted: true }, { $set: { seatsCounted: false } })).modifiedCount > 0
    : true
  if (shouldRestore) {
    await Event.updateOne({ _id: booking.event }, [
      { $set: { availableSeats: { $min: ['$totalSeats', { $add: ['$availableSeats', count] }] } } }
    ])
    await bustCache()
  }

  if (named) {
    try {
      await unmarkSeatsBooked(String(booking.event), booking.seatNumbers)
    } catch {
      await enqueue(
        'sync-unbooked',
        { eventId: String(booking.event), seatIds: booking.seatNumbers },
        { attempts: 10, backoff: { type: 'exponential', delay: 2000 } }
      )
    }
  }
}
