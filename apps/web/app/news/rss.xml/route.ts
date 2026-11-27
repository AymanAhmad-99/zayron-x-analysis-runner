import { getNewsIndex } from "../../lib/news";
import { buildNewsRssXml, RSS_CACHE_CONTROL, RSS_CONTENT_TYPE } from "../../lib/rss";
import { getSiteUrl } from "../../lib/siteConfig";

export const revalidate = 300;

export async function GET(request?: Request): Promise<Response> {
  const isHead = request?.method?.toUpperCase() === "HEAD";
  const result = await getNewsIndex({ limit: 30 });
  if (result.state !== "ok") {
    return new Response(isHead ? null : "RSS feed temporarily unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const xml = buildNewsRssXml(result.data?.items ?? [], getSiteUrl());
  const byteLength = new TextEncoder().encode(xml).byteLength;
  return new Response(isHead ? null : xml, {
    status: 200,
    headers: {
      "Content-Type": RSS_CONTENT_TYPE,
      "Cache-Control": RSS_CACHE_CONTROL,
      "Content-Length": String(byteLength),
    },
  });
}

export async function HEAD(request?: Request): Promise<Response> {
  return GET(request);
}
