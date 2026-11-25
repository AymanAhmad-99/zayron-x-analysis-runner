/**
 * PHASE 7B — IOC hygiene & allowlist shield.
 *
 * Bulk open-source feeds are noisy and occasionally hostile to the very
 * infrastructure that consumes them: a Spamhaus DROP range can cover a resolver,
 * a URL feed happily publishes `github.com`, and a Feodo entry is sometimes an
 * RFC1918 address from a misconfigured honeypot. Publishing those as "block
 * this" data would be actively harmful to a customer's firewall.
 *
 * EVERYTHING here is pure (no D1, no fetch, no `cloudflare:workers`) so the
 * exact rules that run in production are the ones the unit gate exercises.
 *
 * Shell for the DB-facing ingest lives in `workers/ingest/src/iocIngest.ts`;
 * this module owns the decisions, never the transport.
 */

/** Canonical indicator types. `ipv4` is accepted on input and mapped to `ip`. */
export type IocType = 'ip' | 'domain' | 'url' | 'cidr' | 'sha256';

export const IOC_TYPES: readonly IocType[] = ['ip', 'domain', 'url', 'cidr', 'sha256'];

/**
 * Free-Tier budget: one Worker invocation may not exceed 25 external HTTP
 * subrequests. The ingest pass asserts against this constant.
 */
export const MAX_SUBREQUESTS_PER_RUN = 25;

/** EDL publish gate — an indicator below this is tracked, never served. */
export const EDL_MIN_CONFIDENCE = 85;

export const DEFAULT_CONFIDENCE = 70;

/**
 * Shared cloud / top-domain infrastructure. Blocking any of these breaks the
 * customer's own tooling (package installs, CI, chat, DNS) long before it hurts
 * an adversary, so they are never emitted as `ip` or `domain` indicators.
 */
export const ALLOWLISTED_DOMAINS: readonly string[] = [
  'google.com',
  'googleapis.com',
  'github.com',
  'githubusercontent.com',
  'cloudflare.com',
  'amazonaws.com',
  'microsoft.com',
  'azureedge.net',
  'dropbox.com',
  'discord.com',
  't.me',
  'telegram.org',
  'zayron-x.co',
];

/** Addresses that must never appear in an outbound blocklist. */
export const ALLOWLISTED_IPS: readonly string[] = ['1.1.1.1', '8.8.8.8'];

/** Reserved IPv4 blocks (RFC1918 + loopback + link-local + CGNAT + TEST-NET). */
const RESERVED_V4_BLOCKS: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

/** Decay policy. A stale indicator is expired, not deleted: history is evidence. */
const TTL_DAYS: Record<IocType, number> = {
  ip: 14,
  domain: 30,
  url: 30,
  cidr: 30,
  sha256: 365,
};

/** Map a feed's own vocabulary onto the canonical type. Unknown ⇒ null. */
export function canonicalType(type: string): IocType | null {
  const t = String(type || '').trim().toLowerCase();
  if (t === 'ip' || t === 'ipv4' || t === 'ipv6') return 'ip';
  if (t === 'domain' || t === 'hostname' || t === 'fqdn') return 'domain';
  if (t === 'url' || t === 'uri') return 'url';
  if (t === 'cidr' || t === 'netblock' || t === 'network') return 'cidr';
  if (t === 'sha256' || t === 'hash' || t === 'sha-256') return 'sha256';
  return null;
}

/** IPv4 dotted-quad → unsigned 32-bit integer, or null when malformed. */
export function ipv4ToInt(ip: string): number | null {
  const parts = String(ip || '').trim().split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
}

function intToIpv4(value: number): string {
  return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.');
}

