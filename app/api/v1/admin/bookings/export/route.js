import { connectDB } from '../../../../../../lib/mongodb'
import Booking from '../../../../../../models/Booking'
import { requireAdmin } from '../../../../../../lib/auth'
import { bookingFilterFrom } from '../../../../../../lib/adminBookings'
import { fail } from '../../../../../../lib/api'

export const dynamic = 'force-dynamic'

const MAX_ROWS = 20000
const COLUMNS = [
  'Booking code', 'Status', 'Event', 'Event date', 'Customer', 'Email', 'Phone', 'Seats', 'Seat numbers',
  'Price per seat', 'Amount', 'Refunded amount', 'Cancelled by', 'Checked in', 'Checked in at',
  'Razorpay order', 'Razorpay payment', 'Refund id', 'Booked at'
]

// Quote everything; a leading = + - @ would be run as a formula by Excel/Sheets, so defuse it.
function cell(v) {
  if (v === undefined || v === null) return '""'
  let s = v instanceof Date ? v.toISOString() : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

/** CSV download of the bookings matching the same filters as the list. */
export async function GET(request) {
  try {
    await requireAdmin()
    await connectDB()

    const filter = await bookingFilterFrom(new URL(request.url).searchParams)
    const rows = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .limit(MAX_ROWS)
      .populate('event', 'title date')
      .populate('user', 'name email phone')
      .lean()

    const lines = [COLUMNS.map(cell).join(',')]
    for (const b of rows) {
      lines.push(
        [
          b.bookingCode, b.status, b.event?.title, b.event?.date, b.user?.name, b.user?.email, b.user?.phone,
          b.seats, (b.seatNumbers || []).join(' '), b.pricePerSeat, b.amount, b.refundAmount, b.cancelledBy,
          b.checkedIn ? 'yes' : 'no', b.checkedInAt, b.razorpayOrderId, b.razorpayPaymentId, b.refundId, b.createdAt
        ]
          .map(cell)
          .join(',')
      )
    }

    const stamp = new Date().toISOString().slice(0, 10)
    return new Response('﻿' + lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="qpie-bookings-${stamp}.csv"`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (err) {
    return fail(err)
  }
}
