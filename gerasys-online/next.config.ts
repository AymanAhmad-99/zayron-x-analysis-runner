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
  `style-src 'self' fonts.googleapis.com 'unsafe-inline'`,
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
  outputFileTracingRoot: process.cwd(),

  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://xdfndojvqazffcjngglr.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZm5kb2p2cWF6ZmZjam5nZ2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDQ0MDQsImV4cCI6MjA5MzgyMDQwNH0.UGitfLsGYqQIATh6qK-uT-ZsTXpf7zFArE3QvR9JEYw",
  },

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

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      "node:fs": false,
      os: false,
      "node:os": false,
    };
    return config;
  },

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
