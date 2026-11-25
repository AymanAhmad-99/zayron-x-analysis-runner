/**
 * Phase 4C — bounded executive Telegram dispatch pass.
 *
 * WHAT IT IS
 *   One pass over the ALREADY VERIFIED corpus that publishes at most
 *   `TELEGRAM_MAX_DAILY_DISPATCHES` executive posts to the configured channel.
 *   Eligible: `AUTHORITATIVE_VERIFIED` CVEs carrying an
 *   `ai_analyst_assessment.v4` brief, and canonical malware dossiers carrying a
 *   `malware_strategic_brief.v1`. Nothing else, ever.
 *
 * WHAT IT IS NOT
 *   · Not a collection path. `LEGACY_FREEZE="true"`, the Telegram collector DO
 *     and every inbound narrative pipeline are untouched and unreachable here.
 *   · Not a trust decision. The pass reads `provenance_state`; it never writes
 *     it, and it renders only what the stored brief already claims.
 *   · Not retried blindly. The ledger is the idempotency boundary: a `SENT` row
 *     permanently blocks that entity, so a cron rerun or a replayed operator
 *     request can never produce a second public post.
 *
 * Kill switch: `TELEGRAM_OUTBOUND_ENABLED="true"` only. Any other value (absent
 * included) returns `DISABLED` without a single outbound request.
 *
 * PACING — the 4-hourly cron publishes AT MOST `TELEGRAM_MAX_PER_TICK` (default
 * `1`) post, and only when no `SENT` row landed in the previous
 * `TELEGRAM_AUTOMATED_MIN_SPACING_MINUTES` (180). A tick can therefore never
 * drop a burst, whatever the corpus backlog. The operator route
 * `/internal/telegram-dispatch` passes no `automated` flag: an explicit
 * invocation is the authorised override and is still bounded by the daily cap.
 */
import {
  formatCveTelegramDispatch,
  formatMalwareTelegramDispatch,
  malwareDispatchSignals,
  validateTelegramDispatch,
  type TelegramDispatchPayload,
} from '../../../packages/intelligence/src/syndication/telegramFormatter';

export const TELEGRAM_DISPATCH_CHANNEL_VAR = 'TELEGRAM_TARGET_CHANNEL';
export const TELEGRAM_OUTBOUND_FLAG = 'TELEGRAM_OUTBOUND_ENABLED';
export const TELEGRAM_DAILY_CAP_VAR = 'TELEGRAM_MAX_DAILY_DISPATCHES';
/** PHASE 7D — the wire publishes ten business-hours slots per day. */
export const TELEGRAM_DEFAULT_DAILY_CAP = 10;
export const TELEGRAM_MAX_DAILY_CAP = 10;
export const TELEGRAM_PER_TICK_VAR = 'TELEGRAM_MAX_PER_TICK';
export const TELEGRAM_DEFAULT_PER_TICK = 1;
/** Anti-burst spacing that applies to AUTOMATED (cron) runs only. */
export const TELEGRAM_AUTOMATED_MIN_SPACING_MINUTES = 180;
export const TELEGRAM_API_BASE = 'https://api.telegram.org';

export interface TelegramDispatchEnv {
  DB: any;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_TARGET_CHANNEL?: string;
  TELEGRAM_OUTBOUND_ENABLED?: string;
  TELEGRAM_MAX_DAILY_DISPATCHES?: string;
  TELEGRAM_MAX_PER_TICK?: string;
  [key: string]: unknown;
}

export interface TelegramDispatchResult {
  entity_type: 'cve' | 'malware';
  entity_id: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  telegram_message_id: string | null;
  error_code: string | null;
  link: string | null;
  html?: string;
}

export interface TelegramDispatchSummary {
  status: 'DISABLED' | 'NO_BOT_TOKEN' | 'OK';
  channel: string;
  enabled: boolean;
  dry_run: boolean;
  daily_cap: number;
  automated: boolean;
  per_tick: number;
  min_spacing_minutes: number;
  last_sent_at: string | null;
  spacing_remaining_minutes: number;
  sent_today: number;
  remaining: number;
  dispatched: TelegramDispatchResult[];
  skipped: Array<{ entity_type: string; entity_id: string; reason: string }>;
  errors: string[];
}

/** Telegram is on only for the literal `true`; everything else is closed. */
export function telegramOutboundEnabled(env: TelegramDispatchEnv): boolean {
  return String(env?.[TELEGRAM_OUTBOUND_FLAG] ?? '').trim().toLowerCase() === 'true';
}

