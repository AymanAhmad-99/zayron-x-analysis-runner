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
  truncateGraphemes,
  utf8ByteRange,
} from "./textUtils";

export const BSKY_SERVICE_URL = "https://bsky.social";
export const BSKY_DEFAULT_IDENTIFIER = "zayron-x.co";
export const BSKY_MAX_GRAPHEMES = 300;
export const BSKY_DAILY_CAP = 8;
export const BSKY_COOLDOWN_MINUTES = 90;
const BSKY_MAX_BLOB_BYTES = 950_000;

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

/** Build post text + exact UTF-8 byte-offset link & tag facets within 300 graphemes. */
export function buildBlueskyRichText(item: SyndicationItem): {
  text: string;
  facets: BlueskyFacet[];
} {
  const tags = selectHashtags(item, 2);
  const tagLine = tags.map((tag) => `#${tag}`).join(" ");
  const hasUrl = /^https?:\/\/\S+$/i.test(String(item.url ?? "").trim());
  const url = String(item.url ?? "").trim();
  const footerParts = [hasUrl ? url : "", tagLine].filter(Boolean);
  const footer = footerParts.join(" ");

  const prefix = item.isKev || item.itemType === "kev" ? "[CISA KEV] " : "";
  const title = collapseWhitespace(item.title);
  const summary = collapseWhitespace(item.summary);
  const bodyCandidate =
    summary && summary.toLowerCase() !== title.toLowerCase()
      ? `${prefix}${title} — ${summary}`
      : `${prefix}${title}`;

  let text: string;
  if (footer) {
    const separator = "\n\n";
    const reserved = graphemeLength(separator) + graphemeLength(footer);
    const bodyBudget = BSKY_MAX_GRAPHEMES - reserved;
    if (bodyBudget >= 24) {
      const clampedBody = truncateGraphemes(bodyCandidate, bodyBudget);
      text = `${clampedBody}${separator}${footer}`;
    } else {
      text = truncateGraphemes(footer, BSKY_MAX_GRAPHEMES);
    }
  } else {
    text = truncateGraphemes(bodyCandidate, BSKY_MAX_GRAPHEMES);
  }

  // Final failsafe clamp
  if (graphemeLength(text) > BSKY_MAX_GRAPHEMES) {
    text = truncateGraphemes(text, BSKY_MAX_GRAPHEMES);
  }

  const facets: BlueskyFacet[] = [];
  if (hasUrl) {
    const urlRange = utf8ByteRange(text, url);
    if (urlRange) {
      facets.push({
        index: { byteStart: urlRange.byteStart, byteEnd: urlRange.byteEnd },
        features: [{ $type: "app.bsky.richtext.facet#link", uri: url }],
      });
    }
  }

  let tagSearchCursor = hasUrl ? Math.max(0, text.indexOf(url)) : 0;
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

export async function tryUploadBlueskyOgBlob(
  accessJwt: string,
  imageUrl: string | null,
  fetchFn: typeof fetch = fetch,
  serviceUrl: string = BSKY_SERVICE_URL,
): Promise<BlueskyBlobRef | undefined> {
  if (!imageUrl || !/^https:\/\//i.test(imageUrl)) return undefined;
  try {
    const imgRes = await fetchFn(imageUrl, {
      headers: { Accept: "image/png,image/jpeg,image/webp" },
      signal: AbortSignal.timeout(5000),
    });
    if (!imgRes.ok) return undefined;
    const contentType = (imgRes.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("image/")) return undefined;
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

  const thumb = await tryUploadBlueskyOgBlob(session.accessJwt, item.imageUrl, fetchFn, serviceUrl);
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
