import mongoose from 'mongoose'
import { connectDB } from '../../../../../lib/mongodb'
import Event from '../../../../../models/Event'
import Booking from '../../../../../models/Booking'
import BookedSeat from '../../../../../models/BookedSeat'
import seatCore from '../../../../../lib/seatCore.cjs'
import { requireAdmin } from '../../../../../lib/auth'
import { redis, bustCache } from '../../../../../lib/redis'
import { pickEventFields } from '../../../../../lib/eventInput'
import { allSeatLabels, hasSeatMap } from '../../../../../lib/seats'
import { ok, fail, readJson, ApiError } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

function assertValidId(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Event not found')
}

// Public
export async function GET(_request, { params }) {
  try {
    assertValidId(params.id)
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
    assertValidId(params.id)
    await connectDB()

    const body = await readJson(request)
    const data = pickEventFields(body)

    const existing = await Event.findById(params.id).select('totalSeats availableSeats').lean()
    if (!existing) throw new ApiError(404, 'Event not found')

    const total = data.totalSeats ?? existing.totalSeats
    const available = data.availableSeats ?? existing.availableSeats
    if (available > total) throw new ApiError(400, 'Seats on sale cannot be more than total seats')

    // Shrinking the hall must never orphan a seat that is already sold.
    if (data.totalSeats !== undefined && data.totalSeats !== existing.totalSeats && hasSeatMap({ totalSeats: total })) {
      const sold = await BookedSeat.find({ event: params.id }).select('seatId -_id').lean()
      if (sold.length) {
        const valid = new Set(allSeatLabels(total))
        const orphaned = sold.map((s) => s.seatId).filter((id) => !valid.has(id))
        if (orphaned.length) {
          throw new ApiError(
            409,
            `Seats ${orphaned.slice(0, 5).join(', ')}${orphaned.length > 5 ? '…' : ''} are already sold, so total seats can't go that low.`
          )
        }
      }
    }

    const event = await Event.findByIdAndUpdate(params.id, data, { new: true, runValidators: true })
    if (!event) throw new ApiError(404, 'Event not found')

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
    assertValidId(params.id)
    await connectDB()

    const active = await Booking.countDocuments({ event: params.id, status: { $in: ['paid', 'processing'] } })
    if (active > 0) {
      throw new ApiError(
        409,
        'This event has paid bookings, so it can\'t be deleted. Untick "Published" to hide it instead.'
      )
    }

    const event = await Event.findByIdAndDelete(params.id)
    if (!event) throw new ApiError(404, 'Event not found')

    // Clean up everything that pointed at it.
    await Booking.updateMany({ event: params.id, status: 'created' }, { $set: { status: 'expired' } })
    await BookedSeat.deleteMany({ event: params.id })
    try {
      const k = seatCore.keysFor(params.id)
      await redis().del(k.booked, k.holds, k.holdby, k.warm)
    } catch {}

    await bustCache()
    return ok({ ok: true })
  } catch (err) {
    return fail(err)
  }
}
