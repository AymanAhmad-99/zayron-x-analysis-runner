/**
 * PHASE 7B — STIX 2.1 / CSV / EDL projection for the IOC feed.
 *
 * Pure formatting only. The API route decides *which* rows are eligible
 * (`status = 'ACTIVE'`, allowlist-clean, confidence gate for the EDL); this
 * module turns rows into the three wire formats a customer's tooling expects.
 *
 * A STIX Bundle is deliberately minimal and standards-valid rather than
 * expressive: one Identity (the producer) plus one Indicator per record, with a
 * real `pattern_type: "stix"` pattern, `valid_from`, `confidence` (0–100) and
 * `labels`. Anything richer (relationships, malware SDOs) would require facts
 * this engine does not own.
 */

import { defangIndicator, EDL_MIN_CONFIDENCE, type IocType } from './hygiene';

export interface IocRecord {
  type: string;
  value: string;
  confidence: number;
  family?: string | null;
  sources?: string[];
  firstSeen?: string | null;
  lastSeen?: string | null;
  asn?: string | null;
  country?: string | null;
  status?: string;
}

export const STIX_SPEC_VERSION = '2.1';
export const STIX_IDENTITY_ID = 'identity--b3f0a1c2-6c1d-4f0e-9c1a-7a1e2d3c4b5a';

/** Escape a STIX string literal (`'` is the pattern delimiter). */
export function stixEscape(value: string): string {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** STIX 2.1 pattern for an indicator, or null for a type with no STIX object. */
export function stixPatternFor(type: string, value: string): string | null {
  const t = String(type || '').toLowerCase();
  if (t === 'ip') return `[ipv4-addr:value = '${stixEscape(value)}']`;
  if (t === 'domain') return `[domain-name:value = '${stixEscape(value)}']`;
  if (t === 'url') return `[url:value = '${stixEscape(value)}']`;
  if (t === 'cidr') {
    // STIX has no CIDR object; a range is expressed as an ipv4-addr with a
    // belongs-to relationship in full STIX, so the pattern stays a network
    // literal and the range itself is carried verbatim in the object value.
    return `[ipv4-addr:value = '${stixEscape(value.split('/')[0])}']`;
  }
  if (t === 'sha256') return `[file:hashes.'SHA-256' = '${stixEscape(value)}']`;
  return null;
}

/** Deterministic UUID-shaped id from a string, so re-emitting a bundle is stable. */
export function stableUuid(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < seed.length; i += 1) {
    const code = seed.charCodeAt(i);
    h1 = (h1 ^ code) * 0x01000193 >>> 0;
    h2 = (h2 + code * (i + 1)) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, '0');
  const a = hex(h1);
  const b = hex(h2);
  const c = hex((h1 ^ h2) >>> 0);
  const d = hex((h1 + h2) >>> 0);
  return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-a${c.slice(1, 4)}-${c.slice(4)}${d}`;
}

export function stixIdentity(): Record<string, unknown> {
  return {
    type: 'identity',
    spec_version: STIX_SPEC_VERSION,
    id: STIX_IDENTITY_ID,
    created: '2026-01-01T00:00:00.000Z',
    modified: '2026-01-01T00:00:00.000Z',
    name: 'ZAYRON-X',
    identity_class: 'organization',
  };
}

/**
 * Build a STIX 2.1 Bundle. Records with no STIX pattern (or an expired state)
 * are skipped rather than emitted as an invalid object.
 */
export function toStixBundle(
  records: readonly IocRecord[],
  options: { now?: Date; identityName?: string } = {},
): Record<string, unknown> {
  const now = (options.now ?? new Date()).toISOString();
  const objects: Array<Record<string, unknown>> = [stixIdentity()];

  for (const record of records) {
    if (record.status && record.status.toUpperCase() === 'EXPIRED') continue;
    const pattern = stixPatternFor(record.type, record.value);
    if (!pattern) continue;
    objects.push({
      type: 'indicator',
      spec_version: STIX_SPEC_VERSION,
      id: `indicator--${stableUuid(`${record.type}|${record.value}`)}`,
      created: record.firstSeen || now,
      modified: record.lastSeen || now,
      name: defangIndicator(record.value),
      description: record.family
        ? `Observed in ${record.family} activity by ${options.identityName ?? 'ZAYRON-X'}.`
        : `Indicator published by ${options.identityName ?? 'ZAYRON-X'}.`,
      indicator_types: ['malicious-activity'],
      pattern,
      pattern_type: 'stix',
      pattern_version: STIX_SPEC_VERSION,
      valid_from: record.firstSeen || now,
      confidence: Math.max(0, Math.min(100, Math.round(Number(record.confidence) || 0))),
      labels: ['malicious-activity', ...(record.family ? [String(record.family)] : [])],
      created_by_ref: STIX_IDENTITY_ID,
    });
  }

  return {
    type: 'bundle',
    id: `bundle--${stableUuid(objects.map((o) => String(o.id)).join(','))}`,
    spec_version: STIX_SPEC_VERSION,
    objects,
  };
}

/** Structural validation used by the tests and by the route's own guard. */
export function isValidStixBundle(bundle: unknown): boolean {
  const value = bundle as Record<string, unknown> | null;
  if (!value || value.type !== 'bundle') return false;
  if (value.spec_version !== STIX_SPEC_VERSION) return false;
  if (typeof value.id !== 'string' || !value.id.startsWith('bundle--')) return false;
  if (!Array.isArray(value.objects)) return false;
  for (const object of value.objects as Array<Record<string, unknown>>) {
    if (!object || typeof object !== 'object') return false;
    if (typeof object.type !== 'string') return false;
    if (object.type === 'indicator') {
      if (object.pattern_type !== 'stix') return false;
      if (typeof object.pattern !== 'string' || !object.pattern.startsWith('[')) return false;
      if (typeof object.valid_from !== 'string') return false;
      const confidence = object.confidence;
      if (typeof confidence !== 'number' || confidence < 0 || confidence > 100) return false;
    }
    if (typeof object.id !== 'string' || !String(object.id).includes('--')) return false;
  }
  return true;
}

/** The EDL gate: active, high-confidence, and a type a firewall can consume. */
export function meetsEdlGate(record: IocRecord): boolean {
  if (!record) return false;
  if (record.status && record.status.toUpperCase() !== 'ACTIVE') return false;
  if (Number(record.confidence) < EDL_MIN_CONFIDENCE) return false;
  return (['ip', 'domain', 'url', 'cidr'] as IocType[]).includes(record.type as IocType);
}

/** Plain Firewall EDL body — one value per line, no commentary, no defanging. */
export function toEdlText(records: readonly IocRecord[], limit?: number): string {
  const rows = records.filter(meetsEdlGate);
  const bounded = typeof limit === 'number' && limit > 0 ? rows.slice(0, limit) : rows;
  return bounded.length === 0 ? '' : `${bounded.map((r) => r.value).join('\n')}\n`;
}

const CSV_COLUMNS = ['type', 'value', 'confidence', 'family', 'asn', 'country', 'sources', 'first_seen', 'last_seen'] as const;

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV with a stable header. */
export function toCsv(records: readonly IocRecord[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const record of records) {
    lines.push(
      [
        record.type,
        record.value,
        Math.round(Number(record.confidence) || 0),
        record.family ?? '',
        record.asn ?? '',
        record.country ?? '',
        (record.sources ?? []).join('|'),
        record.firstSeen ?? '',
        record.lastSeen ?? '',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}
