/**
 * Proves the seat engine under load. Needs only Redis (no Mongo, no Next).
 *   npm run test:concurrency
 *
 * 1) 1000 users fight for the SAME seat      -> exactly 1 winner, 999 clean "taken"
 * 2) 1000 users grab random overlapping sets -> no seat ever has two owners
 * 3) release / expiry / markBooked behave
 */
require('dotenv').config({ path: '.env.local' })
const Redis = require('ioredis')
const { createSeatStore } = require('../lib/seatCore.cjs')

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379')
const store = createSeatStore(redis)
const SHOW = `test-${Date.now()}`
const USERS = 1000

let failed = 0
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`)
  if (!cond) failed++
}

async function run() {
  // 1 — same seat, 1000 parallel users
  const t0 = Date.now()
  const results = await Promise.all(
    Array.from({ length: USERS }, (_, i) => store.hold(SHOW, ['A1'], `user-${i}`, 60))
  )
  const winners = results.filter((r) => r.ok).length
  check('1000 users, same seat -> exactly 1 winner', winners === 1, `(winners=${winners}, ${Date.now() - t0}ms)`)
  check('losers get a clean unavailable list', results.filter((r) => !r.ok).every((r) => r.unavailable[0] === 'A1'))

  // 2 — random overlapping multi-seat requests: all-or-nothing, no double ownership
  const SHOW2 = SHOW + '-b'
  const seatPool = Array.from({ length: 30 }, (_, i) => `B${i + 1}`)
  const pick = () => {
    const n = 1 + Math.floor(Math.random() * 4)
    return [...seatPool].sort(() => Math.random() - 0.5).slice(0, n)
  }
  const attempts = await Promise.all(
    Array.from({ length: USERS }, (_, i) => {
      const seats = pick()
      return store.hold(SHOW2, seats, `u-${i}`, 60).then((r) => ({ holdId: `u-${i}`, seats, ...r }))
    })
  )
  const owners = await redis.hgetall(store.keysFor(SHOW2).holdby)
  const wonSeats = attempts.filter((a) => a.ok).flatMap((a) => a.seats)
  check('no seat is owned by two users', new Set(wonSeats).size === wonSeats.length)
  check(
    'redis owner matches the winning request for every seat',
    attempts.filter((a) => a.ok).every((a) => a.seats.every((s) => owners[s] === a.holdId))
  )
  check(
    'partial wins never happen (losers hold nothing)',
    attempts.filter((a) => !a.ok).every((a) => a.seats.every((s) => owners[s] !== a.holdId))
  )

  // 3 — release / book / expiry
  const SHOW3 = SHOW + '-c'
  await store.hold(SHOW3, ['C1', 'C2'], 'h1', 60)
  check('other holdId cannot release my seats', (await store.release(SHOW3, ['C1'], 'intruder')) === 0)
  check('owner releases own seats', (await store.release(SHOW3, ['C1', 'C2'], 'h1')) === 2)
  check('seat free again after release', (await store.hold(SHOW3, ['C1'], 'h2', 60)).ok)

  await store.markBooked(SHOW3, ['C1'])
  const snap = await store.snapshot(SHOW3)
  check('booked seat shows booked and not held', snap.booked.includes('C1') && !snap.held.includes('C1'))
  check('booked seat cannot be held again', !(await store.hold(SHOW3, ['C1'], 'h3', 60)).ok)

  await store.hold(SHOW3, ['C5'], 'h4', 1)
  await new Promise((r) => setTimeout(r, 1300))
  check('expired hold is free for the next user', (await store.hold(SHOW3, ['C5'], 'h5', 60)).ok)

  const keys = await redis.keys('{show:test-*')
  if (keys.length) await redis.del(...keys)
  await redis.quit()

  console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed')
  process.exit(failed ? 1 : 0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
