import { connectDB } from '../../../../lib/mongodb'
import Subscriber from '../../../../models/Subscriber'
import { sendMail, welcomeEmail } from '../../../../lib/mailer'
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
    const result = await Subscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true })

    // Welcome mail only for brand-new subscribers (no repeat spam on re-submit).
    const isNew = result.upsertedCount > 0
    const emailed = isNew ? await sendMail({ to: email, ...welcomeEmail() }) : false

    return ok({ ok: true, emailed }, 201)
  } catch (err) {
    return fail(err)
  }
}
