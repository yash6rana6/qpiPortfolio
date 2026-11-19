/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false, // don't advertise "X-Powered-By: Next.js"

  experimental: {
    // Runs instrumentation.js on boot (starts the booking queue worker).
    instrumentationHook: true,
    // Keep these as plain Node requires instead of bundling them.
    serverComponentsExternalPackages: ['ioredis', 'bullmq', 'pdfkit', 'qrcode']
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' }
    ]
  },

  // Basic browser hardening for every page. (No CSP on purpose: Razorpay Checkout, Google sign-in and
  // the Pexels media need a carefully tested allow-list, and a wrong CSP silently breaks payments.)
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // camera=(self): the organiser check-in scanner (/admin/scan) needs the camera.
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
      // Only takes effect over https; no includeSubDomains so other subdomains can't be locked out by accident.
      { key: 'Strict-Transport-Security', value: 'max-age=15552000' }
    ]

    const rules = [{ source: '/:path*', headers: security }]

    // Files in /public never change under the same name, so let browsers keep them for a week
    // (a changed photo should get a new file name). Next already caches /_next/static for a year.
    const staticCache = [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }]
    for (const source of ['/team/:path*', '/logo.svg', '/logoff.svg', '/signupForm.webp']) {
      rules.push({ source, headers: staticCache })
    }

    // CORS for /api/v1 (a future mobile app). The origin is read at BUILD time, so set ALLOWED_ORIGIN
    // before `next build`. Unset in production = same-origin only (no CORS headers at all);
    // unset in development = open '*' for convenience (never combined with credentials).
    const origin = process.env.ALLOWED_ORIGIN
    const cors = [
      { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
      // lets a browser app read the total of a paginated list (X-Total-Count)
      { key: 'Access-Control-Expose-Headers', value: 'X-Total-Count' }
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
