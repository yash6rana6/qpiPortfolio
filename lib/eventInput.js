import { ApiError } from './api'

export const WRITABLE = [
  'title', 'category', 'city', 'description', 'venue', 'date', 'posterImage', 'videoUrl',
  'rows', 'seatsPerRow', 'pricePerSeat', 'status', 'isRecent', 'accentColor'
]

export function normalizeCity(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Only let through fields we own — no mass assignment from the request body. */
export function pickEventFields(body) {
  const out = {}
  for (const key of WRITABLE) if (body[key] !== undefined) out[key] = body[key]

  if (out.city !== undefined) out.city = normalizeCity(out.city)
  for (const key of ['rows', 'seatsPerRow', 'pricePerSeat']) {
    if (out[key] !== undefined) out[key] = Number(out[key])
  }
  if (out.rows !== undefined && !(Number.isInteger(out.rows) && out.rows >= 1 && out.rows <= 26)) {
    throw new ApiError(400, 'Rows must be a whole number between 1 and 26')
  }
  if (out.seatsPerRow !== undefined && !(Number.isInteger(out.seatsPerRow) && out.seatsPerRow >= 1 && out.seatsPerRow <= 40)) {
    throw new ApiError(400, 'Seats per row must be a whole number between 1 and 40')
  }
  return out
}
