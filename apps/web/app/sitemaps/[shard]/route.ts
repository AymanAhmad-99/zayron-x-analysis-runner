import { apiFetch, getApiBaseUrl, getSiteUrl, getSitemapMaxShards } from "../../lib/siteConfig";
import { getIocFamilies, getSupplyChainDossiers } from "../../lib/api";
import { getCampaigns, getThreatActors } from "../../lib/threatGraph";
import { getTechniques } from "../../lib/techniques";
import { getNewsIndex } from "../../lib/news";
import { getRegions, getVendors } from "../../lib/hubs";
import { familyHubPath } from "../../lib/iocSeo";
import {
  buildUrlset,
  isSitemapPageWithinCap,
  parseSitemapShard,
  SITEMAP_PAGE_SIZE,
  staticSitemapEntries,
  type SitemapKind,
} from "../../lib/sitemap";
import { serveXmlWithEdgeCache } from "../../lib/sitemapCache";

export const revalidate = 300;

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

/**
 * Wave 4B — one shard = ONE API page (`O(1)` subrequests, never a scan loop).
 * PHASE 9C — static & malware hub fan-outs run in `Promise.all` and are
 * cached at the edge via `serveXmlWithEdgeCache` so warm TTFB is <30ms.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ shard: string }> },
): Promise<Response> {
  const { shard } = await context.params;
  const parsed = parseSitemapShard(shard);
  if (!parsed) {
    return new Response(request.method.toUpperCase() === "HEAD" ? null : "Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  if (parsed.kind !== "static" && !isSitemapPageWithinCap(parsed.page, getSitemapMaxShards())) {
    return new Response(request.method.toUpperCase() === "HEAD" ? null : "Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return serveXmlWithEdgeCache(request, async () => {
    const site = getSiteUrl();

    if (parsed.kind === "static") {
      const [
        families,
        actors,
        campaignIndex,
        techniqueIndex,
        newsIndex,
        vendorIndex,
        regionIndex,
      ] = await Promise.all([
        getIocFamilies(),
        getThreatActors({ limit: 200 }),
        getCampaigns({ limit: 100 }),
        getTechniques({ limit: 250 }),
        getNewsIndex({ limit: 50 }),
        getVendors(),
        getRegions(),
      ]);

      // PHASE 12-EXECUTE — fail closed on upstream outage: never serve a gutted 200 OK static.xml
      if (
        families.state === "error" || !families.data ||
        actors.state === "error" || !actors.data ||
        campaignIndex.state === "error" || !campaignIndex.data ||
        techniqueIndex.state === "error" || !techniqueIndex.data ||
        newsIndex.state === "error" || !newsIndex.data ||
        vendorIndex.state === "error" || !vendorIndex.data ||
        regionIndex.state === "error" || !regionIndex.data
      ) {
        return { status: 503, body: "Sitemap feed temporarily unavailable" };
      }

      const familyEntries = (families.data ?? []).map((entry) => ({ loc: `${site}${familyHubPath(entry.slug)}` }));
      const actorEntries = (actors.data?.items ?? [])
        .filter((actor) => (actor.linked_cve_count ?? actor.documented_cves?.length ?? 0) >= 1 || (actor.live_c2_count ?? 0) >= 1)
        .map((actor) => ({
          loc: `${site}/intelligence/threat-actors/${encodeURIComponent(actor.slug)}`,
        }));
      const campaignEntries = (campaignIndex.data?.items ?? [])
        .filter((campaign) => (campaign.cves?.length ?? 0) >= 1 || (campaign.linked_kev_count ?? 0) >= 1 || campaign.activity_tier === "LIVE_OBSERVED")
        .map((campaign) => ({
          loc: `${site}/intelligence/campaigns/${encodeURIComponent(campaign.slug)}`,
        }));
      const techniqueEntries = (techniqueIndex.data?.items ?? [])
        .filter((technique) => (technique.entity_count ?? 0) >= 2 || ((technique.actor_count ?? 0) + (technique.campaign_count ?? 0)) >= 2)
        .map((technique) => ({
          loc: `${site}/intelligence/techniques/${encodeURIComponent(technique.id)}`,
          priority: "0.7",
          changefreq: "weekly",
        }));
      const newsEntries = (newsIndex.data?.items ?? []).map((briefing) => ({
        loc: `${site}/news/${encodeURIComponent(briefing.slug)}`,
        lastmod: briefing.published_at ?? null,
        priority: "0.9",
        changefreq: "daily",
      }));
      const vendorEntries = (vendorIndex.data?.items ?? [])
        .filter((vendor) => (vendor.verified_cves ?? 0) >= 3 || (vendor.kev_count ?? 0) >= 1 || (vendor.poc_count ?? 0) >= 1)
        .map((vendor) => ({
          loc: `${site}/intelligence/vendors/${encodeURIComponent(vendor.slug)}`,
          priority: "0.7",
          changefreq: "daily",
        }));
      const regionEntries = (regionIndex.data?.items ?? []).map((region) => ({
        loc: `${site}/intelligence/regions/${encodeURIComponent(region.code)}`,
        priority: "0.7",
        changefreq: "daily",
      }));

      return {
        status: 200,
        body: buildUrlset([
          ...staticSitemapEntries(site),
          ...familyEntries,
          ...actorEntries,
          ...campaignEntries,
          ...techniqueEntries,
          ...newsEntries,
          ...vendorEntries,
          ...regionEntries,
        ]),
      };
    }

    const hubEntries: Array<{ loc: string; lastmod?: string | null }> = [];
    const shardFetchPromise = apiFetch(
      `${getApiBaseUrl()}/sitemap/${parsed.kind}?page=${parsed.page}&limit=${SITEMAP_PAGE_SIZE}`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) },
    );

    const [response, familyIndex, advisories] = await Promise.all([
      shardFetchPromise,
      parsed.kind === "malware" ? getIocFamilies() : Promise.resolve({ data: null }),
      parsed.kind === "malware" ? getSupplyChainDossiers(30) : Promise.resolve({ data: null }),
    ]);

    if (parsed.kind === "malware") {
      for (const family of familyIndex.data ?? []) {
        hubEntries.push({ loc: `${site}${familyHubPath(family.slug)}`, lastmod: family.last_seen ?? null });
      }
      for (const dossier of advisories.data ?? []) {
        hubEntries.push({
          loc: `${site}/intelligence/malware/advisories/${encodeURIComponent(dossier.report_id)}`,
          lastmod: dossier.published_at ?? null,
        });
      }
    }

    let payload: ShardResponse;
    try {
      if (!response.ok) throw new Error(`sitemap feed returned ${response.status}`);
      payload = (await response.json()) as ShardResponse;
    } catch {
      return { status: 503, body: "Sitemap feed temporarily unavailable" };
    }

    const entries = (Array.isArray(payload.items) ? payload.items : [])
      .filter((item): item is { id: string; updated_at?: string | null } => typeof item?.id === "string" && item.id.trim() !== "")
      .map((item) => ({
        loc: `${site}${itemPath(parsed.kind as SitemapKind, item.id)}`,
        lastmod: item.updated_at ?? null,
      }));

    return { status: 200, body: buildUrlset([...entries, ...hubEntries]) };
  });
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ shard: string }> },
): Promise<Response> {
  return GET(request, context);
}
