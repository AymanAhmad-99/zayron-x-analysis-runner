/**
 * M16.4.32 — REPORT SEMANTIC CONSISTENCY & REPRODUCIBILITY GATE
 *
 * A narrow correction of the customer-facing malware report's SEMANTICS:
 * a canonical Behavior record whose modality is CAN_DO is a STATIC CAPABILITY
 * INDICATION — the code is structured to do this — and is NEVER described as an
 * observed, runtime, executed or "evidence-backed" behaviour. Only a record
 * whose modality establishes execution (OBSERVED_DOING, backed by DYNAMIC
 * evidence) is a runtime behaviour, and this specimen has none.
 *
 * Everything asserted here runs over the REAL stored document of run
 * 36716096667 / specimen
 * e4e5c3a6c15beff4e17117075e2c0bd65f176d81e6885134d2b4d97c20d4773a. No evidence
 * is invented, no value is hand-authored, and the production datastore is never
 * touched. The full re-materialization determinism proof (the same real
 * container envelope → byte-identical report) is the M16.4.32 harness; this
 * suite pins the committed fixture to that output and enforces the invariants.
 */
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

import {
  behaviorExposure,
  summarizeBehaviorSemantics,
  type BehaviorExposureInput,
} from '../../packages/intelligence/src/malware/canonical/behaviorProcessor';
import {
  deriveBehaviorSectionSemantics,
  lintReportSemantics,
} from '../../packages/intelligence/src/malware/canonical/reportSemanticLint';
import {
  BEHAVIOR_EXPOSURE,
  BEHAVIOR_SECTION_TITLES,
  DYNAMIC_NOT_PERFORMED,
  behaviorSemantics,
  dynamicExecutionState,
} from '../../apps/web/app/lib/malwareReportProjection';

const FIXTURE_PATH = join(import.meta.dir, '..', 'fixtures', 'malware_report', 'real_report_e4e5c3a6.json');
const PROVENANCE_PATH = join(import.meta.dir, '..', 'fixtures', 'malware_report', 'PROVENANCE.json');

const FIXTURE_TEXT = readFileSync(FIXTURE_PATH, 'utf8');
const load = (): Record<string, any> => JSON.parse(FIXTURE_TEXT) as Record<string, any>;
const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

const REAL_SHA = 'e4e5c3a6c15beff4e17117075e2c0bd65f176d81e6885134d2b4d97c20d4773a';
const REAL_RUNNER = 'gh-runner-36716096667';
const REAL_CAPA_STDOUT_SHA = '94b15f832b17a025c0e8eda319edcaa6f1c848414d099ededeeb8ea337942931';

const behaviorItems = (report: Record<string, any>): BehaviorExposureInput[] =>
  (report.behaviors?.items ?? []) as BehaviorExposureInput[];

const allStatements = (report: Record<string, any>): string[] =>
  ((report.executive_assessment?.statements ?? []) as { statement: string }[]).map((s) => s.statement);

/* ─────────────────────── 1. CAN_DO never a runtime behaviour ─────────────────────── */

describe('M16.4.32 / capability != runtime behavior', () => {
  it('1. a CAN_DO record is a static capability and never a runtime behavior', () => {
    const report = load();
    const items = behaviorItems(report);
    expect(items.length).toBeGreaterThan(0);

    for (const record of items) {
      // The canonical record itself says CAN_DO, not "observed".
      expect((record as Record<string, any>).modality).toBe('CAN_DO');
      expect((record as Record<string, any>).category).toBe('capability');
      // The one canonical classifier refuses to call it a runtime behavior.
      expect(behaviorExposure(record)).toBe('STATIC_CAPABILITY');
    }

    // And nothing in the record set establishes execution.
    const derived = deriveBehaviorSectionSemantics(report.behaviors);
    expect(derived.observed_runtime_behavior_count).toBe(0);
    expect(derived.static_capability_count).toBe(items.length);
  });

  it('2. the static capability count is derived from the records, never hard-coded', () => {
    const report = load();
    const derived = summarizeBehaviorSemantics(behaviorItems(report));

    expect(report.behaviors.static_capability_count).toBe(derived.static_capability_count);
    expect(report.behaviors.record_count).toBe(derived.record_count);
    expect(report.behaviors.observed_runtime_behavior_count).toBe(derived.observed_runtime_behavior_count);
    expect(derived.static_capability_count).toBe(1);

    // It is a real derivation: removing the record changes the count.
    expect(deriveBehaviorSectionSemantics({ items: [] }).static_capability_count).toBe(0);
    expect(deriveBehaviorSectionSemantics({ items: (report.behaviors.items as unknown[]).slice(1) }).static_capability_count).toBe(0);
  });

  it('3. observed runtime behavior is 0 while no runtime evidence exists', () => {
    const report = load();
    expect(report.behaviors.observed_runtime_behavior_count).toBe(0);
    expect(report.behaviors.exposure).toBe('STATIC_CAPABILITY_ONLY');
    expect(deriveBehaviorSectionSemantics(report.behaviors).observed_runtime_behavior_count).toBe(0);
    expect(deriveBehaviorSectionSemantics(report.behaviors).exposure).toBe('STATIC_CAPABILITY_ONLY');
    expect(
      behaviorItems(report).some((b) => behaviorExposure(b) === 'OBSERVED_RUNTIME_BEHAVIOR'),
    ).toBe(false);
  });
});

