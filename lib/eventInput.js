import { ApiError } from './api'
import { SEATING_TYPES, SEAT_MAP_LIMIT } from './seats'

export const WRITABLE = [
  'title', 'category', 'description', 'venue', 'city', 'date', 'endDate', 'posterImage', 'videoUrl',
  'seating', 'totalSeats', 'availableSeats', 'pricePerSeat', 'status', 'isRecent', 'accentColor'
]

const ACCENTS = ['pink', 'cyan', 'amber', 'lime']
const STATUSES = ['draft', 'published']

/** "new   DELHI" -> "New Delhi" so "delhi" and "Delhi" never become two cities. */
export function normalizeCity(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function wholeNumber(value, label) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) throw new ApiError(400, `${label} must be a whole number, 0 or more`)
  return n
}

function parseDate(value, label) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `${label} is not a valid date`)
  return d
}

/**
 * Only lets through fields we own (no mass assignment) and validates them.
 * Used by BOTH POST /events and PUT /events/:id so the rules can't drift apart.
 */
export function pickEventFields(body) {
  const out = {}
  for (const key of WRITABLE) if (body[key] !== undefined) out[key] = body[key]

  for (const key of ['title', 'category']) {
    if (out[key] !== undefined) {
      out[key] = String(out[key]).trim()
      if (!out[key]) throw new ApiError(400, `${key} cannot be empty`)
    }
  }

  if (out.city !== undefined) out.city = normalizeCity(out.city)

  if (out.totalSeats !== undefined) out.totalSeats = wholeNumber(out.totalSeats, 'Total seats')
  if (out.availableSeats !== undefined) out.availableSeats = wholeNumber(out.availableSeats, 'Seats on sale')

  if (out.pricePerSeat !== undefined) {
    const price = Number(out.pricePerSeat)
    if (!Number.isFinite(price) || price < 0) throw new ApiError(400, 'Price must be 0 or more')
    out.pricePerSeat = price
  }

  if (out.date !== undefined && out.date !== null) out.date = parseDate(out.date, 'Start date')
  if (out.endDate !== undefined && out.endDate !== null) out.endDate = parseDate(out.endDate, 'End date')
  if (out.date && out.endDate && out.endDate < out.date) {
    throw new ApiError(400, 'End date cannot be before the start date')
  }

  if (out.accentColor !== undefined && !ACCENTS.includes(out.accentColor)) {
    throw new ApiError(400, `Accent colour must be one of: ${ACCENTS.join(', ')}`)
  }
  if (out.status !== undefined && !STATUSES.includes(out.status)) {
    throw new ApiError(400, 'Status must be draft or published')
  }
  if (out.isRecent !== undefined) out.isRecent = Boolean(out.isRecent)

  if (out.seating !== undefined && !SEATING_TYPES.includes(out.seating)) {
    throw new ApiError(400, 'Seating must be "seated" or "general"')
  }
  if (out.seating === 'seated' && out.totalSeats !== undefined && out.totalSeats > SEAT_MAP_LIMIT) {
    throw new ApiError(400, `A seated event can have at most ${SEAT_MAP_LIMIT} seats. Use Unseated / General for bigger crowds.`)
  }

  if (out.totalSeats !== undefined && out.availableSeats !== undefined && out.availableSeats > out.totalSeats) {
    throw new ApiError(400, 'Seats on sale cannot be more than total seats')
  }

  return out
}
