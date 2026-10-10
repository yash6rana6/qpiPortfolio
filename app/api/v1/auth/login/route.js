import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { connectDB } from '../../../../../lib/mongodb'
import User from '../../../../../models/User'
import { comparePassword, signToken, TOKEN_COOKIE, sessionCookieOptions } from '../../../../../lib/auth'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../lib/api'
import { rateLimit } from '../../../../../lib/redis'
import { clientIp } from '../../../../../lib/clientIp'

export const dynamic = 'force-dynamic'

// Compared against when the email doesn't exist, so response time doesn't reveal it.
let dummyHash = null
const getDummyHash = () => (dummyHash ||= bcrypt.hashSync('qpie-timing-guard', 10))

export async function POST(request) {
  try {
    const body = await readJson(request)
    requireFields(body, ['email', 'password'])
    const email = String(body.email).toLowerCase().trim()

    await rateLimit(`login-ip:${clientIp(request)}`, 20, 900, ApiError)
    await rateLimit(`login-email:${email}`, 8, 900, ApiError)

    await connectDB()
    const user = await User.findOne({ email })

    const hash = user?.passwordHash || getDummyHash()
    const matches = await comparePassword(String(body.password), hash)

    if (!user || !user.passwordHash || !matches) {
      if (user && !user.passwordHash) {
        throw new ApiError(401, 'This account uses Google sign-in. Continue with Google, or reset your password to add one.')
      }
      throw new ApiError(401, 'Invalid email or password')
    }

    const token = await signToken({ sub: user._id.toString(), role: user.role, name: user.name })
    cookies().set(TOKEN_COOKIE, token, sessionCookieOptions())

    return ok({ user: user.toPublic(), token })
  } catch (err) {
    return fail(err)
  }
}