/* ───────────────────────────── 2. report prose ───────────────────────────────────── */

describe('M16.4.32 / report prose', () => {
  it('4. the Executive Assessment uses capability vocabulary', () => {
    const text = allStatements(load()).join('\n');

    // The two categories are reported separately, from the records.
    expect(text).toMatch(/static capability indication\(s\)/i);
    expect(text).toMatch(/0 observed runtime behavior\(s\)/i);
    expect(text).toMatch(/modality CAN_DO/i);
    // The exact defect wording (a static-only report claiming evidence-backed
    // BEHAVIOURS) is gone.
    expect(text).not.toMatch(/\d+\s+evidence-backed behavior\(s\)/i);
    // A static indication is explicitly distinguished from an executed fact.
    expect(text).toMatch(/NOT observed runtime behavior/i);
    expect(text).toMatch(/no CAN_DO record was promoted to an executed capability/i);
  });

  it('5. WHAT WAS NOT ESTABLISHED never claims a runtime behavior was established', () => {
    const notEstablished = allStatements(load()).find((s) => /WHAT WAS NOT ESTABLISHED/i.test(s));
    expect(notEstablished).toBeDefined();

    expect(notEstablished!).toMatch(/runtime\/executed behavior:\s*NOT ESTABLISHED/i);
    expect(notEstablished!).toMatch(/0 observed runtime behavior/i);
    expect(notEstablished!).toMatch(/static capability indications:\s*1\s*\(modality CAN_DO, not execution\)/i);
    expect(notEstablished!).toMatch(/execution outcome:\s*NOT PERFORMED/i);
    expect(notEstablished!).not.toMatch(/OBSERVED_DOING/);
  });

  it('6. the behavior section label matches the records it actually holds', () => {
    const report = load();
    const semantics = behaviorSemantics(report.behaviors);

    expect(semantics.runtime_behavior_present).toBe(false);
    expect(semantics.exposure).toBe(BEHAVIOR_EXPOSURE.STATIC_CAPABILITY_ONLY);

    // The authorised labels: capability for a static section, behavior only when
    // execution was established. The canonical category is never renamed.
    expect(BEHAVIOR_SECTION_TITLES.STATIC_CAPABILITY_ONLY).toBe('Evidence-Backed Capabilities');
    expect(BEHAVIOR_SECTION_TITLES.OBSERVED_RUNTIME_BEHAVIOR_PRESENT).toBe('Evidence-Backed Behaviors');
    expect(report.behaviors.items[0].category).toBe('capability');

    // The component renders the derived label, never a fixed "Behaviors" title.
    const component = readFileSync(
      join(import.meta.dir, '..', '..', 'apps', 'web', 'app', 'components', 'CanonicalMalwareReport.tsx'),
      'utf8',
    );
    expect(component).toContain('title={behaviorSectionTitle}');
    expect(component).toContain('BEHAVIOR_SECTION_TITLES.STATIC_CAPABILITY_ONLY');
    expect(component).toContain('BEHAVIOR_SECTION_TITLES.OBSERVED_RUNTIME_BEHAVIOR_PRESENT');
  });

  it('7. dynamic execution is NOT PERFORMED, derived from the records', () => {
    const report = load();
    const state = dynamicExecutionState(behaviorItems(report) as Record<string, any>[]);

    expect(state).toBe(DYNAMIC_NOT_PERFORMED);
    expect(state).toBe('NOT PERFORMED');
    expect(allStatements(report).join('\n')).toMatch(/dynamic behavior\s*=\s*NOT PERFORMED/i);
  });

  it('8. the full deterministic semantic lint passes with no violation', () => {
    const report = load();
    expect(lintReportSemantics(report)).toEqual([]);
    // Deterministic: the same document yields the same (empty) result.
    expect(lintReportSemantics(report)).toEqual(lintReportSemantics(report));
  });
});

/* ───────────────────── 3. fixture reproducibility & evidence ────────────────────── */

