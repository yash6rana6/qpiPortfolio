import nodemailer from 'nodemailer'

let transporter = null

function getTransport() {
  if (transporter) return transporter

  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return null

  const port = Number(process.env.SMTP_PORT || 465)
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user, pass }
  })
  return transporter
}

/** Never throws — returns true only when the mail was really handed to SMTP. */
export async function sendMail({ to, subject, html, text }) {
  const transport = getTransport()
  if (!transport) {
    console.warn('[mail] SMTP_USER / SMTP_PASS not set — email skipped')
    return false
  }

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || `QPIE <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html
    })
    return true
  } catch (err) {
    console.error('[mail]', err.message)
    return false
  }
}

export function welcomeEmail() {
  const text = "You're on the QPIE list. We'll let you know about new shows before anyone else."
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#FFF6E8;color:#2B1B12;border-radius:16px">
      <h1 style="margin:0 0 12px;font-size:28px">You're on the list 🎟️</h1>
      <p style="margin:0;font-size:16px;line-height:1.5">
        Thanks for signing up to <b>QPIE</b>. We'll let you know about new shows before anyone else.
      </p>
    </div>`
  return { subject: "You're on the QPIE list", text, html }
}
