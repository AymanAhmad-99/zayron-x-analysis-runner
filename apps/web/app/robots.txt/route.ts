import { getSiteUrl, isPreviewDeployment } from "../lib/siteConfig";
import { robotsText } from "../lib/sitemap";

/**
 * Wave 4B — /robots.txt as a Route Handler (the most reliable form on
 * vinext 1.0.0-beta.8). Preview disallows everything; production allows the
 * site, keeps operator/API surfaces out, and advertises the sitemap index.
 */
export async function GET(): Promise<Response> {
  return new Response(robotsText(isPreviewDeployment(), getSiteUrl()), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
