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
 * Applied to every response that leaves the Worker — redirects included — so no
 * path can serve without them. A CSP is deliberately absent: the site inlines a
 * vinext streaming bootstrap script, so a policy here would need a nonce plumbing
 * change rather than a guessed directive.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
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
  "/intelligence/vulnerabilities",
  "/intelligence/malware",
  // PHASE 7C — the live IOC workspace and the server-rendered family hubs.
  "/intelligence/iocs",
  "/pricing",
  "/developers",
]);

/**
 * Prefix-cached page families. A family hub is a stable, anonymous, SSR
 * document keyed only by its slug, so it inherits the same 300s edge policy as
 * the catalog roots rather than the Worker serving every crawler hit.
 */
const PUBLIC_PAGE_CACHE_PREFIXES = ["/intelligence/malware/families/"];

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
