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

/** Fixed-window limiter. Fails open if Redis is down (booking itself still needs Redis). */
export async function rateLimit(key, limit, windowSeconds, ApiError) {
  let count = 0
  try {
    const k = `rl:${key}`
    count = await redis().incr(k)
    if (count === 1) await redis().expire(k, windowSeconds)
  } catch {
    return
  }
  if (count > limit) throw new ApiError(429, 'Too many requests — slow down a little and try again')
}
