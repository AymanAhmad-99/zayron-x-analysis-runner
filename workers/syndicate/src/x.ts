/**
 * PHASE 14 — X (Twitter API v2) Plug-and-Play Adapter.
 *
 * Uses native Web Crypto HMAC-SHA1 OAuth 1.0a signing (zero npm deps).
 * Enforces 2-tweet threads:
 *   1) Main tweet: hook + defensive impact, <= 280 chars, 1–2 hashtags, ZERO external URL.
 *   2) Self-reply: canonical zayron-x.co dossier URL + detection/remediation context.
 */
import type { SyndicateEnv, SyndicationItem } from "./types";
import {
  collapseWhitespace,
  graphemeLength,
  selectHashtags,
  stripUrls,
  truncateGraphemes,
} from "./textUtils";

export const X_TWEETS_URL = "https://api.x.com/2/tweets";
export const X_MAX_CHARS = 280;
export const X_DAILY_CAP = 5;

export interface XOAuth1Creds {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface XThreadPayload {
  mainTweet: string;
  replyTweet: string;
}

export interface XPublishOutput {
  tweetId: string;
  replyId: string | null;
  tweetUrl: string;
  thread: XThreadPayload;
}

export function resolveXCreds(env: SyndicateEnv): XOAuth1Creds | null {
  const apiKey = String(env.X_API_KEY ?? "").trim();
  const apiSecret = String(env.X_API_SECRET ?? "").trim();
  const accessToken = String(env.X_ACCESS_TOKEN ?? "").trim();
  const accessSecret = String(env.X_ACCESS_SECRET ?? env.X_ACCESS_TOKEN_SECRET ?? "").trim();
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null;
  return { apiKey, apiSecret, accessToken, accessSecret };
}

/** RFC 3986 percent-encoding required for OAuth 1.0a base strings. */
export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Pure Web Crypto HMAC-SHA1 OAuth 1.0a Authorization header builder. */
export async function buildOAuth1AuthorizationHeader(input: {
  method: string;
  url: string;
  creds: XOAuth1Creds;
  nonce?: string;
  timestamp?: string;
}): Promise<string> {
  const parsed = new URL(input.url);
  const baseUrl = `${parsed.origin}${parsed.pathname}`;
  const nonce =
    input.nonce ??
    Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const timestamp = input.timestamp ?? String(Math.floor(Date.now() / 1000));

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: input.creds.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: input.creds.accessToken,
    oauth_version: "1.0",
  };

  const pairs: Array<[string, string]> = Object.entries(oauthParams).map(([k, v]) => [
    percentEncode(k),
    percentEncode(v),
  ]);
  parsed.searchParams.forEach((v, k) => {
    pairs.push([percentEncode(k), percentEncode(v)]);
  });
  pairs.sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : a[0] < b[0] ? -1 : 1));

  const paramString = pairs.map(([k, v]) => `${k}=${v}`).join("&");
  const signatureBase = `${input.method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(input.creds.apiSecret)}&${percentEncode(input.creds.accessSecret)}`;

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(signatureBase));
  const sigBytes = new Uint8Array(sigBuffer);
  let binary = "";
  for (let i = 0; i < sigBytes.byteLength; i++) {
    binary += String.fromCharCode(sigBytes[i]);
  }
  const signature = btoa(binary);

  const headerPairs = Object.entries({ ...oauthParams, oauth_signature: signature })
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`);

  return `OAuth ${headerPairs.join(", ")}`;
}

/** Format 2-tweet thread: Main tweet has ZERO external URLs; reply tweet delivers canonical URL + telemetry. */
export function formatXThread(item: SyndicationItem): XThreadPayload {
  const tags = selectHashtags(item, 2);
  const tagSuffix = tags.map((tag) => `#${tag}`).join(" ");
  const cleanTitle = stripUrls(item.title);
  const cleanSummary = stripUrls(item.summary);
  const badge = item.isKev || item.itemType === "kev" ? "CISA KEV Advisory:" : `${String(item.severity || "HIGH").toUpperCase()}:`;

  const bodyCandidate =
    cleanSummary && cleanSummary.toLowerCase() !== cleanTitle.toLowerCase()
      ? `${badge} ${cleanTitle} — ${cleanSummary}`
      : `${badge} ${cleanTitle}`;

  const footer = `\n\n${tagSuffix}`;
  const mainBudget = X_MAX_CHARS - graphemeLength(footer);
  const mainBody = truncateGraphemes(bodyCandidate, Math.max(40, mainBudget));
  const mainTweet = truncateGraphemes(`${mainBody}${footer}`, X_MAX_CHARS);

  const telemetryParts: string[] = [];
  if (item.cvssScore !== null) telemetryParts.push(`CVSS ${item.cvssScore.toFixed(1)}`);
  if (item.epssScore !== null) telemetryParts.push(`EPSS ${(item.epssScore * 100).toFixed(1)}%`);
  if (item.detectionHint) telemetryParts.push(collapseWhitespace(stripUrls(item.detectionHint)));
  const telemetryNote =
    telemetryParts.length > 0
      ? telemetryParts.join(" · ")
      : "Verified dossier, remediation & detection telemetry:";

  const url = String(item.url ?? "").trim();
  const replySuffix = `\n\n${url}`;
  const replyBudget = X_MAX_CHARS - graphemeLength(replySuffix);
  const replyTweet =
    replyBudget >= 24
      ? `${truncateGraphemes(telemetryNote, replyBudget)}${replySuffix}`
      : truncateGraphemes(url, X_MAX_CHARS);

  return { mainTweet, replyTweet };
}

async function postSingleTweet(
  body: Record<string, unknown>,
  creds: XOAuth1Creds,
  fetchFn: typeof fetch,
  tweetsUrl: string,
): Promise<string> {
  const authorization = await buildOAuth1AuthorizationHeader({
    method: "POST",
    url: tweetsUrl,
    creds,
  });

  const res = await fetchFn(tweetsUrl, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`X API HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }

  const data = (await res.json()) as { data?: { id?: string } };
  const id = data?.data?.id;
  if (!id) throw new Error("X API response missing data.id");
  return id;
}

export async function publishXThread(
  item: SyndicationItem,
  creds: XOAuth1Creds,
  fetchFn: typeof fetch = fetch,
  tweetsUrl: string = X_TWEETS_URL,
): Promise<XPublishOutput> {
  const thread = formatXThread(item);
  const tweetId = await postSingleTweet({ text: thread.mainTweet }, creds, fetchFn, tweetsUrl);
  let replyId: string | null = null;
  try {
    replyId = await postSingleTweet(
      { text: thread.replyTweet, reply: { in_reply_to_tweet_id: tweetId } },
      creds,
      fetchFn,
      tweetsUrl,
    );
  } catch {
    replyId = null;
  }

  return {
    tweetId,
    replyId,
    tweetUrl: `https://x.com/i/web/status/${encodeURIComponent(tweetId)}`,
    thread,
  };
}
