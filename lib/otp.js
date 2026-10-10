import crypto from 'crypto'
import Otp from '../models/Otp'
import { ApiError } from './api'
import { sendMail } from './mailer'

const OTP_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 30 * 1000
const MAX_ATTEMPTS = 5

function hashCode(email, purpose, code) {
  const secret = process.env.JWT_SECRET || ''
  return crypto.createHmac('sha256', secret).update(`${email}:${purpose}:${code}`).digest('hex')
}

function safeEqual(a, b) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

/** Creates a fresh 6-digit code (replacing any older one) and emails it. */
export async function issueOtp(email, purpose, name = '') {
  const recent = await Otp.findOne({ email, purpose }).lean()
  if (recent && Date.now() - new Date(recent.updatedAt).getTime() < RESEND_COOLDOWN_MS) {
    throw new ApiError(429, 'Please wait 30 seconds before asking for another code')
  }

  const code = String(crypto.randomInt(100000, 1000000))

  await Otp.findOneAndUpdate(
    { email, purpose },
    {
      $set: {
        codeHash: hashCode(email, purpose, code),
        attempts: 0,
        expiresAt: new Date(Date.now() + OTP_TTL_MS)
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  const heading = purpose === 'verify' ? 'Verify your email' : 'Reset your password'
  const hello = name ? `Hi ${name},` : 'Hi,'

  const sent = await sendMail({
    to: email,
    subject: `${code} is your QPIE code`,
    text: `${hello}\n\n${heading} with this code: ${code}\n\nIt expires in 10 minutes. If you did not ask for this, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px">
      <p>${hello}</p>
      <p>${heading} with this code:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>
      <p style="color:#666;font-size:13px">It expires in 10 minutes. If you did not ask for this, you can ignore this email.</p>
    </div>`
  })

  if (!sent) {
    // No SMTP configured while developing: print the code so the flow can still be tested.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n[otp:dev] ${purpose} code for ${email}: ${code}\n`)
      return
    }
    throw new ApiError(503, 'Could not send the email right now. Please try again shortly.')
  }
}

/**
 * Checks a code. The attempt counter is bumped atomically *before* comparing,
 * so parallel guessing can't get more than MAX_ATTEMPTS tries.
 */
export async function checkOtp(email, purpose, code) {
  const doc = await Otp.findOneAndUpdate(
    { email, purpose, attempts: { $lt: MAX_ATTEMPTS }, expiresAt: { $gt: new Date() } },
    { $inc: { attempts: 1 } },
    { new: true }
  )
  if (!doc) throw new ApiError(400, 'Code expired or too many wrong attempts. Request a new code.')

  if (!safeEqual(doc.codeHash, hashCode(email, purpose, String(code).trim()))) {
    throw new ApiError(400, 'Incorrect code')
  }

  await Otp.deleteOne({ _id: doc._id })
}
