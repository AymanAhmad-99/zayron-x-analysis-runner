// Edge Sentry configuration — runs on Cloudflare Workers (OpenNext edge runtime).
// Captures middleware failures, edge API errors, and cold-start performance data.

import * as Sentry from '@sentry/nextjs';
import { sharedSentryOptions } from './sentry.config.shared';

Sentry.init({
  ...sharedSentryOptions,

  // Edge runtimes are stateless and short-lived — keep sample rates minimal.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
});
