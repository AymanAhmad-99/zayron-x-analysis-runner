/**
 * PHASE 14 — Bluesky (AT Protocol) Syndication Adapter.
 *
 * Publishes concise <= 300-grapheme defensive intelligence updates to @zayron-x.co
 * with exact UTF-8 byte-offset link & tag facets and an app.bsky.embed.external card.
 */
import type { SyndicateEnv, SyndicationItem } from "./types";
import {
  collapseWhitespace,
  graphemeLength,
  selectHashtags,
  splitGraphemes,
  stripUrls,
  truncateGraphemes,
  utf8ByteRange,
} from "./textUtils";

export const BSKY_SERVICE_URL = "https://bsky.social";
export const BSKY_DEFAULT_IDENTIFIER = "zayron-x.co";
export const BSKY_MAX_GRAPHEMES = 300;
export const BSKY_DAILY_CAP = 8;
export const BSKY_COOLDOWN_MINUTES = 90;
const BSKY_MAX_BLOB_BYTES = 950_000;
const ALLOWED_BSKY_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export interface BlueskyCreds {
  identifier: string;
  appPassword: string;
}

export interface BlueskyFacet {
  index: { byteStart: number; byteEnd: number };
  features: Array<
    | { $type: "app.bsky.richtext.facet#link"; uri: string }
    | { $type: "app.bsky.richtext.facet#tag"; tag: string }
  >;
}

export interface BlueskyBlobRef {
  $type: "blob";
  ref: { $link: string };
  mimeType: string;
  size: number;
}

export interface BlueskyExternalEmbed {
  $type: "app.bsky.embed.external";
  external: {
    uri: string;
    title: string;
    description: string;
    thumb?: BlueskyBlobRef;
  };
}

export interface BlueskyPostPayload {
  text: string;
  facets: BlueskyFacet[];
  embed: BlueskyExternalEmbed;
}

export interface BlueskyPublishOutput {
  atUri: string;
  cid: string;
  webUrl: string | null;
  handle: string;
  payload: BlueskyPostPayload;
}

export function resolveBlueskyCreds(env: SyndicateEnv): BlueskyCreds | null {
  const appPassword = String(env.BLUESKY_APP_PASSWORD ?? "").trim();
  if (!appPassword) return null;
  const identifier = String(env.BLUESKY_IDENTIFIER ?? "").trim() || BSKY_DEFAULT_IDENTIFIER;
  return { identifier, appPassword };
}

export function extractBlueskyRkey(atUri: string): string | null {
  const clean = String(atUri ?? "").trim();
  if (!clean.startsWith("at://")) return null;
  const parts = clean.split("/").filter(Boolean);
  const rkey = parts[parts.length - 1];
  return rkey ? rkey : null;
}

export function buildBlueskyPostWebUrl(handle: string, atUri: string): string | null {
  const rkey = extractBlueskyRkey(atUri);
  const cleanHandle = String(handle ?? "").trim().replace(/^@/, "");
  if (!rkey || !cleanHandle) return null;
  return `https://bsky.app/profile/${encodeURIComponent(cleanHandle)}/post/${encodeURIComponent(rkey)}`;
}

/** Trim cleanly to 1-2 sentences or a word boundary (no mid-word cuts or trailing connectors). */
function trimCleanEditorialSummary(rawText: string, maxGraphemes: number): string {
  if (maxGraphemes <= 0) return "";
  const cleaned = collapseWhitespace(stripUrls(rawText)).replace(/\s+([.,!?;:])/g, "$1").trim();
  if (!cleaned) return "";
  if (graphemeLength(cleaned) <= maxGraphemes) return cleaned;

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 0) {
    if (sentences.length >= 2) {
      const twoSentences = `${sentences[0]} ${sentences[1]}`;
      if (graphemeLength(twoSentences) <= maxGraphemes) return twoSentences;
    }
    if (graphemeLength(sentences[0]) <= maxGraphemes) return sentences[0];
  }

  if (maxGraphemes <= 2) return truncateGraphemes(cleaned, maxGraphemes);
  const clipped = splitGraphemes(cleaned)
    .slice(0, maxGraphemes - 1)
    .join("");
  const lastSpace = clipped.lastIndexOf(" ");
  const boundary = lastSpace >= Math.floor(clipped.length * 0.45) ? clipped.slice(0, lastSpace) : clipped;
  const trimmed = boundary.replace(/[\s,;:\-—]+$/, "");
  return trimmed ? `${trimmed}…` : truncateGraphemes(cleaned, maxGraphemes);
}

