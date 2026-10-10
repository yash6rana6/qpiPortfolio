import { connectDB } from '../../../../../lib/mongodb'
import User from '../../../../../models/User'
import { requireUser } from '../../../../../lib/auth'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../lib/api'
import { rateLimit } from '../../../../../lib/redis'
import { checkOtp } from '../../../../../lib/otp'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const session = await requireUser()
    await connectDB()

    const body = await readJson(request)
    requireFields(body, ['code'])

    const user = await User.findById(session.sub)
    if (!user) throw new ApiError(401, 'Login required')
    if (user.emailVerified) return ok({ user: user.toPublic() })

    await rateLimit(`otp-verify:${user.email}`, 10, 900, ApiError)
    await checkOtp(user.email, 'verify', body.code)

    user.emailVerified = true
    await user.save()

    return ok({ user: user.toPublic() })
  } catch (err) {
    return fail(err)
  }
}
