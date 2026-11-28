/**
 * PHASE 14 — LinkedIn Posts API Plug-and-Play Adapter.
 *
 * Publishes executive cyber-defense briefs (<= 2 posts/day) with structured framing:
 *   Headline -> What happened / Who is affected -> Defensive action -> Canonical link + 3 hashtags.
 */
import type { SyndicateEnv, SyndicationItem } from "./types";
import { collapseWhitespace, truncateGraphemes } from "./textUtils";

export const LINKEDIN_POSTS_URL = "https://api.linkedin.com/rest/posts";
export const LINKEDIN_API_VERSION = "202411";
export const LINKEDIN_DAILY_CAP = 2;
const LINKEDIN_MAX_CHARS = 2800;

export interface LinkedInCreds {
  accessToken: string;
  orgUrn: string;
}

export interface LinkedInPublishOutput {
  postId: string;
  postUrl: string | null;
  text: string;
}

export function resolveLinkedInCreds(env: SyndicateEnv): LinkedInCreds | null {
  const accessToken = String(env.LINKEDIN_ACCESS_TOKEN ?? "").trim();
  const orgUrn = String(env.LINKEDIN_ORG_URN ?? env.LINKEDIN_AUTHOR_URN ?? "").trim();
  if (!accessToken || !orgUrn) return null;
  return { accessToken, orgUrn };
}

export function formatLinkedInPost(item: SyndicationItem): string {
  const telemetry: string[] = [`Severity: ${String(item.severity || "HIGH").toUpperCase()}`];
  if (item.isKev || item.itemType === "kev") telemetry.push("CISA KEV: Active Exploitation Confirmed");
  if (item.cvssScore !== null) telemetry.push(`CVSS ${item.cvssScore.toFixed(1)}`);
  if (item.epssScore !== null) telemetry.push(`EPSS ${(item.epssScore * 100).toFixed(1)}%`);

  const defensiveAction = collapseWhitespace(
    item.detectionHint ||
      "Audit exposed assets against verified indicators and prioritize vendor patch deployment.",
  );

  const text = [
    collapseWhitespace(item.title),
    "",
    "What Happened & Who Is Affected",
    collapseWhitespace(item.summary || item.title),
    telemetry.join(" · "),
    "",
    "Defensive Action",
    defensiveAction,
    "",
    `Canonical Technical Dossier: ${item.url}`,
    "",
    "#Cybersecurity #ThreatIntelligence #VulnerabilityManagement",
  ].join("\n");

  return text.length > LINKEDIN_MAX_CHARS ? truncateGraphemes(text, LINKEDIN_MAX_CHARS) : text;
}

export async function publishLinkedInPost(
  item: SyndicationItem,
  creds: LinkedInCreds,
  fetchFn: typeof fetch = fetch,
  postsUrl: string = LINKEDIN_POSTS_URL,
): Promise<LinkedInPublishOutput> {
  const text = formatLinkedInPost(item);
  const res = await fetchFn(postsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Linkedin-Version": LINKEDIN_API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author: creds.orgUrn,
      commentary: text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        article: {
          source: item.url,
          title: truncateGraphemes(item.title, 180),
          description: truncateGraphemes(item.summary || item.title, 250),
        },
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`LinkedIn Posts API HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }

  let postId = String(res.headers.get("x-restli-id") ?? "").trim();
  if (!postId) {
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    postId = String(data?.id ?? "").trim();
  }
  if (!postId) {
    postId = `li-${Date.now()}`;
  }

  return {
    postId,
    postUrl: postId.startsWith("urn:li:")
      ? `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}/`
      : null,
    text,
  };
}
