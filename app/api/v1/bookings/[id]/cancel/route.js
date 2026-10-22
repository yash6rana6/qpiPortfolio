import mongoose from 'mongoose'
import { requireUser } from '../../../../../../lib/auth'
import { cancelAndRefund, quoteFor } from '../../../../../../lib/refunds'
import { POLICY_TEXT } from '../../../../../../lib/refundPolicy'
import { rateLimit } from '../../../../../../lib/redis'
import { ok, fail, ApiError } from '../../../../../../lib/api'

export const dynamic = 'force-dynamic'

function checkId(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Booking not found')
}

/** Preview: what would I get back if I cancelled right now? */
export async function GET(_request, { params }) {
  try {
    const session = await requireUser()
    checkId(params.id)
    const quote = await quoteFor({ bookingId: params.id, by: 'user', userId: session.sub })
    return ok({ ...quote, policy: POLICY_TEXT })
  } catch (err) {
    return fail(err)
  }
}

/** Cancel a paid ticket and refund it according to the refund policy. */
export async function POST(_request, { params }) {
  try {
    const session = await requireUser()
    checkId(params.id)
    await rateLimit(`cancel:${session.sub}`, 10, 60, ApiError)
    const result = await cancelAndRefund({ bookingId: params.id, by: 'user', userId: session.sub })
    return ok(result)
  } catch (err) {
    return fail(err)
  }
}
