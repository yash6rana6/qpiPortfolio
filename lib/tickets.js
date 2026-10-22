import QRCode from 'qrcode'
import PDFDocument from 'pdfkit'
import { connectDB } from './mongodb'
import { sendMail, mailConfigured } from './mailer'
import Booking from '../models/Booking'

/**
 * The QR simply encodes the booking code. The code alone grants nothing: the scanner endpoint
 * is admin-only and checks the booking (paid, not refunded, not already used) in the database.
 */
export function qrPng(code, width = 360) {
  return QRCode.toBuffer(code, { width, margin: 1, errorCorrectionLevel: 'M', type: 'png' })
}

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const when = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
    : 'To be announced'

// pdfkit's built-in fonts have no ₹ glyph, so the PDF uses "Rs."
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`

/** Ticket PDF as a Buffer. `booking.event` and `booking.user` must be populated. */
export async function buildTicketPdf(booking) {
  const { event = {}, user = {} } = booking
  const png = await qrPng(booking.bookingCode, 480)
  const seats = booking.seatNumbers?.length ? booking.seatNumbers.join(', ') : `${booking.seats} x General Admission`

  const doc = new PDFDocument({ size: 'A5', margin: 36, info: { Title: `QPIE ticket ${booking.bookingCode}` } })
  const chunks = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const W = doc.page.width
  doc.rect(0, 0, W, 70).fill('#FF6B5B')
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(24).text('QPIE', 36, 24)
  doc.fontSize(10).font('Helvetica').text('ENTRY PASS', 36, 30, { align: 'right', width: W - 72 })

  doc.fillColor('#111').font('Helvetica-Bold').fontSize(20).text(event.title || 'Event', 36, 95, { width: W - 72 })
  doc.moveDown(0.4).font('Helvetica').fontSize(11).fillColor('#444')
  doc.text(when(event.date))
  doc.text([event.venue, event.city].filter(Boolean).join(', ') || 'Venue to be announced')

  doc.moveDown(1)
  const label = (k, v) => {
    doc.font('Helvetica').fontSize(8).fillColor('#888').text(k.toUpperCase())
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111').text(v)
    doc.moveDown(0.4)
  }
  label('Name', user.name || '-')
  label('Seats', seats)
  label('Amount paid', rs(booking.amount))

  const qrSize = 150
  doc.image(png, (W - qrSize) / 2, doc.y + 6, { width: qrSize })
  doc.y += qrSize + 14
  doc.font('Courier-Bold').fontSize(18).fillColor('#FF6B5B').text(booking.bookingCode, { align: 'center', characterSpacing: 3 })
  doc.font('Helvetica').fontSize(8).fillColor('#888').text('Show this QR code at the venue entrance. One scan = one entry.', { align: 'center' })

  doc.end()
  return done
}

function ticketEmailContent(b, png) {
  const e = b.event || {}
  const seats = b.seatNumbers?.length ? b.seatNumbers.join(', ') : `${b.seats} ticket${b.seats > 1 ? 's' : ''}`
  const subject = `Your QPIE ticket — ${e.title || 'your show'} (${b.bookingCode})`
  const text =
    `Hi ${b.user?.name || ''},\n\nYour booking is confirmed.\n\n${e.title || ''}\n${when(e.date)}\n` +
    `${[e.venue, e.city].filter(Boolean).join(', ')}\nSeats: ${seats}\nTicket code: ${b.bookingCode}\n\n` +
    `Your ticket (QR code) is attached as a PDF. Show it at the entrance.`
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;background:#FFF6E8;color:#2B1B12;border-radius:16px">
      <h1 style="margin:0 0 4px;font-size:26px">You're going 🎟️</h1>
      <p style="margin:0 0 20px;color:#6b5a4e">Booking confirmed, ${esc(b.user?.name || '')}.</p>
      <div style="background:#fff;border-radius:12px;padding:20px">
        <h2 style="margin:0 0 6px;font-size:20px">${esc(e.title)}</h2>
        <p style="margin:0;line-height:1.6">${esc(when(e.date))}<br>${esc([e.venue, e.city].filter(Boolean).join(', '))}</p>
        <p style="margin:12px 0 0"><b>Seats:</b> ${esc(seats)}</p>
        <div style="text-align:center;margin-top:16px">
          <img src="cid:ticket-qr" width="200" height="200" alt="Ticket QR code" style="display:block;margin:auto">
          <p style="margin:10px 0 0;font:bold 22px 'Courier New',monospace;letter-spacing:4px;color:#FF6B5B">${esc(b.bookingCode)}</p>
        </div>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#6b5a4e">A PDF copy is attached. Show the QR code at the entrance — each ticket works once.</p>
    </div>`
  return { subject, text, html }
}

async function loadBooking(bookingId) {
  await connectDB()
  return Booking.findById(bookingId)
    .populate('event', 'title venue city date')
    .populate('user', 'name email')
    .lean()
}

/**
 * Sends the ticket email (QR inline + PDF attached). Safe to call twice: it stops once
 * `ticketEmailSentAt` is set. THROWS when SMTP fails so the queue job retries with backoff.
 */
export async function sendTicketEmail(bookingId) {
  const b = await loadBooking(bookingId)
  if (!b || b.status !== 'paid' || !b.bookingCode || !b.user?.email) return 'skipped'
  if (b.ticketEmailSentAt) return 'already-sent'
  if (!mailConfigured()) return 'smtp-not-configured'

  const [png, pdf] = await Promise.all([qrPng(b.bookingCode), buildTicketPdf(b)])
  const { subject, text, html } = ticketEmailContent(b, png)

  const sent = await sendMail({
    to: b.user.email,
    subject,
    text,
    html,
    attachments: [
      { filename: 'ticket-qr.png', content: png, cid: 'ticket-qr', contentType: 'image/png' },
      { filename: `QPIE-ticket-${b.bookingCode}.pdf`, content: pdf, contentType: 'application/pdf' }
    ]
  })
  if (!sent) throw new Error('ticket email could not be sent')

  await Booking.updateOne({ _id: b._id }, { $set: { ticketEmailSentAt: new Date() } })
  return 'sent'
}

/** Cancellation / refund confirmation. Throws on SMTP failure (queue retries). */
export async function sendRefundEmail(bookingId) {
  const b = await loadBooking(bookingId)
  if (!b || b.status !== 'refunded' || !b.user?.email || !b.cancelledBy) return 'skipped'
  if (!mailConfigured()) return 'smtp-not-configured'

  const amount = b.refundAmount ?? b.amount
  const sent = await sendMail({
    to: b.user.email,
    subject: `Booking cancelled — ${b.event?.title || 'your show'} (${b.bookingCode})`,
    text:
      `Hi ${b.user.name},\n\nYour booking ${b.bookingCode} for ${b.event?.title || 'the show'} was cancelled.\n` +
      `Refund: ${rs(amount)} to your original payment method (usually 5-7 working days).`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:28px;background:#FFF6E8;color:#2B1B12;border-radius:16px">
        <h1 style="margin:0 0 12px;font-size:24px">Booking cancelled</h1>
        <p style="line-height:1.6;margin:0">Your booking <b>${esc(b.bookingCode)}</b> for <b>${esc(b.event?.title)}</b> was cancelled.</p>
        <p style="line-height:1.6;margin:12px 0 0">Refund of <b>${esc(rs(amount))}</b> is on its way to your original payment method (usually 5–7 working days).</p>
      </div>`
  })
  if (!sent) throw new Error('refund email could not be sent')
  return 'sent'
}
