// Shared Sentry configuration — imported by all Sentry runtimes.
// See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// ═══════════════════════════════════════════════════════════════
// REQUIRED SECRETS (never commit these — upload via wrangler CLI):
//
//   wrangler secret put NEXT_PUBLIC_SENTRY_DSN
//   wrangler secret put SENTRY_AUTH_TOKEN
//   wrangler secret put SENTRY_ORG
//   wrangler secret put SENTRY_PROJECT
//
// The DSN is the ONLY variable required for error reporting to work.
// SENTRY_AUTH_TOKEN enables source-map uploads during `next build`.
// ═══════════════════════════════════════════════════════════════

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ?? '';
const IS_DEV = process.env.NODE_ENV === 'development';

// Warn at startup if the DSN is missing in a non-dev environment —
// errors will NOT be reported to Sentry.
if (!IS_DEV && !SENTRY_DSN) {
  console.warn(
    '[SENTRY] NEXT_PUBLIC_SENTRY_DSN is not set — error reporting is DISABLED.\n' +
    '  Upload it with: wrangler secret put NEXT_PUBLIC_SENTRY_DSN',
  );
}

export const sharedSentryOptions = {
  dsn: SENTRY_DSN,

  // ── Sampling ──────────────────────────────────────────────
  // Client (browser): 0.1  — 10% of page-load transactions
  // Server (Node.js): 0.05 — 5%  of API-route transactions
  // Edge   (Worker):  0.05 — 5%  of middleware transactions
  //
  // The server & edge configs override this default.  Setting a
  // lower rate on the server/edge keeps costs predictable while
  // still capturing enough data for p95/p99 latency analysis.
  tracesSampleRate: IS_DEV ? 1.0 : 0.1,

  // Profiling is enabled at the same rate as tracing so every
  // traced transaction also gets a profile.
  profilesSampleRate: IS_DEV ? 1.0 : 0.1,

  // Sentry is ENABLED whenever a real DSN is provided.
  // In development we leave it off to avoid noise; in production
  // the missing-DSN warning above tells you it's not active.
  enabled: !IS_DEV && SENTRY_DSN.length > 0,

  // ── Environment tag — helps filter issues by deployment ──
  environment: process.env.NODE_ENV ?? 'development',

  // ── Noise reduction ──────────────────────────────────────
  // Filter out health-check, static-asset, and bot transactions.
  ignoreTransactions: [
    '/api/db-status',
    '/api/status',
    '/_next/static',
    '/favicon.ico',
    '/robots.txt',
    '/api/monitoring',
  ],
};
