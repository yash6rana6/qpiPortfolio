import { connectDB } from '../../../../lib/mongodb'
import Event from '../../../../models/Event'
import { requireAdmin } from '../../../../lib/auth'
import { cached, bustCache } from '../../../../lib/redis'
import { pickEventFields, normalizeCity } from '../../../../lib/eventInput'
import { ok, fail, readJson, requireFields } from '../../../../lib/api'

export const dynamic = 'force-dynamic'

/**
 * Public:  GET /events?city=Delhi&upcoming=true&recent=true   (cached 30s in Redis)
 * Admin:   GET /events?all=true                               (drafts included, never cached)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    if (searchParams.get('all') === 'true') {
      await requireAdmin()
      await connectDB()
      return ok(await Event.find({}).sort({ date: -1 }).lean())
    }

    const city = searchParams.get('city') ? normalizeCity(searchParams.get('city')) : ''
    const upcoming = searchParams.get('upcoming') === 'true'
    const recent = searchParams.get('recent') === 'true'

    const events = await cached(`events:${city || 'all'}:${upcoming ? 'u' : ''}${recent ? 'r' : ''}`, 30, async () => {
      await connectDB()
      const filter = { status: 'published' }
      if (city) filter.city = city
      if (recent) filter.isRecent = true
      if (upcoming) filter.$or = [{ date: null }, { date: { $gte: new Date() } }]
      return Event.find(filter).sort({ date: upcoming ? 1 : -1 }).lean()
    })

    const res = ok(events)
    res.headers.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30')
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
    requireFields(body, ['title', 'category', 'city'])

    const data = pickEventFields(body)
    const rows = data.rows ?? 10
    const seatsPerRow = data.seatsPerRow ?? 10
    data.totalSeats = rows * seatsPerRow
    data.availableSeats = data.totalSeats

    const event = await Event.create(data)
    await bustCache()
    return ok(event, 201)
  } catch (err) {
    return fail(err)
  }
}
