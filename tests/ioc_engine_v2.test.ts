/**
 * PHASE 7B — IOC engine v2 unit gate.
 *
 * Local-only: pure modules plus the API projection helpers. No network, no D1,
 * no live endpoint is touched. The D1-facing writers are exercised through the
 * pure planner they delegate to, so the dedup/allowlist/decay rules that run in
 * production are the exact rules asserted here.
 */

import { describe, expect, test } from 'bun:test';
import {
  ALLOWLISTED_DOMAINS,
  DEFAULT_CONFIDENCE,
  EDL_MIN_CONFIDENCE,
  MAX_SUBREQUESTS_PER_RUN,
  baseConfidenceFor,
  canonicalType,
  confidenceForSources,
  defangIndicator,
  expiresAtFor,
  isAllowlistedDomain,
  isExpired,
  isPrivateOrReservedIp,
  isReservedCidr,
  mergeSources,
  normalizeIndicator,
  planBulkUpsert,
  refangIndicator,
  rejectReason,
  ttlDaysForType,
  type IncomingIoc,
} from '../packages/intelligence/src/iocs/hygiene';
import {
  meetsEdlGate,
  isValidStixBundle,
  stixPatternFor,
  toCsv,
  toEdlText,
  toStixBundle,
  type IocRecord,
} from '../packages/intelligence/src/iocs/stix';
import {
  mapOsvMaliciousRecord,
  parseFeodoBlocklist,
  parsePlainUrlFeed,
  parseSpamhausDrop,
  parseUrlhausApi,
  selectNewestMalObjectNames,
} from '../workers/ingest/src/iocIngest';
import { formatIocFeed, resolveEdlType, resolveFeedStatus } from '../workers/api/src/iocs';

const NOW = Date.parse('2026-11-25T00:00:00.000Z');

describe('IOC normalization', () => {
  test('canonical type mapping accepts feed vocabulary', () => {
    expect(canonicalType('ipv4')).toBe('ip');
    expect(canonicalType('IPv6')).toBe('ip');
    expect(canonicalType('hostname')).toBe('domain');
    expect(canonicalType('netblock')).toBe('cidr');
    expect(canonicalType('hash')).toBe('sha256');
    expect(canonicalType('asn')).toBeNull();
  });

  test('ip normalization canonicalizes dotted quads and rejects hostnames', () => {
    expect(normalizeIndicator('ipv4', '  8.8.4.4 ')).toBe('8.8.4.4');
    expect(normalizeIndicator('ip', '010.0.0.1')).toBe('10.0.0.1');
    expect(normalizeIndicator('ip', 'not-an-ip.example')).toBeNull();
    expect(normalizeIndicator('ip', '2001:DB8::1')).toBe('2001:db8::1');
  });

  test('domain normalization lowercases, strips wildcard and trailing dot', () => {
    expect(normalizeIndicator('domain', 'Evil.Example.')).toBe('evil.example');
    expect(normalizeIndicator('domain', '*.bad.example')).toBe('bad.example');
    expect(normalizeIndicator('domain', 'localhost')).toBeNull();
  });

  test('url normalization refangs and requires a scheme', () => {
    expect(normalizeIndicator('url', 'hxxp://evil[.]example/a')).toBe('http://evil.example/a');
    expect(normalizeIndicator('url', 'evil.example/a')).toBeNull();
  });

  test('cidr normalization rewrites to the network base', () => {
    expect(normalizeIndicator('cidr', '45.9.168.99/24')).toBe('45.9.168.0/24');
    expect(normalizeIndicator('cidr', '45.9.168.0/33')).toBeNull();
  });

  test('sha256 accepts only 64 hex characters', () => {
    const good = 'A'.repeat(64);
    expect(normalizeIndicator('sha256', good)).toBe('a'.repeat(64));
    expect(normalizeIndicator('sha256', 'abc')).toBeNull();
  });
});

