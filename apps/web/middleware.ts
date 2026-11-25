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

export function middleware(request: NextRequest): NextResponse {
  const host = (request.headers.get("host") ?? "").split(":")[0].trim().toLowerCase();
  if (!REDIRECT_HOSTS.has(host)) return NextResponse.next();

  const url = new URL(request.url);
  const target = new URL(`https://${CANONICAL_HOST}${url.pathname}`);
  target.search = url.search;
  return NextResponse.redirect(target, 301);
}

export const config = {
  // Every path on the www host is canonicalised, assets included: a crawler must
  // never record two indexable origins for the same document.
  matcher: "/:path*",
};
