import { connectDB } from '../../../../lib/mongodb'
import Event from '../../../../models/Event'
import Booking from '../../../../models/Booking'
import { requireUser } from '../../../../lib/auth'
import { razorpay } from '../../../../lib/razorpay'
import { ok, fail, readJson, requireFields, ApiError } from '../../../../lib/api'
import { MAX_SEATS_PER_BOOKING, HOLD_MINUTES, allSeatLabels, hasSeatMap } from '../../../../lib/seats'

export const dynamic = 'force-dynamic'

// My bookings
export async function GET() {
  try {
    const session = await requireUser()
    await connectDB()

    const bookings = await Booking.find({ user: session.sub })
      .sort({ createdAt: -1 })
      .populate('event', 'title venue date posterImage')
      .lean()

    return ok(bookings)
  } catch (err) {
    return fail(err)
  }
}

/**
 * Create a Razorpay order.
 * The amount is computed server-side from the event's own price — the client
 * only ever sends eventId + seats, so it can't dictate what it pays.
 */
export async function POST(request) {
  try {
    const session = await requireUser()
    await connectDB()

    const body = await readJson(request)
    requireFields(body, ['eventId'])

    const event = await Event.findById(body.eventId).select('+bookedSeats')
    if (!event || event.status !== 'published') throw new ApiError(404, 'Event not found')
    if (event.pricePerSeat <= 0) throw new ApiError(400, 'This event is not open for paid booking')

    // Events with a seat map need named seats; very large ones just take a count.
    // A retry shouldn't clash with this user's own abandoned order.
    await Booking.updateMany(
      { user: session.sub, event: event._id, status: 'created' },
      { status: 'failed', failureReason: 'Replaced by a new attempt' }
    )

    let seatNumbers = []
    let seats
    if (hasSeatMap(event)) {
      if (!Array.isArray(body.seatNumbers) || body.seatNumbers.length === 0) {
        throw new ApiError(400, 'Choose your seats first')
      }
      seatNumbers = [...new Set(body.seatNumbers.map((s) => String(s).trim().toUpperCase()))]
      seats = seatNumbers.length

      const valid = new Set(allSeatLabels(event.totalSeats))
      if (seatNumbers.some((s) => !valid.has(s))) throw new ApiError(400, 'One of those seats does not exist')

      const sold = new Set(event.bookedSeats || [])
      if (seatNumbers.some((s) => sold.has(s))) throw new ApiError(409, 'Some of those seats were just taken — pick others')

      // Seats held by someone else's unpaid order (short hold while they pay).
      const cutoff = new Date(Date.now() - HOLD_MINUTES * 60 * 1000)
      const clash = await Booking.exists({
        event: event._id,
        status: 'created',
        createdAt: { $gte: cutoff },
        seatNumbers: { $in: seatNumbers }
      })
      if (clash) throw new ApiError(409, 'Some of those seats are being booked right now — pick others')
    } else {
      seats = Number(body.seats)
      if (!Number.isInteger(seats) || seats < 1) throw new ApiError(400, 'Seats must be a whole number, at least 1')
    }

    if (seats > MAX_SEATS_PER_BOOKING) throw new ApiError(400, `You can book at most ${MAX_SEATS_PER_BOOKING} seats at a time`)
    if (event.availableSeats < seats) throw new ApiError(409, `Only ${event.availableSeats} seat(s) left`)

    const amount = event.pricePerSeat * seats

    const order = await razorpay().orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `qpie_${event._id}_${Date.now()}`.slice(0, 40),
      notes: { eventId: event._id.toString(), userId: session.sub, seats: String(seats) }
    })

    await Booking.create({
      user: session.sub,
      event: event._id,
      seats,
      seatNumbers,
      pricePerSeat: event.pricePerSeat,
      amount,
      status: 'created',
      razorpayOrderId: order.id
    })

    return ok(
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        eventTitle: event.title,
        seats,
        seatNumbers
      },
      201
    )
  } catch (err) {
    return fail(err)
  }
}
