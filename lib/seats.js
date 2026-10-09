// Shared by the API (validation) and the UI (seat map) so both agree on seat names.

export const SEATS_PER_ROW = 10
export const SEAT_MAP_LIMIT = 1500 // bigger events fall back to "how many tickets"
export const MAX_SEATS_PER_BOOKING = 10
export const HOLD_MINUTES = 10 // seats in an unpaid order stay held this long

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

export const hasSeatMap = (event) => event?.totalSeats > 0 && event.totalSeats <= SEAT_MAP_LIMIT

/** Rows of seat labels for rendering: [['A1'..'A10'], ['B1'..]] */
export function seatRows(total) {
  const labels = allSeatLabels(total)
  const rows = []
  for (let i = 0; i < labels.length; i += SEATS_PER_ROW) rows.push(labels.slice(i, i + SEATS_PER_ROW))
  return rows
}
