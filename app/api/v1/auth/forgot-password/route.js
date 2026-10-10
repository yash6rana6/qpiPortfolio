import { connectDB } from '../../../../../lib/mongodb'
import User from '../../../../../models/User'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../lib/api'
import { rateLimit } from '../../../../../lib/redis'
import { clientIp } from '../../../../../lib/clientIp'
import { issueOtp } from '../../../../../lib/otp'

export const dynamic = 'force-dynamic'

// Always answers "ok" so nobody can use this to find out which emails have accounts.
export async function POST(request) {
  try {
    const body = await readJson(request)
    requireFields(body, ['email'])
    const email = String(body.email).toLowerCase().trim()

    await rateLimit(`forgot-ip:${clientIp(request)}`, 8, 900, ApiError)
    await rateLimit(`forgot-email:${email}`, 4, 900, ApiError)

    await connectDB()
    const user = await User.findOne({ email })
    if (user) {
      try {
        await issueOtp(email, 'reset', user.name)
      } catch (err) {
        console.error('[forgot-password]', err?.message)
      }
    }

    return ok({ ok: true })
  } catch (err) {
    return fail(err)
  }
}
