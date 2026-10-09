import { connectDB } from '../../../../../../lib/mongodb'
import Event from '../../../../../../models/Event'
import Booking from '../../../../../../models/Booking'
import { ok, fail, ApiError } from '../../../../../../lib/api'
import { HOLD_MINUTES, allSeatLabels, hasSeatMap } from '../../../../../../lib/seats'

export const dynamic = 'force-dynamic'

// Public — which seats can't be picked right now.
export async function GET(_request, { params }) {
  try {
    await connectDB()
    const event = await Event.findById(params.id).select('+bookedSeats status totalSeats availableSeats')
    if (!event || event.status !== 'published') throw new ApiError(404, 'Event not found')
    if (!hasSeatMap(event)) return ok({ total: event.totalSeats, mapped: false, taken: [] })

    const booked = event.bookedSeats || []

    const cutoff = new Date(Date.now() - HOLD_MINUTES * 60 * 1000)
    const holds = await Booking.find({ event: event._id, status: 'created', createdAt: { $gte: cutoff } })
      .select('seatNumbers')
      .lean()
    const held = holds.flatMap((h) => h.seatNumbers || [])

    const taken = new Set([...booked, ...held])

    // Tickets sold before seat selection existed have no seat names —
    // mark that many seats from the back of the hall as gone so counts add up.
    const legacy = Math.max(0, event.totalSeats - event.availableSeats - booked.length)
    if (legacy > 0) {
      const labels = allSeatLabels(event.totalSeats)
      let left = legacy
      for (let i = labels.length - 1; i >= 0 && left > 0; i--) {
        if (!taken.has(labels[i])) {
          taken.add(labels[i])
          left--
        }
      }
    }

    return ok({ total: event.totalSeats, mapped: true, taken: [...taken] })
  } catch (err) {
    return fail(err)
  }
}
