import { cookies } from 'next/headers'
import { connectDB } from '../../../../../lib/mongodb'
import User from '../../../../../models/User'
import { hashPassword, signToken, TOKEN_COOKIE, sessionCookieOptions } from '../../../../../lib/auth'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../lib/api'
import { rateLimit } from '../../../../../lib/redis'
import { clientIp } from '../../../../../lib/clientIp'
import { issueOtp } from '../../../../../lib/otp'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    await rateLimit(`register-ip:${clientIp(request)}`, 10, 3600, ApiError)

    await connectDB()
    const body = await readJson(request)
    requireFields(body, ['name', 'email', 'password'])

    const email = String(body.email).toLowerCase().trim()
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Enter a valid email address')
    if (String(body.password).length < 8) throw new ApiError(400, 'Password must be at least 8 characters')

    const exists = await User.findOne({ email })
    if (exists) throw new ApiError(409, 'An account with this email already exists')

    let user
    try {
      user = await User.create({
        name: String(body.name).trim(),
        email,
        phone: body.phone ? String(body.phone).trim() : undefined,
        passwordHash: await hashPassword(String(body.password)),
        emailVerified: false,
        role: 'user' // role is never taken from the request body
      })
    } catch (err) {
      // Two simultaneous sign-ups with one email: the unique index catches the loser.
      if (err?.code === 11000) throw new ApiError(409, 'An account with this email already exists')
      throw err
    }

    const token = await signToken({ sub: user._id.toString(), role: user.role, name: user.name })
    cookies().set(TOKEN_COOKIE, token, sessionCookieOptions())

    // Account exists either way; if mail fails the user can hit "resend" on the verify step.
    let emailSent = true
    try {
      await issueOtp(email, 'verify', user.name)
    } catch (err) {
      emailSent = false
      console.error('[register] could not send verification code', err?.message)
    }

    return ok({ user: user.toPublic(), token, needsVerification: true, emailSent }, 201)
  } catch (err) {
    return fail(err)
  }
}
