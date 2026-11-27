/**
 * PHASE 9C — Secret-Gated, Fail-Closed LinkedIn Executive Auto-Publisher.
 *
 * Schedule: 13:40, 17:40 UTC (`isLinkedInPublishSlot`).
 * Budget: <= 4 subrequests/run (1 OG PNG fetch + 1 image init + 1 image PUT + 1 post).
 */
import {
  fetchOgCardPng,
  isLinkedInPublishSlot,
  recordSocialDispatch,
  selectSocialCandidate,
  type SocialCandidate,
} from './socialDispatch';

export const LINKEDIN_IMAGES_INIT_URL = 'https://api.linkedin.com/rest/images?action=initializeUpload';
export const LINKEDIN_POSTS_URL = 'https://api.linkedin.com/rest/posts';
export const LINKEDIN_API_VERSION = '202411';

export interface LinkedInPublishEnv {
  DB: any;
  LINKEDIN_ACCESS_TOKEN?: string;
  LINKEDIN_AUTHOR_URN?: string;
  [key: string]: unknown;
}

export interface LinkedInPublishResult {
  status: 'SENT' | 'FAILED' | 'SKIPPED_NO_CREDS' | 'NO_CANDIDATE' | 'SLOT_ONLY';
  base_entity_id: string | null;
  entity_type: string | null;
  post_id: string | null;
  media_attached: boolean;
  subrequestsUsed: number;
  error: string | null;
}

export function resolveLinkedInCreds(
  env: LinkedInPublishEnv,
): { accessToken: string; authorUrn: string } | null {
  const accessToken = String(env?.LINKEDIN_ACCESS_TOKEN ?? '').trim();
  const authorUrn = String(env?.LINKEDIN_AUTHOR_URN ?? '').trim();
  if (!accessToken || !authorUrn) return null;
  return { accessToken, authorUrn };
}

/** CISO-grade 3-part executive breakdown. */
export function formatLinkedInPost(candidate: SocialCandidate): string {
  const telemetry: string[] = [`Severity: ${candidate.severity}`];
  if (candidate.is_kev) telemetry.push('CISA KEV: Listed (Active Exploitation)');
  if (candidate.cvss_score !== null) telemetry.push(`CVSS: ${candidate.cvss_score.toFixed(1)}`);
  if (candidate.epss_score !== null) telemetry.push(`EPSS: ${(candidate.epss_score * 100).toFixed(1)}%`);
  if (candidate.linked_cves.length > 0 && candidate.entity_type !== 'cve') {
    telemetry.push(`Linked CVEs: ${candidate.linked_cves.slice(0, 4).join(', ')}`);
  }
  if (candidate.source_name) telemetry.push(`Source: ${candidate.source_name}`);

  const action =
    candidate.remediation_hint ||
    'Validate exposure across internet-facing and critical assets and apply vendor patches immediately.';

  return [
    `${candidate.title}`,
    '',
    `What Happened`,
    candidate.verdict,
    '',
    `Live ZAYRON-X Telemetry`,
    telemetry.join(' · '),
    '',
    `Immediate Defensive Action`,
    action,
    '',
    `Full technical dossier: ${candidate.canonical_url}`,
    `Real-time briefings: https://t.me/zayronxai`,
    '',
    '#Cybersecurity #ThreatIntelligence #SOC',
  ].join('\n');
}

