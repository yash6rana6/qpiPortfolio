import mongoose from 'mongoose'
import { requireAdmin } from '../../../../../../../lib/auth'
import { cancelAndRefund } from '../../../../../../../lib/refunds'
import { ok, fail, ApiError } from '../../../../../../../lib/api'

export const dynamic = 'force-dynamic'

/** Manual refund (always 100%) for any paid booking. Frees the seats and emails the customer. */
export async function POST(_request, { params }) {
  try {
    await requireAdmin()
    if (!mongoose.isValidObjectId(params.id)) throw new ApiError(404, 'Booking not found')
    const result = await cancelAndRefund({ bookingId: params.id, by: 'admin' })
    return ok(result)
  } catch (err) {
    return fail(err)
  }
}