describe('allowlist shield', () => {
  test('rejects RFC1918, loopback, link-local, CGNAT and reserved addresses', () => {
    for (const ip of ['10.1.2.3', '127.0.0.1', '172.16.5.4', '192.168.1.1', '169.254.1.1', '100.64.0.1', '224.0.0.1']) {
      expect(isPrivateOrReservedIp(ip)).toBe(true);
      expect(rejectReason('ip', ip)).toBe('PRIVATE_OR_RESERVED');
    }
  });

  test('rejects public resolvers by policy even though they are routable', () => {
    expect(rejectReason('ip', '1.1.1.1')).toBe('ALLOWLISTED_RESOLVER');
    expect(rejectReason('ip', '8.8.8.8')).toBe('ALLOWLISTED_RESOLVER');
    expect(rejectReason('ip', '45.9.168.10')).toBeNull();
  });

  test('rejects shared cloud and top domains, including subdomains', () => {
    expect(rejectReason('domain', 'google.com')).toBe('SHARED_INFRASTRUCTURE');
    expect(rejectReason('domain', 'raw.githubusercontent.com')).toBe('SHARED_INFRASTRUCTURE');
    expect(rejectReason('domain', 'api.zayron-x.co')).toBe('SHARED_INFRASTRUCTURE');
    expect(rejectReason('domain', 'evil.example')).toBeNull();
    expect(ALLOWLISTED_DOMAINS).toContain('amazonaws.com');
  });

  test('applies the shield to a URL through its host', () => {
    expect(rejectReason('url', 'https://github.com/org/repo')).toBe('SHARED_INFRASTRUCTURE');
    expect(rejectReason('url', 'http://192.168.0.5/beacon')).toBe('PRIVATE_OR_RESERVED');
    expect(rejectReason('url', 'http://evil.example/beacon')).toBeNull();
  });

  test('a CIDR inside a reserved block is rejected, a routable one is not', () => {
    expect(isReservedCidr('10.0.0.0/8')).toBe(true);
    expect(isReservedCidr('192.168.0.0/16')).toBe(true);
    expect(rejectReason('cidr', '45.9.168.0/24')).toBeNull();
  });

  test('allowlist matching is exact-or-subdomain only', () => {
    expect(isAllowlistedDomain('mail.google.com')).toBe(true);
    expect(isAllowlistedDomain('notgoogle.com')).toBe(false);
  });
});

describe('decay TTL policy', () => {
  test('per-type lifetimes match the contract', () => {
    expect(ttlDaysForType('ip')).toBe(14);
    expect(ttlDaysForType('domain')).toBe(30);
    expect(ttlDaysForType('url')).toBe(30);
    expect(ttlDaysForType('cidr')).toBe(30);
    expect(ttlDaysForType('sha256')).toBe(365);
  });

  test('expiry is computed from the type lifetime', () => {
    expect(expiresAtFor('ip', NOW)).toBe('2026-12-09T00:00:00.000Z');
    const year = expiresAtFor('sha256', NOW);
    expect(Date.parse(year) - NOW).toBe(365 * 24 * 60 * 60 * 1000);
  });

  test('an elapsed expiry is EXPIRED, a future one is not', () => {
    expect(isExpired('2026-11-24T00:00:00.000Z', NOW)).toBe(true);
    expect(isExpired('2026-12-24T00:00:00.000Z', NOW)).toBe(false);
  });
});

