/**
 * sentry.client.config.ts — SUPERSEDED
 *
 * Next.js 16 initializes browser-side Sentry from `instrumentation-client.ts`,
 * not this file. This file is intentionally left without a `Sentry.init(...)`
 * call so the two configs cannot drift (e.g. back to tracesSampleRate: 1).
 *
 * Edit client Sentry settings in `instrumentation-client.ts`.
 */
export {}
