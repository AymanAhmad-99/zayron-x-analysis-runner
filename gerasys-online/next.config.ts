import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";


/* ── Strict Nonce‑Based CSP ──
   The nonce is generated per‑request in middleware.ts and passed via
   the request headers (x-csp-nonce).  Scripts that need inline execution
   must carry this nonce.  All 'unsafe-inline' occurrences have been removed.
   ──────────────────────────────────────────────────────────────── */
const CSP = [
  `default-src 'self'`,
  `script-src 'self' *.supabase.co 'strict-dynamic'`,
  `style-src 'self' fonts.googleapis.com`,
  `img-src 'self' data: blob: images.unsplash.com *.supabase.co *.unsplash.com`,
  `connect-src 'self' *.supabase.co`,
  `font-src 'self' fonts.gstatic.com`,
  `frame-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",

  // Transform lucide-react barrel imports into direct icon-file imports.
  // Without this, Turbopack tries to instantiate all ~1500 icon module
  // factories from the barrel re-export and fails with
  // "module factory is not available" for icons not in the current chunk.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Explicitly declared to silence Turbopack ambiguity warning.
  // Build uses --webpack (see package.json), so this is a no-op.
  turbopack: {},

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    deviceSizes: [390, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  async headers() {
    const rules: Awaited<ReturnType<NonNullable<NextConfig["headers"]>>> = [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            // The nonce placeholder is replaced per-request by middleware
            // which reads the request header and inlines the actual nonce.
            value: CSP,
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];

    if (process.env.NODE_ENV === "production") {
      rules.push({
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      });
    }

    return rules;
  },

  async redirects() {
    return [
      {
        source: "/article/:slug",
        destination: "/intelligence/threat-intelligence/:slug",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? 'zayron-x',
  project: process.env.SENTRY_PROJECT ?? 'zayron-x-web',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: true },
  tunnelRoute: '/api/monitoring',
  disableLogger: true,
  automaticVercelMonitors: false,
});
