import Razorpay from 'razorpay'
import crypto from 'crypto'
import { ApiError } from './api'

let client = null

/** Lazy — so a missing key never blows up at import/build time. */
export function razorpay() {
  if (client) return client

  const key_id = process.env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET
  if (!key_id || !key_secret) {
    throw new ApiError(503, 'Payments not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET')
  }

  client = new Razorpay({ key_id, key_secret })
  return client
}

/** HMAC-SHA256(order_id|payment_id, key_secret) compared in constant time. */
export function isValidSignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret || !signature) return false

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature, 'utf8')
  if (a.length !== b.length) return false

  return crypto.timingSafeEqual(a, b)
}
