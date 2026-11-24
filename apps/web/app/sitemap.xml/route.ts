import { apiFetch, getApiBaseUrl, getSiteUrl, getSitemapMaxShards } from "../lib/siteConfig";
import {
  buildSitemapIndex,
  buildSitemapIndexEntries,
  capSitemapShardCounts,
  SITEMAP_CACHE_CONTROL,
  SITEMAP_XML_CONTENT_TYPE,
  type SitemapKind,
} from "../lib/sitemap";

/**
 * Wave 4B — /sitemap.xml (index).
 *
 * Lists `sitemaps/static.xml` plus one entry per existing shard. If the API is
 * unreachable the index degrades to `static.xml` only: a sitemap must never
 * 500, and it must never advertise shards that cannot be served.
 *
 * Wave 4C — the advertised shard count is capped by `SITEMAP_MAX_SHARDS` under
 * Free-Tier Survival Mode, so a crawler cannot walk an unbounded inventory of
 * D1 page reads. Unset/`0` restores the full inventory with no code change.
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

export async function GET(): Promise<Response> {
  const shards = capSitemapShardCounts(await fetchShardCounts(), getSitemapMaxShards());
  const xml = buildSitemapIndex(buildSitemapIndexEntries(getSiteUrl(), shards));
  return new Response(xml, {
    headers: {
      "Content-Type": SITEMAP_XML_CONTENT_TYPE,
      "Cache-Control": SITEMAP_CACHE_CONTROL,
    },
  });
}
