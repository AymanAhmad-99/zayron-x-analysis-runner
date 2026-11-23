/**
 * M3 — Static Analysis Layer Tests
 *
 * Minimum M3 coverage:
 *  - PE static extraction (identity + binary metadata + sections + entropy)
 *  - ELF static extraction
 *  - unsupported artifact (UNSUPPORTED, never "clean")
 *  - no dynamic claims (no Behaviors/Claims/OBSERVED_DOING anywhere)
 *  - no family resolution (no FamilyCandidates emitted)
 *  - no ATT&CK/MBC (no technique mappings)
 *  - missing analyzer/bytes != clean (UNAVAILABLE status)
 *  - provenance on every emitted observation
 */
import { describe, it, expect } from 'bun:test';

import {
  runStaticAnalysis,
  detectFormat,
  shannonEntropy,
  extractStringIndicators,
  assessPackingIndicators,
  parsePe,
  parseElf,
  STATIC_ANALYZER_SOURCE_ID,
} from '../../packages/intelligence/src/malware/canonical';
import type { Artifact } from '../../packages/intelligence/src/malware/canonical';

const RUN_ID = 'ar_m3_test_001';

function makeArtifact(hashes: Record<string, string | undefined>, format: Artifact['format_class'] = 'OTHER'): Artifact {
  return {
    artifact_id: 'art_m3_test',
    identity_key: `sha256:${hashes.sha256 ?? '0'.repeat(64)}`,
    format_class: format,
    file_names: ['m3_test_sample.bin'],
    hashes: hashes as Artifact['hashes'],
    file_size_bytes: undefined,
    mime_type: 'application/octet-stream',
    format_attributes: {},
    provenance: {
      evidence_refs: [],
      source_ids: [],
      authority_tier: 'TIER_2',
      snapshot_ids: [],
      derived_at: '2026-09-20T00:00:00.000Z',
    },
  };
}

const ANALYZED_AT = '2026-09-20T12:00:00.000Z';

// ── Minimal deterministic PE32+ fixture (hand-built) ─────────────

function buildPe(): Uint8Array {
  const dosHeader = new Uint8Array(0x40);
  dosHeader[0] = 0x4d; // 'M'
  dosHeader[1] = 0x5a; // 'Z'
  const peOff = 0x80;
  const dv = new DataView(dosHeader.buffer);
  dv.setUint32(0x3c, peOff, true);

  const coffSize = 24; // PE signature + COFF
  const optSize = 112 + 16 * 8; // PE32+ optional header + 16 data directories
  const numSections = 2;
  const sectionTableSize = numSections * 40;
  const headerSize = peOff + coffSize + optSize + sectionTableSize;

  const pe = new Uint8Array(headerSize + 2048);
  pe.set(dosHeader, 0);
  pe[peOff] = 0x50; pe[peOff + 1] = 0x45; pe[peOff + 2] = 0; pe[peOff + 3] = 0;
  const pdv = new DataView(pe.buffer);
  pdv.setUint16(peOff + 4, 0x8664, true); // x86_64
  pdv.setUint16(peOff + 6, numSections, true);
  pdv.setUint32(peOff + 8, 0x678f0000, true); // timestamp
  pdv.setUint16(peOff + 20, optSize, true);

  const opt = peOff + 24;
  pdv.setUint16(opt, 0x20b, true); // PE32+
  pdv.setUint32(opt + 16, 0x1000, true); // entry point RVA
  pe[opt + 2] = 14; pe[opt + 3] = 29; // linker 14.29

  const ddOff = opt + 112;
  pdv.setUint32(ddOff + 4 * 8, 0x2000, true); // certificate directory present (signed indicator)

  // Section table
  const st = opt + optSize;
  const writeSection = (i: number, name: string, vsize: number, rsize: number, roff: number, fill: number) => {
    const base = st + i * 40;
    for (let j = 0; j < name.length; j++) pe[base + j] = name.charCodeAt(j);
    pdv.setUint32(base + 8, vsize, true);
    pdv.setUint32(base + 16, rsize, true);
    pdv.setUint32(base + 20, roff, true);
    pe.fill(fill, roff, roff + rsize);
  };
  const sec1Off = headerSize;
  writeSection(0, '.text', 0x1000, 0x800, sec1Off, 0x41); // repeating 'A' → low entropy
  const sec2Off = headerSize + 0x800;
  // pseudo-random fill for higher entropy
  let x = 12345;
  for (let i = 0; i < 0x800; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    pe[sec2Off + i] = (x >>> 16) & 0xff;
  }
  writeSection(1, '.data', 0x2000, 0x800, sec2Off, 0x41);
  for (let i = 0; i < 0x800; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    pe[sec2Off + i] = (x >>> 16) & 0xff;
  }
  pdv.setUint32(st + 40 + 8, 0x2000, true);
  pdv.setUint32(st + 40 + 16, 0x800, true);
  pdv.setUint32(st + 40 + 20, sec2Off, true);

  return pe;
}