describe('dedup + confidence engine', () => {
  test('the same value from two sources in one batch becomes one row', () => {
    const incoming: IncomingIoc[] = [
      { type: 'ip', value: '45.9.168.10', source: 'feodo-tracker' },
      { type: 'ipv4', value: '45.9.168.010', source: 'urlhaus' },
    ];
    const { accepted, rejected } = planBulkUpsert(incoming, [], NOW);
    expect(rejected).toHaveLength(0);
    expect(accepted).toHaveLength(1);
    expect(accepted[0].value).toBe('45.9.168.10');
    expect(accepted[0].sources).toEqual(['feodo-tracker', 'urlhaus']);
    expect(accepted[0].seenCount).toBe(2);
    // corroboration lifts a single-source indicator to the EDL gate
    expect(accepted[0].confidence).toBeGreaterThanOrEqual(85);
    expect(accepted[0].status).toBe('ACTIVE');
  });

  test('an existing row is incremented, merged and never downgraded', () => {
    const existing = [
      {
        type: 'ip',
        normalized_value: '45.9.168.10',
        confidence: 95,
        seen_count: 3,
        sources_json: '["spamhaus-drop"]',
        status: 'EXPIRED',
      },
    ];
    const { accepted } = planBulkUpsert([{ type: 'ip', value: '45.9.168.10', source: 'urlhaus' }], existing, NOW);
    expect(accepted[0].seenCount).toBe(4);
    expect(accepted[0].confidence).toBe(95);
    expect(accepted[0].sources).toEqual(['spamhaus-drop', 'urlhaus']);
    // seen again ⇒ revived and the decay window refreshed
    expect(accepted[0].status).toBe('ACTIVE');
  });

  test('three distinct sources raise confidence to 95', () => {
    expect(confidenceForSources(['a', 'b'])).toBe(85);
    expect(confidenceForSources(['a', 'b', 'c'])).toBe(95);
    expect(confidenceForSources(['a'], 60)).toBe(60);
    expect(confidenceForSources([], 0)).toBe(0);
  });

  test('source baselines are stable and overridable', () => {
    expect(baseConfidenceFor('spamhaus-drop')).toBe(95);
    expect(baseConfidenceFor('feodo-tracker')).toBe(90);
    expect(baseConfidenceFor('unknown')).toBe(DEFAULT_CONFIDENCE);
    expect(baseConfidenceFor('urlhaus', 72)).toBe(72);
    expect(baseConfidenceFor('urlhaus', 400)).toBe(100);
  });

  test('mergeSources dedups and preserves first-seen order', () => {
    expect(mergeSources(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(mergeSources([], [])).toEqual([]);
  });

  test('rejected rows are reported with a reason and never planned', () => {
    const { accepted, rejected } = planBulkUpsert(
      [
        { type: 'ip', value: '192.168.1.5', source: 'feodo-tracker' },
        { type: 'domain', value: 'github.com', source: 'urlhaus' },
        { type: 'asn', value: 'AS1234', source: 'urlhaus' },
        { type: 'ip', value: 'nope', source: 'feodo-tracker' },
      ],
      [],
      NOW,
    );
    expect(accepted).toHaveLength(0);
    expect(rejected.map((r) => r.reason)).toEqual([
      'PRIVATE_OR_RESERVED',
      'SHARED_INFRASTRUCTURE',
      'UNSUPPORTED_TYPE',
      'UNNORMALIZABLE',
    ]);
  });
});

describe('defanging', () => {
  test('defang rewrites scheme and dots, refang restores them', () => {
    const url = 'https://evil.example/path/a';
    expect(defangIndicator(url)).toBe('hxxps://evil[.]example/path/a');
    expect(refangIndicator(defangIndicator(url))).toBe(url);
    expect(defangIndicator('45.9.168.10')).toBe('45[.]9[.]168[.]10');
  });
});

describe('STIX 2.1 projection', () => {
  const rows: IocRecord[] = [
    { type: 'ip', value: '45.9.168.10', confidence: 95, family: 'QakBot', status: 'ACTIVE' },
    { type: 'domain', value: 'evil.example', confidence: 88, status: 'ACTIVE' },
    { type: 'sha256', value: 'a'.repeat(64), confidence: 100, status: 'ACTIVE' },
    { type: 'url', value: 'http://evil.example/x', confidence: 90, status: 'ACTIVE' },
    { type: 'cidr', value: '45.9.168.0/24', confidence: 95, status: 'ACTIVE' },
    { type: 'ip', value: '45.9.168.11', confidence: 99, status: 'EXPIRED' },
  ];

  test('every supported type has a real STIX pattern', () => {
    expect(stixPatternFor('ip', '45.9.168.10')).toBe("[ipv4-addr:value = '45.9.168.10']");
    expect(stixPatternFor('domain', 'evil.example')).toBe("[domain-name:value = 'evil.example']");
    expect(stixPatternFor('url', 'http://evil.example')).toBe("[url:value = 'http://evil.example']");
    expect(stixPatternFor('sha256', 'a'.repeat(64))).toBe(`[file:hashes.'SHA-256' = '${'a'.repeat(64)}']`);
    expect(stixPatternFor('unknown', 'x')).toBeNull();
  });

  test('a bundle is valid STIX 2.1 and skips expired records', () => {
    const bundle = toStixBundle(rows, { now: new Date(NOW) });
    expect(isValidStixBundle(bundle)).toBe(true);
    const objects = bundle.objects as Array<Record<string, unknown>>;
    expect(objects[0].type).toBe('identity');
    const indicators = objects.filter((o) => o.type === 'indicator');
    expect(indicators).toHaveLength(5);
    expect(indicators.every((o) => o.spec_version === '2.1')).toBe(true);
    expect(indicators.every((o) => (o.confidence as number) >= 0 && (o.confidence as number) <= 100)).toBe(true);
    expect(objects.some((o) => o.name === '45[.]9[.]168[.]11')).toBe(false);
  });

  test('bundle ids are stable across rebuilds', () => {
    const a = toStixBundle(rows, { now: new Date(NOW) }) as { id: string };
    const b = toStixBundle(rows, { now: new Date(NOW + 5000) }) as { id: string };
    expect(a.id).toBe(b.id);
  });

  test('invalid shapes are rejected by the structural validator', () => {
    expect(isValidStixBundle(null)).toBe(false);
    expect(isValidStixBundle({ type: 'bundle', spec_version: '2.0', id: 'bundle--x', objects: [] })).toBe(false);
    expect(
      isValidStixBundle({
        type: 'bundle',
        spec_version: '2.1',
        id: 'bundle--x',
        objects: [{ type: 'indicator', id: 'indicator--y', pattern_type: 'sigma', pattern: 'x', valid_from: 'now', confidence: 1 }],
      }),
    ).toBe(false);
  });
});

describe('EDL gate', () => {
  test('only ACTIVE indicators at or above 85 qualify', () => {
    expect(meetsEdlGate({ type: 'ip', value: '45.9.168.10', confidence: 85, status: 'ACTIVE' })).toBe(true);
    expect(meetsEdlGate({ type: 'ip', value: '45.9.168.10', confidence: 84, status: 'ACTIVE' })).toBe(false);
    expect(meetsEdlGate({ type: 'ip', value: '45.9.168.10', confidence: 99, status: 'EXPIRED' })).toBe(false);
    expect(meetsEdlGate({ type: 'sha256', value: 'a'.repeat(64), confidence: 99, status: 'ACTIVE' })).toBe(false);
    expect(EDL_MIN_CONFIDENCE).toBe(85);
  });

  test('the text body is one value per line with no commentary', () => {
    const text = toEdlText([
      { type: 'ip', value: '45.9.168.10', confidence: 90, status: 'ACTIVE' },
      { type: 'ip', value: '45.9.168.11', confidence: 40, status: 'ACTIVE' },
    ]);
    expect(text).toBe('45.9.168.10\n');
  });

  test('the anonymous preview cap is enforced by the limit argument', () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({
      type: 'ip',
      value: `45.9.168.${i}`,
      confidence: 90,
      status: 'ACTIVE',
    }));
    expect(toEdlText(rows, 25).trim().split('\n')).toHaveLength(25);
    expect(toEdlText([])).toBe('');
  });

  test('edl file names map onto canonical types only', () => {
    expect(resolveEdlType('ip.txt')).toBe('ip');
    expect(resolveEdlType('DOMAIN.TXT')).toBe('domain');
    expect(resolveEdlType('sha256.txt')).toBeNull();
    expect(resolveEdlType('')).toBeNull();
  });
});