function inV4Block(ipInt: number, base: string, prefix: number): boolean {
  const baseInt = ipv4ToInt(base);
  if (baseInt === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

/** True for RFC1918, loopback, link-local, CGNAT, multicast, TEST-NET and friends. */
export function isPrivateOrReservedIp(ip: string): boolean {
    const value = ipv4ToInt(ip);
    if (value !== null) {
      return RESERVED_V4_BLOCKS.some(([base, prefix]) => inV4Block(value, base, prefix));
    }
    const v6 = String(ip || '').trim().toLowerCase();
    if (!v6.includes(':')) return false;
    return (
      v6 === '::1' ||
      v6 === '::' ||
      v6.startsWith('fc') ||
      v6.startsWith('fd') ||
      v6.startsWith('fe80') ||
      v6.startsWith('::ffff:127.') ||
      v6.startsWith('::ffff:10.') ||
      v6.startsWith('::ffff:192.168.')
    );
}

/** A CIDR that lies entirely inside a reserved block is useless as intel. */
export function isReservedCidr(cidr: string): boolean {
  const [base, prefixRaw] = String(cidr || '').trim().split('/');
  const prefix = Number(prefixRaw);
  const value = ipv4ToInt(base);
  if (value === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  return RESERVED_V4_BLOCKS.some(([blockBase, blockPrefix]) => {
    if (prefix < blockPrefix) return false;
    const blockInt = ipv4ToInt(blockBase);
    if (blockInt === null) return false;
    const mask = blockPrefix === 0 ? 0 : (0xffffffff << (32 - blockPrefix)) >>> 0;
    return (value & mask) === (blockInt & mask);
  });
}

/** Extract the host of a URL without relying on the URL parser's throw behaviour. */
export function hostOfUrl(value: string): string | null {
  const normalized = String(value || '')
    .trim()
    .replace(/^hxxps?:\/\//i, (m) => m.replace(/xx/i, 'tt'))
    .replace(/\[\.\]/g, '.');
  try {
    const parsed = new URL(normalized);
    return parsed.hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    const match = /^(?:[a-z][a-z0-9+.-]*:\/\/)?([^/:?#]+)/i.exec(normalized);
    return match ? match[1].toLowerCase().replace(/\.$/, '') : null;
  }
}

/** Exact or subdomain match against the shared-infrastructure allowlist. */
export function isAllowlistedDomain(domain: string): boolean {
  const host = String(domain || '').trim().toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  if (!host) return false;
  return ALLOWLISTED_DOMAINS.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

/** Canonical, comparable form of an indicator. Returns null when unusable. */
export function normalizeIndicator(type: string, raw: string): string | null {
  const canonical = canonicalType(type);
  if (!canonical) return null;
  const value = String(raw ?? '').trim();
  if (!value) return null;

  switch (canonical) {
    case 'ip': {
      const ip = value.toLowerCase();
      if (ipv4ToInt(ip) === null) {
        // Only accept a plausible IPv6 literal; a hostname in an IP feed is noise.
        return /^[0-9a-f:]+$/.test(ip) && ip.includes(':') ? ip : null;
      }
      return intToIpv4(ipv4ToInt(ip)!);
    }
    case 'domain': {
      const host = value
        .toLowerCase()
        .replace(/^\*\./, '')
        .replace(/\.$/, '');
      if (host.length > 253 || host.length < 4) return null;
      if (!/^[a-z0-9.-]+$/.test(host)) return null;
      if (!host.includes('.')) return null;
      return host;
    }
    case 'url': {
      const fixed = value.replace(/^hxxps?:\/\//i, (m) => m.replace(/xx/i, 'tt')).replace(/\[\.\]/g, '.');
      if (!/^https?:\/\//i.test(fixed)) return null;
      return fixed.length <= 2048 ? fixed : null;
    }
    case 'cidr': {
      const [base, prefixRaw] = value.split('/');
      const prefix = Number(prefixRaw);
      const baseInt = ipv4ToInt(base);
      if (baseInt === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
      // Two feeds rarely agree on host bits; the network address is the identity.
      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      return `${intToIpv4((baseInt & mask) >>> 0)}/${prefix}`;
    }
    case 'sha256': {
      const hex = value.toLowerCase();
      return /^[a-f0-9]{64}$/.test(hex) ? hex : null;
    }
  }
}

/** Human-visible form: `hxxp://`, `[.]`, and a bracketed IPv6-style host. */
export function defangIndicator(value: string): string {
  return String(value ?? '')
    .replace(/https?:\/\//gi, (m) => (m.toLowerCase() === 'https://' ? 'hxxps://' : 'hxxp://'))
    .replace(/\./g, '[.]');
}

/** Refang a defanged indicator back to its canonical form. */
export function refangIndicator(value: string): string {
  return String(value ?? '')
    .replace(/hxxps?:\/\//i, (m) => m.replace(/xx/i, 'tt'))
    .replace(/\[\.\]/g, '.');
}

/**
 * The hard-reject shield. Returns a reason when the indicator must never be
 * stored or published, null when it is acceptable.
 */
export function rejectReason(type: IocType, value: string): string | null {
  if (type === 'ip') {
    if (ALLOWLISTED_IPS.includes(value)) return 'ALLOWLISTED_RESOLVER';
    if (isPrivateOrReservedIp(value)) return 'PRIVATE_OR_RESERVED';
    return null;
  }
  if (type === 'cidr') {
    if (isReservedCidr(value)) return 'PRIVATE_OR_RESERVED';
    return null;
  }
  if (type === 'domain') {
    if (isAllowlistedDomain(value)) return 'SHARED_INFRASTRUCTURE';
    return null;
  }
  if (type === 'url') {
    const host = hostOfUrl(value);
    if (host && isAllowlistedDomain(host)) return 'SHARED_INFRASTRUCTURE';
    if (host && ipv4ToInt(host) !== null && isPrivateOrReservedIp(host)) return 'PRIVATE_OR_RESERVED';
    return null;
  }
  return null;
}

export function ttlDaysForType(type: IocType): number {
  return TTL_DAYS[type] ?? 30;
}

/** Absolute expiry for a freshly seen indicator, as an ISO-8601 UTC string. */
export function expiresAtFor(type: IocType, now: number = Date.now()): string {
  return new Date(now + ttlDaysForType(type) * 24 * 60 * 60 * 1000).toISOString();
}

/** True when a stored expiry is in the past (or unparseable). */
export function isExpired(expiresAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!expiresAt) return false;
  const parsed = Date.parse(expiresAt);
  if (Number.isNaN(parsed)) return true;
  return parsed <= now;
}

/**
 * Source-weighted baseline. A public blocklist is credible; a single
 * community URL dump is less so; corroboration is rewarded in
 * {@link confidenceForSources}.
 */
export function baseConfidenceFor(source: string, override?: number): number {
  if (typeof override === 'number' && Number.isFinite(override)) {
    return Math.max(0, Math.min(100, Math.round(override)));
  }
  switch (String(source || '').toLowerCase()) {
    case 'spamhaus-drop':
      return 95;
    case 'feodo-tracker':
      return 90;
    case 'urlhaus':
    case 'threatfox':
      return 80;
    case 'openssf-osv':
      return 88;
    case 'radar':
      return 75;
    default:
      return DEFAULT_CONFIDENCE;
  }
}

/** Union of two source lists, preserving order and never duplicating a source. */
export function mergeSources(existing: readonly string[] = [], incoming: readonly string[] = []): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const source of [...existing, ...incoming]) {
    const value = String(source || '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    merged.push(value);
  }
  return merged;
}

/**
 * Two independent feeds agreeing is the single strongest signal a free engine
 * has, so corroboration lifts confidence to the EDL gate; three or more lifts it
 * further. The base is never lowered.
 */
export function confidenceForSources(sources: readonly string[], base: number = DEFAULT_CONFIDENCE): number {
  const distinct = new Set(sources.map((s) => String(s || '').trim()).filter(Boolean));
  const floor = distinct.size >= 3 ? 95 : distinct.size >= 2 ? 85 : 0;
  return Math.max(0, Math.min(100, Math.max(Math.round(base), floor)));
}

export interface ExistingIocRow {
  type: string;
  normalized_value: string;
  confidence: number;
  seen_count: number;
  sources_json: string;
  status?: string;
}

export interface IncomingIoc {
  type: string;
  value: string;
  source: string;
  family?: string | null;
  asn?: string | null;
  asnName?: string | null;
  country?: string | null;
  confidence?: number;
}

export interface PlannedIoc {
  type: IocType;
  value: string;
  confidence: number;
  seenCount: number;
  sources: string[];
  status: 'ACTIVE' | 'EXPIRED';
  family: string | null;
  asn: string | null;
  asnName: string | null;
  country: string | null;
  expiresAt: string;
  isNew: boolean;
}

export interface HygieneOutcome {
  accepted: PlannedIoc[];
  rejected: Array<{ value: string; type: string; reason: string }>;
}

function parseSources(raw: string | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

/**
 * Turn one feed's rows into DB-ready plans.
 *
 * - normalizes and hard-rejects through the allowlist shield;
 * - dedups within the batch by (type, value);
 * - on an existing row: increments `seen_count`, merges sources, raises
 *   confidence (never lowers it), refreshes the decay window and revives an
 *   expired indicator that is being seen again.
 */
export function planBulkUpsert(
  incoming: readonly IncomingIoc[],
  existing: readonly ExistingIocRow[] = [],
  now: number = Date.now(),
): HygieneOutcome {
  const existingByKey = new Map<string, ExistingIocRow>();
  for (const row of existing) {
    existingByKey.set(`${row.type}|${row.normalized_value}`, row);
  }

  const accepted: PlannedIoc[] = [];
  const rejected: HygieneOutcome['rejected'] = [];
  const seenInBatch = new Map<string, PlannedIoc>();

  for (const item of incoming) {
    const type = canonicalType(item.type);
    if (!type) {
      rejected.push({ value: String(item.value ?? ''), type: String(item.type ?? ''), reason: 'UNSUPPORTED_TYPE' });
      continue;
    }
    const value = normalizeIndicator(type, item.value);
    if (!value) {
      rejected.push({ value: String(item.value ?? ''), type, reason: 'UNNORMALIZABLE' });
      continue;
    }
    const reason = rejectReason(type, value);
    if (reason) {
      rejected.push({ value, type, reason });
      continue;
    }

    const key = `${type}|${value}`;
    const base = baseConfidenceFor(item.source, item.confidence);
    const prior = existingByKey.get(key) ?? null;
    const priorSources = parseSources(prior?.sources_json);
    const buffered = seenInBatch.get(key);

    if (buffered) {
      buffered.sources = mergeSources(buffered.sources, [item.source]);
      buffered.confidence = confidenceForSources(buffered.sources, Math.max(buffered.confidence, base));
      buffered.seenCount += 1;
      buffered.family = buffered.family ?? item.family ?? null;
      continue;
    }

    const sources = mergeSources(priorSources, [item.source]);
    const plan: PlannedIoc = {
      type,
      value,
      confidence: confidenceForSources(sources, Math.max(Number(prior?.confidence ?? 0), base)),
      seenCount: Number(prior?.seen_count ?? 0) + 1,
      sources,
      status: 'ACTIVE',
      family: item.family ?? null,
      asn: item.asn ?? (prior as any)?.asn ?? null,
      asnName: item.asnName ?? (prior as any)?.asn_name ?? null,
      country: item.country ?? (prior as any)?.country ?? null,
      expiresAt: expiresAtFor(type, now),
      isNew: !prior,
    };
    seenInBatch.set(key, plan);
    accepted.push(plan);
  }

  return { accepted, rejected };
}
