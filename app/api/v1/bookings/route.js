import crypto from 'crypto'
import { connectDB } from '../../../../lib/mongodb'
import Event from '../../../../models/Event'
import Booking from '../../../../models/Booking'
import User from '../../../../models/User'
import { requireUser } from '../../../../lib/auth'
import { razorpay } from '../../../../lib/razorpay'
import { rateLimit } from '../../../../lib/redis'
import { enqueue } from '../../../../lib/queue'
import { MAX_SEATS_PER_BOOKING, hasSeatMap } from '../../../../lib/seats'
import {
  HOLD_TTL_SECONDS,
  getEventLite,
  holdSeats,
  parseSeats,
  publishSeatUpdate,
  releaseSeats
} from '../../../../lib/seatStore'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../lib/api'

export const dynamic = 'force-dynamic'

// My bookings (abandoned/expired checkouts are hidden; they are not tickets)
export async function GET() {
  try {
    const session = await requireUser()
    await connectDB()

    const bookings = await Booking.find({ user: session.sub, status: { $ne: 'expired' } })
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
 * Body: { eventId, seatNumbers: ["A1","A2"] }   (or { eventId, seats: 3 } for huge count-only shows)
 *
 * The hold is one atomic Redis script: if two people pick the same seat in the same
 * millisecond exactly one wins and the other gets a clean 409 + the seats that were
 * just taken (the UI turns that into "pick another seat"). The client never sends a price.
 * MongoDB's unique (event, seat) index stays the final guard when the payment is confirmed.
 */
export async function POST(request) {
  let held = null // { eventId, seatIds, holdId }: released if anything below fails

  try {
    const session = await requireUser()
    await rateLimit(`book:${session.sub}`, 15, 60, ApiError)
    await connectDB()

    // Checked in the database (not the token) so verifying takes effect immediately.
    const account = await User.findById(session.sub).select('emailVerified').lean()
    if (!account) throw new ApiError(401, 'Login required')
    if (!account.emailVerified) {
      throw new ApiError(403, 'Verify your email before booking', { code: 'EMAIL_NOT_VERIFIED' })
    }

    const body = await readJson(request)
    requireFields(body, ['eventId'])

    const event = await getEventLite(body.eventId)
    if (!event || event.status !== 'published') throw new ApiError(404, 'Event not found')
    if (event.pricePerSeat <= 0) throw new ApiError(400, 'This event is not open for paid booking')
    if (event.endDate && new Date(event.endDate) < new Date()) throw new ApiError(400, 'This show has already ended')

    const eventId = String(body.eventId)
    const named = hasSeatMap(event)

    // A retry must not clash with this user's own abandoned order: free it first.
    const abandoned = await Booking.find({ user: session.sub, event: eventId, status: 'created' })
    for (const old of abandoned) {
      const closed = await Booking.updateOne({ _id: old._id, status: 'created' }, { $set: { status: 'expired' } })
      if (closed.modifiedCount && old.seatNumbers?.length) {
        await releaseSeats(eventId, old.seatNumbers, old.holdId)
      }
    }

    let seatNumbers = []
    let seats
    let hold = null
    const holdId = crypto.randomUUID()

    if (named) {
      seatNumbers = parseSeats(event, body.seatNumbers)
      seats = seatNumbers.length

      hold = await holdSeats(eventId, seatNumbers, holdId)
      if (!hold.ok) {
        const list = hold.unavailable.join(', ')
        const many = hold.unavailable.length > 1
        throw new ApiError(
          409,
          `${many ? 'Seats' : 'Seat'} ${list} ${many ? 'were' : 'was'} just taken. Please pick another.`,
          { code: 'SEATS_TAKEN', unavailable: hold.unavailable }
        )
      }
      held = { eventId, seatIds: seatNumbers, holdId }
      await publishSeatUpdate(eventId, 'hold', seatNumbers)
    } else {
      seats = Number(body.seats)
      if (!Number.isInteger(seats) || seats < 1) throw new ApiError(400, 'Seats must be a whole number, at least 1')
      if (seats > MAX_SEATS_PER_BOOKING) {
        throw new ApiError(400, `You can book at most ${MAX_SEATS_PER_BOOKING} seats at a time`)
      }
      // Count-only shows: read availability fresh (the cached event can be up to a minute old).
      const fresh = await Event.findById(eventId).select('availableSeats').lean()
      if (!fresh || fresh.availableSeats < seats) {
        throw new ApiError(409, `Only ${fresh?.availableSeats ?? 0} seat(s) left`)
      }
    }

    const amount = event.pricePerSeat * seats

    const order = await razorpay().orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `qpie_${eventId}_${Date.now()}`.slice(0, 40),
      notes: { eventId, userId: session.sub, seats: String(seats) }
    })

    const booking = await Booking.create({
      user: session.sub,
      event: eventId,
      seats,
      seatNumbers,
      pricePerSeat: event.pricePerSeat,
      amount,
      status: 'created',
      holdId: named ? holdId : undefined,
      holdExpiresAt: hold ? new Date(hold.expiresAt) : undefined,
      razorpayOrderId: order.id
    })

    // Close the booking and free the seats if nobody pays in time (BullMQ delayed job).
    if (named) {
      await enqueue(
        'expire-hold',
        { bookingId: String(booking._id) },
        { delay: (HOLD_TTL_SECONDS + 30) * 1000, jobId: `expire-${booking._id}` }
      )
    }

    held = null // success: the hold now belongs to the booking
    return ok(
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        eventTitle: event.title,
        seats,
        seatNumbers,
        holdSeconds: named ? HOLD_TTL_SECONDS : null
      },
      201
    )
  } catch (err) {
    if (held) await releaseSeats(held.eventId, held.seatIds, held.holdId)
    return fail(err)
  }
}
