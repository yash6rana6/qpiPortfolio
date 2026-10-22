import mongoose from 'mongoose'
import { connectDB } from '../../../../../../lib/mongodb'
import Booking from '../../../../../../models/Booking'
import User from '../../../../../../models/User'
import { requireUser } from '../../../../../../lib/auth'
import { buildTicketPdf, qrPng } from '../../../../../../lib/tickets'
import { fail, ApiError } from '../../../../../../lib/api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/v1/bookings/:id/ticket            -> ticket PDF
 * GET /api/v1/bookings/:id/ticket?format=png -> the QR image only
 * Only the owner (or an admin) gets it, and only for a paid booking.
 */
export async function GET(request, { params }) {
  try {
    const session = await requireUser()
    if (!mongoose.isValidObjectId(params.id)) throw new ApiError(404, 'Booking not found')
    await connectDB()

    const booking = await Booking.findById(params.id)
      .populate('event', 'title venue city date')
      .populate('user', 'name email')
      .lean()
    if (!booking) throw new ApiError(404, 'Booking not found')

    if (String(booking.user?._id) !== String(session.sub)) {
      const me = await User.findById(session.sub).select('role').lean()
      if (me?.role !== 'admin') throw new ApiError(404, 'Booking not found') // don't reveal that it exists
    }
    if (booking.status !== 'paid' || !booking.bookingCode) throw new ApiError(409, 'No active ticket for this booking')

    const headers = { 'Cache-Control': 'private, no-store' }
    const format = new URL(request.url).searchParams.get('format')

    if (format === 'png') {
      return new Response(await qrPng(booking.bookingCode), { headers: { ...headers, 'Content-Type': 'image/png' } })
    }

    const pdf = await buildTicketPdf(booking)
    return new Response(pdf, {
      headers: {
        ...headers,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="QPIE-ticket-${booking.bookingCode}.pdf"`
      }
    })
  } catch (err) {
    return fail(err)
  }
}
