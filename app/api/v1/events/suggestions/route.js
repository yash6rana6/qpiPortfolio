import mongoose from 'mongoose'
import { connectDB } from '../../../../../lib/mongodb'
import Event from '../../../../../models/Event'
import Booking from '../../../../../models/Booking'
import { getSessionUser } from '../../../../../lib/auth'
import { cached } from '../../../../../lib/redis'
import { rankEvents } from '../../../../../lib/suggest'
import { ok, fail } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/events/suggestions?eventId=<id>&city=<city>&limit=3
 * Public. If the visitor is signed in, their paid bookings sharpen the ranking.
 * The pool of upcoming events is read through the Redis cache (30s), so this
 * endpoint adds almost no MongoDB load.
 */
export async function GET(request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '3', 10) || 3, 1), 6)
    const eventId = searchParams.get('eventId')
    const city = (searchParams.get('city') || '').trim() || null

    const events = await cached('suggest-pool', 30, async () => {
      const now = new Date()
      return Event.find({
        status: 'published',
        pricePerSeat: { $gt: 0 },
        availableSeats: { $gt: 0 },
        $or: [{ date: { $gte: now } }, { endDate: { $gte: now } }, { date: null }]
      })
        .select('title category venue city date endDate posterImage accentColor pricePerSeat totalSeats availableSeats')
        .lean()
    })

    let context = null
    if (eventId && mongoose.isValidObjectId(eventId)) {
      const found = await Event.findById(eventId).select('title category city pricePerSeat status').lean()
      if (found && found.status === 'published') context = found
    }

    let history = []
    const session = await getSessionUser()
    if (session && mongoose.isValidObjectId(session.sub)) {
      const paid = await Booking.find({ user: session.sub, status: 'paid' })
        .populate('event', 'category')
        .lean()
      history = paid
        .filter((b) => b.event)
        .map((b) => ({ eventId: b.event._id, category: b.event.category, price: b.pricePerSeat }))
    }

    const ranked = rankEvents({ events, context, history, city, limit })

    return ok(
      ranked.map(({ event, reason, badge }) => ({
        _id: event._id,
        title: event.title,
        category: event.category,
        venue: event.venue,
        city: event.city,
        date: event.date,
        pricePerSeat: event.pricePerSeat,
        availableSeats: event.availableSeats,
        posterImage: event.posterImage,
        accentColor: event.accentColor,
        reason,
        badge
      }))
    )
  } catch (err) {
    return fail(err)
  }
}
