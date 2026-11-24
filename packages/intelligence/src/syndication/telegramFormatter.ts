/**
 * Phase 4C — EXECUTIVE TELEGRAM INTELLIGENCE WIRE formatter.
 *
 * Pure, dependency-free projection of an ALREADY VERIFIED record into one
 * executive Telegram message. It renders; it never decides factuality. The
 * caller may only hand it a `ai_analyst_assessment.v4` CVE or a
 * `malware_strategic_brief.v1` specimen, so absence stays absence here.
 *
 * NON-NEGOTIABLE RENDERING RULES
 *   · `parse_mode: "HTML"` — every dynamic value is escaped for `&`, `<`, `>`
 *     first, so an advisory that contains `<script>` or `a & b` can never make
 *     Telegram reject the message (or inject markup).
 *   · ZERO raw URLs in the body: the only `https://` occurrence is inside
 *     `href="…"`. The visible CTA is an underlined blue anchor with executive
 *     copy. {@link validateTelegramDispatch} enforces this, not a convention.
 *   · At least 5 hashtags, always `#USA`, `#CyberSecurity` and `#ThreatIntel`,
 *     at most 7. Tags come only from verified facts (`#CISAKEV` requires a KEV
 *     listing; a family tag requires a resolved/source-reported family).
 *   · Hyphens break Telegram hashtags, so a CVE id becomes `#CVE_2026_132147`.
 *
 * Kept free of Worker imports so every rule is unit-testable.
 */

export const TELEGRAM_MAX_MESSAGE_CHARS = 4096;
/** Target band: crisp executive wire copy, far below the hard limit. */
export const TELEGRAM_TARGET_MAX_CHARS = 1400;
export const TELEGRAM_MIN_HASHTAGS = 5;
export const TELEGRAM_MAX_HASHTAGS = 7;
export const TELEGRAM_MANDATORY_HASHTAGS = ['#USA', '#CyberSecurity', '#ThreatIntel'] as const;

export const TELEGRAM_CVE_BASE_URL = 'https://zayron-x.co/intelligence/vulnerabilities';
export const TELEGRAM_MALWARE_BASE_URL = 'https://zayron-x.co/malware/intelligence/reports';

export const TELEGRAM_HAIRLINE = '─────────────────────';

/** The exact CTA copy — executive, never a naked URL. */
export const TELEGRAM_CVE_CTA =
  'Inspect Full Technical Advisory &amp; Defender Playbook';
export const TELEGRAM_MALWARE_CTA =
  'Access Full Static Dossier, ATT&amp;CK Chain &amp; Hunting Rules';

export type TelegramEntityType = 'cve' | 'malware';

export interface TelegramDispatchPayload {
  entity_type: TelegramEntityType;
  entity_id: string;
  /** Telegram HTML body (parse_mode: "HTML"). */
  html: string;
  /** The sanitized tags actually rendered, in order. */
  hashtags: string[];
  /** Public advisory/dossier URL — carried, never printed as text. */
  url: string;
  /** P0–P3 for a CVE, `null` for a specimen. */
  priority: string | null;
}

export interface TelegramCveBrief {
  executive_bluf: string;
  exploitation_mechanics?: { attack_path?: string; blast_radius?: string };
  operational_prioritization: { priority: string; remediation_sla?: string };
}

export interface TelegramCveRecord {
  cve_id: string;
  severity?: string | null;
  cvss_score?: number | null;
  epss_score?: number | null;
  epss_percentile?: number | null;
  known_exploited?: boolean;
  kev_due_date?: string | null;
  vendor?: string | null;
  product?: string | null;
  cwe_ids?: string[];
  affected_versions?: string[];
  cisa_ssvc?: { automatable?: string | null; technical_impact?: string | null } | null;
  public_poc_status?: string | null;
  brief: TelegramCveBrief;
}

