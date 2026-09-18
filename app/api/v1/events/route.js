import { connectDB } from '../../../../lib/mongodb'
import Event from '../../../../models/Event'
import { requireAdmin } from '../../../../lib/auth'
import { ok, fail, readJson, requireFields } from '../../../../lib/api'

export const dynamic = 'force-dynamic'

const WRITABLE = [
  'title', 'category', 'description', 'venue', 'date', 'posterImage', 'videoUrl',
  'totalSeats', 'availableSeats', 'pricePerSeat', 'status', 'isRecent', 'accentColor'
]

/** Only let through fields we own — no mass assignment from the request body. */
function pick(body) {
  const out = {}
  for (const key of WRITABLE) if (body[key] !== undefined) out[key] = body[key]
  return out
}

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

    const data = pick(body)
    if (data.totalSeats !== undefined && data.availableSeats === undefined) {
      data.availableSeats = data.totalSeats
    }

    const event = await Event.create(data)
    return ok(event, 201)
  } catch (err) {
    return fail(err)
  }
}
