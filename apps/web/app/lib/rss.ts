import type { NewsSummary } from "./news";
import { escapeXml } from "./sitemap";

export const RSS_CONTENT_TYPE = "application/rss+xml; charset=utf-8";
export const RSS_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";
export const WEBSUB_HUB_URL = "https://pubsubhubbub.appspot.com/";

function toRfc822(raw: string): string {
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toUTCString() : new Date().toUTCString();
}

export function buildNewsRssXml(items: NewsSummary[], siteUrl: string): string {
  const origin = siteUrl.replace(/\/+$/, "");
  const selfUrl = `${origin}/news/rss.xml`;
  const lastBuild = items[0]?.published_at ? toRfc822(items[0].published_at) : new Date().toUTCString();
  const xmlItems = items
    .map((item) => {
      const link = `${origin}/news/${encodeURIComponent(item.slug)}`;
      const summary = item.verdict || item.summary || item.title;
      return [
        "    <item>",
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${escapeXml(toRfc822(item.published_at))}</pubDate>`,
        `      <category>${escapeXml(item.category)}</category>`,
        `      <description>${escapeXml(summary)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>ZAYRON-X Intelligence Newsroom</title>",
    `    <link>${escapeXml(`${origin}/news`)}</link>`,
    "    <description>Source-verified cybersecurity briefings enriched with NVD, CISA KEV, FIRST EPSS, and ATT&amp;CK telemetry.</description>",
    "    <language>en-us</language>",
    `    <lastBuildDate>${escapeXml(lastBuild)}</lastBuildDate>`,
    `    <atom:link rel="hub" href="${WEBSUB_HUB_URL}" />`,
    `    <atom:link rel="self" href="${escapeXml(selfUrl)}" type="application/rss+xml" />`,
    xmlItems,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