export interface TelegramMalwareRecord {
  report_id: string;
  sha256: string;
  family?: string | null;
  severity?: string | null;
  format_class?: string | null;
  capability_candidates?: number | null;
  primary_network_indicators?: number | null;
  brief: {
    executive_bluf: string;
    capability_chain: string;
    family_and_limits: { family_provenance: string };
  };
}

/* ──────────────────────────────── escaping ────────────────────────────────── */

/**
 * Telegram HTML escaping. `&` MUST be replaced first, otherwise the ampersands
 * introduced by the later replacements would be double-escaped.
 */
export function escapeTelegramHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ──────────────────────────────── hashtags ────────────────────────────────── */

/**
 * One authoritative hashtag token: alphanumerics only, never a hyphen (it
 * terminates a Telegram hashtag), bounded length, never empty.
 */
export function sanitizeHashtagToken(value: unknown, max = 28): string {
  const cleaned = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '');
  return cleaned.slice(0, max);
}

/** `CVE-2026-132147` → `#CVE_2026_132147` (hyphens would break the tag). */
export function cveHashtag(cveId: string): string {
  const token = String(cveId ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return token ? `#${token}` : '';
}

/**
 * Dedupe is case-insensitive (Telegram treats `#ThreatIntel` and `#threatintel`
 * as the same tag) while the FIRST spelling wins, so the mandatory tags keep
 * their canonical casing.
 */
export function composeHashtags(candidates: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const tag = String(candidate ?? '').trim();
    if (!/^#[A-Za-z0-9_]{2,32}$/.test(tag)) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= TELEGRAM_MAX_HASHTAGS) break;
  }
  return out;
}

/* ─────────────────────────────── text helpers ─────────────────────────────── */

/** First `count` sentences, trimmed to a word boundary — never mid-word. */
export function briefSentences(text: unknown, count = 2, maxChars = 320): string {
  const raw = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, Math.max(1, count));
  let out = sentences.join(' ');
  if (out.length > maxChars) {
    const cut = out.slice(0, maxChars);
    const boundary = cut.lastIndexOf(' ');
    out = `${(boundary > 80 ? cut.slice(0, boundary) : cut).replace(/[.,;:\s]+$/, '')}…`;
  }
  return out;
}

function trimTo(value: unknown, max: number): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const boundary = cut.lastIndexOf(' ');
  return `${(boundary > 20 ? cut.slice(0, boundary) : cut).replace(/[.,;:\s]+$/, '')}…`;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function cvssLabel(score: number | null | undefined): string {
  if (!isFiniteNumber(score)) return 'NOT_PUBLISHED';
  return score.toFixed(1);
}

function epssLabel(score: number | null | undefined): string {
  if (!isFiniteNumber(score)) return 'NOT_SCORED';
  const pct = score * 100;
  return `${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%`;
}

function severityLabel(severity: string | null | undefined, score: number | null | undefined): string {
  const named = String(severity ?? '').trim().toUpperCase();
  if (named) return named;
  if (!isFiniteNumber(score)) return 'UNSCORED';
  if (score >= 9) return 'CRITICAL';
  if (score >= 7) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  return 'LOW';
}

