/** Tiny className joiner — skips falsy values, flattens arrays. */
export function cn(...parts) {
  return parts.flat(Infinity).filter(Boolean).join(' ')
}

export const pad = (n, len = 2) => String(n).padStart(len, '0')

export const clamp = (n, min, max) => Math.min(Math.max(n, min), max)

export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', options)
}

export function formatPrice(amount) {
  if (!amount || amount <= 0) return ''
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatNumber(n) {
  return Number(n || 0).toLocaleString('en-IN')
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/** Safe CSS background for an event poster — gradient when the image is missing. */
export function posterBackground(url) {
  if (url) return { backgroundImage: `url("${url}")` }
  return { backgroundImage: 'linear-gradient(135deg, #FF2A85 0%, #14141B 100%)' }
}

/** "5 PM" or "7:30 PM" */
export function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const h = d.getHours()
  const m = d.getMinutes()
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${m ? `:${pad(m)}` : ''} ${h < 12 ? 'AM' : 'PM'}`
}

/** Local yyyy-mm-dd — used to group events by day. */
export function dateKey(value) {
  if (!value) return 'tba'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'tba'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Date -> value for <input type="datetime-local"> (local time, no seconds). */
export function toDateTimeLocal(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
