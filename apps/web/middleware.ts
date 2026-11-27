import { NextResponse, type NextRequest } from "next/server";

/**
 * Canonical host enforcement (SEO).
 *
 * `zayron-x.co` is the only indexable origin. `www.zayron-x.co` resolves to the
 * same Worker route, so without this redirect every page is reachable under a
 * second hostname: Search Console reports "Duplicate, Google chose different
 * canonical" and link equity splits across two hosts.
 *
 * The redirect is 301 (permanent) and preserves BOTH the path and the query
 * string, so `https://www.zayron-x.co/intelligence/vulnerabilities?page=2`
 * lands on the identical URL on the apex host.
 *
 * This runs before the route handlers, so it works even before any Cloudflare
 * Zone-level Redirect Rule is configured.
 */
const CANONICAL_HOST = "zayron-x.co";
const REDIRECT_HOSTS = new Set(["www.zayron-x.co"]);

/**
 * Phase 6 — permanent path consolidation.
 *
 * Institutional documents moved to canonical top-level routes, and the former
 * "AI Policy" document was replaced by Methodology & Governance. Every legacy URL
 * resolves with a 301 to its successor, so no indexed or externally linked path
 * breaks or returns 404. Query strings are preserved.
 */
const PATH_REDIRECTS: Record<string, string> = {
  "/ai-policy": "/methodology",
  "/legal/ai": "/methodology",
  "/legal/privacy": "/privacy",
  "/legal/cookies": "/cookies",
  "/legal/security": "/security",
  "/legal/vulnerability-disclosure": "/security",
  "/legal/terms": "/legal",
  "/company/about": "/about",
  // `/malware` is the institutional entry point for malware dossiers; the dossier
  // library itself lives under the intelligence tree.
  "/malware": "/intelligence/malware",
};

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.replace(/\/+$/, "");
  return pathname;
}

/**
 * Baseline enterprise response headers.
 *
 * Applied to every response that leaves the Worker — redirects and
 * cache-busted origin renders included — so no path can serve without them.
 * This is the authoritative hardening pass: a `next.config.ts` header rule is
 * only attached to the routes that config compiled, while middleware runs on
 * every matched path.
 *
 * CSP: inline scripts remain permitted because Next.js emits its own streaming
 * bootstrap/hydration scripts and the app does not use per-request nonces.
 * Cloudflare Turnstile (self-serve key form) and Cloudflare Web Analytics are
 * explicitly allowed, so neither is blocked at runtime.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com https://zayron-x.co https://www.zayron-x.co https://zayron-x-api-preview.aabusabih.workers.dev",
  "frame-src 'self' https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
};

function harden(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

/**
 * PHASE 7A — 50K-user edge cache shield for public SSR pages.
 *
 * These documents are identical for every anonymous visitor and change on an
 * hourly (not second) cadence, so the Cloudflare CDN may serve a repeat request
 * for 300s with a 600s stale-while-revalidate window. That removes the Worker
 * invocation AND the API/D1 read behind it. Only the explicitly public catalog
 * pages are listed: a personalized or operator route must never inherit this.
 */
const PUBLIC_PAGE_CACHE = new Set([
  "/",
  "/intelligence",
  "/intelligence/vulnerabilities",
  "/intelligence/malware",
  // PHASE 7C — the live IOC workspace and the server-rendered family hubs.
  "/intelligence/iocs",
  // PHASE 9C — the SSR catalogs that previously re-rendered on every crawl hit
  // and exhausted the Free-tier CPU ceiling (`Error 1102`). They are identical
  // for every anonymous visitor and are already revalidated against a 300s API
  // window, so the edge may serve a repeat request without invoking the Worker.
  "/intelligence/campaigns",
  "/intelligence/threat-actors",
  "/intelligence/exploits",
  "/intelligence/techniques",
  "/news",
  "/pricing",
  "/developers",
]);

/**
 * Prefix-cached page families. A family hub is a stable, anonymous, SSR
 * document keyed only by its slug, so it inherits the same 300s edge policy as
 * the catalog roots rather than the Worker serving every crawler hit.
 */
const PUBLIC_PAGE_CACHE_PREFIXES = [
  "/intelligence/malware/families/",
  // PHASE 9C — the SSR dossier trees. Each URL is a stable, anonymous document
  // keyed only by its slug; caching them keeps a crawler burst off the origin.
  "/intelligence/threat-actors/",
  "/intelligence/campaigns/",
  "/intelligence/techniques/",
  "/news/",
];

const PUBLIC_PAGE_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

function withPageCache(response: NextResponse, pathname: string): NextResponse {
  const path = normalizePath(pathname);
  if (PUBLIC_PAGE_CACHE.has(path) || PUBLIC_PAGE_CACHE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    response.headers.set("Cache-Control", PUBLIC_PAGE_CACHE_CONTROL);
  }
  return response;
}

export function middleware(request: NextRequest): NextResponse {
  const url = new URL(request.url);
  const host = (request.headers.get("host") ?? "").split(":")[0].trim().toLowerCase();

  if (REDIRECT_HOSTS.has(host)) {
    const target = new URL(`https://${CANONICAL_HOST}${url.pathname}`);
    target.search = url.search;
    return harden(NextResponse.redirect(target, 301));
  }

  const destination = PATH_REDIRECTS[normalizePath(url.pathname)];
  if (destination) {
    const target = new URL(destination, url.origin);
    target.search = url.search;
    return harden(NextResponse.redirect(target, 301));
  }

  return withPageCache(harden(NextResponse.next()), url.pathname);
}

export const config = {
  // Every path on the www host is canonicalised, assets included: a crawler must
  // never record two indexable origins for the same document.
  matcher: "/:path*",
};
