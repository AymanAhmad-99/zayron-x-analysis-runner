/**
 * PHASE 14 — `zayron-x-syndicate` Isolated Multi-Platform Syndication Worker.
 *
 * Scheduled every 30 minutes (`*\/30 * * * *`) to syndicate high-signal ZAYRON-X
 * intelligence independently across Bluesky (live), X, and LinkedIn.
 */
import type { PlatformName, PlatformPublishResult, SyndicateEnv, SyndicationItem } from "./types";
import { collapseWhitespace, normalizeHashtag, normalizeSiteUrl } from "./textUtils";
import {
  BSKY_COOLDOWN_MINUTES,
  BSKY_DAILY_CAP,
  BSKY_DEFAULT_IDENTIFIER,
  buildBlueskyPostPayload,
  publishBlueskyPost,
  resolveBlueskyCreds,
} from "./bluesky";
import { X_DAILY_CAP, formatXThread, publishXThread, resolveXCreds } from "./x";
import {
  LINKEDIN_DAILY_CAP,
  formatLinkedInPost,
  publishLinkedInPost,
  resolveLinkedInCreds,
} from "./linkedin";
import {
  getPlatformQuotaState,
  loadSyndicationCandidates,
  recordSyndicationLog,
  selectUnpostedCandidate,
} from "./signalGate";

const ALL_PLATFORMS: readonly PlatformName[] = ["bluesky", "x", "linkedin"];
const NOINDEX_JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: NOINDEX_JSON_HEADERS,
  });
}

/** Constant-time SHA-256 Bearer token check (fail-closed when token is unset). */
export async function verifyBearerToken(
  authHeader: string | null,
  expectedToken: string | undefined,
): Promise<boolean> {
  const expected = String(expectedToken ?? "").trim();
  const header = String(authHeader ?? "").trim();
  if (!expected || !header) return false;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const provided = match[1].trim();
  if (!provided) return false;

  const encoder = new TextEncoder();
  const [expectedHash, providedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
  ]);
  const a = new Uint8Array(expectedHash);
  const b = new Uint8Array(providedHash);
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export interface SyndicateTestPostInput {
  itemId?: string;
  title: string;
  summary: string;
  url: string;
  tags?: string[];
  imageUrl?: string | null;
}

export interface SyndicateRunOptions {
  dryRun?: boolean;
  platforms?: PlatformName[];
  limit?: number;
  testPost?: SyndicateTestPostInput;
  now?: Date;
  fetchFn?: typeof fetch;
}

export interface SyndicateCycleReport {
  ok: boolean;
  dryRun: boolean;
  candidateSource: "manual_test" | "d1" | "rss_fallback" | "idle_no_platforms";
  results: PlatformPublishResult[];
}

function normalizeTestPost(input: SyndicateTestPostInput): SyndicationItem {
  const cleanUrl = String(input.url ?? "").trim();
  let derivedId = input.itemId ? String(input.itemId).trim() : "";
  if (!derivedId) {
    try {
      const parsed = new URL(cleanUrl);
      const slug = parsed.pathname.split("/").filter(Boolean).pop() || "post";
      derivedId = `manual:${slug}`;
    } catch {
      derivedId = `manual:${collapseWhitespace(input.title).slice(0, 48)}`;
    }
  }
  const tags = Array.isArray(input.tags)
    ? input.tags.map((t) => normalizeHashtag(String(t))).filter(Boolean)
    : [];

  return {
    itemId: derivedId,
    itemType: "news",
    title: collapseWhitespace(input.title),
    summary: collapseWhitespace(input.summary || input.title),
    url: cleanUrl,
    imageUrl: input.imageUrl ?? null,
    tags: tags.length > 0 ? tags : ["ThreatIntel", "Cybersecurity"],
    severity: "HIGH",
    cvssScore: null,
    epssScore: null,
    isKev: false,
    publishedAt: new Date().toISOString(),
    detectionHint: "Verify affected assets and review full defensive dossier.",
  };
}

