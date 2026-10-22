import { connectDB } from '../../../../../lib/mongodb'
import Booking from '../../../../../models/Booking'
import Event from '../../../../../models/Event'
import { requireAdmin } from '../../../../../lib/auth'
import { ok, fail } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

const isPaid = { $eq: ['$status', 'paid'] }
const isRefunded = { $eq: ['$status', 'refunded'] }
// A partial refund (policy: 50%) leaves the rest with us — that part still counts as revenue.
const retained = { $max: [0, { $subtract: ['$amount', { $ifNull: ['$refundAmount', '$amount'] }] }] }
const refundedRupees = { $ifNull: ['$refundAmount', '$amount'] }

/**
 * Dashboard numbers. "Revenue" = money kept: paid bookings + the retained part of partly-refunded ones.
 * "Seats sold" counts paid bookings only (cancelled seats go back on sale).
 */
export async function GET(request) {
  try {
    await requireAdmin()
    await connectDB()

    const days = Math.min(Math.max(parseInt(new URL(request.url).searchParams.get('days')) || 14, 1), 90)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [perEvent, events, daily] = await Promise.all([
      Booking.aggregate([
        { $match: { status: { $in: ['paid', 'refunded', 'refunding'] } } },
        {
          $group: {
            _id: '$event',
            seatsSold: { $sum: { $cond: [isPaid, '$seats', 0] } },
            paidBookings: { $sum: { $cond: [isPaid, 1, 0] } },
            checkedIn: { $sum: { $cond: [{ $and: [isPaid, '$checkedIn'] }, '$seats', 0] } },
            revenue: { $sum: { $cond: [isPaid, '$amount', { $cond: [isRefunded, retained, 0] }] } },
            refundedBookings: { $sum: { $cond: [isRefunded, 1, 0] } },
            refundedAmount: { $sum: { $cond: [isRefunded, refundedRupees, 0] } }
          }
        }
      ]),
      Event.find().select('title date totalSeats availableSeats pricePerSeat status').sort({ date: -1 }).lean(),
      Booking.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
            revenue: { $sum: '$amount' },
            seats: { $sum: '$seats' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ])

    const byEvent = new Map(perEvent.map((r) => [String(r._id), r]))
    const rows = events.map((e) => {
      const r = byEvent.get(String(e._id)) || {}
      return {
        eventId: e._id,
        title: e.title,
        date: e.date,
        status: e.status,
        totalSeats: e.totalSeats,
        availableSeats: e.availableSeats,
        seatsSold: r.seatsSold || 0,
        paidBookings: r.paidBookings || 0,
        checkedIn: r.checkedIn || 0,
        revenue: r.revenue || 0,
        refundedBookings: r.refundedBookings || 0,
        refundedAmount: r.refundedAmount || 0
      }
    })

    const sum = (k) => rows.reduce((t, r) => t + r[k], 0)
    return ok({
      totals: {
        revenue: sum('revenue'),
        seatsSold: sum('seatsSold'),
        paidBookings: sum('paidBookings'),
        checkedIn: sum('checkedIn'),
        refundedBookings: sum('refundedBookings'),
        refundedAmount: sum('refundedAmount')
      },
      events: rows,
      daily: daily.map((d) => ({ date: d._id, revenue: d.revenue, seats: d.seats })),
      days
    })
  } catch (err) {
    return fail(err)
  }
}