// ── Minimal deterministic ELF64 fixture (hand-built) ─────────────

function buildElf(): Uint8Array {
  const size = 64 + 64 * 3 + 256;
  const elf = new Uint8Array(size);
  elf[0] = 0x7f; elf[1] = 0x45; elf[2] = 0x4c; elf[3] = 0x46;
  elf[4] = 2; // ELF64
  elf[5] = 1; // little endian
  const dv = new DataView(elf.buffer);
  dv.setUint16(16, 2, true); // ET_EXEC
  dv.setUint16(18, 62, true); // x86_64
  dv.setBigUint64(24, 0x1000n, true); // entry
  dv.setBigUint64(32, 0n, true); // phoff
  dv.setBigUint64(40, 64n, true); // shoff
  dv.setUint16(58, 64, true); // shentsize
  dv.setUint16(60, 3, true); // shnum
  dv.setUint16(62, 2, true); // shstrndx

  // Section 0: NULL. Section 1: .text PROGBITS with content. Section 2: .shstrtab.
  const textOff = 64 + 64 * 3;
  const textData = new Uint8Array(128);
  textData.fill(0x90); // NOPs — low entropy
  elf.set(textData, textOff);

  const writeSh = (i: number, nameOff: number, type: number, offset: number, size: number) => {
    const base = 64 + i * 64;
    dv.setUint32(base, nameOff, true);
    dv.setUint32(base + 4, type, true);
    dv.setBigUint64(base + 24, BigInt(offset), true);
    dv.setBigUint64(base + 32, BigInt(size), true);
  };
  writeSh(0, 0, 0, 0, 0);
  writeSh(1, 1, 1, textOff, 128); // .text
  writeSh(2, 7, 3, textOff + 128, 16); // .shstrtab

  // shstrtab content: "\0.text\0.shstrtab\0"
  const strTab = '.text\0.shstrtab\0';
  for (let i = 0; i < strTab.length; i++) elf[textOff + 128 + i] = strTab.charCodeAt(i);

  return elf;
}

// ── Tests ────────────────────────────────────────────────────────

describe('M3 static analysis — format detection and primitives', () => {
  it('detects PE, ELF, and unsupported formats by magic', () => {
    expect(detectFormat(buildPe())).toBe('PE');
    expect(detectFormat(buildElf())).toBe('ELF');
    expect(detectFormat(new TextEncoder().encode('just a text document'))).toBe('UNSUPPORTED');
  });

  it('entropy primitive behaves deterministically', () => {
    expect(shannonEntropy(new Uint8Array(0))).toBe(0);
    expect(shannonEntropy(new Uint8Array(1024).fill(0x41))).toBe(0);
    const high = new Uint8Array(4096);
    for (let i = 0; i < high.length; i++) high[i] = (i * 7919) & 0xff;
    expect(shannonEntropy(high)).toBeGreaterThan(7.5);
  });
});

