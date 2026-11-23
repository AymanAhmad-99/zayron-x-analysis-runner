/**
 * M16.2 Gate 1 — CANONICAL FORMAT AUTHORITY
 *
 * Proves:
 *   - ONE canonical structural resolver classifies PE / ELF / Mach-O / RAR /
 *     RAR5 / ZIP, with `UNSUPPORTED` as the canonical OTHER/UNKNOWN fallback;
 *   - recognition is deterministic and pure (same bytes → same format);
 *   - archive recognition does NOT activate any binary analyzer: a recognized
 *     RAR/RAR5/ZIP routes to an identity-only static step, the five structural
 *     analyzers are EXTERNAL_EXECUTION (never canonically scheduled), and magika
 *     (content-agnostic) is the only PLANNED tool;
 *   - secondary classifications cannot override routing: feed classification
 *     disagrees (OTHER) while canonical routing stays ZIP, and magika content
 *     typing is evidence only.
 *
 * Recognition-only: NO parser, NO enumeration, NO extraction, NO archive
 * fixture requiring a parser. Minimal byte-signature buffers only.
 */
import { describe, it, expect } from 'bun:test';

import { detectFormat, isIdentityOnlyFormat } from '../../packages/intelligence/src/malware/canonical/staticAnalysis';
import { classifyFeedBytes } from '../../packages/intelligence/src/malware/canonical/githubMalwareFeedAdapter';
import { planAnalysis, type AnalysisPlan } from '../../packages/intelligence/src/malware/canonical/analysisPlanner';
import { CONTENT_AGNOSTIC_FORMATS } from '../../packages/intelligence/src/malware/canonical/toolBridge';

const PE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
const ELF = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]);
const MACHO = new Uint8Array([0xcf, 0xfa, 0xed, 0xfe]);
const RAR4 = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]);
const RAR5 = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]);
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
const UNKNOWN = new Uint8Array([0x00, 0x01, 0x02, 0x03]);

const SHA = 'f'.repeat(64);
const ARTIFACT_ID = `art_gmf_${SHA.slice(0, 16)}`;

function planFor(bytes: Uint8Array): AnalysisPlan {
  return planAnalysis({
    analysis_run_id: 'ar_gate1_holdout_001',
    artifact: {
      artifact_id: ARTIFACT_ID,
      identity_key: `sha256:${SHA}`,
      hashes: { sha256: SHA },
      file_names: ['gate1_holdout.bin'],
      file_size_bytes: bytes.length,
      format_class: 'OTHER',
    } as never,
    rawBytes: bytes,
    existing_observations: [],
    toolAvailability: null,
    planned_at: '2026-09-25T00:00:00.000Z',
  });
}

const toolStatus = (plan: AnalysisPlan) =>
  new Map(plan.steps.filter((s) => s.step_type === 'EXTERNAL_TOOL').map((s) => [s.tool_id, s.status] as const));

describe('M16.2 Gate 1 — canonical structural format resolver', () => {
  it('1-3. recognizes PE, ELF and Mach-O', () => {
    expect(detectFormat(PE)).toBe('PE');
    expect(detectFormat(ELF)).toBe('ELF');
    expect(detectFormat(MACHO)).toBe('MACH_O');
    // The three binary formats are NOT identity-only: existing routing preserved.
    expect(isIdentityOnlyFormat('PE')).toBe(false);
    expect(isIdentityOnlyFormat('ELF')).toBe(false);
    expect(isIdentityOnlyFormat('MACH_O')).toBe(false);
  });

  it('4-6. recognizes RAR (RAR4), RAR5 and ZIP container signatures', () => {
    expect(detectFormat(RAR4)).toBe('RAR');
    expect(detectFormat(RAR5)).toBe('RAR5');
    expect(detectFormat(ZIP)).toBe('ZIP');
    // A recognized archive has no structural analyzer route yet.
    expect(isIdentityOnlyFormat('RAR')).toBe(true);
    expect(isIdentityOnlyFormat('RAR5')).toBe(true);
    expect(isIdentityOnlyFormat('ZIP')).toBe(true);
  });

  it('distinguishes RAR4 from RAR5 by the shared prefix + 8th byte', () => {
    const truncatedRar5 = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01]); // 7 bytes, version byte only
    expect(detectFormat(truncatedRar5)).toBe('UNSUPPORTED');
  });

  it('7-8. unknown and truncated bytes fall back to UNSUPPORTED (never a guess)', () => {
    expect(detectFormat(UNKNOWN)).toBe('UNSUPPORTED');
    expect(detectFormat(new Uint8Array(0))).toBe('UNSUPPORTED');
    expect(detectFormat(new Uint8Array([0x4d]))).toBe('UNSUPPORTED'); // partial MZ
    expect(detectFormat(new Uint8Array([0x50, 0x4b, 0x03]))).toBe('UNSUPPORTED'); // partial ZIP
    expect(detectFormat(new Uint8Array([0x52, 0x61]))).toBe('UNSUPPORTED'); // partial RAR
  });

  it('9. recognition is deterministic — same bytes, same result', () => {
    for (const bytes of [PE, ELF, MACHO, RAR4, RAR5, ZIP, UNKNOWN]) {
      const first = detectFormat(bytes);
      for (let i = 0; i < 3; i++) expect(detectFormat(bytes)).toBe(first);
    }
  });

  it('10. feed classification may disagree but cannot override canonical routing', () => {
    // The acquisition classifier does not know ZIP...
    expect(classifyFeedBytes(ZIP)).toBe('OTHER');
    // ...while the canonical resolver does, and IT owns routing.
    expect(detectFormat(ZIP)).toBe('ZIP');

    const plan = planFor(ZIP);
    const byTool = toolStatus(plan);
    for (const tool of ['lief', 'floss', 'die', 'yara-x', 'capa']) {
      expect(byTool.get(tool as never)).toBe('EXTERNAL_EXECUTION');
    }
    // magika is the only PLANNED external tool: nothing binary is forced.
    const planned = plan.steps
      .filter((s) => s.step_type === 'EXTERNAL_TOOL' && s.status === 'PLANNED')
      .map((s) => s.tool_id);
    expect(planned).toEqual(['magika']);
  });

  it('11. magika content typing is evidence only and cannot change canonical routing', () => {
    // magika accepts every format (content-agnostic), so its applicability does
    // not depend on — and cannot substitute for — the canonical structural
    // format. Routing consumes the resolver's result alone.
    expect(CONTENT_AGNOSTIC_FORMATS).toContain('ZIP');
    expect(CONTENT_AGNOSTIC_FORMATS).toContain('RAR5');
    const plan = planFor(RAR5);
    expect(toolStatus(plan).get('magika' as never)).toBe('PLANNED');
  });

  it('recognized archives route to an identity-only DEFERRED static step (no analyzer claim)', () => {
    for (const bytes of [RAR4, RAR5, ZIP]) {
      const plan = planFor(bytes);
      const staticSteps = plan.steps.filter((s) => s.step_type === 'STATIC');
      expect(staticSteps).toHaveLength(1);
      expect(staticSteps[0].status).toBe('DEFERRED');
      // No archive parser capability is asserted anywhere in the plan.
      expect(plan.steps.every((s) => s.phase === 'CURRENT_PHASE')).toBe(true);
    }
  });

  it('PE routing is unchanged (all approved analyzers canonically scheduled)', () => {
    const plan = planFor(PE);
    const byTool = toolStatus(plan);
    for (const tool of ['lief', 'floss', 'die', 'yara-x', 'capa', 'magika']) {
      expect(byTool.get(tool as never)).toBe('PLANNED');
    }
  });
});
