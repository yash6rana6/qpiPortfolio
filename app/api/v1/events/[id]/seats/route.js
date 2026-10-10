import { connectDB } from '../../../../../../lib/mongodb'
import Event from '../../../../../../models/Event'
import { ok, fail, ApiError } from '../../../../../../lib/api'
import { allSeatLabels, hasSeatMap } from '../../../../../../lib/seats'
import { getSeatMap } from '../../../../../../lib/seatStore'

export const dynamic = 'force-dynamic'

// Public: which seats can't be picked right now (sold + briefly held by someone paying).
// Read from Redis in one round trip; MongoDB is the fallback if Redis is down.
export async function GET(_request, { params }) {
  try {
    await connectDB()
    const event = await Event.findById(params.id).select('status totalSeats availableSeats')
    if (!event || event.status !== 'published') throw new ApiError(404, 'Event not found')
    if (!hasSeatMap(event)) return ok({ total: event.totalSeats, mapped: false, taken: [] })

    const { booked, held, degraded } = await getSeatMap(params.id)
    const taken = new Set([...booked, ...held])

    // Tickets sold before seat selection existed have no seat names:
    // mark that many seats from the back of the hall as gone so the counts add up.
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

    return ok({ total: event.totalSeats, mapped: true, taken: [...taken], degraded })
  } catch (err) {
    return fail(err)
  }
}
