import { apiFetch, getApiBaseUrl, getSiteUrl, getSitemapMaxShards } from "../lib/siteConfig";
import {
  buildSitemapIndex,
  buildSitemapIndexEntries,
  capSitemapShardCounts,
  type SitemapKind,
} from "../lib/sitemap";
import { serveXmlWithEdgeCache } from "../lib/sitemapCache";

export const revalidate = 300;

/**
 * Wave 4B — /sitemap.xml (index).
 *
 * Lists `sitemaps/static.xml` plus one entry per existing shard. If the API is
 * unreachable the index degrades to `static.xml` + `news.xml` only: a sitemap
 * must never 500, and it must never advertise shards that cannot be served.
 */
async function fetchShardCounts(): Promise<Partial<Record<SitemapKind, number>> | null> {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/sitemap/manifest`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { shards?: Partial<Record<SitemapKind, number>> };
    return payload.shards ?? null;
  } catch {
    return null;
  }
}

export async function GET(request?: Request): Promise<Response> {
  return serveXmlWithEdgeCache(request, async () => {
    const shards = capSitemapShardCounts(await fetchShardCounts(), getSitemapMaxShards());
    const xml = buildSitemapIndex(buildSitemapIndexEntries(getSiteUrl(), shards));
    return { status: 200, body: xml };
  });
}

export async function HEAD(request?: Request): Promise<Response> {
  return GET(request);
}
