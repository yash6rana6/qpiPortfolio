import mongoose from 'mongoose'
import { connectDB } from '../../../../../lib/mongodb'
import Event from '../../../../../models/Event'
import BookedSeat from '../../../../../models/BookedSeat'
import { requireAdmin } from '../../../../../lib/auth'
import { bustCache } from '../../../../../lib/redis'
import { pickEventFields } from '../../../../../lib/eventInput'
import { ok, fail, readJson, ApiError } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

function assertId(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Event not found')
}

// Public
export async function GET(_request, { params }) {
  try {
    assertId(params.id)
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
    assertId(params.id)
    await connectDB()

    const body = await readJson(request)
    const data = pickEventFields(body)

    const current = await Event.findById(params.id).lean()
    if (!current) throw new ApiError(404, 'Event not found')

    const layoutChanged =
      (data.rows !== undefined && data.rows !== current.rows) ||
      (data.seatsPerRow !== undefined && data.seatsPerRow !== current.seatsPerRow)

    if (layoutChanged) {
      const sold = await BookedSeat.countDocuments({ event: params.id })
      if (sold > 0) throw new ApiError(409, 'Seat layout is locked — seats are already sold for this show')
      data.totalSeats = (data.rows ?? current.rows ?? 10) * (data.seatsPerRow ?? current.seatsPerRow ?? 10)
      data.availableSeats = data.totalSeats
    }

    const event = await Event.findByIdAndUpdate(params.id, data, { new: true, runValidators: true })
    await bustCache()
    return ok(event)
  } catch (err) {
    return fail(err)
  }
}

// Admin only
export async function DELETE(_request, { params }) {
  try {
    await requireAdmin()
    assertId(params.id)
    await connectDB()

    const sold = await BookedSeat.countDocuments({ event: params.id })
    if (sold > 0) throw new ApiError(409, 'This show has paid bookings — unpublish it instead of deleting')

    const event = await Event.findByIdAndDelete(params.id)
    if (!event) throw new ApiError(404, 'Event not found')

    await bustCache()
    return ok({ ok: true })
  } catch (err) {
    return fail(err)
  }
}
