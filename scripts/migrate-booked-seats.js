/**
 * One-time (safe to re-run): copies every PAID booking's named seats into the
 * BookedSeat collection, which is the source of truth now, and clears the Redis
 * "warm" markers so Redis rebuilds from it. Without this, seats sold before the
 * switch would show as free.
 *
 *   node scripts/migrate-booked-seats.js
 */
require('dotenv').config({ path: '.env.local' })
const mongoose = require('mongoose')
const Redis = require('ioredis')
const { keysFor } = require('../lib/seatCore.cjs')

async function run() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing in .env.local')
  await mongoose.connect(process.env.MONGODB_URI)

  const db = mongoose.connection.db
  const bookings = db.collection('bookings')
  const booked = db.collection('bookedseats')
  await booked.createIndex({ event: 1, seatId: 1 }, { unique: true })

  const events = new Set()
  let inserted = 0
  let skipped = 0

  for await (const b of bookings.find({ status: 'paid', 'seatNumbers.0': { $exists: true } })) {
    for (const seatId of b.seatNumbers) {
      try {
        await booked.insertOne({ event: b.event, seatId, booking: b._id, user: b.user, createdAt: new Date(), updatedAt: new Date() })
        inserted++
      } catch (err) {
        if (err.code === 11000) skipped++
        else throw err
      }
    }
    events.add(String(b.event))
  }
  console.log(`BookedSeat: ${inserted} inserted, ${skipped} already there`)

  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { maxRetriesPerRequest: 1 })
    for (const id of events) {
      const k = keysFor(id)
      const warm = k.warm || Object.values(k).find((v) => /warm/.test(v))
      if (warm) await redis.del(warm)
    }
    await redis.quit()
    console.log(`Redis warm markers cleared for ${events.size} show(s)`)
  } catch (err) {
    console.log('Redis not reachable, skipped (it rebuilds itself on the first booking):', err.message)
  }

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
