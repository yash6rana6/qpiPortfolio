import Redis from 'ioredis'

const URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const g = globalThis

function baseOptions() {
  return { connectTimeout: 3000, retryStrategy: (n) => Math.min(n * 250, 3000) }
}

/** Shared client for normal commands. Fails fast (2s) instead of hanging requests. */
export function redis() {
  if (!g._qpieRedis) {
    const client = new Redis(URL, { ...baseOptions(), maxRetriesPerRequest: 1, commandTimeout: 2000 })
    let lastLog = 0
    client.on('error', (e) => {
      if (Date.now() - lastLog > 10000) {
        lastLog = Date.now()
        console.error('[redis]', e.message)
      }
    })
    g._qpieRedis = client
  }
  return g._qpieRedis
}

/** Dedicated connection (pub/sub subscriber, BullMQ). */
export function newConnection(options = {}) {
  const client = new Redis(URL, { ...baseOptions(), maxRetriesPerRequest: null, ...options })
  client.on('error', () => {})
  return client
}

const inflight = new Map()


export async function cached(name, ttlSeconds, loader) {
  let version = '0'
  try {
    version = (await redis().get('cache:v')) || '0'
  } catch {}

  const key = `cache:${name}:v${version}`
  try {
    const hit = await redis().get(key)
    if (hit !== null) return JSON.parse(hit)
  } catch {}

  if (inflight.has(key)) return inflight.get(key)

  const p = (async () => {
    const value = await loader()
    try {
      await redis().set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch {}
    return value
  })().finally(() => inflight.delete(key))

  inflight.set(key, p)
  return p
}

/** Call after any admin write — bumps the version so every cached list/event refreshes. */
export async function bustCache() {
  try {
    await redis().incr('cache:v')
  } catch {}
}

// INCR and EXPIRE in ONE atomic step. Done as two calls, a crash between them left a counter with no
// expiry, which blocked that user forever. The TTL check also repairs any key that already lost its expiry.
const RATE_LIMIT_LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 or redis.call('TTL', KEYS[1]) < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return c
`

/** Fixed-window limiter. Fails open if Redis is down (booking itself still needs Redis). */
export async function rateLimit(key, limit, windowSeconds, ApiError) {
  let count = 0
  try {
    count = Number(await redis().eval(RATE_LIMIT_LUA, 1, `rl:${key}`, windowSeconds))
  } catch {
    return
  }
  if (count > limit) throw new ApiError(429, 'Too many requests — slow down a little and try again')
}