/**
 * PHASE 14B — Ultra-clean 3-part Bluesky post body (NO raw URLs in text):
 *   Line 1: Crisp headline / hook
 *   Line 2: 1–2 concise defensive sentences (word/sentence boundary trimmed)
 *   Line 3: Max 2 hashtags with exact UTF-8 byte-offset tag facets (`<= 300` graphemes)
 */
export function buildBlueskyRichText(item: SyndicationItem): {
  text: string;
  facets: BlueskyFacet[];
} {
  const tags = selectHashtags(item, 2);
  const tagLine = tags.map((tag) => `#${tag}`).join(" ");

  const prefix = item.isKev || item.itemType === "kev" ? "[CISA KEV] " : "";
  const cleanTitle = collapseWhitespace(stripUrls(item.title));
  const rawHeadline = `${prefix}${cleanTitle}`;
  const maxHeadlineBudget = Math.min(120, Math.max(40, BSKY_MAX_GRAPHEMES - graphemeLength(tagLine) - 8));
  const headline = trimCleanEditorialSummary(rawHeadline, maxHeadlineBudget);

  const cleanSummary = collapseWhitespace(stripUrls(item.summary)).replace(/\s+([.,!?;:])/g, "$1").trim();
  const hasDistinctSummary = Boolean(cleanSummary) && cleanSummary.toLowerCase() !== cleanTitle.toLowerCase();

  let text = "";
  if (hasDistinctSummary) {
    const tagOverhead = tagLine ? 2 + graphemeLength(tagLine) : 0;
    const summaryBudget = BSKY_MAX_GRAPHEMES - graphemeLength(headline) - 2 - tagOverhead;
    if (summaryBudget >= 24) {
      const conciseSummary = trimCleanEditorialSummary(cleanSummary, summaryBudget);
      if (conciseSummary) {
        text = tagLine ? `${headline}\n\n${conciseSummary}\n\n${tagLine}` : `${headline}\n\n${conciseSummary}`;
      }
    }
  }

  if (!text) {
    const bodyBudget = tagLine ? BSKY_MAX_GRAPHEMES - 2 - graphemeLength(tagLine) : BSKY_MAX_GRAPHEMES;
    const clampedHeadline = trimCleanEditorialSummary(rawHeadline, Math.max(20, bodyBudget));
    text = tagLine ? `${clampedHeadline}\n\n${tagLine}` : clampedHeadline;
  }

  if (graphemeLength(text) > BSKY_MAX_GRAPHEMES) {
    text = truncateGraphemes(text, BSKY_MAX_GRAPHEMES);
  }

  const facets: BlueskyFacet[] = [];
  if (tagLine) {
    let tagSearchCursor = Math.max(0, text.lastIndexOf(tagLine));
    for (const tag of tags) {
      const token = `#${tag}`;
      const range = utf8ByteRange(text, token, tagSearchCursor);
      if (range) {
        facets.push({
          index: { byteStart: range.byteStart, byteEnd: range.byteEnd },
          features: [{ $type: "app.bsky.richtext.facet#tag", tag }],
        });
        tagSearchCursor = range.charEnd;
      }
    }
  }

  facets.sort((a, b) => a.index.byteStart - b.index.byteStart);
  return { text, facets };
}

export function buildBlueskyExternalEmbed(
  item: SyndicationItem,
  thumb?: BlueskyBlobRef,
): BlueskyExternalEmbed {
  const title = truncateGraphemes(item.title, 180);
  const description = truncateGraphemes(item.summary || item.title, 280);
  return {
    $type: "app.bsky.embed.external",
    external: {
      uri: item.url,
      title,
      description,
      ...(thumb ? { thumb } : {}),
    },
  };
}

export function buildBlueskyPostPayload(
  item: SyndicationItem,
  thumb?: BlueskyBlobRef,
): BlueskyPostPayload {
  const { text, facets } = buildBlueskyRichText(item);
  const embed = buildBlueskyExternalEmbed(item, thumb);
  return { text, facets, embed };
}

function resolveCandidateAssetUrl(rawAttr: string, baseUrl: string): string | null {
  const unescaped = rawAttr.replace(/&amp;/g, "&").trim();
  if (!unescaped) return null;
  try {
    const abs = new URL(unescaped, baseUrl).toString();
    return /^https:\/\//i.test(abs) ? abs : null;
  } catch {
    return null;
  }
}

export function extractOgImageCandidates(html: string, pageUrl: string): string[] {
  const candidates: string[] = [];
  const pushUnique = (raw: string | null) => {
    if (raw && !candidates.includes(raw)) candidates.push(raw);
  };

  const patterns = [
    /<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i,
    /<meta[^>]+(?:property|name)=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']twitter:image["']/i,
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
  ];

  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) pushUnique(resolveCandidateAssetUrl(match[1], pageUrl));
  }

  try {
    const origin = new URL(pageUrl).origin;
    pushUnique(`${origin}/og-image.png`);
  } catch {
    // Ignore invalid page URLs
  }

  return candidates.slice(0, 3);
}