function platformConfiguredMap(env: SyndicateEnv): Record<PlatformName, boolean> {
  return {
    bluesky: Boolean(resolveBlueskyCreds(env)),
    x: Boolean(resolveXCreds(env)),
    linkedin: Boolean(resolveLinkedInCreds(env)),
  };
}

function formatPreviewPayload(platform: PlatformName, item: SyndicationItem): unknown {
  if (platform === "bluesky") return buildBlueskyPostPayload(item);
  if (platform === "x") return formatXThread(item);
  return { text: formatLinkedInPost(item) };
}

async function bestEffortLog(
  db: D1Database | undefined,
  entry: Parameters<typeof recordSyndicationLog>[1],
): Promise<boolean> {
  if (!db) return false;
  try {
    await recordSyndicationLog(db, entry);
    return true;
  } catch {
    return false;
  }
}

async function runSinglePlatform(input: {
  platform: PlatformName;
  env: SyndicateEnv;
  candidates: SyndicationItem[];
  dryRun: boolean;
  now: Date;
  isManualTest: boolean;
  fetchFn: typeof fetch;
}): Promise<PlatformPublishResult> {
  const { platform, env, candidates, dryRun, now, isManualTest, fetchFn } = input;
  const configured = platformConfiguredMap(env)[platform];

  if (dryRun) {
    const sample = candidates[0] ?? null;
    if (!sample) {
      return {
        platform,
        configured,
        status: "no_candidate",
        itemId: null,
        externalUri: null,
        externalUrl: null,
        error: null,
      };
    }
    return {
      platform,
      configured,
      status: "dry_run",
      itemId: sample.itemId,
      externalUri: null,
      externalUrl: null,
      payload: formatPreviewPayload(platform, sample),
      error: null,
    };
  }

  if (!configured) {
    return {
      platform,
      configured: false,
      status: "skipped_no_creds",
      itemId: null,
      externalUri: null,
      externalUrl: null,
      error: null,
    };
  }

  let candidate: SyndicationItem | null = null;
  if (isManualTest) {
    // Explicit testPost bypasses D1 quota/dedupe reads so manual verification still works
    // when D1 daily read quotas are exhausted.
    candidate = candidates[0] ?? null;
  } else {
    // Scheduled cron runs stay strictly fail-closed on D1 dedupe errors so the worker
    // can never double-post while D1 is degraded.
    if (!env.DB) {
      return {
        platform,
        configured: true,
        status: "failed",
        itemId: null,
        externalUri: null,
        externalUrl: null,
        d1Logged: false,
        error: "D1_DEDUPE_UNAVAILABLE",
      };
    }

    const dailyCap =
      platform === "bluesky" ? BSKY_DAILY_CAP : platform === "x" ? X_DAILY_CAP : LINKEDIN_DAILY_CAP;
    const cooldownMinutes = platform === "bluesky" ? BSKY_COOLDOWN_MINUTES : 0;

    try {
      const quota = await getPlatformQuotaState(env.DB, platform, now, dailyCap, cooldownMinutes);
      if (!quota.allowed) {
        return {
          platform,
          configured: true,
          status: quota.reason === "cooldown" ? "skipped_cooldown" : "skipped_cap",
          itemId: null,
          externalUri: null,
          externalUrl: null,
          error: `${quota.reason} (today=${quota.countToday}/${dailyCap})`,
        };
      }

      candidate = await selectUnpostedCandidate(env.DB, platform, candidates);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        platform,
        configured: true,
        status: "failed",
        itemId: null,
        externalUri: null,
        externalUrl: null,
        d1Logged: false,
        error: `D1_DEDUPE_FAILED: ${message}`,
      };
    }
  }

  if (!candidate) {
    return {
      platform,
      configured: true,
      status: "no_candidate",
      itemId: null,
      externalUri: null,
      externalUrl: null,
      error: null,
    };
  }

  try {
    if (platform === "bluesky") {
      const creds = resolveBlueskyCreds(env)!;
      const out = await publishBlueskyPost(candidate, creds, fetchFn);
      const d1Logged = await bestEffortLog(env.DB, {
        itemId: candidate.itemId,
        itemType: candidate.itemType,
        platform,
        status: "posted",
        externalUri: out.atUri,
        externalUrl: out.webUrl,
        postedAt: now.toISOString(),
      });
      return {
        platform,
        configured: true,
        status: "posted",
        itemId: candidate.itemId,
        externalUri: out.atUri,
        externalUrl: out.webUrl,
        d1Logged,
        payload: out.payload,
        error: null,
      };
    }

    if (platform === "x") {
      const creds = resolveXCreds(env)!;
      const out = await publishXThread(candidate, creds, fetchFn);
      const d1Logged = await bestEffortLog(env.DB, {
        itemId: candidate.itemId,
        itemType: candidate.itemType,
        platform,
        status: "posted",
        externalUri: out.tweetId,
        externalUrl: out.tweetUrl,
        postedAt: now.toISOString(),
      });
      return {
        platform,
        configured: true,
        status: "posted",
        itemId: candidate.itemId,
        externalUri: out.tweetId,
        externalUrl: out.tweetUrl,
        d1Logged,
        payload: out.thread,
        error: null,
      };
    }

    const creds = resolveLinkedInCreds(env)!;
    const out = await publishLinkedInPost(candidate, creds, fetchFn);
    const d1Logged = await bestEffortLog(env.DB, {
      itemId: candidate.itemId,
      itemType: candidate.itemType,
      platform,
      status: "posted",
      externalUri: out.postId,
      externalUrl: out.postUrl,
      postedAt: now.toISOString(),
    });
    return {
      platform,
      configured: true,
      status: "posted",
      itemId: candidate.itemId,
      externalUri: out.postId,
      externalUrl: out.postUrl,
      d1Logged,
      payload: { text: out.text },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const d1Logged = await bestEffortLog(env.DB, {
      itemId: candidate.itemId,
      itemType: candidate.itemType,
      platform,
      status: "failed",
      errorMessage: message.slice(0, 300),
      postedAt: now.toISOString(),
    });
    return {
      platform,
      configured: true,
      status: "failed",
      itemId: candidate.itemId,
      externalUri: null,
      externalUrl: null,
      d1Logged,
      error: message,
    };
  }
}

