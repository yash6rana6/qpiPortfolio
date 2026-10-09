import { connectDB } from '../../../../../lib/mongodb'
import Event from '../../../../../models/Event'
import { requireAdmin } from '../../../../../lib/auth'
import { ok, fail, readJson, ApiError } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

const WRITABLE = [
  'title', 'category', 'description', 'venue', 'city', 'date', 'endDate', 'posterImage', 'videoUrl',
  'totalSeats', 'availableSeats', 'pricePerSeat', 'status', 'isRecent', 'accentColor'
]

function pick(body) {
  const out = {}
  for (const key of WRITABLE) if (body[key] !== undefined) out[key] = body[key]
  return out
}

// Public
export async function GET(_request, { params }) {
  try {
    await connectDB()
    const event = await Event.findById(params.id).lean()
    if (!event || event.status !== 'published') throw new ApiError(404, 'Event not found')
    return ok(event)
  } catch (err) {
    return fail(err)
  }
}

// Admin only
export async function PUT(request, { params }) {
  try {
    await requireAdmin()
    await connectDB()

    const body = await readJson(request)
    const event = await Event.findByIdAndUpdate(params.id, pick(body), {
      new: true,
      runValidators: true
    })
    if (!event) throw new ApiError(404, 'Event not found')

    return ok(event)
  } catch (err) {
    return fail(err)
  }
}

// Admin only
export async function DELETE(_request, { params }) {
  try {
    await requireAdmin()
    await connectDB()

    const event = await Event.findByIdAndDelete(params.id)
    if (!event) throw new ApiError(404, 'Event not found')

    return ok({ ok: true })
  } catch (err) {
    return fail(err)
  }
}
