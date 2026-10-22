import mongoose from 'mongoose'
import { connectDB } from '../../../../../lib/mongodb'
import Booking from '../../../../../models/Booking'
import { requireAdmin } from '../../../../../lib/auth'
import { ok, fail, readJson, requireFields } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

const view = (b) => ({
  bookingCode: b.bookingCode,
  eventTitle: b.event?.title,
  holder: b.user?.name,
  seats: b.seatNumbers?.length ? b.seatNumbers.join(', ') : `${b.seats} ticket${b.seats > 1 ? 's' : ''}`,
  checkedInAt: b.checkedInAt
})

/**
 * Check-in. Body: { code, eventId? }.  Always answers 200 with a `result` the scanner can show:
 *   ok | already | wrong_event | not_valid | invalid
 * The flip to checkedIn is ONE atomic update, so two gates scanning the same ticket at the same
 * moment can never both get "ok".
 */
export async function POST(request) {
  try {
    const admin = await requireAdmin()
    await connectDB()

    const body = await readJson(request)
    requireFields(body, ['code'])
    const code = String(body.code).trim().toUpperCase().slice(0, 32)
    const eventId = mongoose.isValidObjectId(body.eventId) ? String(body.eventId) : null

    const match = { bookingCode: code, status: 'paid', checkedIn: { $ne: true } }
    if (eventId) match.event = eventId

    const hit = await Booking.findOneAndUpdate(
      match,
      { $set: { checkedIn: true, checkedInAt: new Date(), checkedInBy: admin.sub } },
      { new: true }
    )
      .populate('event', 'title')
      .populate('user', 'name')
      .lean()

    if (hit) {
      if (!hit.event?._id) return ok({ result: 'ok', ...view(hit), stats: null }) // event was deleted: nothing to count
      const [inside, total] = await Promise.all([
        Booking.aggregate([
          { $match: { event: hit.event._id, status: 'paid', checkedIn: true } },
          { $group: { _id: null, n: { $sum: '$seats' } } }
        ]),
        Booking.aggregate([
          { $match: { event: hit.event._id, status: 'paid' } },
          { $group: { _id: null, n: { $sum: '$seats' } } }
        ])
      ])
      return ok({ result: 'ok', ...view(hit), stats: { checkedIn: inside[0]?.n || 0, total: total[0]?.n || 0 } })
    }

    // Not admitted: work out why, so the gate staff see a useful message.
    const b = await Booking.findOne({ bookingCode: code }).populate('event', 'title').populate('user', 'name').lean()
    if (!b) return ok({ result: 'invalid', bookingCode: code })
    if (b.status !== 'paid') return ok({ result: 'not_valid', status: b.status, ...view(b) })
    if (eventId && String(b.event?._id) !== eventId) return ok({ result: 'wrong_event', ...view(b) })
    return ok({ result: 'already', ...view(b) })
  } catch (err) {
    return fail(err)
  }
}
