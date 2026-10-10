import { requireUser } from '../../../../../lib/auth'
import { releaseBooking } from '../../../../../lib/bookingService'
import { ok, fail, readJson, requireFields } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

/** Payment window closed without paying: free the seats held for this order. */
export async function POST(request) {
  try {
    const session = await requireUser()
    const body = await readJson(request)
    requireFields(body, ['razorpay_order_id'])

    const result = await releaseBooking({ orderId: body.razorpay_order_id, userId: session.sub })
    return ok(result)
  } catch (err) {
    return fail(err)
  }
}
