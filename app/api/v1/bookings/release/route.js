import { connectDB } from '../../../../../lib/mongodb'
import Booking from '../../../../../models/Booking'
import { requireUser } from '../../../../../lib/auth'
import { releaseSeats } from '../../../../../lib/seats'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'


export async function POST(request) {
  try {
    const session = await requireUser()
    const body = await readJson(request)
    requireFields(body, ['orderId'])

    await connectDB()
    const booking = await Booking.findOneAndUpdate(
      { razorpayOrderId: body.orderId, user: session.sub, status: 'created' },
      { $set: { status: 'expired' } },
      { new: true }
    )
    if (!booking) return ok({ released: false })

    await releaseSeats(String(booking.event), booking.seatIds, booking.holdId)
    return ok({ released: true })
  } catch (err) {
    return fail(err)
  }
}
