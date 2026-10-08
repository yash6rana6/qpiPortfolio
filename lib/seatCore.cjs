/**
 * Seat engine — pure Redis + Lua. No Next.js, no Mongo imports, so the same
 * file is used by the app AND by scripts/test-concurrency.js.
 *
 * Redis keys per show (the {show:ID} hash-tag keeps them on one cluster slot):
 *   {show:ID}:booked  SET   seatIds that are permanently sold
 *   {show:ID}:holds   ZSET  seatId -> hold expiry (ms, Redis clock)
 *   {show:ID}:holdby  HASH  seatId -> holdId (who owns the temporary hold)
 *
 * Every script runs atomically inside Redis, so "check all seats free, then
 * lock them" can never interleave with another user's request.
 * Time comes from Redis TIME, not from app servers, so clock skew can't
 * cause early/late expiry.
 */

const LUA_NOW = `
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
`

const LUA_PURGE = `
local stale = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', now)
for i = 1, #stale do
  redis.call('ZREM', KEYS[2], stale[i])
  redis.call('HDEL', KEYS[3], stale[i])
end
`

// ARGV: holdId, ttlMs, seat1, seat2, ...
const HOLD = `${LUA_NOW}${LUA_PURGE}
local holdId = ARGV[1]
local expires = now + tonumber(ARGV[2])
local res = {0}
for i = 3, #ARGV do
  local seat = ARGV[i]
  if redis.call('SISMEMBER', KEYS[1], seat) == 1 then
    table.insert(res, seat)
  else
    local owner = redis.call('HGET', KEYS[3], seat)
    if owner and owner ~= holdId then table.insert(res, seat) end
  end
end
if #res > 1 then return res end
for i = 3, #ARGV do
  redis.call('ZADD', KEYS[2], expires, ARGV[i])
  redis.call('HSET', KEYS[3], ARGV[i], holdId)
end
return {1, expires}
`

// ARGV: holdId, seat1, seat2, ...   (only releases seats this hold still owns)
const RELEASE = `
local n = 0
for i = 2, #ARGV do
  if redis.call('HGET', KEYS[3], ARGV[i]) == ARGV[1] then
    redis.call('ZREM', KEYS[2], ARGV[i])
    redis.call('HDEL', KEYS[3], ARGV[i])
    n = n + 1
  end
end
return n
`

// ARGV: seat1, seat2, ...   (MongoDB is the truth; this just mirrors it)
const BOOK = `
for i = 1, #ARGV do
  redis.call('SADD', KEYS[1], ARGV[i])
  redis.call('ZREM', KEYS[2], ARGV[i])
  redis.call('HDEL', KEYS[3], ARGV[i])
end
return #ARGV
`

const SNAPSHOT = `${LUA_NOW}${LUA_PURGE}
return { redis.call('SMEMBERS', KEYS[1]), redis.call('ZRANGE', KEYS[2], 0, -1) }
`

const keysFor = (showId) => {
  const tag = `{show:${showId}}`
  return { booked: `${tag}:booked`, holds: `${tag}:holds`, holdby: `${tag}:holdby`, warm: `${tag}:warm` }
}

function register(redis) {
  if (redis.__seatCmds) return
  redis.defineCommand('seatHold', { numberOfKeys: 3, lua: HOLD })
  redis.defineCommand('seatRelease', { numberOfKeys: 3, lua: RELEASE })
  redis.defineCommand('seatBook', { numberOfKeys: 3, lua: BOOK })
  redis.defineCommand('seatSnapshot', { numberOfKeys: 3, lua: SNAPSHOT })
  redis.__seatCmds = true
}

function createSeatStore(redis) {
  register(redis)

  return {
    keysFor,

    /** All-or-nothing. Returns { ok:true, expiresAt } or { ok:false, unavailable:[seatIds] } */
    async hold(showId, seatIds, holdId, ttlSeconds) {
      const k = keysFor(showId)
      const r = await redis.seatHold(k.booked, k.holds, k.holdby, holdId, ttlSeconds * 1000, ...seatIds)
      return r[0] === 1 ? { ok: true, expiresAt: Number(r[1]) } : { ok: false, unavailable: r.slice(1) }
    },

    async release(showId, seatIds, holdId) {
      const k = keysFor(showId)
      return redis.seatRelease(k.booked, k.holds, k.holdby, holdId, ...seatIds)
    },

    async markBooked(showId, seatIds) {
      const k = keysFor(showId)
      return redis.seatBook(k.booked, k.holds, k.holdby, ...seatIds)
    },

    async snapshot(showId) {
      const k = keysFor(showId)
      const [booked, held] = await redis.seatSnapshot(k.booked, k.holds, k.holdby)
      return { booked, held }
    },

    async isWarm(showId) {
      return (await redis.exists(keysFor(showId).warm)) === 1
    },

    /** Rebuild the booked set from the database (after a Redis restart/flush). */
    async warm(showId, bookedSeatIds) {
      const k = keysFor(showId)
      for (let i = 0; i < bookedSeatIds.length; i += 500) {
        await redis.sadd(k.booked, ...bookedSeatIds.slice(i, i + 500))
      }
      await redis.set(k.warm, '1')
    }
  }
}

module.exports = { createSeatStore, keysFor }
