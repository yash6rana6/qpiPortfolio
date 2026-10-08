import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { confirmPayment } from '../../../../../lib/bookingService'
import { ApiError } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

function validWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * Backstop for "user paid, then closed the tab before /verify ran".
 * Razorpay Dashboard -> Webhooks -> URL: https://YOUR_DOMAIN/api/v1/webhooks/razorpay
 * Events: payment.captured (and order.paid). Secret -> RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request) {
  const raw = await request.text()
  if (!validWebhookSignature(raw, request.headers.get('x-razorpay-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const event = JSON.parse(raw)
    const payment = event?.payload?.payment?.entity
    if (!['payment.captured', 'order.paid'].includes(event.event) || !payment?.order_id) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const result = await confirmPayment({ orderId: payment.order_id, paymentId: payment.id })
    return NextResponse.json({ ok: true, status: result.status })
  } catch (err) {
    // Unknown order (not one of ours) -> acknowledge so Razorpay stops retrying.
    if (err instanceof ApiError && err.status === 404) return NextResponse.json({ ok: true, ignored: true })
    console.error('[webhook]', err)
    return NextResponse.json({ error: 'Retry later' }, { status: 500 }) // Razorpay will retry
  }
}
