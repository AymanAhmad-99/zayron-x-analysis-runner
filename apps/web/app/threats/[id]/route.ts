/**
 * PHASE 9A — Google Search Console recovery.
 *
 * 3,332 legacy `/threats/evt_*` URLs were retired when the event graph was
 * replaced by the canonical threat graph. They must answer `410 Gone` (not 404,
 * not a redirect) so GSC drops them quickly and stops spending crawl budget.
 */

export const dynamic = "force-static";

const GONE_HEADERS = {
  "X-Robots-Tag": "noindex",
  // A 410 is permanent, so a day of edge caching is safe and stops repeat hits.
  "Cache-Control": "public, max-age=86400",
  "Content-Type": "text/plain; charset=utf-8",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  if (String(id ?? "").startsWith("evt_")) {
    return new Response("This legacy event URL has been permanently retired.", {
      status: 410,
      headers: GONE_HEADERS,
    });
  }
  return new Response("Not found", {
    status: 404,
    headers: { "X-Robots-Tag": "noindex", "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const response = await GET(request, context);
  return new Response(null, { status: response.status, headers: response.headers });
}