function formatIsoDate(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function priorityBadge(priority: string | null): string {
  if (priority === 'P0') return '🔴';
  if (priority === 'P1') return '🟠';
  return '🔵';
}

/* ───────────────────────────── CVE dispatch ───────────────────────────────── */

/**
 * One executive CVE dispatch.
 *
 * The brief supplies the executive sentence and the priority band; every
 * telemetry line is re-derived from the SAME verified record the site renders,
 * so the post can never claim a KEV listing, a PoC or a severity the record
 * does not carry.
 */
export function formatCveTelegramDispatch(record: TelegramCveRecord): TelegramDispatchPayload {
  const cveId = String(record?.cve_id ?? '').trim().toUpperCase();
  const priority = /^P[0-3]$/.test(String(record?.brief?.operational_prioritization?.priority ?? ''))
    ? String(record.brief.operational_prioritization.priority)
    : null;
  const sla = String(record?.brief?.operational_prioritization?.remediation_sla ?? '').trim();

  const vendor = trimTo(record?.vendor, 48) || 'MULTI-VENDOR';
  const product = trimTo(record?.product, 64) || 'UNRESOLVED PRODUCT';
  const cwe = (record?.cwe_ids ?? []).map((id) => String(id).toUpperCase()).filter(Boolean).slice(0, 2);
  const severity = severityLabel(record?.severity, record?.cvss_score);

  const exploitParts: string[] = [`EPSS ${epssLabel(record?.epss_score)}`];
  const automatable = String(record?.cisa_ssvc?.automatable ?? '').trim();
  if (automatable) exploitParts.push(`SSVC Automatable ${escapeTelegramHtml(automatable)}`);
  if (String(record?.public_poc_status ?? '') === 'OBSERVED') exploitParts.push('Public PoC observed');

  const kevLine = record?.known_exploited === true
    ? `LISTED${formatIsoDate(record?.kev_due_date) ? ` · Due ${escapeTelegramHtml(formatIsoDate(record?.kev_due_date))}` : ''}`
    : 'NOT_LISTED';

  const affected = (record?.affected_versions ?? []).map((value) => String(value).trim()).filter(Boolean);
  const affectedLine = affected.length > 0
    ? trimTo(affected.slice(0, 3).join(' · '), 120)
    : 'See advisory';

  const url = `${TELEGRAM_CVE_BASE_URL}/${encodeURIComponent(cveId)}`;
  const headline = `${escapeTelegramHtml(vendor)} / ${escapeTelegramHtml(product)}`;

  const hashtags = composeHashtags([
    ...TELEGRAM_MANDATORY_HASHTAGS,
    '#Vulnerability',
    record?.vendor ? `#${sanitizeHashtagToken(record.vendor)}` : null,
    record?.known_exploited === true ? '#CISAKEV' : null,
    cveHashtag(cveId),
    '#InfoSec',
  ]);

  const brief = briefSentences(record?.brief?.executive_bluf, 2);

  const html = [
    `${priorityBadge(priority)} <b>ZAYRON-X | PRIORITY ${escapeTelegramHtml(priority ?? 'ADVISORY')} ADVISORY</b>`,
    `<b>${escapeTelegramHtml(cveId)}</b> — ${headline}${cwe.length > 0 ? ` · ${escapeTelegramHtml(cwe.join(', '))}` : ''}`,
    TELEGRAM_HAIRLINE,
    '<b>EXECUTIVE ASSESSMENT</b>',
    escapeTelegramHtml(brief),
    TELEGRAM_HAIRLINE,
    `▸ <b>Severity</b>: ${escapeTelegramHtml(severity)} · CVSS ${escapeTelegramHtml(cvssLabel(record?.cvss_score))}`,
    `▸ <b>Exploit Signal</b>: ${exploitParts.join(' · ')}`,
    `▸ <b>CISA KEV</b>: ${kevLine}${sla ? ` · SLA ${escapeTelegramHtml(sla)}` : ''}`,
    `▸ <b>Affected</b>: ${escapeTelegramHtml(affectedLine)}`,
    TELEGRAM_HAIRLINE,
    `↳ <a href="${escapeTelegramHtml(url)}"><u>${TELEGRAM_CVE_CTA} ↗</u></a>`,
    hashtags.join(' '),
  ].join('\n');

  return { entity_type: 'cve', entity_id: cveId, html, hashtags, url, priority };
}

/* ──────────────────────────── malware dispatch ────────────────────────────── */

/** Short, hyphenated hash prefix — unambiguous without flooding the post. */
export function shortenSha256(sha256: string): string {
  const value = String(sha256 ?? '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(value)) return 'UNAVAILABLE';
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

/**
 * One executive static-malware dispatch.
 *
 * Language is strictly `CAN_DO`: the specimen CONTAINS a capability, nothing was
 * executed. Family attribution is labelled single-source whenever the only
 * source is the feed tag.
 */
export function formatMalwareTelegramDispatch(record: TelegramMalwareRecord): TelegramDispatchPayload {
  const reportId = String(record?.report_id ?? '').trim();
  const family = trimTo(record?.family, 40);
  const severity = severityLabel(record?.severity, null);
  const capa = isFiniteNumber(record?.capability_candidates) ? record!.capability_candidates! : 0;
  const iocs = isFiniteNumber(record?.primary_network_indicators) ? record!.primary_network_indicators! : 0;
  const formatClass = trimTo(record?.format_class, 24) || 'UNRESOLVED';

  const url = `${TELEGRAM_MALWARE_BASE_URL}/${encodeURIComponent(reportId)}`;
  const executive = briefSentences(record?.brief?.executive_bluf, 2)
    || briefSentences(record?.brief?.capability_chain, 2);

  const hashtags = composeHashtags([
    ...TELEGRAM_MANDATORY_HASHTAGS,
    '#MalwareAnalysis',
    '#DFIR',
    family ? `#${sanitizeHashtagToken(family)}` : null,
    '#StaticAnalysis',
  ]);

  const html = [
    `🟣 <b>ZAYRON-X | STATIC MALWARE DOSSIER</b>`,
    `<b>${escapeTelegramHtml(family || 'UNRESOLVED FAMILY')}</b> — ${escapeTelegramHtml(formatClass)} specimen · ${escapeTelegramHtml(severity)} static triage`,
    TELEGRAM_HAIRLINE,
    '<b>CAPABILITY SYNTHESIS</b>',
    escapeTelegramHtml(executive),
    TELEGRAM_HAIRLINE,
    `▸ <b>SHA-256</b>: <code>${escapeTelegramHtml(shortenSha256(record?.sha256))}</code>`,
    `▸ <b>ATT&amp;CK Scope</b>: ${capa} static capability candidate${capa === 1 ? '' : 's'} (CAN_DO, not execution)`,
    `▸ <b>Clean Network IOCs</b>: ${iocs} primary indicator${iocs === 1 ? '' : 's'} after schema/noise filtering`,
    `▸ <b>Family</b>: ${family ? `${escapeTelegramHtml(family)} (single-source feed tag)` : 'UNRESOLVED — no attribution claimed'}`,
    TELEGRAM_HAIRLINE,
    `↳ <a href="${escapeTelegramHtml(url)}"><u>${TELEGRAM_MALWARE_CTA} ↗</u></a>`,
    hashtags.join(' '),
  ].join('\n');

  return { entity_type: 'malware', entity_id: reportId, html, hashtags, url, priority: null };
}

/* ──────────────────────────────── validator ───────────────────────────────── */

/**
 * Hard gate. A payload that fails ANY rule is never sent: a malformed post is a
 * public defect, and a duplicate post cannot be recalled.
 */
export function validateTelegramDispatch(html: string, hashtags?: string[]): string[] {
  const errors: string[] = [];
  const body = String(html ?? '');

  if (body.trim().length === 0) errors.push('EMPTY_MESSAGE');
  if (body.length > TELEGRAM_MAX_MESSAGE_CHARS) errors.push(`MESSAGE_TOO_LONG:${body.length}`);

  // The only permitted URL occurrence is inside an anchor attribute.
  const withoutAnchors = body.replace(/href="[^"]*"/gi, '');
  if (/https?:\/\//i.test(withoutAnchors)) errors.push('RAW_URL_IN_BODY');
  if (!/<a href="https?:\/\/[^"]+"><u>[^<]+ ↗<\/u><\/a>/i.test(body)) errors.push('MISSING_UNDERLINED_CTA');

  const tags = Array.isArray(hashtags) && hashtags.length > 0
    ? hashtags
    : (body.match(/(?:^|\s)(#[A-Za-z0-9_]+)/g) ?? []).map((tag) => tag.trim());
  if (tags.length < TELEGRAM_MIN_HASHTAGS) errors.push(`TOO_FEW_HASHTAGS:${tags.length}`);
  if (tags.length > TELEGRAM_MAX_HASHTAGS) errors.push(`TOO_MANY_HASHTAGS:${tags.length}`);
  const lowered = new Set(tags.map((tag) => tag.toLowerCase()));
  for (const mandatory of TELEGRAM_MANDATORY_HASHTAGS) {
    if (!lowered.has(mandatory.toLowerCase())) errors.push(`MISSING_HASHTAG:${mandatory}`);
  }
  if (tags.some((tag) => tag.includes('-'))) errors.push('HYPHEN_IN_HASHTAG');

  return errors;
}

/**
 * Conservative projection of a canonical static report into the two counts the
 * dispatch renders. Deliberately UNDERCUTS rather than overstates: a value that
 * is not clearly a network indicator is not counted.
 */
export function malwareDispatchSignals(report: Record<string, any> | null | undefined): {
  capability_candidates: number;
  primary_network_indicators: number;
  sha256: string;
  family: string | null;
} {
  const source = (report ?? {}) as Record<string, any>;
  const identity = (source.sample_identity ?? {}) as Record<string, any>;
  const sha256 = String(identity.sha256 ?? source.sha256 ?? '').trim().toLowerCase();

  const statements = source?.static_findings?.statements;
  let capabilityCandidates = 0;
  if (Array.isArray(statements)) {
    for (const entry of statements) {
      const statement = typeof entry?.statement === 'string' ? entry.statement : '';
      const match = statement.match(/Static tooling reported (\d+) capability candidate/);
      if (match) {
        const declared = Number(match[1]);
        if (Number.isFinite(declared) && declared > 0) capabilityCandidates = declared;
      }
    }
  }

  const demoted = /(^|\.)(w3\.org|ns\.adobe\.com|purl\.org|xmlns\.com|schemas\.xmlsoap\.org|openxmlformats\.org)$/i;
  const items = Array.isArray(source?.infrastructure?.items) ? source.infrastructure.items : [];
  const seen = new Set<string>();
  let primaryNetworkIndicators = 0;
  for (const item of items) {
    const value = String(item?.indicator_value ?? '').trim();
    if (!value || value.length > 253) continue;
    if (!value.includes('.') && !value.includes('://')) continue;
    if (demoted.test(value.replace(/^https?:\/\//i, '').split('/')[0])) continue;
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
      const octets = value.split('.').map(Number);
      if (octets[0] === 10 || octets[0] === 127 || (octets[0] === 192 && octets[1] === 168)) continue;
      if (octets[0] === 0) continue;
    }
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    primaryNetworkIndicators += 1;
  }

  const family = (source.family ?? {}) as Record<string, any>;
  const resolvedFamily = typeof family.resolved_family === 'string' && family.resolved_family.trim()
    ? family.resolved_family.trim()
    : null;
  const candidates = Array.isArray(family.candidates) ? family.candidates : [];
  const sourceCandidate = candidates.find((candidate: Record<string, any>) =>
    Array.isArray(candidate?.source_labels)
    && candidate.source_labels.some((label: unknown) => /malwarebazaar/i.test(String(label)))
    && typeof candidate?.candidate_family === 'string'
    && candidate.candidate_family.trim() !== '');
  const sourceReported = sourceCandidate
    ? String(sourceCandidate.candidate_family).trim()
    : (typeof source.source_reported_family === 'string' && source.source_reported_family.trim()
      ? source.source_reported_family.trim()
      : null);

  return {
    capability_candidates: capabilityCandidates,
    primary_network_indicators: primaryNetworkIndicators,
    sha256,
    family: resolvedFamily ?? sourceReported,
  };
}
