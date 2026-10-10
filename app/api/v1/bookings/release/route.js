import { requireUser } from '../../../../../lib/auth'
import { releaseBooking } from '../../../../../lib/bookingService'
import { ok, fail, readJson, requireFields } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

// Same as /bookings/cancel (kept because the original design called it `release`).
export async function POST(request) {
  try {
    const session = await requireUser()
    const body = await readJson(request)
    requireFields(body, ['orderId'])

    const result = await releaseBooking({ orderId: body.orderId, userId: session.sub })
    return ok(result)
  } catch (err) {
    return fail(err)
  }
}