describe('feed formatters', () => {
  const row = {
    id: 'ioc_1',
    type: 'ip',
    normalized_value: '45.9.168.10',
    confidence: 95,
    status: 'ACTIVE',
    seen_count: 2,
    sources_json: '["feodo-tracker","urlhaus"]',
    family: 'QakBot',
    asn: '1234',
    asn_name: null,
    country: 'RU',
    expires_at: '2026-12-09T00:00:00.000Z',
    radar_enriched_at: null,
    created_at: '2026-11-25T00:00:00.000Z',
    updated_at: '2026-11-25T00:00:00.000Z',
  };

  test('json is the default projection', () => {
    const out = formatIocFeed([row], 'json');
    expect(out.contentType).toContain('application/json');
    const parsed = JSON.parse(out.body);
    expect(parsed.data[0].defanged).toBe('45[.]9[.]168[.]10');
    expect(parsed.data[0].sources).toEqual(['feodo-tracker', 'urlhaus']);
  });

  test('csv has a stable header and one row per record', () => {
    const out = formatIocFeed([row], 'csv');
    const lines = out.body.trim().split('\n');
    expect(out.contentType).toContain('text/csv');
    expect(lines[0]).toBe('type,value,confidence,family,asn,country,sources,first_seen,last_seen');
    expect(lines[1]).toContain('45.9.168.10');
    expect(lines[1]).toContain('feodo-tracker|urlhaus');
  });

  test('stix emits a valid STIX 2.1 bundle', () => {
    const out = formatIocFeed([row], 'stix');
    expect(out.contentType).toContain('application/stix+json');
    const bundle = JSON.parse(out.body);
    expect(isValidStixBundle(bundle)).toBe(true);
    expect(bundle.objects.some((o: any) => o.type === 'indicator')).toBe(true);
  });

  test('toCsv escapes quotes and commas', () => {
    const csv = toCsv([{ type: 'url', value: 'http://x/a,b"c', confidence: 90, family: null }]);
    expect(csv.split('\n')[1]).toContain('"http://x/a,b""c"');
  });

  test('status filter defaults to active and accepts explicit overrides', () => {
    expect(resolveFeedStatus(null)).toBe('ACTIVE');
    expect(resolveFeedStatus('expired')).toBe('EXPIRED');
    expect(resolveFeedStatus('all')).toBe('ANY');
  });
});

