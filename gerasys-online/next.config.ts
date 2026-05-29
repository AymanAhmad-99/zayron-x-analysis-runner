import type { NextConfig } from "next";

const CSP = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' *.supabase.co`,
  `style-src 'self' 'unsafe-inline' fonts.googleapis.com`,
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

  // Transform lucide-react barrel imports into direct icon-file imports.
  // Without this, Turbopack tries to instantiate all ~1500 icon module
  // factories from the barrel re-export and fails with
  // "module factory is not available" for icons not in the current chunk.
  experimental: {
    optimizePackageImports: ["lucide-react"],
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
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];

    // Only apply aggressive static-asset caching in production.
    // In dev, Turbopack rebuilds chunks on every change and the browser must
    // always fetch the latest version — "immutable" breaks that.
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

export default nextConfig;