/** Cap is clamped to 1..6: the executive wire is high-signal, never a firehose. */
export function resolveDailyCap(env: TelegramDispatchEnv): number {
  const raw = Number(String(env?.[TELEGRAM_DAILY_CAP_VAR] ?? '').trim());
  if (!Number.isFinite(raw) || raw <= 0) return TELEGRAM_DEFAULT_DAILY_CAP;
  return Math.min(Math.max(Math.floor(raw), 1), TELEGRAM_MAX_DAILY_CAP);
}

/**
 * Per-tick ceiling. Default 1 and clamped to 1..dailyCap, so a single cron
 * invocation can never publish two posts even if the corpus has a backlog.
 */
export function resolvePerTick(env: TelegramDispatchEnv, dailyCap = resolveDailyCap(env)): number {
  const ceiling = Math.max(1, Math.floor(dailyCap));
  const raw = Number(String(env?.[TELEGRAM_PER_TICK_VAR] ?? '').trim());
  if (!Number.isFinite(raw) || raw <= 0) return Math.min(TELEGRAM_DEFAULT_PER_TICK, ceiling);
  return Math.min(Math.max(Math.floor(raw), 1), ceiling);
}

/** `zayronxai` → `@zayronxai`; an explicit `@…` or numeric chat id is kept. */
export function resolveChatId(env: TelegramDispatchEnv): string {
  const raw = String(env?.[TELEGRAM_DISPATCH_CHANNEL_VAR] ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('@') || /^-?\d+$/.test(raw)) return raw;
  return `@${raw}`;
}

/**
 * CVE selection: verified + current brief, never dispatched, highest operational
 * urgency first (KEV, then the deterministic priority band, then EPSS/CVSS).
 */
export const TELEGRAM_CVE_SELECTION_SQL = `
  SELECT cve_id, severity, cvss_score, epss_score, epss_percentile, is_exploited_in_wild,
         kev_due_date, affected_vendor, affected_product, cwe_ids_json, affected_versions_json,
         ssvc_json, public_poc_status, strategic_brief_json
  FROM vulnerabilities
  WHERE provenance_state = 'AUTHORITATIVE_VERIFIED'
    AND strategic_brief_version = 'ai_analyst_assessment.v4'
    AND COALESCE(strategic_brief_json, '') <> ''
    AND NOT EXISTS (
      SELECT 1 FROM telegram_dispatches d
       WHERE d.entity_type = 'cve' AND d.entity_id = vulnerabilities.cve_id
         AND d.channel = ? AND d.status IN ('SENT', 'SKIPPED')
    )
  ORDER BY (CASE WHEN is_exploited_in_wild = 1 THEN 0 ELSE 1 END) ASC,
           (CASE json_extract(strategic_brief_json, '$.operational_prioritization.priority')
                 WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END) ASC,
           COALESCE(epss_score, 0) DESC,
           COALESCE(cvss_score, 0) DESC,
           cve_id ASC
  LIMIT ?`;

/** Malware selection: canonical dossier + `v1` brief, never dispatched. */
export const TELEGRAM_MALWARE_SELECTION_SQL = `
  SELECT id, sha256, family, severity, source, published_at, report_json, strategic_brief_json
  FROM malware_reports
  WHERE strategic_brief_version = 'malware_strategic_brief.v1'
    AND COALESCE(strategic_brief_json, '') <> ''
    AND NOT EXISTS (
      SELECT 1 FROM telegram_dispatches d
       WHERE d.entity_type = 'malware' AND d.entity_id = malware_reports.id
         AND d.channel = ? AND d.status IN ('SENT', 'SKIPPED')
    )
  ORDER BY COALESCE(published_at, created_at) DESC, id ASC
  LIMIT ?`;

export const TELEGRAM_DAILY_COUNT_SQL = `
  SELECT COUNT(*) AS total FROM telegram_dispatches
   WHERE channel = ? AND status = 'SENT' AND substr(dispatched_at, 1, 10) = ?`;

/** Newest public post on the channel: the anti-burst clock for cron runs. */
export const TELEGRAM_LAST_SENT_SQL = `
  SELECT MAX(dispatched_at) AS last_sent_at FROM telegram_dispatches
   WHERE channel = ? AND status = 'SENT'`;

