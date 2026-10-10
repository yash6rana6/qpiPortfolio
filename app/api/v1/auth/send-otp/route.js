import { connectDB } from '../../../../../lib/mongodb'
import User from '../../../../../models/User'
import { requireUser } from '../../../../../lib/auth'
import { ok, fail, ApiError } from '../../../../../lib/api'
import { rateLimit } from '../../../../../lib/redis'
import { issueOtp } from '../../../../../lib/otp'

export const dynamic = 'force-dynamic'

// (Re)sends the email-verification code to the signed-in user's own address.
export async function POST() {
  try {
    const session = await requireUser()
    await connectDB()

    const user = await User.findById(session.sub)
    if (!user) throw new ApiError(401, 'Login required')
    if (user.emailVerified) return ok({ alreadyVerified: true })

    await rateLimit(`otp-send:${user.email}`, 5, 900, ApiError)
    await issueOtp(user.email, 'verify', user.name)

    return ok({ ok: true })
  } catch (err) {
    return fail(err)
  }
}