describe('M3 static analysis — PE extraction', () => {
  const peBytes = buildPe();

  it('parses PE identity and binary metadata deterministically', () => {
    const pe = parsePe(peBytes);
    expect(pe).not.toBeNull();
    expect(pe!.architecture).toBe('x86_64');
    expect(pe!.entry_point).toBe(0x1000);
    expect(pe!.linker_version).toBe('14.29');
    expect(pe!.is_signed).toBe(true);
    expect(pe!.sections.map((s) => s.name)).toEqual(['.text', '.data']);
  });

  it('emits identity, binary_metadata, sections, entropy, string_indicators, packing observations — all STATIC', () => {
    const artifact = makeArtifact({ sha256: 'a'.repeat(64) }, 'PE');
    const result = runStaticAnalysis({
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: peBytes,
      analyzed_at: ANALYZED_AT,
    });

    expect(result.status).toBe('OBSERVED');
    const types = result.observations.map((o) => o.observation_type);
    expect(types).toContain('binary_metadata');
    expect(types).toContain('sections');
    expect(types).toContain('entropy');
    expect(types).toContain('string_indicators');
    expect(types).toContain('packing_indicators');

    const meta = result.observations.find((o) => o.observation_type === 'binary_metadata')!;
    expect(meta.attributes.analysis_status).toBe('OBSERVED');
    expect(meta.attributes.architecture).toBe('x86_64');
    expect(meta.attributes.entry_point).toBe('0x1000');
    expect(meta.attributes.linker_version).toBe('14.29');
    expect(meta.attributes.signature_indicator).toBe('CERTIFICATE_DIRECTORY_PRESENT');
    expect(meta.attributes.detected_format).toBe('PE');
    expect(meta.attributes.size_bytes).toBe(peBytes.length);

    // imports/exports not implemented in this analyzer version → NO_RESULT, never absence
    const ie = result.observations.find((o) => o.observation_type === 'imports_exports');
    expect(ie).toBeDefined();
    expect(ie!.attributes.analysis_status).toBe('NO_RESULT');
  });

  it('packing assessment requires >= 2 signals — a single weak clue is never "packed"', () => {
    // High entropy alone → NO_RESULT
    const single = assessPackingIndicators({
      overall_entropy: 7.9,
      max_section_entropy: 0,
      anomalous_section_names: false,
      entry_point_in_last_section: false,
      section_virtual_vs_raw_inflation: false,
    });
    expect(single.assessment).toBe('NO_RESULT');
    expect(single.indicators).toEqual(['overall_entropy_high']);

    // Two signals → INDICATED (indicator evidence, not a behavior claim)
    const two = assessPackingIndicators({
      overall_entropy: 7.9,
      max_section_entropy: 7.5,
      anomalous_section_names: false,
      entry_point_in_last_section: false,
      section_virtual_vs_raw_inflation: false,
    });
    expect(two.assessment).toBe('INDICATED');
    expect(two.min_signals_required).toBe(2);
  });
});

describe('M3 static analysis — ELF extraction', () => {
  const elfBytes = buildElf();

  it('parses ELF identity deterministically', () => {
    const elf = parseElf(elfBytes);
    expect(elf).not.toBeNull();
    expect(elf!.elf_class).toBe('ELF64');
    expect(elf!.architecture).toBe('x86_64');
    expect(elf!.type).toBe('EXEC');
    expect(elf!.entry_point).toBe('0x1000');
    expect(elf!.sections.map((s) => s.name)).toContain('.text');
  });

  it('emits ELF static observations with OBSERVED status and entropy', () => {
    const artifact = makeArtifact({ sha256: 'b'.repeat(64) }, 'ELF');
    const result = runStaticAnalysis({
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: elfBytes,
      analyzed_at: ANALYZED_AT,
    });

    expect(result.status).toBe('OBSERVED');
    const meta = result.observations.find((o) => o.observation_type === 'binary_metadata')!;
    expect(meta.attributes.architecture).toBe('x86_64');
    expect(meta.attributes.elf_class).toBe('ELF64');
    expect(meta.attributes.elf_type).toBe('EXEC');

    const sections = result.observations.find((o) => o.observation_type === 'sections')!;
    expect(sections.attributes.analysis_status).toBe('OBSERVED');
    expect(String(sections.attributes.sections)).toContain('.text');
  });
});

