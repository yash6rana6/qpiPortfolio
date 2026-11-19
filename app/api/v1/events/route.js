import { connectDB } from '../../../../lib/mongodb'
import Event from '../../../../models/Event'
import { requireAdmin } from '../../../../lib/auth'
import { bustCache, cached } from '../../../../lib/redis'
import { pickEventFields } from '../../../../lib/eventInput'
import { hasSeatMap } from '../../../../lib/seats'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../lib/api'

export const dynamic = 'force-dynamic'

// What an event card / list needs. Leaves out the long description and the video url.
const CARD_FIELDS =
  'title category venue city date endDate posterImage accentColor pricePerSeat totalSeats availableSeats seating status isRecent'
const MAX_PAGE_SIZE = 100
const LIST_CACHE_SECONDS = 20

const intParam = (value, fallback, min, max) => {
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
}

/**
 * Public. Still answers a plain array, so existing callers keep working.
 *   ?recent=true   only the "recent events"
 *   ?view=card     slim documents (no description / video url)
 *   ?limit=&page=  paginate; the total comes back in the X-Total-Count header
 *   ?fresh=1       admin only: skip the cache (the dashboard wants exact seat counts)
 * The list is cached in Redis for a few seconds (admin writes clear it), so a crowd opening /events
 * costs MongoDB one query, not one per visitor.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    const recent = searchParams.get('recent') === 'true'
    const slim = searchParams.get('view') === 'card'
    const limit = searchParams.get('limit') ? intParam(searchParams.get('limit'), MAX_PAGE_SIZE, 1, MAX_PAGE_SIZE) : 0
    const page = intParam(searchParams.get('page'), 1, 1, 10000)

    const load = async () => {
      await connectDB()
      const filter = { status: 'published' }
      if (recent) filter.isRecent = true

      // _id as a tie-breaker keeps the order stable between pages.
      let query = Event.find(filter).sort({ date: -1, _id: -1 })
      if (slim) query = query.select(CARD_FIELDS)
      if (limit) query = query.skip((page - 1) * limit).limit(limit)

      const [items, total] = await Promise.all([query.lean(), limit ? Event.countDocuments(filter) : null])
      return { items, total }
    }

    let result
    if (searchParams.get('fresh') === '1') {
      await requireAdmin()
      result = await load()
    } else {
      const key = `events:${recent ? 'recent' : 'all'}:${slim ? 'card' : 'full'}:${limit}:${page}`
      result = await cached(key, LIST_CACHE_SECONDS, load)
    }

    const res = ok(result.items)
    if (result.total !== null) res.headers.set('X-Total-Count', String(result.total))
    return res
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
