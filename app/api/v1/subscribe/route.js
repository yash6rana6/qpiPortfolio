import { connectDB } from '../../../../lib/mongodb'
import Subscriber from '../../../../models/Subscriber'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../lib/api'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    await connectDB()
    const body = await readJson(request)
    requireFields(body, ['email'])

    const email = String(body.email).toLowerCase().trim()
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Enter a valid email address')

    // Already subscribed is a success, not an error.
    await Subscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true })
    return ok({ ok: true }, 201)
  } catch (err) {
    return fail(err)
  }
}
