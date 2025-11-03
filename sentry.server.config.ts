import * as Sentry from "@sentry/nextjs";

// Sentry disabled temporarily
// Uncomment when ready to enable Sentry tracking
/*
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  sampleRate: 0.1,
  tracesSampleRate: 0.1,
  enabled: !!process.env.SENTRY_DSN,
});
*/

// Empty init to prevent errors
Sentry.init({ enabled: false });
