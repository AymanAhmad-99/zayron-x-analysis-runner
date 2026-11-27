/**
 * PHASE 9C — Secret-Gated, Fail-Closed X (Twitter) Auto-Publisher.
 *
 * Schedule: 07:40, 11:40, 15:40, 19:40, 21:40, 23:40 UTC (`isXPublishSlot`).
 * Budget: <= 4 subrequests/run (1 OG PNG fetch + 1 media upload + 1 tweet + 1 self-reply).
 * Crypto: Pure Web Crypto OAuth 1.0a (HMAC-SHA1) signer — zero npm dependencies.
 */
import {
  fetchOgCardPng,
  isXPublishSlot,
  recordSocialDispatch,
  selectSocialCandidate,
  type SocialCandidate,
} from './socialDispatch';

export const X_MEDIA_UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
export const X_TWEETS_URL = 'https://api.twitter.com/2/tweets';
export const X_POST_MAX_CHARS = 220;

export interface XPublishEnv {
  DB: any;
  X_API_KEY?: string;
  X_API_SECRET?: string;
  X_ACCESS_TOKEN?: string;
  X_ACCESS_TOKEN_SECRET?: string;
  [key: string]: unknown;
}

export interface OAuth1Creds {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface XPublishResult {
  status: 'SENT' | 'FAILED' | 'SKIPPED_NO_CREDS' | 'NO_CANDIDATE' | 'SLOT_ONLY';
  base_entity_id: string | null;
  entity_type: string | null;
  tweet_id: string | null;
  reply_id: string | null;
  media_attached: boolean;
  subrequestsUsed: number;
  error: string | null;
}

export function resolveXCreds(env: XPublishEnv): OAuth1Creds | null {
  const consumerKey = String(env?.X_API_KEY ?? '').trim();
  const consumerSecret = String(env?.X_API_SECRET ?? '').trim();
  const accessToken = String(env?.X_ACCESS_TOKEN ?? '').trim();
  const accessTokenSecret = String(env?.X_ACCESS_TOKEN_SECRET ?? '').trim();
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) return null;
  return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
}

/** RFC 3986 percent-encoding required by OAuth 1.0a. */
export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Pure Web Crypto OAuth 1.0a (`HMAC-SHA1`) Authorization header builder.
 * Supports deterministic `nonce` and `timestamp` injection for unit tests.
 */
export async function buildOAuth1Header(input: {
  method: string;
  url: string;
  creds: OAuth1Creds;
  extraParams?: Record<string, string>;
  nonce?: string;
  timestamp?: string;
}): Promise<string> {
  const parsed = new URL(input.url);
  const baseUrl = `${parsed.origin}${parsed.pathname}`;
  const nonce =
    input.nonce ??
    Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  const timestamp = input.timestamp ?? String(Math.floor(Date.now() / 1000));

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: input.creds.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: input.creds.accessToken,
    oauth_version: '1.0',
  };

  const pairs: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(oauthParams)) {
    pairs.push([percentEncode(k), percentEncode(v)]);
  }
  parsed.searchParams.forEach((v, k) => {
    pairs.push([percentEncode(k), percentEncode(v)]);
  });
  if (input.extraParams) {
    for (const [k, v] of Object.entries(input.extraParams)) {
      pairs.push([percentEncode(k), percentEncode(v)]);
    }
  }

  pairs.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
  const paramString = pairs.map(([k, v]) => `${k}=${v}`).join('&');
  const signatureBase = `${input.method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(input.creds.consumerSecret)}&${percentEncode(input.creds.accessTokenSecret)}`;

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(signatureBase));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

  const headerParams: Record<string, string> = {
    ...oauthParams,
    oauth_signature: signature,
  };
  const headerEntries = Object.keys(headerParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(headerParams[k])}"`);
  return `OAuth ${headerEntries.join(', ')}`;
}

