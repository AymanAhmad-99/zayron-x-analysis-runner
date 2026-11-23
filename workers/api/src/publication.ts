/**
 * Wave 4A — Telegram publication engine with a claim-before-send contract.
 *
 * The previous flow sent to Telegram first and only then wrote the
 * `social_assets` row, so two concurrent/retried queue deliveries for the same
 * `idempotency_key` could both pass the duplicate check and both post.
 *
 * New contract:
 *   1. CLAIM the idempotency key with ONE atomic upsert (`ON CONFLICT
 *      (idempotency_key) DO UPDATE … WHERE … RETURNING id`) against the unique
 *      index `social_assets_idempotency_key_unique`. Three outcomes:
 *        - no row ⇒ brand-new key, row inserted as `SENDING`;
 *        - row returned ⇒ a `FAILED` attempt was reclaimed, or a `SENDING`
 *          attempt exceeded its lease and was reclaimed;
 *        - no row after an existing key ⇒ still in flight or already
 *          published ⇒ `DUPLICATE`.
 *   2. Only the claim winner performs the outbound fetch.
 *   3. Transition the asset `SENDING` → `PUBLISHED` or → `FAILED`, using the
 *      id RETURNED BY THE CLAIM (a reclaimed row keeps its original id, so
 *      updating the freshly generated id would strand the row in `SENDING`
 *      and trip the `social_publications.asset_id` foreign key).
 *   4. A `429` from the collector is surfaced as `RATE_LIMITED` together with
 *      `retry_after_seconds`, so the queue consumer can retry with the exact
 *      delay Telegram asked for instead of a generic failure.
 *
 * Kept in its own module (no Worker entrypoint imports) so the claim ordering
 * is unit testable without loading the wasm/kernel bundle.
 */

export type PublicationInput = {
  intelligence_id: string;
  publication_type: 'website' | 'telegram';
  idempotency_key: string;
  custom_message?: string;
};

export type PublicationResult = {
  status: 'PUBLISHED' | 'DUPLICATE' | 'REJECTED' | 'FAILED';
  publication_id?: string;
  website_status: string;
  telegram_status: string;
  /** Whole seconds the upstream asked the caller to wait (Telegram 429). */
  retry_after_seconds?: number;
};

export interface PublicationEnv {
  DB: D1Database;
  TELEGRAM_COLLECTOR_SERVICE?: Fetcher;
  TELEGRAM_TARGET_CHANNEL?: string;
}

const ASSET_FORMAT = 'ALERT';
const DEFAULT_RETRY_AFTER_SECONDS = 30;

/**
 * How long a `SENDING` claim is trusted before another delivery may reclaim it.
 *
 * Without a lease, an isolate that dies between the claim and the terminal
 * transition (fetch hang, CPU kill, deploy) leaves the key `SENDING` FOREVER:
 * every later delivery is a duplicate, so the alert is silently never sent.
 * Five minutes is far longer than one collector call (bounded by the queue
 * consumer's own retry budget) and short enough that a stuck alert recovers.
 */
export const SENDING_LEASE_SECONDS = 300;

/**
 * THE claim. One statement, no SELECT-then-INSERT window.
 *
 * `RETURNING id` is what makes the reclaim safe: on a conflict the surviving
 * row keeps its original `id`, and that is the id every later statement in
 * this module must use. `updated_at` is written here as `datetime('now')`
 * (`YYYY-MM-DD HH:MM:SS`) while the table default is ISO-8601 (`...T...Z`), so
 * both layouts are normalised through `datetime()` before the lease compare.
 */
export const CLAIM_ASSET_SQL = `INSERT INTO social_assets (id, event_id, article_id, platform, format, status, body, idempotency_key, created_at, updated_at)
     VALUES (?, ?, ?, 'telegram', ?, 'SENDING', ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(idempotency_key) DO UPDATE SET
       status = 'SENDING', body = excluded.body, updated_at = datetime('now')
     WHERE social_assets.status = 'FAILED'
        OR (
          social_assets.status = 'SENDING'
          AND datetime(COALESCE(social_assets.updated_at, '1970-01-01T00:00:00Z')) <= datetime('now', '-${SENDING_LEASE_SECONDS} seconds')
        )
     RETURNING id`;

