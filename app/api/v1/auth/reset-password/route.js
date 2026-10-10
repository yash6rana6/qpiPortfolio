import { connectDB } from '../../../../../lib/mongodb'
import User from '../../../../../models/User'
import { hashPassword } from '../../../../../lib/auth'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../lib/api'
import { rateLimit } from '../../../../../lib/redis'
import { clientIp } from '../../../../../lib/clientIp'
import { checkOtp } from '../../../../../lib/otp'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await readJson(request)
    requireFields(body, ['email', 'code', 'password'])
    const email = String(body.email).toLowerCase().trim()

    if (String(body.password).length < 8) throw new ApiError(400, 'Password must be at least 8 characters')

    await rateLimit(`reset-ip:${clientIp(request)}`, 10, 900, ApiError)
    await rateLimit(`reset-email:${email}`, 10, 900, ApiError)

    await connectDB()
    const user = await User.findOne({ email })
    if (!user) throw new ApiError(400, 'Code expired or too many wrong attempts. Request a new code.')

    await checkOtp(email, 'reset', body.code)

    user.passwordHash = await hashPassword(String(body.password))
    user.emailVerified = true ;
    await user.save()

    return ok({ ok: true })
  } catch (err) {
    return fail(err)
  }
}
