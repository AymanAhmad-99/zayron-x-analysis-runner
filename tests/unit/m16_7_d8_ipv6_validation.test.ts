import { describe, expect, test } from 'bun:test';

import { canonicalIpv6 } from '../../packages/intelligence/src/malware/canonical/ipValidation';
import { classifyIndicator } from '../../packages/intelligence/src/malware/canonical/infrastructureCorrelation';
import { validateStaticIndicator } from '../../packages/intelligence/src/malware/canonical/staticEvidenceProjection';
import { extractStringIndicators } from '../../packages/intelligence/src/malware/canonical/staticAnalysis';

const VALID = [
  '::1',
  '2001:db8::1',
  '2001:db8:0:0:0:0:2:1',
  'fe80::',
  '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
];

const MALFORMED = ['2:::B', '1:::2', ':::', '1:2:3:4:5:6:7:8:9', '12345::1', 'gggg::1'];

describe('M16.7-D8 — canonical IPv6 validator', () => {
  test('accepts every valid IPv6 form', () => {
    for (const v of VALID) expect([v, canonicalIpv6(v)]).toEqual([v, true]);
  });

  test('rejects every malformed IPv6-like form', () => {
    for (const v of MALFORMED) expect([v, canonicalIpv6(v)]).toEqual([v, false]);
  });

  test('rejects the remaining grammar violations (multiple ::, 7/9 groups, trailing colon junk, non-string)', () => {
    expect(canonicalIpv6('2001:db8::1::2')).toBe(false);
    expect(canonicalIpv6('1:2:3:4:5:6:7')).toBe(false);
    expect(canonicalIpv6('1.2.3.4')).toBe(false);
    expect(canonicalIpv6('')).toBe(false);
    expect(canonicalIpv6('fe80::1%eth0')).toBe(false);
    expect(canonicalIpv6(null as unknown as string)).toBe(false);
  });

  test('accepts the standard IPv4-embedded form', () => {
    expect(canonicalIpv6('::ffff:192.0.2.1')).toBe(true);
    expect(canonicalIpv6('::ffff:999.0.2.1')).toBe(false);
  });
});

describe('M16.7-D8 — extraction guard', () => {
  const ipv6Values = (s: string) =>
    extractStringIndicators(new TextEncoder().encode(s)).indicators
      .filter((i) => i.id === 'ipv6')
      .map((i) => i.value);

  test('malformed 2:::B is never assigned the ipv6 class', () => {
    expect(ipv6Values('2:::B')).toEqual([]);
  });

  test('a valid IPv6 token is still extracted, and every extracted ipv6 value is valid', () => {
    const values = ipv6Values('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) expect(canonicalIpv6(v)).toBe(true);
  });

  test('no extracted ipv6 value can be malformed, even beside junk', () => {
    for (const v of ipv6Values('junk 2:::B then 2001:db8::1 junk')) expect(canonicalIpv6(v)).toBe(true);
  });
});

describe('M16.7-D8 — classification guard', () => {
  test('valid IPv6 classifies IPV6; malformed does not', () => {
    for (const v of VALID) expect(classifyIndicator(v)).toBe('IPV6');
    for (const v of MALFORMED) expect(classifyIndicator(v)).not.toBe('IPV6');
    expect(classifyIndicator('2:::B')).toBe('OTHER');
  });

  test('IPv4 and URL behaviour is unchanged', () => {
    expect(classifyIndicator('10.0.0.1')).toBe('IPV4');
    expect(classifyIndicator('https://example.test/a')).toBe('URL');
    expect(classifyIndicator('example.test')).toBe('OTHER');
  });
});

describe('M16.7-D8 — canonical validation guard', () => {
  const indicator = (indicator_type: string, value: string) =>
    ({
      indicator_type,
      value,
      evidence_id: 'ev_1',
      artifact_id: 'art_1',
      analysis_run_id: 'ar_1',
      source_tool: 'static',
      tool_version: '1.0.0',
      observation_id: 'obs_1',
      epistemic_status: 'STATIC_CANDIDATE',
      execution_confirmed: false,
    }) as never;

  test('a value typed IPV6 must be syntactically valid IPv6', () => {
    expect(validateStaticIndicator(indicator('IPV6', '2:::B'))).toContain('indicator:invalid_ipv6');
    expect(validateStaticIndicator(indicator('IPV6', '::1'))).not.toContain('indicator:invalid_ipv6');
    expect(validateStaticIndicator(indicator('IPV6', '2001:db8::1'))).toEqual([]);
  });
});