/** D1 can echo `YYYY-MM-DD HH:MM:SS.sss`; without this `Date.parse` reads it as
 *  local time and the 180-minute guard would drift by the colo's offset. */
function parseDispatchedAt(raw: string): number {
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
  return Date.parse(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
}

export const parseJson = <T>(raw: unknown, fallback: T): T => {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
};

export const stringArray = (raw: unknown): string[] => {
  const parsed = parseJson<unknown>(raw, []);
  return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
};

/** A dossier is worth a public post only when it carries grounded signal. */
export function isDispatchableDossier(signals: {
  capability_candidates: number;
  primary_network_indicators: number;
  family: string | null;
}): boolean {
  if (signals.family) return true;
  return signals.capability_candidates >= 5 || signals.primary_network_indicators >= 1;
}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  html: string,
  fetchFn: typeof fetch,
): Promise<{ ok: boolean; messageId: string | null; errorCode: string | null }> {
  try {
    const response = await fetchFn(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        // Zero raw URLs, zero previews: the anchor is the only navigation.
        link_preview_options: { is_disabled: true },
        disable_web_page_preview: true,
      }),
    });
    const payload = await response.json().catch(() => null) as {
      ok?: boolean;
      result?: { message_id?: number };
      error_code?: number;
      description?: string;
    } | null;
    if (response.ok && payload?.ok === true) {
      const messageId = payload?.result?.message_id;
      return { ok: true, messageId: messageId != null ? String(messageId) : null, errorCode: null };
    }
    // Never log the token: only the status and Telegram's own error class.
    const code = payload?.error_code != null
      ? `TELEGRAM_${payload.error_code}`
      : `TELEGRAM_HTTP_${response.status}`;
    return { ok: false, messageId: null, errorCode: code };
  } catch (error) {
    return { ok: false, messageId: null, errorCode: `TELEGRAM_UNREACHABLE:${String((error as Error)?.message || error).slice(0, 80)}` };
  }
}

/**
 * One bounded dispatch pass.
 *
 * `dryRun` renders the exact payloads and returns them WITHOUT any outbound
 * request and WITHOUT a ledger write, so the operator can review the HTML first.
 */