function clampSingleLine(text: string, maxLen: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, Math.max(1, maxLen - 1)).trimEnd()}…`;
}

/** Crisp <= 220-char technical brief with direct verdict, telemetry, and max 2 hashtags. */
export function formatXPost(candidate: SocialCandidate): string {
  const tags: string[] = [];
  if (candidate.entity_type === 'cve') {
    tags.push(`#${candidate.base_entity_id.replace(/[^A-Za-z0-9]/g, '')}`);
  } else if (candidate.linked_cves[0]) {
    tags.push(`#${candidate.linked_cves[0].replace(/[^A-Za-z0-9]/g, '')}`);
  }
  tags.push('#ThreatIntel');
  const hashtags = tags.slice(0, 2).join(' ');

  const telemetryParts: string[] = [];
  if (candidate.is_kev) telemetryParts.push('CISA KEV');
  if (candidate.cvss_score !== null) telemetryParts.push(`CVSS ${candidate.cvss_score.toFixed(1)}`);
  if (candidate.epss_score !== null) telemetryParts.push(`EPSS ${(candidate.epss_score * 100).toFixed(1)}%`);
  if (candidate.entity_type === 'news' && candidate.source_name) telemetryParts.push(candidate.source_name);
  if (candidate.entity_type === 'malware_advisory' && candidate.ecosystem) telemetryParts.push(candidate.ecosystem);
  if (telemetryParts.length === 0) telemetryParts.push(candidate.severity);

  const prefix = `${candidate.title} [${telemetryParts.slice(0, 3).join(' · ')}]: `;
  const suffix = ` ${hashtags}`;
  const available = X_POST_MAX_CHARS - prefix.length - suffix.length;
  if (available < 30) {
    return clampSingleLine(`${candidate.title} — ${telemetryParts.join(' · ')}${suffix}`, X_POST_MAX_CHARS);
  }
  const verdict = clampSingleLine(candidate.verdict, available);
  return `${prefix}${verdict}${suffix}`;
}

export function formatXSelfReply(candidate: SocialCandidate): string {
  return `Full dossier & catalog telemetry: ${candidate.canonical_url}\n\nLive alerts: https://t.me/zayronxai`;
}

