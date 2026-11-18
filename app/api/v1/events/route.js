import { connectDB } from '../../../../lib/mongodb'
import Event from '../../../../models/Event'
import { requireAdmin } from '../../../../lib/auth'
import { bustCache } from '../../../../lib/redis'
import { pickEventFields } from '../../../../lib/eventInput'
import { hasSeatMap } from '../../../../lib/seats'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../lib/api'

export const dynamic = 'force-dynamic'

// Public
export async function GET(request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)

    const filter = { status: 'published' }
    if (searchParams.get('recent') === 'true') filter.isRecent = true

    const events = await Event.find(filter).sort({ date: -1 }).lean()
    return ok(events)
  } catch (err) {
    return fail(err)
  }
}

// Admin only
export async function POST(request) {
  try {
    await requireAdmin()
    await connectDB()

    const body = await readJson(request)
    requireFields(body, ['title', 'category'])

    const data = pickEventFields(body)
    if (data.totalSeats !== undefined && data.availableSeats === undefined) {
      data.availableSeats = data.totalSeats
    }
    // Always store an explicit seating type on new events (same rule old events fall back to).
    if (!data.seating) data.seating = hasSeatMap({ totalSeats: data.totalSeats }) ? 'seated' : 'general'
    if (data.seating === 'seated' && !(data.totalSeats > 0)) {
      throw new ApiError(400, 'A seated event needs total seats (at least 1)')
    }

    const event = await Event.create(data)
    await bustCache()
    return ok(event, 201)
  } catch (err) {
    return fail(err)
  }
}