export async function runSyndicationCycle(
  env: SyndicateEnv,
  options: SyndicateRunOptions = {},
): Promise<SyndicateCycleReport> {
  const dryRun = Boolean(options.dryRun);
  const now = options.now ?? new Date();
  const fetchFn = options.fetchFn ?? fetch;
  const siteUrl = normalizeSiteUrl(env.SYNDICATE_SITE_URL);
  const targetPlatforms: PlatformName[] =
    options.platforms && options.platforms.length > 0
      ? options.platforms.filter((p): p is PlatformName => (ALL_PLATFORMS as readonly string[]).includes(p))
      : [...ALL_PLATFORMS];

  const configuredMap = platformConfiguredMap(env);
  if (!dryRun && targetPlatforms.every((p) => !configuredMap[p])) {
    return {
      ok: true,
      dryRun: false,
      candidateSource: "idle_no_platforms",
      results: targetPlatforms.map((platform) => ({
        platform,
        configured: false,
        status: "skipped_no_creds",
        itemId: null,
        externalUri: null,
        externalUrl: null,
        error: null,
      })),
    };
  }

  let candidates: SyndicationItem[];
  let candidateSource: SyndicateCycleReport["candidateSource"];
  const isManualTest = Boolean(options.testPost);
  if (options.testPost) {
    candidates = [normalizeTestPost(options.testPost)];
    candidateSource = "manual_test";
  } else {
    const loaded = await loadSyndicationCandidates(env.DB, siteUrl, fetchFn);
    candidates = loaded.candidates;
    candidateSource = loaded.source;
  }

  const limit = Math.max(1, Math.min(3, Math.floor(Number(options.limit ?? 1) || 1)));
  const allResults: PlatformPublishResult[] = [];

  for (let pass = 0; pass < limit; pass++) {
    const settled = await Promise.allSettled(
      targetPlatforms.map((platform) =>
        runSinglePlatform({
          platform,
          env,
          candidates,
          dryRun,
          now: new Date(now.getTime() + pass * 1000),
          isManualTest,
          fetchFn,
        }),
      ),
    );

    let anyPosted = false;
    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i];
      if (outcome.status === "fulfilled") {
        allResults.push(outcome.value);
        if (outcome.value.status === "posted") anyPosted = true;
      } else {
        allResults.push({
          platform: targetPlatforms[i],
          configured: configuredMap[targetPlatforms[i]],
          status: "failed",
          itemId: null,
          externalUri: null,
          externalUrl: null,
          error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
        });
      }
    }
    if (dryRun || !anyPosted) break;
  }

  return {
    ok: true,
    dryRun,
    candidateSource,
    results: allResults,
  };
}

