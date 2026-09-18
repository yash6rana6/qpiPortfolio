import { cookies } from 'next/headers'
import { connectDB } from '../../../../../lib/mongodb'
import User from '../../../../../models/User'
import { comparePassword, signToken, TOKEN_COOKIE, sessionCookieOptions } from '../../../../../lib/auth'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    await connectDB()
    const body = await readJson(request)
    requireFields(body, ['email', 'password'])

    const user = await User.findOne({ email: String(body.email).toLowerCase().trim() })

    // Same message either way — don't leak which emails exist.
    const valid = user && (await comparePassword(String(body.password), user.passwordHash))
    if (!valid) throw new ApiError(401, 'Invalid email or password')

    const token = await signToken({ sub: user._id.toString(), role: user.role, name: user.name })
    cookies().set(TOKEN_COOKIE, token, sessionCookieOptions())

    return ok({ user: user.toPublic(), token })
  } catch (err) {
    return fail(err)
  }
}
