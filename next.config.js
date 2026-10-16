/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false, // don't advertise "X-Powered-By: Next.js"

  experimental: {
    // Runs instrumentation.js on boot (starts the booking queue worker).
    instrumentationHook: true,
    // Keep these as plain Node requires instead of bundling them.
    serverComponentsExternalPackages: ['ioredis', 'bullmq']
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.pexels.com' }
    ]
  },

  // Basic browser hardening for every page. (No CSP on purpose: Razorpay Checkout, Google sign-in and
  // the Pexels media need a carefully tested allow-list, and a wrong CSP silently breaks payments.)
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // Only takes effect over https; no includeSubDomains so other subdomains can't be locked out by accident.
      { key: 'Strict-Transport-Security', value: 'max-age=15552000' }
    ]

    const rules = [{ source: '/:path*', headers: security }]

    // CORS for /api/v1 (a future mobile app). The origin is read at BUILD time, so set ALLOWED_ORIGIN
    // before `next build`. Unset in production = same-origin only (no CORS headers at all);
    // unset in development = open '*' for convenience (never combined with credentials).
    const origin = process.env.ALLOWED_ORIGIN
    const cors = [
      { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
    ]
    if (origin) {
      rules.push({
        source: '/api/v1/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: origin },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Vary', value: 'Origin' },
          ...cors
        ]
      })
    } else if (process.env.NODE_ENV !== 'production') {
      rules.push({
        source: '/api/v1/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }, ...cors]
      })
    }

    return rules
  }
}

module.exports = nextConfig
