import type { NextConfig } from "next";

/**
 * ZX-12 — baseline security headers for every web response.
 *
 * CSP choice: the app does NOT wire per-request nonces, and Next.js emits
 * inline bootstrap/hydration scripts. A rigid `script-src 'self'` would
 * white-screen the app, so inline scripts are explicitly permitted while every
 * other directive stays locked down.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value:
      // PHASE 7.2 — Cloudflare Turnstile (self-serve key form) loads its script
      // from challenges.cloudflare.com, frames the challenge in an iframe and
      // calls back to that origin. Without these three directives the widget is
      // blocked by CSP and the form submits with no token.
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com https://zayron-x.co https://www.zayron-x.co https://zayron-x-api-preview.aabusabih.workers.dev; frame-src 'self' https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // PHASE 7.3 — an already-published advisory is immutable, so the dossier
        // is cacheable for 5 minutes with a stale fallback instead of being
        // re-rendered on every crawl hit.
        source: "/intelligence/malware/advisories/:id*",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        // PHASE 8B — the Exploit & Weaponization Radar is a live read over the
        // same 300s API cache, so the HTML shares that window.
        source: "/intelligence/exploits",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        // PHASE 8C — the connected threat graph (index + every dossier) and the
        // campaign index share the API's 300s window.
        source: "/intelligence/threat-actors/:path*",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/intelligence/campaigns/:path*",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
    ];
  },
};

export default nextConfig;
