// Server-side Sentry configuration — runs in Next.js Server Components and API routes.
// Captures server-side errors, database timeouts, and API failures.

import * as Sentry from '@sentry/nextjs';
import { sharedSentryOptions } from './sentry.config.shared';

Sentry.init({
  ...sharedSentryOptions,

  // Server-specific sample rates are lower to control cost.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
});