export async function runTelegramDispatchPass(
  env: TelegramDispatchEnv,
  options: {
    dryRun?: boolean;
    limit?: number;
    entityType?: 'cve' | 'malware' | 'both';
    /** Cron path: applies the per-tick ceiling and the anti-burst spacing. */
    automated?: boolean;
    fetchFn?: typeof fetch;
  } = {},
): Promise<TelegramDispatchSummary> {
  const fetchFn = options.fetchFn ?? fetch;
  const channel = resolveChatId(env);
  const dailyCap = resolveDailyCap(env);
  const perTick = resolvePerTick(env, dailyCap);
  const automated = options.automated === true;
  const dryRun = options.dryRun === true;
  const requested = Number(options.limit);
  // An automated pass is additionally capped at one post per tick; the operator
  // route keeps the full daily ceiling and can ask for more explicitly.
  const runCeiling = automated ? Math.min(dailyCap, perTick) : dailyCap;
  const limit = Number.isFinite(requested) && requested > 0 ? Math.min(Math.floor(requested), runCeiling) : runCeiling;
  const entityType = options.entityType === 'cve' || options.entityType === 'malware' ? options.entityType : 'both';

  const summary: TelegramDispatchSummary = {
    status: 'OK',
    channel,
    enabled: telegramOutboundEnabled(env),
    dry_run: dryRun,
    daily_cap: dailyCap,
    automated,
    per_tick: perTick,
    min_spacing_minutes: TELEGRAM_AUTOMATED_MIN_SPACING_MINUTES,
    last_sent_at: null,
    spacing_remaining_minutes: 0,
    sent_today: 0,
    remaining: 0,
    dispatched: [],
    skipped: [],
    errors: [],
  };

  if (!channel) {
    summary.status = 'DISABLED';
    summary.errors.push('TELEGRAM_TARGET_CHANNEL_UNSET');
    return summary;
  }

  const today = new Date().toISOString().slice(0, 10);
  const countRow = await env.DB.prepare(TELEGRAM_DAILY_COUNT_SQL)
    .bind(channel, today).first().catch(() => null) as { total?: number } | null;
  summary.sent_today = Number(countRow?.total ?? 0) || 0;
  summary.remaining = Math.max(0, dailyCap - summary.sent_today);

  // ── Eligibility ────────────────────────────────────────────────────────────
  // `dryRun` is allowed while the wire is closed (that is how the operator
  // reviews the first payload). A live run requires the flag AND a token.
  const token = String(env?.TELEGRAM_BOT_TOKEN ?? '').trim();
  if (!dryRun) {
    if (!summary.enabled) {
      summary.status = 'DISABLED';
      return summary;
    }
    if (!token) {
      summary.status = 'NO_BOT_TOKEN';
      summary.errors.push('TELEGRAM_BOT_TOKEN_UNSET');
      return summary;
    }
    if (summary.remaining <= 0) {
      summary.skipped.push({ entity_type: 'all', entity_id: 'all', reason: 'DAILY_CAP_REACHED' });
      return summary;
    }
    // ── Anti-burst spacing (automated only) ──────────────────────────────────
    // The cron is every 4 hours, so nominal ticks are already 240 minutes
    // apart. This guard exists for the abnormal cases — a retried or doubled
    // invocation, a manual deploy-triggered tick, a backlog drain — where two
    // runs land close together and would otherwise publish back-to-back.
    if (automated && TELEGRAM_AUTOMATED_MIN_SPACING_MINUTES > 0) {
      const lastRow = await env.DB.prepare(TELEGRAM_LAST_SENT_SQL)
        .bind(channel).first().catch(() => null) as { last_sent_at?: string | null } | null;
      summary.last_sent_at = lastRow?.last_sent_at ? String(lastRow.last_sent_at) : null;
      if (summary.last_sent_at) {
        const elapsedMs = Date.now() - parseDispatchedAt(summary.last_sent_at);
        const spacingMs = TELEGRAM_AUTOMATED_MIN_SPACING_MINUTES * 60 * 1000;
        if (Number.isFinite(elapsedMs) && elapsedMs < spacingMs) {
          summary.spacing_remaining_minutes = Math.ceil((spacingMs - elapsedMs) / 60000);
          summary.skipped.push({ entity_type: 'all', entity_id: 'all', reason: 'AUTOMATED_SPACING_COOLDOWN' });
          return summary;
        }
      }
    }
  }

  const budget = dryRun ? Math.min(limit, 3) : Math.min(limit, summary.remaining);
  const payloads: TelegramDispatchPayload[] = [];

  if (entityType !== 'malware') {
    const rows = await env.DB.prepare(TELEGRAM_CVE_SELECTION_SQL)
      .bind(channel, budget).all().catch(() => ({ results: [] })) as { results?: any[] };
    for (const row of (rows.results ?? []).slice(0, budget)) {
      const brief = parseJson<Record<string, any> | null>(row?.strategic_brief_json, null);
      if (!brief) {
        summary.skipped.push({ entity_type: 'cve', entity_id: String(row?.cve_id ?? ''), reason: 'BRIEF_UNPARSEABLE' });
        continue;
      }
      const ssvc = parseJson<Record<string, any> | null>(row?.ssvc_json, null);
      payloads.push(formatCveTelegramDispatch({
        cve_id: String(row?.cve_id ?? ''),
        severity: row?.severity ?? null,
        cvss_score: row?.cvss_score ?? null,
        epss_score: row?.epss_score ?? null,
        epss_percentile: row?.epss_percentile ?? null,
        known_exploited: Number(row?.is_exploited_in_wild ?? 0) === 1,
        kev_due_date: row?.kev_due_date ?? null,
        vendor: row?.affected_vendor ?? null,
        product: row?.affected_product ?? null,
        cwe_ids: stringArray(row?.cwe_ids_json),
        affected_versions: stringArray(row?.affected_versions_json),
        cisa_ssvc: ssvc && typeof ssvc === 'object'
          ? { automatable: ssvc.automatable ?? null, technical_impact: ssvc.technical_impact ?? null }
          : null,
        public_poc_status: row?.public_poc_status ?? null,
        brief: brief as any,
      }));
    }
  }

  if (entityType !== 'cve' && payloads.length < budget) {
    const rows = await env.DB.prepare(TELEGRAM_MALWARE_SELECTION_SQL)
      .bind(channel, budget - payloads.length).all().catch(() => ({ results: [] })) as { results?: any[] };
    for (const row of (rows.results ?? []).slice(0, budget - payloads.length)) {
      const report = parseJson<Record<string, any> | null>(row?.report_json, null);
      const brief = parseJson<Record<string, any> | null>(row?.strategic_brief_json, null);
      const reportId = String(row?.id ?? '');
      if (!brief) {
        summary.skipped.push({ entity_type: 'malware', entity_id: reportId, reason: 'BRIEF_UNPARSEABLE' });
        continue;
      }
      const signals = malwareDispatchSignals(report);
      const sha256 = signals.sha256 || String(row?.sha256 ?? '').trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(sha256)) {
        summary.skipped.push({ entity_type: 'malware', entity_id: reportId, reason: 'SHA256_INVALID' });
        continue;
      }
      if (!isDispatchableDossier(signals)) {
        summary.skipped.push({ entity_type: 'malware', entity_id: reportId, reason: 'THIN_LOW_SIGNAL_DOSSIER' });
        continue;
      }
      payloads.push(formatMalwareTelegramDispatch({
        report_id: reportId,
        sha256,
        family: signals.family ?? (row?.family ?? null),
        severity: row?.severity ?? null,
        format_class: report?.sample_identity?.format_class ?? null,
        capability_candidates: signals.capability_candidates,
        primary_network_indicators: signals.primary_network_indicators,
        brief: brief as any,
      }));
    }
  }

  if (payloads.length === 0) {
    summary.skipped.push({ entity_type: 'all', entity_id: 'all', reason: 'NOTHING_ELIGIBLE' });
    return summary;
  }

  // ── Render gate ────────────────────────────────────────────────────────────
  const valid: TelegramDispatchPayload[] = [];
  for (const payload of payloads) {
    const errors = validateTelegramDispatch(payload.html, payload.hashtags);
    if (errors.length > 0) {
      summary.errors.push(`RENDER_REJECTED:${payload.entity_id}:${errors.join(',')}`);
      summary.skipped.push({ entity_type: payload.entity_type, entity_id: payload.entity_id, reason: 'RENDER_REJECTED' });
      // A render rejection is an OPERATOR-visible event, not a silent drop: the
      // entity stays eligible (no ledger row is written) but the exact validator
      // failures are emitted so a high-impact CVE is never lost without a trace.
      console.warn(JSON.stringify({
        type: 'TELEGRAM_RENDER_REJECTED',
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        errors,
      }));
      continue;
    }
    valid.push(payload);
  }

  if (dryRun) {
    summary.dispatched = valid.map((payload) => ({
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      status: 'SKIPPED' as const,
      telegram_message_id: null,
      error_code: 'DRY_RUN',
      link: null,
      html: payload.html,
    }));
    return summary;
  }

  // ── Live dispatch, bounded by the cap ───────────────────────────────────────
  let sentThisRun = 0;
  for (const payload of valid) {
    if (sentThisRun >= summary.remaining) {
      summary.skipped.push({ entity_type: payload.entity_type, entity_id: payload.entity_id, reason: 'DAILY_CAP_REACHED' });
      continue;
    }
    const send = await sendTelegramMessage(token, channel, payload.html, fetchFn);
    const dispatchedAt = new Date().toISOString();
    const messageId = send.messageId;
    const link = messageId ? `https://t.me/${channel.replace(/^@/, '')}/${messageId}` : null;
    await env.DB.prepare(
      `INSERT INTO telegram_dispatches (id, entity_type, entity_id, channel, telegram_message_id, status, error_code, dispatched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(entity_type, entity_id, channel) DO UPDATE SET
         telegram_message_id = excluded.telegram_message_id,
         status = excluded.status,
         error_code = excluded.error_code,
         dispatched_at = excluded.dispatched_at`,
    ).bind(
      `td_${crypto.randomUUID().slice(0, 16)}`,
      payload.entity_type,
      payload.entity_id,
      channel,
      messageId,
      send.ok ? 'SENT' : 'FAILED',
      send.errorCode,
      dispatchedAt,
    ).run().catch((error: unknown) => {
      summary.errors.push(`LEDGER_WRITE_FAILED:${payload.entity_id}:${String((error as Error)?.message || error).slice(0, 80)}`);
    });

    if (send.ok) {
      sentThisRun += 1;
      summary.sent_today += 1;
      summary.remaining = Math.max(0, dailyCap - summary.sent_today);
    } else {
      summary.errors.push(`SEND_FAILED:${payload.entity_id}:${send.errorCode}`);
    }
    summary.dispatched.push({
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      status: send.ok ? 'SENT' : 'FAILED',
      telegram_message_id: messageId,
      error_code: send.errorCode,
      link,
    });
  }

  return summary;
}
