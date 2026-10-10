import { cookies } from 'next/headers'
import { OAuth2Client } from 'google-auth-library'
import { connectDB } from '../../../../../lib/mongodb'
import User from '../../../../../models/User'
import { signToken, TOKEN_COOKIE, sessionCookieOptions } from '../../../../../lib/auth'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../lib/api'
import { rateLimit } from '../../../../../lib/redis'
import { clientIp } from '../../../../../lib/clientIp'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) throw new ApiError(503, 'Google sign-in is not configured')

    await rateLimit(`google-ip:${clientIp(request)}`, 30, 900, ApiError)

    const body = await readJson(request)
    requireFields(body, ['credential'])

    let payload
    try {
      const ticket = await new OAuth2Client(clientId).verifyIdToken({
        idToken: String(body.credential),
        audience: clientId
      })
      payload = ticket.getPayload()
    } catch {
      throw new ApiError(401, 'Google sign-in could not be verified')
    }

    if (!payload?.email || !payload.email_verified) {
      throw new ApiError(400, 'Your Google account email is not verified')
    }

    const email = payload.email.toLowerCase().trim()
    await connectDB()

    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] })

    if (user) {
      if (!user.googleId) user.googleId = payload.sub

      if (!user.emailVerified) {
        // Someone may have pre-registered this address with a password they chose.
        // Google just proved the real owner, so wipe that password to block takeover.
        user.emailVerified = true
        user.passwordHash = undefined
      }
      await user.save()
    } else {
      try {
        user = await User.create({
          name: payload.name || email.split('@')[0],
          email,
          googleId: payload.sub,
          emailVerified: true,
          role: 'user'
        })
      } catch (err) {
        if (err?.code === 11000) {
          user = await User.findOne({ email })
        } else {
          throw err
        }
      }
    }

    const token = await signToken({ sub: user._id.toString(), role: user.role, name: user.name })
    cookies().set(TOKEN_COOKIE, token, sessionCookieOptions())

    return ok({ user: user.toPublic(), token })
  } catch (err) {
    return fail(err)
  }
}
