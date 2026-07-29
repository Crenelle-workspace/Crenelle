import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // ── Security headers (applied to every route) ──────────────────────────────
  // Conservative, non-breaking hardening. No Content-Security-Policy here on
  // purpose: a strict CSP would need per-nonce wiring for Next.js/Sentry inline
  // scripts and is out of scope for this batch. camera=(self) is kept ENABLED
  // because the QR scanner (/scan) needs same-origin camera access.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // Sentry org and project — set these in CI/CD env or .env.local
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for source map uploads (generate at https://sentry.io/settings/auth-tokens/)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps only during production builds; hide them from the browser bundle
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },

  // Suppresses Sentry CLI log output during builds
  silent: !process.env.CI,

  // Automatically instrument Next.js Data Fetching methods
  autoInstrumentServerFunctions: true,

  // Disable the Sentry tunnel route (/monitoring) — add it if you hit ad-blocker issues
  tunnelRoute: undefined,
})
