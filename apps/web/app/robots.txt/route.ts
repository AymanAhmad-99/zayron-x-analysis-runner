import { getSiteUrl, isPreviewDeployment } from "../lib/siteConfig";
import { robotsText } from "../lib/sitemap";

/**
 * Wave 4B — /robots.txt as a Route Handler (the most reliable form on
 * vinext 1.0.0-beta.8). Preview disallows everything; production allows the
 * site, keeps operator/API surfaces out, and advertises the sitemap index + news sitemap.
 */
export async function GET(request?: Request): Promise<Response> {
  const body = robotsText(isPreviewDeployment(), getSiteUrl());
  const isHead = request?.method?.toUpperCase() === "HEAD";
  const byteLength = new TextEncoder().encode(body).byteLength;
  return new Response(isHead ? null : body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Content-Length": String(byteLength),
    },
  });
}

export async function HEAD(request?: Request): Promise<Response> {
  return GET(request);
}
