import { getNewsArticle } from "../../../../lib/news";
import { newsCoverResponse, newsCoverSpecFromArticle } from "../../../../lib/newsCover";

/**
 * PHASE 10A — `/api/news-cover/[slug]`.
 *
 * A branded 1200×675 PNG cover for every published briefing, rendered from the
 * article's own metadata. Deterministic (seeded by slug) and cacheable: the
 * response carries `Cache-Control: public, max-age=86400, s-maxage=604800`, so a
 * social crawler, a card grid and a detail hero all receive the same object.
 */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { slug } = await params;
  const result = await getNewsArticle(decodeURIComponent(slug));
  if (result.state !== "ok" || !result.data) {
    return new Response("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  return newsCoverResponse(newsCoverSpecFromArticle(result.data));
}
