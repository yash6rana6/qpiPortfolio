/** @type {import('next').NextConfig} */
const nextConfig = {
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

  // The /api/v1 surface is what a future mobile app will talk to, so it needs
  // CORS. Set ALLOWED_ORIGIN once the app has a real origin; '*' is only for
  // local development and cannot be combined with credentials.
  async headers() {
    const origin = process.env.ALLOWED_ORIGIN || '*'

    return [
      {
        source: '/api/v1/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: origin },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          ...(origin === '*' ? [] : [{ key: 'Access-Control-Allow-Credentials', value: 'true' }])
        ]
      }
    ]
  }
}

module.exports = nextConfig
