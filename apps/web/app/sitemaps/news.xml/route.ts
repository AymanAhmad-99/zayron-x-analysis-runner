import { getSiteUrl } from "../../lib/siteConfig";
import { getNewsIndex } from "../../lib/news";
import {
  buildNewsSitemap,
  isNewsSitemapFresh,
  SITEMAP_CACHE_CONTROL,
  SITEMAP_XML_CONTENT_TYPE,
} from "../../lib/sitemap";

/**
 * PHASE 9B — Google News sitemap.
 *
 * Only briefings published in the last 48 hours are listed; the archive lives in
 * the standard sitemap. An API failure is a 503, never a valid-but-empty feed
 * (which would read as "these stories were retracted").
 */
export const revalidate = 300;

export async function GET(): Promise<Response> {
  const result = await getNewsIndex({ limit: 50 });
  if (result.state !== "ok") {
    return new Response("News sitemap feed temporarily unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
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
  return new Response(buildNewsSitemap(entries, site), {
    headers: {
      "Content-Type": SITEMAP_XML_CONTENT_TYPE,
      "Cache-Control": SITEMAP_CACHE_CONTROL,
    },
  });
}
