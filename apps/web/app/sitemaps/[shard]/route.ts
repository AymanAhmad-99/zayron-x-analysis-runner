import { getApiBaseUrl, getSiteUrl, getSitemapMaxShards } from "../../lib/siteConfig";
import {
  buildUrlset,
  isSitemapPageWithinCap,
  parseSitemapShard,
  SITEMAP_CACHE_CONTROL,
  SITEMAP_PAGE_SIZE,
  SITEMAP_XML_CONTENT_TYPE,
  staticSitemapEntries,
  type SitemapKind,
} from "../../lib/sitemap";

/** Canonical public detail path per content kind. */
function itemPath(kind: SitemapKind, id: string): string {
  const encoded = encodeURIComponent(id);
  if (kind === "vulnerabilities") return `/intelligence/vulnerabilities/${encoded}`;
  if (kind === "malware") return `/malware/intelligence/reports/${encoded}`;
  return `/articles/${encoded}`;
}

interface ShardResponse {
  items?: Array<{ id?: string; updated_at?: string | null }>;
}

function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: { "Content-Type": SITEMAP_XML_CONTENT_TYPE, "Cache-Control": SITEMAP_CACHE_CONTROL },
  });
}

/**
 * Wave 4B — one shard = ONE API page (`O(1)` subrequests, never a scan loop).
 *
 * An invalid shard name is a 404. An API failure is a 503: emitting a valid but
 * empty `<urlset>` would tell crawlers those pages no longer exist.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ shard: string }> },
): Promise<Response> {
  const { shard } = await context.params;
  const parsed = parseSitemapShard(shard);
  if (!parsed) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  if (parsed.kind === "static") {
    return xmlResponse(buildUrlset(staticSitemapEntries(getSiteUrl())));
  }

  // Wave 4C — Free-Tier Survival Mode: a shard outside the configured cap is not
  // part of the published inventory, so it is a 404 (never a 503, and never an
  // empty <urlset> that would read as "these pages were deleted").
  if (!isSitemapPageWithinCap(parsed.page, getSitemapMaxShards())) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  let payload: ShardResponse;
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/sitemap/${parsed.kind}?page=${parsed.page}&limit=${SITEMAP_PAGE_SIZE}`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(3000) },
    );
    if (!response.ok) throw new Error(`sitemap feed returned ${response.status}`);
    payload = (await response.json()) as ShardResponse;
  } catch {
    return new Response("Sitemap feed temporarily unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const entries = (Array.isArray(payload.items) ? payload.items : [])
    .filter((item): item is { id: string; updated_at?: string | null } => typeof item?.id === "string" && item.id.trim() !== "")
    .map((item) => ({
      loc: `${getSiteUrl()}${itemPath(parsed.kind as SitemapKind, item.id)}`,
      // Only a real API timestamp becomes <lastmod>.
      lastmod: item.updated_at ?? null,
    }));

  return xmlResponse(buildUrlset(entries));
}
