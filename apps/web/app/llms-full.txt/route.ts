import { apiFetch, getApiBaseUrl, getSiteUrl } from "../lib/siteConfig";

/**
 * PHASE 9B — `/llms-full.txt`: a compact RAG digest of the newest briefings.
 * 503 (never an empty 200) when the live digest cannot be produced.
 */
export const revalidate = 300;

export async function GET(): Promise<Response> {
  try {
    const response = await apiFetch(`${getApiBaseUrl()}/llms-full.txt`, {
      headers: { accept: "text/plain" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`llms-full returned ${response.status}`);
    const body = await response.text();
    if (!body.trim()) throw new Error("llms-full payload was empty");
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
        "x-llms-source": "live",
      },
    });
  } catch {
    return new Response(`# ZAYRON-X — intelligence digest temporarily unavailable\n\nLive digest generation failed. Canonical index: ${getSiteUrl()}/llms.txt\n`, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
