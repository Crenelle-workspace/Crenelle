// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || "https://0446c50b40e631ef951d00c6033743e9@o4511824794157056.ingest.de.sentry.io/4511824801431632",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Sample all traces in dev, 10% in production to control ingestion cost.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Session Replay: capture all error sessions, 5% of the rest in production.
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