export async function handleSyndicateRequest(
  request: Request,
  env: SyndicateEnv,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "GET" && path === "/health") {
    const platforms = platformConfiguredMap(env);
    return jsonResponse({
      ok: true,
      worker: "zayron-x-syndicate",
      blueskyIdentifier: String(env.BLUESKY_IDENTIFIER ?? "").trim() || BSKY_DEFAULT_IDENTIFIER,
      siteUrl: normalizeSiteUrl(env.SYNDICATE_SITE_URL),
      platforms,
    });
  }

  if (request.method === "POST" && path === "/admin/syndicate") {
    const authorized = await verifyBearerToken(
      request.headers.get("authorization"),
      env.SYNDICATE_ADMIN_TOKEN,
    );
    if (!authorized) {
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }

    let body: Record<string, unknown> = {};
    const rawText = await request.text().catch(() => "");
    if (rawText.trim()) {
      try {
        body = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        return jsonResponse({ ok: false, error: "invalid_json" }, 400);
      }
    }

    const rawPlatforms = Array.isArray(body.platforms)
      ? body.platforms.filter((p): p is PlatformName => (ALL_PLATFORMS as readonly string[]).includes(String(p)))
      : undefined;

    let testPost: SyndicateTestPostInput | undefined;
    if (body.testPost && typeof body.testPost === "object") {
      const tp = body.testPost as Record<string, unknown>;
      const title = String(tp.title ?? "").trim();
      const targetUrl = String(tp.url ?? "").trim();
      if (!title || !/^https?:\/\/\S+$/i.test(targetUrl)) {
        return jsonResponse({ ok: false, error: "invalid_test_post" }, 400);
      }
      testPost = {
        itemId: tp.itemId ? String(tp.itemId) : undefined,
        title,
        summary: String(tp.summary ?? title),
        url: targetUrl,
        tags: Array.isArray(tp.tags) ? tp.tags.map((t) => String(t)) : undefined,
        imageUrl: typeof tp.imageUrl === "string" ? tp.imageUrl : null,
      };
    }

    const report = await runSyndicationCycle(env, {
      dryRun: Boolean(body.dryRun),
      platforms: rawPlatforms,
      limit: typeof body.limit === "number" ? body.limit : 1,
      testPost,
      fetchFn,
    });
    return jsonResponse(report, 200);
  }

  return jsonResponse({ ok: false, error: "not_found" }, 404);
}

const worker: ExportedHandler<SyndicateEnv> = {
  async fetch(request, env) {
    return handleSyndicateRequest(request, env);
  },
  async scheduled(_controller, env) {
    await runSyndicationCycle(env, { dryRun: false, limit: 1 });
  },
};

export default worker;
