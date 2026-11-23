/**
 * P3 — String indicator evidence-depth tests (static-only, deterministic).
 *
 * Locks the extractor upgrade:
 *  - whole-artifact scan (the previous pass stopped at 262,144 bytes)
 *  - UTF-16LE strings are extracted (many script/.NET artifacts store strings
 *    only as interleaved printable byte + NUL)
 *  - deterministic indicator classes: url, domain, email, ipv4, ipv6,
 *    mutex_like, registry_path, windows_path, unix_path, command_fragment,
 *    user_agent, encoded_blob_base64, executable_name
 *  - no filler/false-positive promotion, bounded budget, honest cap reporting
 *  - every indicator inherits STATIC evidence lineage from the observation and
 *    asserts nothing about behavior, C2, intent or execution
 */
import { describe, it, expect } from 'bun:test';

import {
  runStaticAnalysis,
  extractStringIndicators,
  scanEmbeddedObjects,
  MAX_STRING_INDICATORS,
  STATIC_ANALYZER_SOURCE_ID,
} from '../../packages/intelligence/src/malware/canonical';
import type { Artifact } from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_p3_strings_001';
const SHA = 'b'.repeat(64);

function ascii(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function utf16le(s: string): Uint8Array {
  const out = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) out[i * 2] = s.charCodeAt(i) & 0x7f;
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function makeArtifact(): Artifact {
  return {
    artifact_id: 'art_p3_strings',
    identity_key: `sha256:${SHA}`,
    format_class: 'OTHER',
    file_names: ['p3_strings_sample.bin'],
    hashes: { sha256: SHA } as Artifact['hashes'],
    file_size_bytes: undefined,
    mime_type: 'application/octet-stream',
    format_attributes: {},
    provenance: {
      evidence_refs: [],
      source_ids: [],
      authority_tier: 'TIER_2',
      snapshot_ids: [],
      derived_at: '2026-09-23T00:00:00.000Z',
    },
  };
}

const ids = (bytes: Uint8Array) => extractStringIndicators(bytes).indicators.map((i) => i.id);
const values = (bytes: Uint8Array) => extractStringIndicators(bytes).indicators.map((i) => i.value);

/** Minimal valid PE32+ fixture (one section) with the payload inside .text. */
function buildPe(payload: string): Uint8Array {
  const peOff = 0x40;
  const optSize = 112 + 16 * 8;
  const headerSize = peOff + 24 + optSize + 40;
  const text = new TextEncoder().encode(payload);
  const pe = new Uint8Array(headerSize + 0x400 + text.length);
  pe[0] = 0x4d;
  pe[1] = 0x5a;
  const dv = new DataView(pe.buffer);
  dv.setUint32(0x3c, peOff, true);
  pe[peOff] = 0x50;
  pe[peOff + 1] = 0x45;
  dv.setUint16(peOff + 4, 0x8664, true);
  dv.setUint16(peOff + 6, 1, true);
  dv.setUint32(peOff + 8, 0x678f0000, true);
  dv.setUint16(peOff + 20, optSize, true);
  const opt = peOff + 24;
  dv.setUint16(opt, 0x20b, true);
  dv.setUint32(opt + 16, 0x1000, true);
  pe[opt + 2] = 14;
  pe[opt + 3] = 29;
  const st = opt + optSize;
  const secOff = headerSize;
  const name = '.text';
  for (let j = 0; j < name.length; j++) pe[st + j] = name.charCodeAt(j);
  dv.setUint32(st + 8, 0x1000, true);
  dv.setUint32(st + 16, 0x400, true);
  dv.setUint32(st + 20, secOff, true);
  pe.fill(0x41, secOff, secOff + 0x400);
  pe.set(text, secOff + 16);
  return pe;
}

describe('P3 — deterministic string indicator depth', () => {
  it('scans the whole artifact: an indicator past the old 262,144-byte bound is still found', () => {
    const padding = new Uint8Array(400_000); // well past the previous byte cap
    const tail = ascii('contact us at https://late.example.net/beacon for details');
    const res = extractStringIndicators(concat(padding, tail));
    expect(res.indicators.map((i) => i.value)).toContain('https://late.example.net/beacon');
    expect(res.byte_scan_capped).toBe(false);
  });

  it('extracts UTF-16LE strings and marks the encoding (ASCII-only scan could not)', () => {
    const res = extractStringIndicators(concat(new Uint8Array(16), utf16le('cmd.exe /c powershell -enc AAAA BBBB')));
    const hits = res.indicators.filter((i) => i.encoding === 'utf16le');
    expect(hits.length).toBeGreaterThan(0);
    expect(res.ascii_strings).toBeGreaterThanOrEqual(0);
    expect(res.unicode_strings).toBeGreaterThan(0);
  });

  it('classifies deterministic indicator classes and never promotes a filler run', () => {
    const text = [
      'https://evil.example.com/payload',
      'beacon.evil.example.org',
      'operator@evil.example.net',
      '203.0.113.99',
      '2001:db8::1',
      'Global\\ZxGuardMutex',
      'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      'C:\\Users\\Public\\stage2.exe',
      '/etc/ld.so.preload',
      'powershell.exe -nop -w hidden -enc SQBFAFgA',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo0MTIzNDU2Nzg5MA==',
      'O'.repeat(80),
    ].join(' padding ');
    const found = ids(ascii(text));
    for (const id of [
      'url',
      'domain',
      'email',
      'ipv4',
      'ipv6',
      'mutex_like',
      'registry_path',
      'windows_path',
      'unix_path',
      'command_fragment',
      'user_agent',
      'encoded_blob_base64',
      'executable_name',
    ]) {
      expect(found).toContain(id);
    }
    // A repeated filler character is not an encoded blob.
    expect(values(ascii(text))).not.toContain('O'.repeat(80));
  });

  it('does not treat wildcard/broadcast addresses as IPv4 indicators', () => {
    const v = values(ascii('bind to 0.0.0.0 and 255.255.255.255 but also 10.11.12.13'));
    expect(v).toContain('10.11.12.13');
    expect(v).not.toContain('0.0.0.0');
    expect(v).not.toContain('255.255.255.255');
  });

  it('bounds its output truthfully (per-category and total caps) and reports capping', () => {
    const text = Array.from({ length: 400 }, (_, i) => `https://host${i}.example.com/path`).join(' ');
    const res = extractStringIndicators(ascii(text));
    expect(res.indicators.length).toBeLessThanOrEqual(MAX_STRING_INDICATORS);
    expect(res.indicators.filter((i) => i.id === 'url').length).toBeLessThanOrEqual(16); // per-category cap
    const dense = new Uint8Array(4096 * 8).fill(0x41);
    expect(extractStringIndicators(dense).scanned_capped).toBe(false);
  });

  it('every indicator inherits STATIC evidence lineage from the observation and asserts no behavior', () => {
    const rawBytes = buildPe('http://c2.example.com/gate and ping 198.51.100.7 and C:\\Temp\\x.dll');
    const result = runStaticAnalysis({
      analysis_run_id: RUN_ID,
      artifact: makeArtifact(),
      rawBytes,
      analyzed_at: '2026-09-23T00:00:00.000Z',
    });
    const obs = result.observations.find((o) => o.observation_type === 'string_indicators')!;
    expect(obs.analysis_run_id).toBe(RUN_ID);
    expect(obs.artifact_id).toBe('art_p3_strings');
    expect(obs.attributes.analysis_status).toBe('OBSERVED');
    expect(Number(obs.attributes.indicator_count)).toBeGreaterThan(0);
    expect(String(obs.attributes.indicator_categories)).toContain('url');
    expect(String(obs.attributes.epistemic_note)).toContain('does not imply');
    expect(Object.keys(obs.attributes).some((k) => /^indicator_\d+_/.test(k))).toBe(true);

    expect(obs.evidence_refs.length).toBe(1);
    expect(obs.evidence_refs[0].kind).toBe('STATIC');
    expect(obs.evidence_refs[0].source_id).toBe(STATIC_ANALYZER_SOURCE_ID);
    expect(obs.evidence_refs[0].evidence_id.startsWith('ev_static_')).toBe(true);
    expect(obs.evidence_refs[0].source_snapshot_id).toBe(RUN_ID);
    expect(obs.provenance.evidence_refs).toEqual(obs.evidence_refs);

    // Static string evidence never produces behavior/family/technique output.
    expect(result.observations.every((o) => o.evidence_refs.every((r) => r.kind === 'STATIC'))).toBe(true);
    expect(JSON.stringify(obs)).not.toContain('OBSERVED_DOING');
  });
});

describe('P3 — embedded object / overlay structure evidence', () => {
  function minimalPe(extraBytes = 0): Uint8Array {
    const pe = buildPe('padding padding padding');
    if (extraBytes === 0) return pe;
    const out = new Uint8Array(pe.length + extraBytes);
    out.set(pe, 0);
    return out;
  }

  it('reports overlay bytes past the last section instead of pretending the file ends cleanly', () => {
    const base = scanEmbeddedObjects(minimalPe(), true).overlay_bytes;
    const res = scanEmbeddedObjects(minimalPe(512), true);
    expect(res.overlay_bytes).toBe(base + 512);
  });

  it('detects a nested PE only when a real PE header follows the MZ magic', () => {
    const nested = buildPe('inner payload');
    const outer = new Uint8Array(64 + nested.length);
    outer.set(nested, 64);
    const hits = scanEmbeddedObjects(outer, false).signatures.filter((s) => s.id === 'embedded_pe');
    expect(hits.length).toBe(1);
    expect(hits[0].offset).toBe(64);

    // Bare 'MZ' bytes without a PE header are not an embedded PE.
    const bare = new Uint8Array(256);
    bare[100] = 0x4d;
    bare[101] = 0x5a;
    expect(scanEmbeddedObjects(bare, false).signatures.some((s) => s.id === 'embedded_pe')).toBe(false);
  });

  it('detects archive and compiled-script magics as structure, not as payloads', () => {
    const zip = new Uint8Array(64);
    zip.set([0x50, 0x4b, 0x03, 0x04], 16);
    expect(scanEmbeddedObjects(zip, false).signatures.map((s) => s.id)).toContain('zip_archive');

    const au3 = new Uint8Array(64);
    au3.set(new TextEncoder().encode('AU3!EA06'), 8);
    expect(scanEmbeddedObjects(au3, false).signatures.map((s) => s.id)).toContain('compiled_autoit_script');
  });

  it('records an empty result as NO_RESULT with an explicit non-cleanliness reason', () => {
    const res = scanEmbeddedObjects(minimalPe(), true);
    expect(res.status).toBe('NO_RESULT');
    expect(String(res.reason)).toContain('not evidence of absence');
    expect(res.signatures).toEqual([]);
  });

  it('emits an embedded_objects observation carrying STATIC lineage and a no-extraction note', () => {
    const rawBytes = concat(buildPe('body'), new Uint8Array([0x50, 0x4b, 0x03, 0x04]));
    const result = runStaticAnalysis({
      analysis_run_id: RUN_ID,
      artifact: makeArtifact(),
      rawBytes,
      analyzed_at: '2026-09-23T00:00:00.000Z',
    });
    const obs = result.observations.find((o) => o.observation_type === 'embedded_objects')!;
    expect(obs.analysis_run_id).toBe(RUN_ID);
    expect(obs.artifact_id).toBe('art_p3_strings');
    expect(obs.evidence_refs[0].kind).toBe('STATIC');
    expect(obs.evidence_refs[0].source_snapshot_id).toBe(RUN_ID);
    expect(String(obs.attributes.epistemic_note)).toContain('not a confirmed payload');
    expect(String(obs.attributes.embedded_signatures)).toContain('zip_archive');
  });
});
