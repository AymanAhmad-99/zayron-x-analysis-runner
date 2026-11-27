import { SITEMAP_CACHE_CONTROL, SITEMAP_XML_CONTENT_TYPE } from "./sitemap";

/**
 * PHASE 9C — Cloudflare edge cache shield for XML sitemaps.
 *
 * Uses `caches.default` when running in the Cloudflare Workers runtime so warm
 * Googlebot `GET` and `HEAD` requests answer in <30ms instead of re-running
 * multi-endpoint D1 fan-outs on every crawl. Fails open when `caches` is
 * absent (local Node/Bun tests).
 */
export async function serveXmlWithEdgeCache(
  request: Request | undefined,
  buildXml: () => Promise<{ status: number; body: string }>,
): Promise<Response> {
  const isHead = request?.method?.toUpperCase() === "HEAD";
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  const cacheKey = request?.url ? new Request(request.url, { method: "GET" }) : null;

  if (cache && cacheKey) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit && hit.status === 200) {
        const headers = new Headers(hit.headers);
        if (isHead) return new Response(null, { status: 200, headers });
        return new Response(hit.body, { status: 200, headers });
      }
    } catch {
      /* ignore cache read failure */
    }
  }

  const built = await buildXml();
  if (built.status !== 200) {
    return new Response(isHead ? null : built.body, {
      status: built.status,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const cleanXml = built.body.replace(/^\uFEFF/, "").trimStart();
  const byteLength = new TextEncoder().encode(cleanXml).byteLength;
  const headers = new Headers({
    "Content-Type": SITEMAP_XML_CONTENT_TYPE,
    "Cache-Control": SITEMAP_CACHE_CONTROL,
    "Content-Length": String(byteLength),
  });

  if (cache && cacheKey) {
    try {
      await cache.put(cacheKey, new Response(cleanXml, { status: 200, headers: new Headers(headers) }));
    } catch {
      /* ignore cache write failure */
    }
  }

  return new Response(isHead ? null : cleanXml, { status: 200, headers });
}
