import { connectDB } from '../../../../../lib/mongodb'
import Booking from '../../../../../models/Booking'
import { requireUser } from '../../../../../lib/auth'
import { ok, fail, readJson, requireFields } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

/** Payment window closed without paying — release the seats held for this order. */
export async function POST(request) {
  try {
    const session = await requireUser()
    await connectDB()

    const body = await readJson(request)
    requireFields(body, ['razorpay_order_id'])

    await Booking.updateOne(
      { razorpayOrderId: body.razorpay_order_id, user: session.sub, status: 'created' },
      { status: 'failed', failureReason: 'Payment cancelled' }
    )
    return ok({ ok: true })
  } catch (err) {
    return fail(err)
  }
}