describe('OpenSSF / abuse.ch / Spamhaus mappers', () => {
  test('an OSV MAL record becomes a human-readable dossier', () => {
    const mapped = mapOsvMaliciousRecord({
      id: 'MAL-2026-20328',
      published: '2026-11-21T22:04:01Z',
      summary: 'Malicious code in @c1-ease/core (npm)',
      details: 'Dependency-confusion package with a postinstall beacon.',
      affected: [{ package: { ecosystem: 'npm', name: '@c1-ease/core' } }],
    });
    expect(mapped).not.toBeNull();
    expect(mapped!.report.id).toBe('MAL-2026-20328');
    expect(mapped!.report.source).toBe('openssf-osv');
    expect(mapped!.report.title).toContain('@c1-ease/core');
    expect(mapped!.report.family).toBe('@c1-ease/core');
    expect(mapped!.report.summary).toContain('Dependency-confusion');
    expect(JSON.parse(mapped!.report.report_json).ecosystems).toEqual(['npm']);
  });

  test('a non-MAL OSV record is not a malware dossier', () => {
    expect(mapOsvMaliciousRecord({ id: 'GHSA-xxxx', summary: 'x' })).toBeNull();
    expect(mapOsvMaliciousRecord({})).toBeNull();
  });

  test('package-manager fixed hashes become sha256 indicators', () => {
    const hash = 'b'.repeat(64);
    const mapped = mapOsvMaliciousRecord({
      id: 'MAL-2026-1',
      summary: 'Malicious code in left-pad (PyPI)',
      details: 'x',
      affected: [
        {
          package: { ecosystem: 'PyPI', name: 'left-pad' },
          ranges: [{ events: [{ fixed: hash }] }],
        },
      ],
    });
    expect(mapped!.iocs).toHaveLength(1);
    expect(mapped!.iocs[0]).toMatchObject({ type: 'sha256', value: hash, source: 'openssf-osv' });
  });

  test('Spamhaus NDJSON parsing skips metadata and keeps CIDRs', () => {
    const text = [
      '{"cidr":"1.10.16.0/20","sblid":"SBL1"}',
      '{"cidr":"45.9.168.0/24","sblid":"SBL2"},',
      '{"type":"metadata","records":2}',
      '',
    ].join('\n');
    expect(parseSpamhausDrop(text)).toEqual(['1.10.16.0/20', '45.9.168.0/24']);
  });

  test('Feodo parsing keeps family, ASN and country', () => {
    const rows = parseFeodoBlocklist([
      { ip_address: '162.243.103.246', malware: 'Emotet', as_number: 14061, as_name: 'DIGITALOCEAN-ASN', country: 'US' },
      { malware: 'no ip' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      ip: '162.243.103.246',
      family: 'Emotet',
      asn: '14061',
      asnName: 'DIGITALOCEAN-ASN',
      country: 'US',
    });
  });

  test('URLhaus API and plain-text URL feeds parse', () => {
    expect(parseUrlhausApi({ query_status: 'ok', urls: [{ url: 'http://evil.example/a', tags: ['emotet'] }] })).toEqual([
      { url: 'http://evil.example/a', family: 'emotet' },
    ]);
    expect(parsePlainUrlFeed('# comment\nhttp://evil.example/b\nnot a url\n')).toEqual([
      { url: 'http://evil.example/b', family: null },
    ]);
  });

  test('newest MAL ids are chosen by numeric suffix, not lexicographic order', () => {
    const items = [
      { name: 'npm/MAL-2026-1.json' },
      { name: 'npm/MAL-2026-10.json' },
      { name: 'npm/MAL-2026-100.json' },
      { name: 'npm/MAL-2026-20328.json' },
      { name: 'npm/GHSA-2026-9.json' },
    ];
    expect(selectNewestMalObjectNames(items, 2)).toEqual(['npm/MAL-2026-20328.json', 'npm/MAL-2026-100.json']);
    expect(selectNewestMalObjectNames(items, 2, ['MAL-2026-20328'])).toEqual([
      'npm/MAL-2026-100.json',
      'npm/MAL-2026-10.json',
    ]);
  });
});

describe('free-tier subrequest budget', () => {
  test('the ceiling is 25 external calls per run', () => {
    expect(MAX_SUBREQUESTS_PER_RUN).toBe(25);
  });
});
