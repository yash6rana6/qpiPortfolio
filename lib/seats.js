// Shared by the API (validation) and the UI (seat map) so both agree on seat names.

export const SEATS_PER_ROW = 10
export const SEAT_MAP_LIMIT = 1500 // bigger events fall back to "how many tickets"
export const MAX_SEATS_PER_BOOKING = 10

/** 0 -> A, 25 -> Z, 26 -> AA ... */
export function rowLabel(row) {
  let n = row + 1
  let out = ''
  while (n > 0) {
    const m = (n - 1) % 26
    out = String.fromCharCode(65 + m) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

export const seatLabel = (index) => `${rowLabel(Math.floor(index / SEATS_PER_ROW))}${(index % SEATS_PER_ROW) + 1}`

export function allSeatLabels(total) {
  return Array.from({ length: total }, (_, i) => seatLabel(i))
}

export const SEATING_TYPES = ['seated', 'general']

/**
 * Does this event use a seat map at booking time?
 *  - seating 'general'  -> never (just a ticket count)
 *  - seating 'seated'   -> yes (capacity is capped at SEAT_MAP_LIMIT when the event is saved)
 *  - no seating field   -> old events: seat map when capacity is small enough
 */
export function hasSeatMap(event) {
  if (!event || !(event.totalSeats > 0)) return false
  if (event.seating === 'general') return false
  return event.totalSeats <= SEAT_MAP_LIMIT
}

/** Rows of seat labels for rendering: [['A1'..'A10'], ['B1'..]] */
export function seatRows(total) {
  const labels = allSeatLabels(total)
  const rows = []
  for (let i = 0; i < labels.length; i += SEATS_PER_ROW) rows.push(labels.slice(i, i + SEATS_PER_ROW))
  return rows
}
