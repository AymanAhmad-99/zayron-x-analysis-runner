/**
 * PHASE 7D — the 10-slot EU/US business-hours Telegram wire.
 *
 * `telegramDispatch.ts` keeps the bounded operator pass (one post per tick, a
 * 180-minute anti-burst spacing). The scheduled tick calls THIS module instead:
 * it resolves exactly ONE fixed UTC slot, renders that slot's entity, and
 * dispatches it. The ledger stays the idempotency boundary, so a replayed tick
 * can never publish a second copy.
 */
import {
  formatCveTelegramDispatch,
  formatMalwareTelegramDispatch,
  malwareDispatchSignals,
  validateTelegramDispatch,
  type TelegramDispatchPayload,
} from '../../../packages/intelligence/src/syndication/telegramFormatter';
import {
  clampTelegramCaption,
  defangIndicator,
  formatIocTelegramDispatch,
  formatPulseTelegramDispatch,
} from '../../../packages/intelligence/src/syndication/telegramWire';
import {
  TELEGRAM_API_BASE,
  TELEGRAM_CVE_SELECTION_SQL,
  TELEGRAM_DAILY_COUNT_SQL,
  TELEGRAM_MALWARE_SELECTION_SQL,
  isDispatchableDossier,
  normalizeTelegramEntityId,
  parseJson,
  resolveChatId,
  resolveDailyCap,
  sendTelegramMessage,
  stringArray,
  telegramOutboundEnabled,
  type TelegramDispatchEnv,
} from './telegramDispatch';
import {
  isBreakingP0,
  isTelegramQuietHours,
  resolveTelegramWireSlot,
  withBreakingPrefix,
  type TelegramWireSlot,
  type TelegramWireSlotKind,
} from './telegramSlots';

export const TELEGRAM_WIRE_ORIGIN = 'https://zayron-x.co';

export const TELEGRAM_ACTIVE_IOC_COUNTS_SQL = `
  SELECT COUNT(*) AS total,
         SUM(CASE WHEN confidence >= 85 THEN 1 ELSE 0 END) AS edl
    FROM iocs WHERE status = 'ACTIVE'`;

export const TELEGRAM_ACTIVE_IOC_TOP_FAMILY_SQL = `
  SELECT family, COUNT(*) AS count FROM iocs
   WHERE status = 'ACTIVE' AND family IS NOT NULL AND family <> ''
   GROUP BY family ORDER BY count DESC, family ASC LIMIT 1`;

export const TELEGRAM_ACTIVE_IOC_TOP_FAMILIES_SQL = `
  SELECT family, COUNT(*) AS count FROM iocs
   WHERE status = 'ACTIVE' AND family IS NOT NULL AND family <> ''
   GROUP BY family ORDER BY count DESC, family ASC LIMIT 3`;

export const TELEGRAM_TOP_IOCS_SQL = `
  SELECT type, normalized_value, confidence, family, sources_json FROM iocs
   WHERE status = 'ACTIVE'
   ORDER BY confidence DESC, COALESCE(seen_count, 0) DESC, updated_at DESC
   LIMIT ?`;

export const TELEGRAM_LATEST_RADAR_PULSE_SQL =
  `SELECT pulse_date FROM radar_pulses ORDER BY pulse_date DESC LIMIT 1`;

export interface TelegramWireResult {
  status: 'SKIPPED' | 'SENT' | 'FAILED' | 'DRY_RUN' | 'DISABLED';
  slot: string | null;
  index: number | null;
  kind: TelegramWireSlotKind | null;
  visual: boolean;
  entity_type: 'cve' | 'malware' | null;
  entity_id: string | null;
  message_id: string | null;
  reason: string | null;
  html?: string;
  caption?: string;
  errors: string[];
}

interface TelegramApiEnvelope {
  ok?: boolean;
  result?: { message_id?: number };
  error_code?: number;
}

/**
 * `sendPhoto` with a GRACEFUL fallback: a card that fails to render, 404s, or is
 * rejected by Telegram degrades to the exact same post as `sendMessage`, so a
 * slot never goes silent because of the image.
 */
