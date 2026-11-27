import { getSiteUrl } from "../../lib/siteConfig";
import { getNewsIndex } from "../../lib/news";
import { buildNewsSitemap, isNewsSitemapFresh } from "../../lib/sitemap";
import { serveXmlWithEdgeCache } from "../../lib/sitemapCache";

/**
 * PHASE 9B — Google News sitemap.
 *
 * Only briefings published in the last 48 hours are listed; the archive lives in
 * the standard sitemap. An API failure is a 503, never a valid-but-empty feed
 * (which would read as "these stories were retracted").
 */
export const revalidate = 300;

export async function GET(request?: Request): Promise<Response> {
  return serveXmlWithEdgeCache(request, async () => {
    const result = await getNewsIndex({ limit: 50 });
    if (result.state !== "ok") {
      return { status: 503, body: "News sitemap feed temporarily unavailable" };
    }
    const site = getSiteUrl();
    const entries = (result.data?.items ?? [])
      .filter((item) => isNewsSitemapFresh(item.published_at))
      .map((item) => ({
        loc: `${site}/news/${item.slug}`,
        title: item.title,
        publishedAt: item.published_at,
        sourceName: item.source_name,
      }));
    return { status: 200, body: buildNewsSitemap(entries, site) };
  });
}

export async function HEAD(request?: Request): Promise<Response> {
  return GET(request);
}