/** Best-effort FAILED transition; never masks the original failure. */
async function markAssetFailed(env: PublicationEnv, assetId: string, reason: string): Promise<void> {
  try {
    await env.DB.prepare(
      `UPDATE social_assets SET status = 'FAILED', updated_at = datetime('now') WHERE id = ?`,
    ).bind(assetId).run();
  } catch (err) {
    console.error('[PUBLISH] failed to record FAILED social asset', {
      site: 'publish.asset_mark_failed',
      asset_id: assetId,
      reason,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Single publication engine used by both the Queue consumer and internal RPC. */
export async function publishApprovedIntelligence(
  env: PublicationEnv,
  input: PublicationInput,
): Promise<PublicationResult> {
  const approved = await env.DB.prepare(
    'SELECT id, status FROM intelligence_events WHERE id = ? LIMIT 1',
  ).bind(input.intelligence_id).first<{ id: string; status: string }>();
  if (!approved || (approved.status !== 'READY_TO_PUBLISH' && approved.status !== 'PUBLISHED')) {
    return { status: 'REJECTED', website_status: 'NOT_PUBLISHED', telegram_status: 'NOT_PUBLISHED' };
  }

  if (input.publication_type === 'website') {
    const duplicate = await env.DB.prepare(
      'SELECT id FROM social_assets WHERE idempotency_key = ? LIMIT 1',
    ).bind(input.idempotency_key).first<{ id: string }>();
    if (duplicate) {
      return { status: 'DUPLICATE', publication_id: duplicate.id, website_status: 'UNCHANGED', telegram_status: 'UNCHANGED' };
    }
    const article = await env.DB.prepare(
      'SELECT id FROM articles WHERE canonical_intel_event_id = ? AND is_published = 1 LIMIT 1',
    ).bind(input.intelligence_id).first<{ id: string }>();
    return article
      ? { status: 'PUBLISHED', publication_id: article.id, website_status: 'PUBLISHED', telegram_status: 'NOT_REQUESTED' }
      : { status: 'REJECTED', website_status: 'TARGET_MISSING', telegram_status: 'NOT_PUBLISHED' };
  }

  if (!env.TELEGRAM_COLLECTOR_SERVICE) {
    return { status: 'FAILED', website_status: 'NOT_REQUESTED', telegram_status: 'UNAVAILABLE' };
  }
  const article = await env.DB.prepare(
    'SELECT id, title, dek, excerpt FROM articles WHERE canonical_intel_event_id = ? AND is_published = 1 LIMIT 1',
  ).bind(input.intelligence_id).first<{ id: string; title: string; dek: string; excerpt: string }>();
  if (!article) {
    return { status: 'REJECTED', website_status: 'TARGET_MISSING', telegram_status: 'NOT_PUBLISHED' };
  }

  const message = input.custom_message || [article.title, article.dek || article.excerpt].filter(Boolean).join('\n\n');

  // 1. CLAIM — reserve the idempotency key BEFORE any outbound side effect.
  // The claim is an insert-or-reclaim: a brand-new key inserts, a key already
  // SENDING/PUBLISHED is left untouched (⇒ DUPLICATE), a key whose previous
  // attempt ended FAILED is reclaimed so a 429/5xx retry can send, and a key
  // whose claim exceeded SENDING_LEASE_SECONDS is reclaimed so a crashed
  // isolate cannot make the alert permanently unsendable.
  const candidateAssetId = `asset_tg_${crypto.randomUUID().slice(0, 10)}`;
  const claim = await env.DB.prepare(CLAIM_ASSET_SQL)
    .bind(candidateAssetId, input.intelligence_id, article.id, ASSET_FORMAT, message, input.idempotency_key)
    .first<{ id: string }>();

  const assetId = typeof claim?.id === 'string' && claim.id ? claim.id : null;
  if (!assetId) {
    const existing = await env.DB.prepare(
      'SELECT id FROM social_assets WHERE idempotency_key = ? LIMIT 1',
    ).bind(input.idempotency_key).first<{ id: string }>();
    return {
      status: 'DUPLICATE',
      publication_id: existing?.id,
      website_status: 'UNCHANGED',
      telegram_status: 'UNCHANGED',
    };
  }

  // 2. SEND — only the claim winner reaches the Telegram collector.
  let response: Response;
  try {
    response = await env.TELEGRAM_COLLECTOR_SERVICE.fetch('http://internal/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: env.TELEGRAM_TARGET_CHANNEL || 'zayronxai', message }),
    });
  } catch (err) {
    await markAssetFailed(env, assetId, 'collector_unreachable');
    return {
      status: 'FAILED',
      publication_id: assetId,
      website_status: 'NOT_REQUESTED',
      telegram_status: 'UNAVAILABLE',
      retry_after_seconds: DEFAULT_RETRY_AFTER_SECONDS,
    };
  }

  if (response.status === 429) {
    const headerSeconds = Number(response.headers.get('Retry-After'));
    const retryAfter = Number.isFinite(headerSeconds) && headerSeconds > 0
      ? Math.ceil(headerSeconds)
      : DEFAULT_RETRY_AFTER_SECONDS;
    await markAssetFailed(env, assetId, 'telegram_flood_wait');
    return {
      status: 'FAILED',
      publication_id: assetId,
      website_status: 'NOT_REQUESTED',
      telegram_status: 'RATE_LIMITED',
      retry_after_seconds: retryAfter,
    };
  }

  if (!response.ok) {
    await markAssetFailed(env, assetId, `collector_http_${response.status}`);
    return {
      status: 'FAILED',
      publication_id: assetId,
      website_status: 'NOT_REQUESTED',
      telegram_status: `FAILED_${response.status}`,
    };
  }

  // 3. COMMIT — claim transitioned to PUBLISHED.
  const result = await response.json() as { message_id?: string | number };
  const publicationId = `pub_tg_${crypto.randomUUID().slice(0, 10)}`;
  await env.DB.prepare(
    `UPDATE social_assets SET status = 'PUBLISHED', updated_at = datetime('now') WHERE id = ?`,
  ).bind(assetId).run();
  await env.DB.prepare(
    `INSERT INTO social_publications (id, asset_id, platform, external_post_id, status, attempts, published_at, created_at, updated_at)
     VALUES (?, ?, 'telegram', ?, 'PUBLISHED', 1, datetime('now'), datetime('now'), datetime('now'))`,
  ).bind(publicationId, assetId, String(result?.message_id ?? '')).run();

  await env.DB.prepare(
    `UPDATE intelligence_events SET status = 'PUBLISHED', updated_at = datetime('now') WHERE id = ?`,
  ).bind(input.intelligence_id).run();

  return {
    status: 'PUBLISHED',
    publication_id: publicationId,
    website_status: 'NOT_REQUESTED',
    telegram_status: 'PUBLISHED',
  };
}