export async function sendTelegramPhoto(
  token: string,
  chatId: string,
  photoUrl: string,
  caption: string,
  fullHtml: string,
  fetchFn: typeof fetch,
): Promise<{ ok: boolean; messageId: string | null; errorCode: string | null; viaPhoto: boolean }> {
  try {
    const response = await fetchFn(`${TELEGRAM_API_BASE}/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: 'HTML' }),
    });
    const payload = (await response.json().catch(() => null)) as TelegramApiEnvelope | null;
    if (response.ok && payload?.ok === true) {
      const id = payload?.result?.message_id;
      return { ok: true, messageId: id != null ? String(id) : null, errorCode: null, viaPhoto: true };
    }
  } catch {
    /* fall through to sendMessage */
  }
  const fallback = await sendTelegramMessage(token, chatId, fullHtml, fetchFn);
  return { ...fallback, viaPhoto: false };
}

/** The card served for this payload — the same one social platforms render. */
export function ogImageFor(
  entityType: 'cve' | 'malware',
  entityId: string,
  kind: TelegramWireSlotKind,
): string {
  if (kind === 'ioc' || kind === 'radar') return `${TELEGRAM_WIRE_ORIGIN}/api/og/ioc-pulse`;
  if (entityType === 'malware') {
    return `${TELEGRAM_WIRE_ORIGIN}/api/og/malware/${encodeURIComponent(entityId)}`;
  }
  return `${TELEGRAM_WIRE_ORIGIN}/api/og/cve/${encodeURIComponent(entityId)}`;
}

/** One CVE payload from the verified, never-dispatched pool. */
export async function renderCveWirePayload(
  env: TelegramDispatchEnv,
  channel: string,
): Promise<TelegramDispatchPayload | null> {
  const rows = await env.DB.prepare(TELEGRAM_CVE_SELECTION_SQL)
    .bind(channel, 1)
    .all()
    .catch(() => ({ results: [] })) as { results?: any[] };
  const row = (rows.results ?? [])[0];
  if (!row) return null;
  const brief = parseJson<Record<string, any> | null>(row?.strategic_brief_json, null);
  if (!brief) return null;
  const ssvc = parseJson<Record<string, any> | null>(row?.ssvc_json, null);

  // Quiet hours may only be broken by a breaking P0. A never-dispatched CVE that
  // is already on CISA KEV is, by definition, newly surfaced to this wire.
  const priority = String(brief?.operational_prioritization?.priority ?? '');
  const breaking = isBreakingP0({
    kevNewlyFlagged: Number(row?.is_exploited_in_wild ?? 0) === 1,
    priority,
    epssScore: row?.epss_score ?? null,
  });

  const payload = formatCveTelegramDispatch({
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
  });

  if (!breaking) return payload;
  return { ...payload, html: withBreakingPrefix(payload.html) };
}

async function renderMalwareWirePayload(
  env: TelegramDispatchEnv,
  channel: string,
): Promise<TelegramDispatchPayload | null> {
  const rows = await env.DB.prepare(TELEGRAM_MALWARE_SELECTION_SQL)
    .bind(channel, 1)
    .all()
    .catch(() => ({ results: [] })) as { results?: any[] };
  const row = (rows.results ?? [])[0];
  if (!row) return null;
  const report = parseJson<Record<string, any> | null>(row?.report_json, null);
  const brief = parseJson<Record<string, any> | null>(row?.strategic_brief_json, null);
  if (!brief) return null;
  const signals = malwareDispatchSignals(report);
  const sha256 = signals.sha256 || String(row?.sha256 ?? '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(sha256)) return null;
  if (!isDispatchableDossier(signals)) return null;
  return formatMalwareTelegramDispatch({
    report_id: String(row?.id ?? ''),
    sha256,
    family: signals.family ?? (row?.family ?? null),
    severity: row?.severity ?? null,
    format_class: report?.sample_identity?.format_class ?? null,
    capability_candidates: signals.capability_candidates,
    primary_network_indicators: signals.primary_network_indicators,
    brief: brief as any,
  });
}

async function renderIocWirePayload(
  env: TelegramDispatchEnv,
  edition: string,
): Promise<TelegramDispatchPayload | null> {
  const counts = await env.DB.prepare(TELEGRAM_ACTIVE_IOC_COUNTS_SQL)
    .first().catch(() => null) as { total?: number; edl?: number } | null;
  const topFamily = await env.DB.prepare(TELEGRAM_ACTIVE_IOC_TOP_FAMILY_SQL)
    .first().catch(() => null) as { family?: string } | null;
  const rows = await env.DB.prepare(TELEGRAM_TOP_IOCS_SQL)
    .bind(5).all().catch(() => ({ results: [] })) as { results?: any[] };
  const indicators = (rows.results ?? []).map((row) => ({
    type: String(row?.type ?? ''),
    value: String(row?.normalized_value ?? ''),
    confidence: Number(row?.confidence ?? 0),
    family: row?.family ?? null,
    sources: stringArray(row?.sources_json),
  })).filter((item) => item.value);
  if (indicators.length === 0) return null;
  return formatIocTelegramDispatch({
    indicators,
    activeTotal: Number(counts?.total ?? 0) || 0,
    edlReady: Number(counts?.edl ?? 0) || 0,
    topFamily: topFamily?.family ? String(topFamily.family) : null,
    edition,
  });
}

async function renderPulseWirePayload(env: TelegramDispatchEnv): Promise<TelegramDispatchPayload | null> {
  const counts = await env.DB.prepare(TELEGRAM_ACTIVE_IOC_COUNTS_SQL)
    .first().catch(() => null) as { total?: number; edl?: number } | null;
  if (!counts || !Number(counts.total)) return null;
  const pulse = await env.DB.prepare(TELEGRAM_LATEST_RADAR_PULSE_SQL)
    .first().catch(() => null) as { pulse_date?: string } | null;
  const families = await env.DB.prepare(TELEGRAM_ACTIVE_IOC_TOP_FAMILIES_SQL)
    .all().catch(() => ({ results: [] })) as { results?: any[] };
  const list = (families.results ?? []).map((row) => ({
    family: String(row?.family ?? ''),
    count: Number(row?.count ?? 0) || 0,
  })).filter((entry) => entry.family);
  return formatPulseTelegramDispatch({
    pulseDate: pulse?.pulse_date ? String(pulse.pulse_date) : null,
    activeTotal: Number(counts.total) || 0,
    edlReady: Number(counts.edl ?? 0) || 0,
    topFamily: list[0]?.family ?? null,
    confidence: null,
    families: list,
  });
}

/**
 * Dispatch the slot that owns `when` — the ONLY entry point the cron uses.
 *
 *   1. no slot at this minute → quiet hours? then ONLY a breaking P0 CVE may
 *      publish (prefixed `[BREAKING P0]`), otherwise nothing happens;
 *   2. a malware / IOC / radar slot with no unseen item falls back to the
 *      highest-priority un-dispatched briefed CVE, so no slot goes silent;
 *   3. visual slots use `sendPhoto` and degrade to `sendMessage`.
 */
export async function runTelegramWireSlot(
  env: TelegramDispatchEnv,
  options: { when?: Date; dryRun?: boolean; fetchFn?: typeof fetch } = {},
): Promise<TelegramWireResult> {
  const when = options.when ?? new Date();
  const dryRun = options.dryRun === true;
  const fetchFn = options.fetchFn ?? fetch;
  const channel = resolveChatId(env);
  const result: TelegramWireResult = {
    status: 'SKIPPED',
    slot: null,
    index: null,
    kind: null,
    visual: false,
    entity_type: null,
    entity_id: null,
    message_id: null,
    reason: null,
    errors: [],
  };

  if (!channel) {
    return { ...result, status: 'DISABLED', reason: 'TELEGRAM_TARGET_CHANNEL_UNSET' };
  }

  const slot: TelegramWireSlot | null = resolveTelegramWireSlot(when);
  if (!slot) {
    if (!isTelegramQuietHours(when)) return { ...result, reason: 'NO_SLOT' };
    const payload = await renderCveWirePayload(env, channel);
    if (!payload || !payload.html.startsWith('<b>[BREAKING P0]</b>')) {
      return { ...result, reason: 'QUIET_HOURS' };
    }
    return finishWireDispatch(env, channel, payload, { slot: null, kind: 'cve', visual: false, dryRun, fetchFn, result });
  }

  result.slot = slot.utc;
  result.index = slot.index;
  result.kind = slot.kind;
  result.visual = slot.visual;

  let payload: TelegramDispatchPayload | null = null;
  if (slot.kind === 'malware') payload = await renderMalwareWirePayload(env, channel);
  else if (slot.kind === 'ioc') payload = await renderIocWirePayload(env, slot.index === 4 ? '#1' : '#2');
  else if (slot.kind === 'radar') payload = await renderPulseWirePayload(env);

  if (!payload) {
    payload = await renderCveWirePayload(env, channel);
    if (payload) result.errors.push(`FALLBACK_TO_CVE:${slot.kind}`);
  }
  if (!payload) return { ...result, reason: 'NOTHING_ELIGIBLE' };

  return finishWireDispatch(env, channel, payload, {
    slot,
    kind: slot.kind,
    visual: slot.visual,
    dryRun,
    fetchFn,
    result,
  });
}

async function finishWireDispatch(
  env: TelegramDispatchEnv,
  channel: string,
  payload: TelegramDispatchPayload,
  ctx: {
    slot: TelegramWireSlot | null;
    kind: TelegramWireSlotKind;
    visual: boolean;
    dryRun: boolean;
    fetchFn: typeof fetch;
    result: TelegramWireResult;
  },
): Promise<TelegramWireResult> {
  const { result, dryRun } = ctx;
  result.entity_type = payload.entity_type;
  result.entity_id = payload.entity_id;

  const errors = validateTelegramDispatch(payload.html, payload.hashtags);
  const caption = clampTelegramCaption(payload.html);
  result.caption = caption;
  if (errors.length > 0) {
    console.warn(JSON.stringify({
      type: 'TELEGRAM_WIRE_RENDER_REJECTED',
      slot: ctx.slot?.utc ?? null,
      entity_id: payload.entity_id,
      errors,
    }));
    return { ...result, status: 'FAILED', reason: `RENDER_REJECTED:${errors.join(',')}` };
  }
  if (dryRun) return { ...result, status: 'DRY_RUN', html: payload.html };

  const token = String(env?.TELEGRAM_BOT_TOKEN ?? '').trim();
  if (!telegramOutboundEnabled(env)) {
    return { ...result, status: 'DISABLED', reason: 'TELEGRAM_OUTBOUND_DISABLED' };
  }
  if (!token) return { ...result, status: 'DISABLED', reason: 'TELEGRAM_BOT_TOKEN_UNSET' };

  // The daily ceiling still applies to the wire (10 slots = 10 posts).
  const dailyCap = resolveDailyCap(env);
  const today = new Date().toISOString().slice(0, 10);
  const countRow = await env.DB.prepare(TELEGRAM_DAILY_COUNT_SQL)
    .bind(channel, today).first().catch(() => null) as { total?: number } | null;
  if ((Number(countRow?.total ?? 0) || 0) >= dailyCap) {
    return { ...result, status: 'SKIPPED', reason: 'DAILY_CAP_REACHED' };
  }

  const photoUrl = ogImageFor(payload.entity_type, payload.entity_id, ctx.kind);
  const send = ctx.visual
    ? await sendTelegramPhoto(token, channel, photoUrl, caption, payload.html, ctx.fetchFn)
    : { ...(await sendTelegramMessage(token, channel, payload.html, ctx.fetchFn)), viaPhoto: false };

  const dispatchedAt = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO telegram_dispatches (id, entity_type, entity_id, base_entity_id, channel, telegram_message_id, status, error_code, delivery_mode, dispatched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(entity_type, entity_id, channel) DO UPDATE SET
       base_entity_id = excluded.base_entity_id,
       telegram_message_id = excluded.telegram_message_id,
       status = excluded.status,
       error_code = excluded.error_code,
       delivery_mode = excluded.delivery_mode,
       dispatched_at = excluded.dispatched_at`,
  ).bind(
    `td_${crypto.randomUUID().slice(0, 16)}`,
    payload.entity_type,
    // The schema only allows 'cve'/'malware'; a wire slot namespaces the id so
    // IOC/radar editions are idempotent per slot per day. `base_entity_id` is
    // the NORMALIZED key every dedupe decision reads (Phase 8A), so the same
    // advisory can never be published again from another slot.
    ctx.slot ? `${payload.entity_id}@${ctx.slot.utc}` : payload.entity_id,
    normalizeTelegramEntityId(payload.entity_id),
    channel,
    send.messageId,
    send.ok ? 'SENT' : 'FAILED',
    send.errorCode,
    send.viaPhoto ? 'photo' : 'text',
    dispatchedAt,
  ).run().catch((error: unknown) => {
    result.errors.push(`LEDGER_WRITE_FAILED:${String((error as Error)?.message || error).slice(0, 80)}`);
  });

  return {
    ...result,
    status: send.ok ? 'SENT' : 'FAILED',
    message_id: send.messageId,
    html: payload.html,
    errors: send.ok ? result.errors : [...result.errors, `SEND_FAILED:${send.errorCode}`],
    reason: send.ok ? null : send.errorCode,
  };
}

export { defangIndicator };