async function fetchAndUploadSingleImageBlob(
  accessJwt: string,
  imageUrl: string,
  fetchFn: typeof fetch,
  serviceUrl: string,
): Promise<BlueskyBlobRef | undefined> {
  if (!/^https:\/\//i.test(imageUrl)) return undefined;
  try {
    const imgRes = await fetchFn(imageUrl, {
      headers: { Accept: "image/png,image/jpeg,image/webp" },
      signal: AbortSignal.timeout(5000),
    });
    if (!imgRes.ok) return undefined;
    const contentType = (imgRes.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_BSKY_IMAGE_TYPES.has(contentType)) return undefined;
    const bytes = await imgRes.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > BSKY_MAX_BLOB_BYTES) return undefined;

    const uploadRes = await fetchFn(`${serviceUrl}/xrpc/com.atproto.repo.uploadBlob`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessJwt}`,
        "Content-Type": contentType,
      },
      body: bytes,
      signal: AbortSignal.timeout(7000),
    });
    if (!uploadRes.ok) return undefined;
    const data = (await uploadRes.json()) as { blob?: BlueskyBlobRef };
    return data?.blob;
  } catch {
    return undefined;
  }
}

export async function tryUploadBlueskyOgBlob(
  accessJwt: string,
  imageUrl: string | null,
  fetchFn: typeof fetch = fetch,
  serviceUrl: string = BSKY_SERVICE_URL,
  pageUrl?: string,
): Promise<BlueskyBlobRef | undefined> {
  if (imageUrl && /^https:\/\//i.test(imageUrl)) {
    return fetchAndUploadSingleImageBlob(accessJwt, imageUrl, fetchFn, serviceUrl);
  }

  if (!pageUrl || !/^https:\/\//i.test(pageUrl)) return undefined;
  let pageOk = false;
  try {
    const pageRes = await fetchFn(pageUrl, {
      headers: { Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(4000),
    });
    if (pageRes.ok) {
      pageOk = true;
      const html = await pageRes.text();
      for (const candidateUrl of extractOgImageCandidates(html, pageUrl)) {
        const uploaded = await fetchAndUploadSingleImageBlob(accessJwt, candidateUrl, fetchFn, serviceUrl);
        if (uploaded) return uploaded;
      }
    }
  } catch {
    // Fall through cleanly if page HTML fetch failed
  }

  if (pageOk) return undefined;
  try {
    const fallbackUrl = `${new URL(pageUrl).origin}/og-image.png`;
    return await fetchAndUploadSingleImageBlob(accessJwt, fallbackUrl, fetchFn, serviceUrl);
  } catch {
    return undefined;
  }
}

export async function publishBlueskyPost(
  item: SyndicationItem,
  creds: BlueskyCreds,
  fetchFn: typeof fetch = fetch,
  serviceUrl: string = BSKY_SERVICE_URL,
): Promise<BlueskyPublishOutput> {
  const sessionRes = await fetchFn(`${serviceUrl}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: creds.identifier,
      password: creds.appPassword,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!sessionRes.ok) {
    const errText = await sessionRes.text().catch(() => "");
    throw new Error(`Bluesky createSession HTTP ${sessionRes.status}: ${errText.slice(0, 180)}`);
  }

  const session = (await sessionRes.json()) as {
    accessJwt?: string;
    did?: string;
    handle?: string;
  };
  if (!session.accessJwt || !session.did) {
    throw new Error("Bluesky createSession missing accessJwt or did");
  }

  const thumb = await tryUploadBlueskyOgBlob(session.accessJwt, item.imageUrl, fetchFn, serviceUrl, item.url);
  const payload = buildBlueskyPostPayload(item, thumb);
  const createdAt = new Date().toISOString();

  const recordRes = await fetchFn(`${serviceUrl}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text: payload.text,
        facets: payload.facets,
        embed: payload.embed,
        langs: ["en"],
        createdAt,
      },
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!recordRes.ok) {
    const errText = await recordRes.text().catch(() => "");
    throw new Error(`Bluesky createRecord HTTP ${recordRes.status}: ${errText.slice(0, 180)}`);
  }

  const created = (await recordRes.json()) as { uri?: string; cid?: string };
  if (!created.uri || !created.cid) {
    throw new Error("Bluesky createRecord returned invalid payload");
  }

  const handle = session.handle || creds.identifier;
  return {
    atUri: created.uri,
    cid: created.cid,
    webUrl: buildBlueskyPostWebUrl(handle, created.uri),
    handle,
    payload,
  };
}