export async function runXPublishPass(
  env: XPublishEnv,
  options: { when?: Date; force?: boolean; fetchFn?: typeof fetch } = {},
): Promise<XPublishResult> {
  const when = options.when ?? new Date();
  const fetchFn = options.fetchFn ?? fetch;

  if (!options.force && !isXPublishSlot(when)) {
    return {
      status: 'SLOT_ONLY',
      base_entity_id: null,
      entity_type: null,
      tweet_id: null,
      reply_id: null,
      media_attached: false,
      subrequestsUsed: 0,
      error: 'OUTSIDE_X_SLOT',
    };
  }

  const creds = resolveXCreds(env);
  if (!creds) {
    return {
      status: 'SKIPPED_NO_CREDS',
      base_entity_id: null,
      entity_type: null,
      tweet_id: null,
      reply_id: null,
      media_attached: false,
      subrequestsUsed: 0,
      error: null,
    };
  }

  const candidate = await selectSocialCandidate(env.DB, 'x');
  if (!candidate) {
    return {
      status: 'NO_CANDIDATE',
      base_entity_id: null,
      entity_type: null,
      tweet_id: null,
      reply_id: null,
      media_attached: false,
      subrequestsUsed: 0,
      error: null,
    };
  }

  let subrequestsUsed = 0;
  let mediaId: string | null = null;

  // 1. Fetch 1200x630 OG PNG
  subrequestsUsed += 1;
  const pngBytes = await fetchOgCardPng(candidate.og_image_url, fetchFn);

  // 2. Upload media to X v1.1 media endpoint if PNG succeeded
  if (pngBytes) {
    subrequestsUsed += 1;
    try {
      const form = new FormData();
      const copy = new Uint8Array(pngBytes.byteLength);
      copy.set(pngBytes);
      form.append('media', new Blob([copy.buffer], { type: 'image/png' }), `${candidate.base_entity_id}.png`);
      const authHeader = await buildOAuth1Header({
        method: 'POST',
        url: X_MEDIA_UPLOAD_URL,
        creds,
      });
      const uploadRes = await fetchFn(X_MEDIA_UPLOAD_URL, {
        method: 'POST',
        headers: { Authorization: authHeader },
        body: form,
      });
      if (uploadRes.ok) {
        const payload = (await uploadRes.json().catch(() => null)) as { media_id_string?: string } | null;
        if (payload?.media_id_string) mediaId = payload.media_id_string;
      }
    } catch {
      mediaId = null;
    }
  }

  // 3. Publish primary tweet
  subrequestsUsed += 1;
  const postText = formatXPost(candidate);
  let tweetId: string | null = null;
  try {
    const authHeader = await buildOAuth1Header({
      method: 'POST',
      url: X_TWEETS_URL,
      creds,
    });
    const tweetRes = await fetchFn(X_TWEETS_URL, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: postText,
        ...(mediaId ? { media: { media_ids: [mediaId] } } : {}),
      }),
    });
    const tweetJson = (await tweetRes.json().catch(() => null)) as { data?: { id?: string }; detail?: string; title?: string } | null;
    if (!tweetRes.ok || !tweetJson?.data?.id) {
      const errMsg = `X_POST_HTTP_${tweetRes.status}:${tweetJson?.detail || tweetJson?.title || 'FAILED'}`;
      await recordSocialDispatch(env.DB, {
        id: `soc_x_${crypto.randomUUID().slice(0, 12)}`,
        platform: 'x',
        entity_type: candidate.entity_type,
        base_entity_id: candidate.base_entity_id,
        external_post_id: null,
        reply_post_id: null,
        status: 'FAILED',
        error_message: errMsg,
        dispatched_at: when.toISOString(),
      });
      return {
        status: 'FAILED',
        base_entity_id: candidate.base_entity_id,
        entity_type: candidate.entity_type,
        tweet_id: null,
        reply_id: null,
        media_attached: Boolean(mediaId),
        subrequestsUsed,
        error: errMsg,
      };
    }
    tweetId = tweetJson.data.id;
  } catch (error) {
    const errMsg = `X_POST_ERROR:${String((error as Error)?.message || error)}`;
    await recordSocialDispatch(env.DB, {
      id: `soc_x_${crypto.randomUUID().slice(0, 12)}`,
      platform: 'x',
      entity_type: candidate.entity_type,
      base_entity_id: candidate.base_entity_id,
      external_post_id: null,
      reply_post_id: null,
      status: 'FAILED',
      error_message: errMsg,
      dispatched_at: when.toISOString(),
    });
    return {
      status: 'FAILED',
      base_entity_id: candidate.base_entity_id,
      entity_type: candidate.entity_type,
      tweet_id: null,
      reply_id: null,
      media_attached: Boolean(mediaId),
      subrequestsUsed,
      error: errMsg,
    };
  }

  // 4. Publish self-reply with canonical dossier link + Telegram CTA
  let replyId: string | null = null;
  if (subrequestsUsed < 4) {
    subrequestsUsed += 1;
    try {
      const authHeader = await buildOAuth1Header({
        method: 'POST',
        url: X_TWEETS_URL,
        creds,
      });
      const replyRes = await fetchFn(X_TWEETS_URL, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: formatXSelfReply(candidate),
          reply: { in_reply_to_tweet_id: tweetId },
        }),
      });
      if (replyRes.ok) {
        const replyJson = (await replyRes.json().catch(() => null)) as { data?: { id?: string } } | null;
        replyId = replyJson?.data?.id ?? null;
      }
    } catch {
      replyId = null;
    }
  }

  await recordSocialDispatch(env.DB, {
    id: `soc_x_${crypto.randomUUID().slice(0, 12)}`,
    platform: 'x',
    entity_type: candidate.entity_type,
    base_entity_id: candidate.base_entity_id,
    external_post_id: tweetId,
    reply_post_id: replyId,
    status: 'SENT',
    error_message: null,
    dispatched_at: when.toISOString(),
  });

  return {
    status: 'SENT',
    base_entity_id: candidate.base_entity_id,
    entity_type: candidate.entity_type,
    tweet_id: tweetId,
    reply_id: replyId,
    media_attached: Boolean(mediaId),
    subrequestsUsed,
    error: null,
  };
}
