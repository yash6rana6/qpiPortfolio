import mongoose from 'mongoose'
import { connectDB } from '../../../../../../lib/mongodb'
import Event from '../../../../../../models/Event'
import Booking from '../../../../../../models/Booking'
import { cached } from '../../../../../../lib/redis'
import { ok, fail, ApiError } from '../../../../../../lib/api'
import { allSeatLabels, hasSeatMap } from '../../../../../../lib/seats'
import { getSeatMap } from '../../../../../../lib/seatStore'

export const dynamic = 'force-dynamic'

// Public: which seats can't be picked right now (sold + briefly held by someone paying).
// Read from Redis in one round trip; MongoDB is the fallback if Redis is down.
export async function GET(_request, { params }) {
  try {
    if (!mongoose.isValidObjectId(params.id)) throw new ApiError(404, 'Event not found')
    await connectDB()
    const event = await Event.findById(params.id).select('status totalSeats availableSeats')
    if (!event || event.status !== 'published') throw new ApiError(404, 'Event not found')
    if (!hasSeatMap(event)) return ok({ total: event.totalSeats, mapped: false, taken: [] })

    const { booked, held, degraded } = await getSeatMap(params.id)
    const taken = new Set([...booked, ...held])

    // Tickets sold before seat selection existed have no seat names:
    // mark that many seats from the back of the hall as gone so the counts add up.
    // Counted from the paid bookings themselves, NOT from availableSeats, so a drifted
    // availableSeats (or an admin edit) can never block seats that are really free.
    const legacy = await cached(`legacy-seats:${params.id}`, 30, async () => {
      const [row] = await Booking.aggregate([
        {
          $match: {
            event: event._id,
            status: 'paid',
            $or: [{ seatNumbers: { $size: 0 } }, { seatNumbers: { $exists: false } }]
          }
        },
        { $group: { _id: null, n: { $sum: '$seats' } } }
      ])
      return row?.n || 0
    })
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
