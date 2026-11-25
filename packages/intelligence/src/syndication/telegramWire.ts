/**
 * PHASE 7D — institutional wire renderers for the non-CVE slots.
 *
 * The CVE and malware renderers live in `telegramFormatter.ts`; this module adds
 * the two kinds the 10-slot day also publishes (an ACTIVE IOC / C2 brief and the
 * global radar pulse) plus the caption clamp the four `sendPhoto` slots need.
 *
 * Invariants, enforced here and re-checked by `validateTelegramDispatch`:
 *   · every indicator is DEFANGED (`hxxp://`, `[.]`) — never a clickable hazard;
 *   · no raw URL outside an anchor attribute;
 *   · ≥ 5 hashtags including `#USA`, `#CyberSecurity` and `#ThreatIntel`.
 */
import {
  TELEGRAM_CHANNEL_HANDLE,
  TELEGRAM_HAIRLINE,
  TELEGRAM_MANDATORY_HASHTAGS,
  TELEGRAM_MAX_HASHTAGS,
  composeHashtags,
  escapeTelegramHtml,
  sanitizeHashtagToken,
  type TelegramDispatchPayload,
} from './telegramFormatter';

export const TELEGRAM_PHOTO_CAPTION_MAX_CHARS = 1024;
export const TELEGRAM_DEVELOPERS_URL = 'https://zayron-x.co/developers';
export const TELEGRAM_IOCS_URL = 'https://zayron-x.co/intelligence/iocs';
export const TELEGRAM_IOC_FAMILIES_URL = 'https://zayron-x.co/intelligence/malware';

/**
 * Defang ANY indicator before it can reach a public surface.
 *
 * Idempotent: an already-defanged value (`hxxp://`, `[.]`) passes through
 * unchanged, so a stored-then-rendered value is never double-mangled.
 */
