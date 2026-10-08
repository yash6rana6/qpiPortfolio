import crypto from 'crypto'
import { connectDB } from '../../../../lib/mongodb'
import Booking from '../../../../models/Booking'
import { requireUser } from '../../../../lib/auth'
import { razorpay } from '../../../../lib/razorpay'
import { rateLimit } from '../../../../lib/redis'
import { enqueue } from '../../../../lib/queue'
import {
  HOLD_TTL_SECONDS,
  getEventLite,
  holdSeats,
  layoutOf,
  parseSeats,
  publishSeatUpdate,
  releaseSeats
} from '../../../../lib/seats'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../lib/api'

export const dynamic = 'force-dynamic'

// My bookings
export async function GET() {
  try {
    const session = await requireUser()
    await connectDB()

    const bookings = await Booking.find({ user: session.sub })
      .sort({ createdAt: -1 })
      .populate('event', 'title venue city date posterImage')
      .lean()

    return ok(bookings)
  } catch (err) {
    return fail(err)
  }
}

/**
 * Step 1 of a booking: HOLD the chosen seats, then create the Razorpay order.
 *
 * Body: { eventId, seatIds: ["A1","A2"] }
 *
 * The hold is one atomic Redis script — if two people pick the same seat in the
 * same millisecond, exactly one wins and the other gets a clean 409 with the
 * list of seats that were just taken (the UI turns that into "pick another seat",
 * not an error page). The client never sends a price.
 */
export async function POST(request) {
  let held = null // { eventId, seatIds, holdId } — released if anything below fails

  try {
    const session = await requireUser()
    await rateLimit(`book:${session.sub}`, 15, 60, ApiError)

    const body = await readJson(request)
    requireFields(body, ['eventId', 'seatIds'])

    const event = await getEventLite(body.eventId)
    if (!event || event.status !== 'published') throw new ApiError(404, 'Show not found')
    if (event.pricePerSeat <= 0) throw new ApiError(400, 'This show is not open for paid booking')
    if (event.date && new Date(event.date) < new Date()) throw new ApiError(400, 'This show has already happened')

    const seatIds = parseSeats(layoutOf(event), body.seatIds)
    const eventId = String(body.eventId)
    const holdId = crypto.randomUUID()

    const hold = await holdSeats(eventId, seatIds, holdId)
    if (!hold.ok) {
      const list = hold.unavailable.join(', ')
      throw new ApiError(
        409,
        `${hold.unavailable.length > 1 ? 'Seats' : 'Seat'} ${list} ${hold.unavailable.length > 1 ? 'were' : 'was'} just taken. Please pick another.`,
        { code: 'SEATS_TAKEN', unavailable: hold.unavailable }
      )
    }
    held = { eventId, seatIds, holdId }
    await publishSeatUpdate(eventId, 'hold', seatIds)

    const amount = event.pricePerSeat * seatIds.length
    const order = await razorpay().orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `qpie_${eventId}_${Date.now()}`.slice(0, 40),
      notes: { eventId, userId: session.sub, seats: seatIds.join(',') }
    })

    await connectDB()
    const booking = await Booking.create({
      user: session.sub,
      event: eventId,
      seats: seatIds.length,
      seatIds,
      pricePerSeat: event.pricePerSeat,
      amount,
      status: 'created',
      holdId,
      holdExpiresAt: new Date(hold.expiresAt),
      razorpayOrderId: order.id
    })

    // Close the booking + free the seats if nobody pays in time (BullMQ delayed job).
    await enqueue(
      'expire-hold',
      { bookingId: String(booking._id) },
      { delay: (HOLD_TTL_SECONDS + 30) * 1000, jobId: `expire-${booking._id}` }
    )

    held = null // success — the hold now belongs to the booking
    return ok(
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        eventTitle: event.title,
        seatIds,
        holdSeconds: HOLD_TTL_SECONDS
      },
      201
    )
  } catch (err) {
    if (held) await releaseSeats(held.eventId, held.seatIds, held.holdId)
    return fail(err)
  }
}
