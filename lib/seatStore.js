import mongoose from 'mongoose'
import seatCore from './seatCore.cjs'
import { redis, cached } from './redis'
import { connectDB } from './mongodb'
import Event from '../models/Event'
import BookedSeat from '../models/BookedSeat'
import { ApiError } from './api'
import { MAX_SEATS_PER_BOOKING, allSeatLabels } from './seats'

/**
 * SERVER-ONLY seat engine (Redis hold + MongoDB truth).
 * `lib/seats.js` stays browser-safe (labels, constants); anything that touches
 * Redis/Mongo lives here so it never ends up in a client bundle.
 */
export const HOLD_TTL_SECONDS = Number(process.env.SEAT_HOLD_SECONDS) || 300

let _store
function store() {
  if (!_store) _store = seatCore.createSeatStore(redis())
  return _store
}

export const channelFor = (eventId) => `show:${eventId}:events`

// ---------- seat validation (labels come from the same helper the seat map UI uses) ----------

const validCache = new Map()
function validSeats(total) {
  let set = validCache.get(total)
  if (!set) {
    set = new Set(allSeatLabels(total))
    validCache.set(total, set)
  }
  return set
}

/** Validates + dedupes the seat names a client sent. Returns them sorted (A1, A2, B1 ...). */
export function parseSeats(event, input) {
  if (!Array.isArray(input) || input.length < 1) throw new ApiError(400, 'Choose your seats first')
  const seats = [...new Set(input.map((s) => String(s).toUpperCase().trim()))]
  if (seats.length > MAX_SEATS_PER_BOOKING) {
    throw new ApiError(400, `You can book at most ${MAX_SEATS_PER_BOOKING} seats at a time`)
  }
  const valid = validSeats(event.totalSeats)
  const bad = seats.filter((s) => !valid.has(s))
  if (bad.length) throw new ApiError(400, `Invalid seat(s): ${bad.join(', ')}`)
  return seats.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

// ---------- event lookup (Redis-cached 60s; admin writes bump the cache version) ----------

export async function getEventLite(id) {
  if (!mongoose.isValidObjectId(id)) return null
  return cached(`event:${id}`, 60, async () => {
    await connectDB()
    return Event.findById(id)
      .select('title city venue date endDate posterImage accentColor totalSeats availableSeats pricePerSeat status')
      .lean()
  })
}

// ---------- seat state ----------

/** After a Redis restart the booked-set is empty: rebuild it from MongoDB before trusting it. */
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
    throw new ApiError(503, 'Seat service is busy. Please try again in a moment.')
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

/** { booked, held, degraded } — falls back to MongoDB (without live holds) if Redis is down. */
export async function getSeatMap(eventId) {
  try {
    await ensureWarm(eventId)
    const snap = await store().snapshot(eventId)
    return { ...snap, degraded: false }
  } catch {
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