export function defangIndicator(value: unknown): string {
  let out = String(value ?? '').trim();
  if (!out) return '';
  out = out.replace(/^https?:\/\//i, (scheme) => scheme.replace(/tt/gi, 'xx'));
  // Protect already-bracketed dots so the transform is idempotent (a stored
  // defanged value must not become `evil[[.]]example`).
  const sentinel = '\u0000';
  out = out.split('[.]').join(sentinel).split('.').join('[.]');
  return out.split(sentinel).join('[.]');
}

export interface IocWireIndicator {
  type: string;
  value: string;
  confidence?: number | null;
  family?: string | null;
  sources?: string[];
}

export interface IocWireRecord {
  indicators: IocWireIndicator[];
  activeTotal: number;
  edlReady: number;
  topFamily: string | null;
  /** `#1` / `#2` — the slot label, so two daily briefs are distinguishable. */
  edition: string;
}

/** ACTIVE IOC / C2 brief. Text or photo caption (the caller clamps). */
export function formatIocTelegramDispatch(record: IocWireRecord): TelegramDispatchPayload {
  const edition = String(record?.edition ?? '').trim() || '#1';
  const indicators = (record?.indicators ?? [])
    .filter((item) => item && String(item.value ?? '').trim())
    .slice(0, 5);
  const topFamily = String(record?.topFamily ?? '').trim();

  const hashtags = composeHashtags([
    ...TELEGRAM_MANDATORY_HASHTAGS,
    '#IOC',
    '#ThreatIntel',
    '#SOC',
    topFamily ? `#${sanitizeHashtagToken(topFamily)}` : null,
  ]);

  const lines = [
    `<b>ZAYRON-X | ACTIVE IOC / C2 BRIEF ${escapeTelegramHtml(edition)}</b>`,
    `<b>${Number(record?.activeTotal) || 0}</b> active indicators · <b>${Number(record?.edlReady) || 0}</b> firewall-ready (EDL ≥ 85)`,
    topFamily ? `▸ <b>Top family (24h)</b>: ${escapeTelegramHtml(topFamily)}` : '▸ <b>Top family (24h)</b>: unresolved',
    TELEGRAM_HAIRLINE,
    '<b>INDICATORS</b> <i>(defanged — never clickable)</i>',
    ...indicators.map(
      (item) =>
        `▸ <code>${escapeTelegramHtml(defangIndicator(item.value))}</code> · ${escapeTelegramHtml(String(item.type ?? '').toUpperCase())} · conf ${Math.round(Number(item.confidence) || 0)}`,
    ),
    TELEGRAM_HAIRLINE,
    `↳ <a href="${TELEGRAM_IOCS_URL}"><u>Browse the live IOC workbench ↗</u></a>`,
    `↳ <a href="${TELEGRAM_DEVELOPERS_URL}"><u>Automate via EDL / STIX API ↗</u></a>`,
    TELEGRAM_CHANNEL_HANDLE,
    hashtags.join(' '),
  ];

  return {
    entity_type: 'cve',
    entity_id: `ioc:${edition}`,
    html: lines.join('\n'),
    hashtags,
    url: TELEGRAM_IOCS_URL,
    priority: null,
  };
}

export interface PulseWireRecord {
  pulseDate: string | null;
  activeTotal: number;
  edlReady: number;
  topFamily: string | null;
  confidence: number | null;
  families?: Array<{ family: string; count: number }>;
}

/** Global threat / radar & IOC pulse card (EU/US golden overlap). */
export function formatPulseTelegramDispatch(record: PulseWireRecord): TelegramDispatchPayload {
  const families = (record?.families ?? []).slice(0, 3);
  const hashtags = composeHashtags([
    ...TELEGRAM_MANDATORY_HASHTAGS,
    '#IOC',
    '#ThreatIntel',
    '#Malware',
  ]);

  const lines = [
    '<b>ZAYRON-X | GLOBAL THREAT &amp; IOC PULSE</b>',
    record?.pulseDate
      ? `▸ <b>Radar pulse</b>: ${escapeTelegramHtml(record.pulseDate)}`
      : '▸ <b>Radar pulse</b>: pending enrichment (no token-bound pulse stored)',
    `▸ <b>Active IOCs</b>: ${Number(record?.activeTotal) || 0} · <b>EDL ready</b>: ${Number(record?.edlReady) || 0}`,
    `▸ <b>Peak confidence</b>: ${record?.confidence != null ? Math.round(Number(record.confidence)) : '—'} / 100`,
    TELEGRAM_HAIRLINE,
    ...(families.length > 0
      ? families.map(
          (entry) =>
            `▸ ${escapeTelegramHtml(entry.family)} · ${Number(entry.count) || 0} indicator${Number(entry.count) === 1 ? '' : 's'}`,
        )
      : ['▸ No resolved family cluster in the last 24h']),
    TELEGRAM_HAIRLINE,
    `↳ <a href="${TELEGRAM_IOCS_URL}"><u>Open the live IOC workbench ↗</u></a>`,
    `↳ <a href="${TELEGRAM_IOC_FAMILIES_URL}"><u>Read verified malware dossiers ↗</u></a>`,
    TELEGRAM_CHANNEL_HANDLE,
    hashtags.join(' '),
  ];

  return {
    entity_type: 'cve',
    entity_id: `pulse:${record?.pulseDate ?? 'undated'}`,
    html: lines.join('\n'),
    hashtags,
    url: TELEGRAM_IOCS_URL,
    priority: null,
  };
}

/**
 * Clamp a rendered post to Telegram's 1024-character caption limit WITHOUT ever
 * cutting the anchor CTA or the hashtag block: the tail lines (anchor, channel
 * handle, hashtags) are reserved first and only the body is trimmed.
 */
export function clampTelegramCaption(html: string, max = TELEGRAM_PHOTO_CAPTION_MAX_CHARS): string {
  const body = String(html ?? '');
  if (body.length <= max) return body;
  const lines = body.split('\n');
  const tailCount = Math.min(4, lines.length);
  const head = lines.slice(0, lines.length - tailCount);
  const tail = lines.slice(lines.length - tailCount);

  // Hashtags are capped at 7 tokens, so a valid tail always fits the budget.
  const tailText = tail.join('\n');
  if (tailText.length + 24 >= max) {
    // Degenerate case: return the tail + an ellipsis line rather than break it.
    return `…\n${tailText}`.slice(0, max);
  }
  const kept: string[] = [];
  let used = tailText.length + 8;
  for (const line of head) {
    if (used + line.length + 1 > max) break;
    kept.push(line);
    used += line.length + 1;
  }
  return [...kept, '…', ...tail].join('\n');
}

/** True when the caption is within Telegram's photo limit. */
export function isValidTelegramCaption(html: string): boolean {
  const body = String(html ?? '');
  return body.length > 0 && body.length <= TELEGRAM_PHOTO_CAPTION_MAX_CHARS;
}

export { TELEGRAM_MAX_HASHTAGS };
