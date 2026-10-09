import crypto from 'crypto'
import { connectDB } from '../../../../../lib/mongodb'
import Event from '../../../../../models/Event'
import Booking from '../../../../../models/Booking'
import { requireUser } from '../../../../../lib/auth'
import { isValidSignature } from '../../../../../lib/razorpay'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

function makeBookingCode() {
  return `QP${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

/**
 * Confirm a payment. Nothing is trusted from the browser here except the three
 * Razorpay ids — and those only count once the HMAC signature checks out.
 */
export async function POST(request) {
  try {
    const session = await requireUser()
    await connectDB()

    const body = await readJson(request)
    requireFields(body, ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'])

    const booking = await Booking.findOne({
      razorpayOrderId: body.razorpay_order_id,
      user: session.sub
    })
    if (!booking) throw new ApiError(404, 'Booking not found')

    // Idempotent — Razorpay's handler can fire more than once.
    if (booking.status === 'paid') {
      return ok({ bookingId: booking._id, bookingCode: booking.bookingCode, status: 'paid', seatNumbers: booking.seatNumbers })
    }

    const valid = isValidSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature
    })

    if (!valid) {
      booking.status = 'failed'
      booking.failureReason = 'Signature verification failed'
      await booking.save()
      throw new ApiError(400, 'Payment could not be verified')
    }

    // Atomic seat decrement — the guard in the filter means two people paying
    // for the last seat at the same time can't both succeed.
    // For named seats the same filter also requires every chosen seat to still be free.
    const seatNumbers = booking.seatNumbers || []
    const filter = { _id: booking.event, availableSeats: { $gte: booking.seats } }
    if (seatNumbers.length) filter.bookedSeats = { $nin: seatNumbers }

    const updated = await Event.findOneAndUpdate(
      filter,
      { $inc: { availableSeats: -booking.seats }, $addToSet: { bookedSeats: { $each: seatNumbers } } },
      { new: true }
    )

    if (!updated) {
      booking.status = 'failed'
      booking.razorpayPaymentId = body.razorpay_payment_id
      booking.failureReason = 'Seats were taken before payment was confirmed'
      await booking.save()
      throw new ApiError(409, 'Those seats were taken before your payment went through — a refund will be issued')
    }

    booking.status = 'paid'
    booking.razorpayPaymentId = body.razorpay_payment_id
    booking.bookingCode = makeBookingCode()
    await booking.save()

    return ok({ bookingId: booking._id, bookingCode: booking.bookingCode, status: 'paid', seatNumbers })
  } catch (err) {
    return fail(err)
  }
}