describe('M3 static analysis — status semantics and epistemic separation', () => {
  it('unsupported artifact → UNSUPPORTED, never clean', () => {
    const artifact = makeArtifact({ sha256: 'c'.repeat(64) }, 'DOCUMENT');
    const result = runStaticAnalysis({
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: new TextEncoder().encode('plain text file with https://example.com link'),
      analyzed_at: ANALYZED_AT,
    });
    expect(result.status).toBe('UNSUPPORTED');
    expect(result.observations[0].attributes.analysis_status).toBe('UNSUPPORTED');
    // The word "clean" must never appear as an assessment
    expect(JSON.stringify(result)).not.toContain('CLEAN');
    expect(JSON.stringify(result)).not.toContain('clean');
  });

  it('missing bytes → UNAVAILABLE, never clean', () => {
    const artifact = makeArtifact({ sha256: 'd'.repeat(64) }, 'PE');
    const result = runStaticAnalysis({
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: null,
      analyzed_at: ANALYZED_AT,
    });
    expect(result.status).toBe('UNAVAILABLE');
    expect(result.observations[0].attributes.analysis_status).toBe('UNAVAILABLE');
  });

  it('NO DYNAMIC CLAIMS: analyzer emits no Behaviors, no Claims, no OBSERVED_DOING, no modality assertions', () => {
    const artifact = makeArtifact({ sha256: 'a'.repeat(64) }, 'PE');
    const result = runStaticAnalysis({
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: buildPe(),
      analyzed_at: ANALYZED_AT,
    });
    const json = JSON.stringify(result);
    // No behavior/claim objects of any kind
    expect(json).not.toContain('behavior_id');
    expect(json).not.toContain('claim_id');
    expect(json).not.toContain('OBSERVED_DOING');
    expect(json).not.toContain('CAN_DO');
    // No epistemic escalation beyond observation
    expect(json).not.toContain('EXHIBITS_CAPABILITY');
  });

  it('NO FAMILY RESOLUTION: analyzer emits no FamilyCandidates and consumes no family labels', () => {
    const artifact = makeArtifact({ sha256: 'a'.repeat(64) }, 'PE');
    const result = runStaticAnalysis({
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: buildPe(),
      analyzed_at: ANALYZED_AT,
    });
    const json = JSON.stringify(result);
    expect(json).not.toContain('family_candidate');
    expect(json).not.toContain('candidate_family');
    expect(json).not.toContain('resolution_state');
  });

  it('NO ATT&CK/MBC: no technique mappings of any kind', () => {
    const artifact = makeArtifact({ sha256: 'a'.repeat(64) }, 'PE');
    const result = runStaticAnalysis({
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: buildPe(),
      analyzed_at: ANALYZED_AT,
    });
    const json = JSON.stringify(result);
    expect(json).not.toContain('technique_id');
    expect(json).not.toContain('technique_mappings');
    expect(json).not.toContain('mapping_provenance');
    expect(json).not.toContain('T1486');
  });

  it('PROVENANCE: every observation carries analysis_run_id, artifact_id, STATIC evidence ref, and analyzer source', () => {
    const artifact = makeArtifact({ sha256: 'a'.repeat(64) }, 'PE');
    const result = runStaticAnalysis({
      analysis_run_id: RUN_ID,
      artifact,
      rawBytes: buildPe(),
      analyzed_at: ANALYZED_AT,
    });

    expect(result.observations.length).toBeGreaterThanOrEqual(5);
    for (const obs of result.observations) {
      expect(obs.analysis_run_id).toBe(RUN_ID);
      expect(obs.artifact_id).toBe('art_m3_test');
      expect(obs.source).toBe('STATIC_ANALYSIS');
      expect(obs.evidence_refs).toHaveLength(1);
      expect(obs.evidence_refs[0].kind).toBe('STATIC');
      expect(obs.evidence_refs[0].source_id).toBe(STATIC_ANALYZER_SOURCE_ID);
      expect(obs.provenance.evidence_refs).toEqual(obs.evidence_refs);
      expect(obs.provenance.derived_at).toBe(ANALYZED_AT);
    }
  });

  it('string indicator extraction records static indicators with explicit non-execution semantics', () => {
    const text = [
      'Visit https://evil.example.com/payload now',
      'connect to 203.0.113.99 and load cmd.exe',
      'HKEY_CURRENT_USER\\Software\\Run',
    ].join(' some padding text ');
    const res = extractStringIndicators(new TextEncoder().encode(text));
    const ids = res.indicators.map((i) => i.id);
    expect(ids).toContain('url');
    expect(ids).toContain('ipv4');
    expect(ids).toContain('executable_name');
    expect(ids).toContain('registry_path');
  });
});
