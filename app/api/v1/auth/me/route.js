import { connectDB } from '../../../../../lib/mongodb'
import User from '../../../../../models/User'
import { getSessionUser } from '../../../../../lib/auth'
import { ok, fail } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session) return ok({ user: null })

    await connectDB()
    const user = await User.findById(session.sub)
    return ok({ user: user ? user.toPublic() : null })
  } catch (err) {
    return fail(err)
  }
}
