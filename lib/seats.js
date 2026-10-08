import mongoose from 'mongoose'
import seatCore from './seatCore.cjs'
import { redis, cached } from './redis'
import { connectDB } from './mongodb'
import Event from '../models/Event'
import BookedSeat from '../models/BookedSeat'
import { ApiError } from './api'

export const HOLD_TTL_SECONDS = Number(process.env.SEAT_HOLD_SECONDS) || 300
export const MAX_SEATS_PER_BOOKING = 10

let _store
function store() {
  if (!_store) _store = seatCore.createSeatStore(redis())
  return _store
}

export const channelFor = (eventId) => `show:${eventId}:events`

// ---------- layout helpers ----------

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || lo))

export function layoutOf(event) {
  return { rows: clamp(event.rows ?? 10, 1, 26), seatsPerRow: clamp(event.seatsPerRow ?? 10, 1, 40) }
}

const SEAT_RE = /^([A-Z])([1-9]\d?)$/

export function isValidSeat(layout, id) {
  const m = SEAT_RE.exec(id)
  if (!m) return false
  return m[1].charCodeAt(0) - 65 < layout.rows && Number(m[2]) <= layout.seatsPerRow
}

/** Validates + dedupes the seat ids a client sent. */
export function parseSeats(layout, input) {
  if (!Array.isArray(input) || input.length < 1) throw new ApiError(400, 'Pick at least one seat')
  const seats = [...new Set(input.map((s) => String(s).toUpperCase().trim()))]
  if (seats.length > MAX_SEATS_PER_BOOKING) {
    throw new ApiError(400, `You can book at most ${MAX_SEATS_PER_BOOKING} seats at a time`)
  }
  const bad = seats.filter((s) => !isValidSeat(layout, s))
  if (bad.length) throw new ApiError(400, `Invalid seat(s): ${bad.join(', ')}`)
  return seats.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

// ---------- event lookup (cached) ----------

export async function getEventLite(id) {
  if (!mongoose.isValidObjectId(id)) return null
  return cached(`event:${id}`, 60, async () => {
    await connectDB()
    return Event.findById(id)
      .select('title city venue date posterImage accentColor rows seatsPerRow pricePerSeat status')
      .lean()
  })
}

// ---------- seat state ----------

/** After a Redis restart the booked-set is empty — rebuild it from MongoDB before trusting it. */
async function ensureWarm(eventId) {
  if (await store().isWarm(eventId)) return
  await connectDB()
  const rows = await BookedSeat.find({ event: eventId }).select('seatId -_id').lean()
  await store().warm(eventId, rows.map((r) => r.seatId))
}

export async function holdSeats(eventId, seatIds, holdId) {
  try {
    await ensureWarm(eventId)
    return await store().hold(eventId, seatIds, holdId, HOLD_TTL_SECONDS)
  } catch (err) {
    console.error('[seats] hold failed', err.message)
    throw new ApiError(503, 'Seat service is busy — please try again in a moment')
  }
}

export async function releaseSeats(eventId, seatIds, holdId) {
  try {
    const n = await store().release(eventId, seatIds, holdId)
    if (n > 0) await publishSeatUpdate(eventId, 'release', seatIds)
    return n
  } catch (err) {
    console.error('[seats] release failed', err.message)
    return 0
  }
}

/** Throws on failure so the caller can queue a retry. */
export async function markSeatsBooked(eventId, seatIds) {
  await store().markBooked(eventId, seatIds)
  await publishSeatUpdate(eventId, 'book', seatIds)
}

export async function getSeatMap(eventId) {
  try {
    await ensureWarm(eventId)
    const snap = await store().snapshot(eventId)
    return { ...snap, degraded: false }
  } catch (err) {
    // Redis down: reads still work from MongoDB (holds just aren't visible).
    await connectDB()
    const rows = await BookedSeat.find({ event: eventId }).select('seatId -_id').lean()
    return { booked: rows.map((r) => r.seatId), held: [], degraded: true }
  }
}

export async function publishSeatUpdate(eventId, type, seats) {
  try {
    await redis().publish(channelFor(eventId), JSON.stringify({ t: type, seats }))
  } catch {}
}
