// Client-side Sentry configuration — runs in the browser.
// Registers error and performance monitoring for React components.

import * as Sentry from '@sentry/nextjs';
import { sharedSentryOptions } from './sentry.config.shared';

Sentry.init({
  ...sharedSentryOptions,

  // Browser-only integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Replay session sample rate
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
