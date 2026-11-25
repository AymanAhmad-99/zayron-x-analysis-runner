/**
 * Wave 4B — sitemap/robots XML builders (pure).
 *
 * Kept free of React/Workers imports so the XML contract, the shard-name
 * validation and the robots policy are unit testable in plain bun.
 *
 * Shard naming:
 *   sitemaps/static.xml
 *   sitemaps/vulnerabilities-<n>.xml | malware-<n>.xml | articles-<n>.xml   (n >= 1)
 */

export const SITEMAP_PAGE_SIZE = 2000;

/**
 * Kinds this app can actually SERVE a page for.
 *
 * `articles` exists in the API feed but `apps/web` has no `/articles/*` route,
 * so listing article shards would feed Googlebot guaranteed 404 URLs. The API
 * keeps the kind; the web sitemap deliberately does not advertise it.
 */
export const SITEMAP_KINDS = ["vulnerabilities", "malware"] as const;
export type SitemapKind = (typeof SITEMAP_KINDS)[number];

/** Kinds the backend can enumerate, for reference/documentation only. */
export const BACKEND_SITEMAP_KINDS = ["vulnerabilities", "malware", "articles"] as const;

/** Public pages that always exist and are NOT placeholder surfaces. */
export const STATIC_PATHS = [
  "/",
  "/intelligence",
  "/intelligence/vulnerabilities",
  "/intelligence/malware",
  "/intelligence/exploits",
  "/intelligence/actors",
  "/intelligence/campaigns",
  "/intelligence/iocs",
  "/search",
  // Institutional surfaces (Phase 6). `/ai-policy` and the legacy `/legal/*`
  // aliases are permanently redirected, so they are never advertised here.
  "/pricing",
  "/developers",
  "/about",
  "/methodology",
  "/signal-index",
  "/malware-handling",
  "/security",
  "/privacy",
  "/cookies",
  "/legal",
  "/company/trust",
  "/company/contact",
  "/company/careers",
] as const;

/**
 * Never listed: /news, /research, /intelligence/graph (placeholder surfaces,
 * explicitly noindex) and /intelligence/relationships (no public nav entry).
 */
export const EXCLUDED_PATHS = [
  "/news",
  "/research",
  "/intelligence/graph",
  "/intelligence/relationships",
] as const;

// Not a path exclusion: `/articles/*` is excluded structurally — the route does
// not exist, so no article shard is ever advertised (see SITEMAP_KINDS).

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export type ParsedShard = { kind: "static" } | { kind: SitemapKind; page: number };

/**
 * `static.xml`, `vulnerabilities-3.xml`, `malware-1.xml`. Anything else —
 * including `articles-1.xml`, which has no route behind it — is invalid (⇒ 404).
 */
export function parseSitemapShard(raw: string): ParsedShard | null {
  const shard = decodeURIComponent(raw).trim();
  if (shard === "static.xml") return { kind: "static" };
  const match = /^(vulnerabilities|malware)-([1-9]\d*)\.xml$/.exec(shard);
  if (!match) return null;
  const page = Number(match[2]);
  if (!Number.isSafeInteger(page) || page < 1) return null;
  return { kind: match[1] as SitemapKind, page };
}

export interface SitemapEntry {
  loc: string;
  /** Only ever a real API `updated_at`; omitted when the source had none. */
  lastmod?: string | null;
}

export function buildUrlset(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildSitemapIndex(entries: SitemapEntry[]): string {
  const sitemaps = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "";
      return `  <sitemap>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </sitemap>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps}\n</sitemapindex>\n`;
}

/** `static.xml` always exists, so the index is never empty (API outage ⇒ 1 entry). */
export function buildSitemapIndexEntries(
  siteUrl: string,
  shards: Partial<Record<SitemapKind, number>> | null,
): SitemapEntry[] {
  const entries: SitemapEntry[] = [{ loc: `${siteUrl}/sitemaps/static.xml` }];
  if (!shards) return entries;
  for (const kind of SITEMAP_KINDS) {
    const count = Math.max(0, Math.floor(Number(shards[kind] ?? 0)));
    for (let page = 1; page <= count; page += 1) {
      entries.push({ loc: `${siteUrl}/sitemaps/${kind}-${page}.xml` });
    }
  }
  return entries;
}

/**
 * Wave 4C — Free-Tier Survival Mode cap.
 *
 * `maxShardsPerKind === null` is the uncapped default (every shard the API
 * reports). A positive integer caps each dynamic kind independently, so
 * `vulnerabilities: 5, malware: 3` with a cap of 1 becomes `1 / 1`.
 */
export function capSitemapShardCounts(
  shards: Partial<Record<SitemapKind, number>> | null,
  maxShardsPerKind: number | null,
): Partial<Record<SitemapKind, number>> | null {
  if (!shards) return null;
  const capped: Partial<Record<SitemapKind, number>> = {};
  for (const kind of SITEMAP_KINDS) {
    const count = Math.max(0, Math.floor(Number(shards[kind] ?? 0)));
    capped[kind] = maxShardsPerKind === null ? count : Math.min(count, maxShardsPerKind);
  }
  return capped;
}

/** A shard page beyond the configured cap does not exist (⇒ 404), never 503. */
export function isSitemapPageWithinCap(page: number, maxShardsPerKind: number | null): boolean {
  return maxShardsPerKind === null || page <= maxShardsPerKind;
}

export function staticSitemapEntries(siteUrl: string): SitemapEntry[] {
  return STATIC_PATHS.map((path) => ({ loc: `${siteUrl}${path}` }));
}

/**
 * Crawlers that must be able to read the site AND every brand asset. A crawler
 * that cannot fetch `/favicon.ico` renders no site icon in the SERP.
 *
 * These groups are declared explicitly (not inherited from `User-agent: *`) so a
 * Cloudflare edge-managed robots block — which prepends its own `User-agent: *`
 * group — can never narrow what Googlebot or Bingbot is allowed to fetch: once a
 * bot has its own group, only that group applies to it.
 */
export const NAMED_CRAWLERS = ["Googlebot", "Googlebot-Image", "Bingbot"] as const;

/** Icon and manifest paths that must stay fetchable for every crawler. */
export const CRAWLABLE_ASSET_PATHS = [
  "/favicon.ico",
  "/favicon-48x48.png",
  "/favicon-96x96.png",
  "/apple-touch-icon.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/site.webmanifest",
] as const;

/** Preview is never indexed; production allows the site and advertises the index. */
export function robotsText(isPreview: boolean, siteUrl: string): string {
  if (isPreview) return "User-agent: *\nDisallow: /\n";
  const operators = ["Disallow: /api/", "Disallow: /admin/", "Disallow: /search?*"];
  const lines = ["User-agent: *", "Allow: /", ...operators];
  for (const crawler of NAMED_CRAWLERS) {
    lines.push("", `User-agent: ${crawler}`, "Allow: /", ...CRAWLABLE_ASSET_PATHS.map((p) => `Allow: ${p}`), ...operators);
  }
  lines.push("", `Sitemap: ${siteUrl}/sitemap.xml`, "");
  return lines.join("\n");
}

export const SITEMAP_XML_CONTENT_TYPE = "application/xml; charset=utf-8";
export const SITEMAP_CACHE_CONTROL = "public, max-age=300, s-maxage=3600";
