import { requireUser } from '../../../../../lib/auth'
import { isValidSignature } from '../../../../../lib/razorpay'
import { confirmPayment } from '../../../../../lib/bookingService'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../lib/api'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'


export async function POST(request) {
  try {
    const session = await requireUser()
    const body = await readJson(request)
    requireFields(body, ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'])

    const valid = isValidSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature
    })
    if (!valid) throw new ApiError(400, 'Payment could not be verified')

    const result = await confirmPayment({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      userId: session.sub
    })

    if (result.status === 'paid') return ok(result)
    if (result.status === 'processing') return NextResponse.json(result, { status: 202 })

    // failed / refunded: the seat was sold to someone else while this payment was in flight
    throw new ApiError(409, 'Your seats were taken just before payment completed. A full refund has been started.', {
      code: 'SEAT_LOST_REFUND',
      status: result.status
    })
  } catch (err) {
    return fail(err)
  }
}
