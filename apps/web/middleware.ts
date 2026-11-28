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

const PAGINATED_HUB_PATHS = new Set([
  "/intelligence/vulnerabilities",
  "/intelligence/vendors",
  "/intelligence/techniques",
]);

/**
 * Phase 6 + Phase 12 — permanent path consolidation.
 *
 * Institutional documents moved to canonical top-level routes, legacy actor/trust
 * aliases consolidated onto canonical routes, and single-segment malware report
 * aliases permanently redirect to `/malware/intelligence/reports/:id`.
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
  "/company/trust": "/security",
  "/intelligence/actors": "/intelligence/threat-actors",
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
  "connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com https://zayron-x.co https://www.zayron-x.co",
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

const CANONICAL_CVE_DETAIL_RE = /^(\/intelligence\/vulnerabilities\/)(cve-\d{4}-\d{4,19})$/i;

function applyNonProdRobots(response: NextResponse, host: string): NextResponse {
  if (host !== "" && host !== CANONICAL_HOST) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

/**
 * PHASE 12-EXECUTE — safe response header pass.
 *
 * Pre-route `NextResponse.next()` no longer stamps `Cache-Control: public, s-maxage=300`
 * before the page executes (which previously poisoned CDN cache with 404s and collided
 * with ISR `no-store` routes). Cacheability for verified 200 OK routes is emitted by
 * `next.config.ts` (for guaranteed static routes) and per-route `revalidate = 300`.
 */
function withPageCache(response: NextResponse, url: URL, host: string): NextResponse {
  if (host !== "" && host !== CANONICAL_HOST) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  const path = normalizePath(url.pathname);
  if (path === "/52217d0bead0f27974ed75fe089329e2.txt") {
    response.headers.set("Content-Type", "text/plain; charset=utf-8");
    response.headers.set("Cache-Control", "public, max-age=86400");
    return response;
  }

  // Keep `?view=wire` (and filtered query views on `/news`, `/intelligence/vulnerabilities?q=`,
  // or `/intelligence/iocs?q=`) out of the shared edge cache so `noindex, follow` never leaks.
  if (path === "/news" && url.search.length > 0) {
    if (url.searchParams.get("view") === "wire") {
      response.headers.set("X-Robots-Tag", "noindex, follow");
    }
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (path === "/intelligence/vulnerabilities" && (url.searchParams.has("q") || url.searchParams.has("severity"))) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (path === "/intelligence/iocs" && (url.searchParams.get("q") ?? "").trim().length > 0) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  return response;
}

function legacyGoneResponse(request: NextRequest): NextResponse {
  const isHead = request.method.toUpperCase() === "HEAD";
  const response = new NextResponse(
    isHead ? null : "This legacy ZAYRON-X intelligence path has been permanently retired.",
    {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
  return harden(response);
}

function legacyRedirectPath(pathname: string): string | null {
  const normalized = normalizePath(pathname);
  const direct = PATH_REDIRECTS[normalized] ?? PATH_REDIRECTS[normalized.toLowerCase()];
  if (direct) return direct;
  if (normalized === "/actors") return "/intelligence/threat-actors";
  if (normalized.startsWith("/actors/")) {
    return `/intelligence/threat-actors${normalized.slice("/actors".length)}`;
  }
  if (normalized.startsWith("/intelligence/actors/")) {
    return `/intelligence/threat-actors${normalized.slice("/intelligence/actors".length)}`;
  }
  if (normalized === "/vulnerabilities") return "/intelligence/vulnerabilities";
  if (normalized.startsWith("/vulnerabilities/")) {
    return `/intelligence/vulnerabilities${normalized.slice("/vulnerabilities".length)}`;
  }
  if (normalized.startsWith("/intelligence/malware/")) {
    const rest = normalized.slice("/intelligence/malware/".length);
    const firstSeg = rest.split("/")[0]?.toLowerCase() ?? "";
    if (firstSeg && firstSeg !== "advisories" && firstSeg !== "families") {
      return `/malware/intelligence/reports/${rest}`;
    }
  }
  return null;
}

function canonicalCvePath(pathname: string): string {
  const match = CANONICAL_CVE_DETAIL_RE.exec(pathname);
  if (!match) return pathname;
  return `${match[1]}${match[2].toUpperCase()}`;
}

export function middleware(request: NextRequest): NextResponse {
  const url = new URL(request.url);
  const headerHost = (request.headers.get("host") ?? "").split(":")[0].trim().toLowerCase();
  const host = headerHost || url.hostname.trim().toLowerCase();
  const normalized = normalizePath(url.pathname);
  const lowerPath = normalized.toLowerCase();

  // Purge 3,332 retired /threats/* event URLs, dead /intelligence/intel_* URLs, and Kill List zombies.
  if (
    lowerPath === "/threats" ||
    lowerPath.startsWith("/threats/") ||
    lowerPath.startsWith("/intelligence/intel_") ||
    lowerPath === "/research" ||
    lowerPath.startsWith("/research/") ||
    lowerPath === "/intelligence/graph" ||
    lowerPath.startsWith("/intelligence/graph/") ||
    lowerPath === "/intelligence/relationships" ||
    lowerPath.startsWith("/intelligence/relationships/")
  ) {
    return legacyGoneResponse(request);
  }

  const destination = legacyRedirectPath(url.pathname);
  let resolvedPath = canonicalCvePath(destination ?? normalized);
  const skipTrailingSlashRedirect = url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/");
  const pathChanged = skipTrailingSlashRedirect
    ? Boolean(destination)
    : resolvedPath !== url.pathname;

  const nextSearchParams = new URLSearchParams(url.searchParams);
  let queryChanged = false;
  if (PAGINATED_HUB_PATHS.has(resolvedPath) && nextSearchParams.has("page")) {
    const rawPage = (nextSearchParams.get("page") ?? "").trim();
    if (/^(?:0+|0*1)$/.test(rawPage)) {
      nextSearchParams.delete("page");
      queryChanged = true;
    }
  }

  if (REDIRECT_HOSTS.has(host) || pathChanged || queryChanged) {
    const canonicalOrigin =
      REDIRECT_HOSTS.has(host) || host === CANONICAL_HOST || host === ""
        ? `https://${CANONICAL_HOST}`
        : url.origin;
    const target = new URL(resolvedPath, canonicalOrigin);
    const searchStr = nextSearchParams.toString();
    target.search = searchStr ? `?${searchStr}` : "";
    const redirectResponse = harden(NextResponse.redirect(target, 301));
    return REDIRECT_HOSTS.has(host) ? redirectResponse : applyNonProdRobots(redirectResponse, host);
  }

  return withPageCache(harden(NextResponse.next()), url, host);
}

export const config = {
  // Every path on the www host is canonicalised, assets included: a crawler must
  // never record two indexable origins for the same document.
  matcher: "/:path*",
};
