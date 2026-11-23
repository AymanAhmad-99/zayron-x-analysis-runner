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
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://zayron-x.co https://www.zayron-x.co https://zayron-x-api-preview.aabusabih.workers.dev; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
