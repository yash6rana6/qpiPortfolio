/**
 * The caller's IP, for rate limiting.
 *
 * X-Forwarded-For is written by the CLIENT too ("1.2.3.4, 5.6.7.8"), and each proxy appends the
 * address it saw to the RIGHT. So the first entry is attacker-controlled; the trustworthy entry is
 * the one added by YOUR proxy. TRUST_PROXY_HOPS = how many proxies sit in front of the app:
 *   1 (default) -> Vercel / Render / Railway / one nginx   0 -> ignore proxy headers entirely
 *   2           -> e.g. Cloudflare in front of nginx
 */
const raw = process.env.TRUST_PROXY_HOPS
const HOPS = raw === undefined || raw === '' || Number.isNaN(Number(raw)) ? 1 : Math.max(0, Number(raw))

export function clientIp(request) {
  if (HOPS > 0) {
    const fwd = request.headers.get('x-forwarded-for')
    if (fwd) {
      const parts = fwd.split(',').map((s) => s.trim()).filter(Boolean)
      const ip = parts[parts.length - HOPS] ?? parts[0]
      if (ip) return ip
    }
    const real = request.headers.get('x-real-ip')
    if (real) return real.trim()
  }
  return 'unknown'
}
