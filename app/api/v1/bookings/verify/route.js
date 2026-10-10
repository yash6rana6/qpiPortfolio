import { connectDB } from '../../../../../lib/mongodb'
import Booking from '../../../../../models/Booking'
import { requireUser } from '../../../../../lib/auth'
import { isValidSignature } from '../../../../../lib/razorpay'
import { confirmPayment } from '../../../../../lib/bookingService'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Confirm a payment. Nothing is trusted from the browser except the three Razorpay
 * ids, and those only count once the HMAC signature checks out. The real work
 * (claim, write seats, refund if lost) is confirmPayment(), shared with the webhook.
 */
export async function POST(request) {
  try {
    const session = await requireUser()
    await connectDB()

    const body = await readJson(request)
    requireFields(body, ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'])

    const valid = isValidSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature
    })
    if (!valid) throw new ApiError(400, 'Payment could not be verified')

    let result = await confirmPayment({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      userId: session.sub
    })

    // The webhook may be finishing this very booking: give it a moment.
    for (let i = 0; i < 8 && result.status === 'processing'; i++) {
      await sleep(400)
      const fresh = await Booking.findById(result.bookingId).lean()
      result = { ...result, status: fresh.status, bookingCode: fresh.bookingCode, seatNumbers: fresh.seatNumbers }
    }

    if (result.status === 'failed' || result.status === 'refunded') {
      throw new ApiError(
        409,
        'Those seats were taken just before your payment went through. Your money is being refunded automatically.'
      )
    }

    return ok({
      bookingId: result.bookingId,
      bookingCode: result.bookingCode || null,
      status: result.status,
      seatNumbers: result.seatNumbers || []
    })
  } catch (err) {
    return fail(err)
  }
}