export async function runLinkedInPublishPass(
  env: LinkedInPublishEnv,
  options: { when?: Date; force?: boolean; fetchFn?: typeof fetch } = {},
): Promise<LinkedInPublishResult> {
  const when = options.when ?? new Date();
  const fetchFn = options.fetchFn ?? fetch;

  if (!options.force && !isLinkedInPublishSlot(when)) {
    return {
      status: 'SLOT_ONLY',
      base_entity_id: null,
      entity_type: null,
      post_id: null,
      media_attached: false,
      subrequestsUsed: 0,
      error: 'OUTSIDE_LINKEDIN_SLOT',
    };
  }

  const creds = resolveLinkedInCreds(env);
  if (!creds) {
    return {
      status: 'SKIPPED_NO_CREDS',
      base_entity_id: null,
      entity_type: null,
      post_id: null,
      media_attached: false,
      subrequestsUsed: 0,
      error: null,
    };
  }

  const candidate = await selectSocialCandidate(env.DB, 'linkedin');
  if (!candidate) {
    return {
      status: 'NO_CANDIDATE',
      base_entity_id: null,
      entity_type: null,
      post_id: null,
      media_attached: false,
      subrequestsUsed: 0,
      error: null,
    };
  }

  let subrequestsUsed = 0;
  let imageUrn: string | null = null;
  const apiHeaders = {
    Authorization: `Bearer ${creds.accessToken}`,
    'LinkedIn-Version': LINKEDIN_API_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
  };

  // 1. Fetch 1200x630 OG PNG
  subrequestsUsed += 1;
  const pngBytes = await fetchOgCardPng(candidate.og_image_url, fetchFn);

  // 2 & 3. Initialize & upload image asset to LinkedIn
  if (pngBytes) {
    subrequestsUsed += 1;
    try {
      const initRes = await fetchFn(LINKEDIN_IMAGES_INIT_URL, {
        method: 'POST',
        headers: { ...apiHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ initializeUploadRequest: { owner: creds.authorUrn } }),
      });
      if (initRes.ok) {
        const initJson = (await initRes.json().catch(() => null)) as {
          value?: { uploadUrl?: string; image?: string };
        } | null;
        const uploadUrl = initJson?.value?.uploadUrl;
        const assetUrn = initJson?.value?.image;
        if (uploadUrl && assetUrn) {
          subrequestsUsed += 1;
          const copy = new Uint8Array(pngBytes.byteLength);
          copy.set(pngBytes);
          const putRes = await fetchFn(uploadUrl, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${creds.accessToken}`,
              'Content-Type': 'image/png',
            },
            body: copy.buffer,
          });
          if (putRes.ok) imageUrn = assetUrn;
        }
      }
    } catch {
      imageUrn = null;
    }
  }

  // 4. Publish post
  subrequestsUsed += 1;
  const commentary = formatLinkedInPost(candidate);
  const body: Record<string, unknown> = {
    author: creds.authorUrn,
    commentary,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
    ...(imageUrn
      ? {
          content: {
            media: {
              title: candidate.title.slice(0, 180),
              id: imageUrn,
            },
          },
        }
      : {}),
  };

  try {
    const postRes = await fetchFn(LINKEDIN_POSTS_URL, {
      method: 'POST',
      headers: { ...apiHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!postRes.ok) {
      const text = await postRes.text().catch(() => '');
      const errMsg = `LINKEDIN_HTTP_${postRes.status}:${text.slice(0, 120)}`;
      await recordSocialDispatch(env.DB, {
        id: `soc_li_${crypto.randomUUID().slice(0, 12)}`,
        platform: 'linkedin',
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
        post_id: null,
        media_attached: Boolean(imageUrn),
        subrequestsUsed,
        error: errMsg,
      };
    }

    const postId = postRes.headers.get('x-restli-id') || `li_${crypto.randomUUID().slice(0, 12)}`;
    await recordSocialDispatch(env.DB, {
      id: `soc_li_${crypto.randomUUID().slice(0, 12)}`,
      platform: 'linkedin',
      entity_type: candidate.entity_type,
      base_entity_id: candidate.base_entity_id,
      external_post_id: postId,
      reply_post_id: null,
      status: 'SENT',
      error_message: null,
      dispatched_at: when.toISOString(),
    });
    return {
      status: 'SENT',
      base_entity_id: candidate.base_entity_id,
      entity_type: candidate.entity_type,
      post_id: postId,
      media_attached: Boolean(imageUrn),
      subrequestsUsed,
      error: null,
    };
  } catch (error) {
    const errMsg = `LINKEDIN_ERROR:${String((error as Error)?.message || error)}`;
    await recordSocialDispatch(env.DB, {
      id: `soc_li_${crypto.randomUUID().slice(0, 12)}`,
      platform: 'linkedin',
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
      post_id: null,
      media_attached: Boolean(imageUrn),
      subrequestsUsed,
      error: errMsg,
    };
  }
}
