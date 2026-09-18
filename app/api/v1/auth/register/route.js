import { cookies } from 'next/headers'
import { connectDB } from '../../../../../lib/mongodb'
import User from '../../../../../models/User'
import { hashPassword, signToken, TOKEN_COOKIE, sessionCookieOptions } from '../../../../../lib/auth'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    await connectDB()
    const body = await readJson(request)
    requireFields(body, ['name', 'email', 'password'])

    const email = String(body.email).toLowerCase().trim()
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Enter a valid email address')
    if (String(body.password).length < 8) throw new ApiError(400, 'Password must be at least 8 characters')

    const exists = await User.findOne({ email })
    if (exists) throw new ApiError(409, 'An account with this email already exists')

    const user = await User.create({
      name: String(body.name).trim(),
      email,
      phone: body.phone ? String(body.phone).trim() : undefined,
      passwordHash: await hashPassword(String(body.password)),
      role: 'user' // role is never taken from the request body
    })

    const token = await signToken({ sub: user._id.toString(), role: user.role, name: user.name })
    cookies().set(TOKEN_COOKIE, token, sessionCookieOptions())

    return ok({ user: user.toPublic(), token }, 201)
  } catch (err) {
    return fail(err)
  }
}
