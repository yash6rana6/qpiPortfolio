import { redis } from './redis'

const KEY = 'news:lucknow:v1'
const TTL = Number(process.env.NEWS_CACHE_SECONDS) || 3 * 60 * 60
const RETRY_AFTER_FAIL_MS = 5 * 60 * 1000
const QUERY =
  'Lucknow AND (event OR concert OR festival OR mela OR exhibition OR show OR fair OR expo OR "cultural programme")'

const g = globalThis

async function ogImage(pageUrl) {
  try {
    const u = new URL(pageUrl)
    if (!/^https?:$/.test(u.protocol)) return null
    const res = await fetch(u, {
      signal: AbortSignal.timeout(3000),
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; QPIEBot/1.0)' },
      redirect: 'follow'
    })
    if (!res.ok) return null
    const html = (await res.text()).slice(0, 150_000)
    const m =
      html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i)
    if (!m) return null
    const img = new URL(m[1].replace(/&amp;/g, '&'), u)
    return /^https?:$/.test(img.protocol) ? img.href : null
  } catch {
    return null
  }
}

async function load() {
  const apikey = process.env.GNEWS_API_KEY
  if (!apikey) return []

  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d+Z$/, 'Z')
  const url = `https://gnews.io/api/v4/search?${new URLSearchParams({
    q: QUERY,
    lang: 'en',
    country: 'in',
    max: '10',
    sortby: 'publishedAt',
    from,
    apikey
  })}`

  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12_000) })
  if (!res.ok) throw new Error(`GNews ${res.status}`)
  const data = await res.json()

  const seen = new Set()
  let items = (data.articles || [])
    .map((a) => ({
      id: a.id || a.url,
      title: String(a.title || '').trim(),
      description: String(a.description || '').trim(),
      url: a.url,
      image: a.image || null,
      source: a.source?.name || '',
      publishedAt: a.publishedAt
    }))
    .filter((a) => {
      const k = a.title.toLowerCase()
      if (!a.title || !a.url || seen.has(k)) return false
      seen.add(k)
      return true
    })

  // Prefer stories that actually put Lucknow in the headline/summary (search also matches body text).
  const local = items.filter((a) => /lucknow/i.test(`${a.title} ${a.description}`))
  if (local.length >= 3) items = local

  // No image from the API? Try the article's own og:image. Still nothing -> the UI draws a crayon doodle.
  await Promise.all(
    items.map(async (a) => {
      if (!a.image) a.image = await ogImage(a.url)
    })
  )

  return items
}

export async function getLucknowNews() {
  try {
    const hit = await redis().get(KEY)
    if (hit) return JSON.parse(hit)
  } catch {}

  const mem = g._qpieNews
  if (mem && Date.now() < mem.until) return mem.items
  if (g._qpieNewsInflight) return g._qpieNewsInflight

  g._qpieNewsInflight = (async () => {
    try {
      const items = await load()
      g._qpieNews = { items, until: Date.now() + TTL * 1000 }
      try {
        await redis().set(KEY, JSON.stringify(items), 'EX', TTL)
      } catch {}
      return items
    } catch (err) {
      console.error('[news]', err.message)
      // Keep serving the last good list and don't hammer the API while it is failing.
      const items = mem?.items || []
      g._qpieNews = { items, until: Date.now() + RETRY_AFTER_FAIL_MS }
      return items
    } finally {
      g._qpieNewsInflight = null
    }
  })()

  return g._qpieNewsInflight
}