describe('M16.4.32 / fixture reproducibility and evidence preservation', () => {
  it('9. the committed fixture is the exact, reproducible generator output', () => {
    const provenance = JSON.parse(readFileSync(PROVENANCE_PATH, 'utf8')) as Record<string, any>;
    const document = load();

    // The fixture bytes ARE the recorded generator output: hash and size agree
    // with provenance, and the serialization is a fixed point (re-serializing
    // the parsed document reproduces the file byte-for-byte).
    expect(sha256(FIXTURE_TEXT)).toBe(provenance.fixture_sha256);
    expect(Buffer.byteLength(FIXTURE_TEXT, 'utf8')).toBe(provenance.fixture_bytes);
    expect(JSON.stringify(document, null, 1)).toBe(FIXTURE_TEXT);

    // Its declared semantics are the ones DERIVED from its own records — the
    // generator output cannot drift from what it claims.
    const derived = deriveBehaviorSectionSemantics(document.behaviors);
    expect(document.behaviors.record_count).toBe(derived.record_count);
    expect(document.behaviors.static_capability_count).toBe(derived.static_capability_count);
    expect(document.behaviors.observed_runtime_behavior_count).toBe(derived.observed_runtime_behavior_count);
    expect(document.behaviors.exposure).toBe(derived.exposure);
  });

  it('10. the semantic repair changed no evidence-bearing field', () => {
    const report = load();

    // Identity, run binding and analyzer execution provenance are untouched.
    expect(report.report_id).toBe('mir_3fcf025450073591');
    expect(report.sha256).toBe(REAL_SHA);
    const capa = report.tool_results.find((t: any) => t.tool_id === 'capa');
    expect(capa.provenance.input_sha256).toBe(REAL_SHA);
    expect(capa.provenance.execution_stdout_sha256).toBe(REAL_CAPA_STDOUT_SHA);
    expect(capa.provenance.runner_identity).toBe(REAL_RUNNER);

    // Analyst-diagnostic states stay exactly as established: no family, no
    // canonical ATT&CK/MBC mapping, raw tool records preserved verbatim.
    expect(report.family.resolution_state).toBe('UNRESOLVED');
    expect(report.attack_mbc.items).toEqual([]);
    expect(
      report.tool_results.map((t: any) => `${t.tool_id}:${t.status}`).sort(),
    ).toEqual([
      'capa:OBSERVED', 'die:OBSERVED', 'floss:OBSERVED', 'lief:OBSERVED',
      'magika:OBSERVED', 'yara-x:NO_RESULT',
    ]);

    // The EVIDENCE_SUPPORT metric definition is unchanged, and a floor value
    // never alters the epistemic state.
    const capabilityRows = report.confidence.items.filter(
      (c: any) => Array.isArray(c.support_semantics?.epistemic_status)
        && c.support_semantics.epistemic_status.includes('CAN_DO'),
    );
    expect(capabilityRows.length).toBeGreaterThan(0);
    for (const row of capabilityRows) {
      expect(row.support_semantics.metric).toBe('EVIDENCE_SUPPORT');
      expect(row.support).toBeGreaterThanOrEqual(0);
      expect(row.support).toBeLessThanOrEqual(1);
      expect(row.support_semantics.evidence_kind).toContain('STATIC');
    }

    // The canonical Behavior record's own evidence fields are unchanged: only
    // the derived exposure/counts were added.
    const behavior = report.behaviors.items[0];
    expect(behavior.status).toBe('CAN_DO');
    expect(behavior.modality).toBe('CAN_DO');
    expect(behavior.category).toBe('capability');
    expect(behavior.evidence_count).toBe(1);
    expect(behavior.evidence_kinds).toEqual(['STATIC']);
  });

  it('NEGATIVE CONTROL: mutating CAN_DO to OBSERVED_DOING is detected, never normalized', () => {
    const report = load();

    // (a) Modality-only mutation, counts left alone.
    const modalityOnly = structuredClone(report);
    modalityOnly.behaviors.items[0].modality = 'OBSERVED_DOING';
    const modalityViolations = lintReportSemantics(modalityOnly);
    expect(modalityViolations.length).toBeGreaterThan(0);
    // The classifier's DYNAMIC cross-check would downgrade this record to static;
    // the lint must still DETECT the contradictory record instead of letting the
    // report pass silently.
    expect(behaviorExposure(modalityOnly.behaviors.items[0])).toBe('STATIC_CAPABILITY');
    expect(modalityViolations.some((v) => v.startsWith('semantics:modality_status_disagreement'))).toBe(true);
    expect(modalityViolations.some((v) => v.startsWith('semantics:runtime_behavior_without_dynamic_evidence'))).toBe(true);

    // (b) The same mutation with the counts laundered to match — still detected.
    const laundered = structuredClone(report);
    laundered.behaviors.items[0].modality = 'OBSERVED_DOING';
    laundered.behaviors.items[0].status = 'OBSERVED_DOING';
    laundered.behaviors.items[0].evidence_kinds = ['DYNAMIC'];
    laundered.behaviors.static_capability_count = 0;
    laundered.behaviors.observed_runtime_behavior_count = 1;
    laundered.behaviors.exposure = 'OBSERVED_RUNTIME_BEHAVIOR_PRESENT';
    const launderedViolations = lintReportSemantics(laundered);
    expect(launderedViolations.length).toBeGreaterThan(0);
    // A declared "NOT PERFORMED" execution that now carries a runtime record.
    expect(launderedViolations.some((v) => v.startsWith('semantics:not_performed_contradicted'))).toBe(true);

    // The unmutated real report remains clean.
    expect(lintReportSemantics(report)).toEqual([]);
  });
});
