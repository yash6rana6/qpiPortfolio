import { connectDB } from '../../../../../lib/mongodb'
import Booking from '../../../../../models/Booking'
import { requireAdmin } from '../../../../../lib/auth'
import { bookingFilterFrom } from '../../../../../lib/adminBookings'
import { ok, fail } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

/** Admin bookings list. ?event= &status= (or "active") &q= &checkedIn=yes|no &from= &to= &page= &limit= */
export async function GET(request) {
  try {
    await requireAdmin()
    await connectDB()

    const { searchParams } = new URL(request.url)
    const filter = await bookingFilterFrom(searchParams)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit')) || 25, 1), 100)
    const page = Math.max(parseInt(searchParams.get('page')) || 1, 1)

    const [items, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('event', 'title date')
        .populate('user', 'name email phone')
        .lean(),
      Booking.countDocuments(filter)
    ])

    return ok({ items, total, page, pages: Math.max(Math.ceil(total / limit), 1) })
  } catch (err) {
    return fail(err)
  }
}
