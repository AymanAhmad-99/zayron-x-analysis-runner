import { getNewsArticle } from "../../../../lib/news";
import { ogCardResponse } from "../../../../lib/ogCard";

/** PHASE 9B — 1200×630 crisp card with the severity accent bar. */
export const dynamic = "force-dynamic";

const ACCENTS: Record<string, string> = {
  CRITICAL: "#FF3B30",
  HIGH: "#FF5500",
  MEDIUM: "#FFB020",
  INFO: "#8A8A96",
};

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
  const article = result.data;
  const entityPills = article.mentions
    .filter((mention) => mention.in_catalog === 1)
    .slice(0, 3)
    .map((mention) => mention.entity_label)
    .join(" · ");

  return ogCardResponse({
    badge: `${article.category} · ${article.severity}`,
    accentHex: ACCENTS[article.severity] ?? ACCENTS.INFO,
    title: article.title,
    subtitle: entityPills || article.source_name,
    cells: [
      { label: "CATEGORY", value: article.category },
      { label: "SEVERITY", value: article.severity },
      { label: "ENTITIES", value: String(article.mentions.filter((m) => m.in_catalog === 1).length) },
      { label: "PUBLISHED", value: article.published_at.slice(0, 10) },
    ],
    footer: "ZAYRON-X NEWSROOM  ·  TRUTH IS THE PERIMETER.",
    tagline: "TRUTH IS THE PERIMETER.",
  });
}
