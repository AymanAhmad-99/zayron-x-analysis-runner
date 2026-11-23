/**
 * M16.2 Gate 0 — WRITE / READ CONTRACT PARITY
 *
 * The stored-document publication rules (tool_results accounted for by the plan,
 * analyzer status vs limitations, NO_RESULT semantics, overall_status presence)
 * must be enforced by ONE implementation, consumed by BOTH:
 *   - the WRITE path (`materializeAndPublish`, before the D1 INSERT), via
 *     `validateStoredDocumentPublicationRules`, and
 *   - the READ gate (`validateStoredMalwareReport`), which now delegates the
 *     same rules to that function.
 *
 * These tests prove (a) a valid stored document passes both, (b) each forbidden
 * shape fails on BOTH paths with the same rule, so a report that the read gate
 * would reject can no longer be inserted as valid.
 *
 * Synthetic holdout identities only; no production data is read or written.
 */
import { describe, it, expect } from 'bun:test';

import {
  validateStoredDocumentPublicationRules,
  validateStoredMalwareReport,
} from '../../packages/intelligence/src/malware/canonical/storedReportValidation';

const SHA = 'a'.repeat(64);
const ARTIFACT_ID = `art_gmf_${SHA.slice(0, 16)}`;
const RUN_ID = 'ar_m162_gate0_001';
const REPORT_ID = 'mir_gate0parity0001';

function toolResult(tool: string, status: string) {
  return {
    tool_id: tool,
    tool_version: '1.0.0',
    status,
    note: null,
    output_present: false,
    provenance: {
      analysis_run_id: RUN_ID,
      artifact_id: ARTIFACT_ID,
      input_sha256: SHA,
      runner_identity: 'gate0-parity',
      ruleset_version: null,
      ruleset_digest: null,
      tool_binary_digest: null,
    },
  };
}

/** A minimal stored document that satisfies the canonical read gate today. */
function validStoredDocument(): Record<string, any> {
  return {
    report_id: REPORT_ID,
    report_version: '1.0.0-malwarereport-canonical',
    artifact_id: ARTIFACT_ID,
    analysis_run_id: RUN_ID,
    sha256: SHA,
    run_binding: {
      domain: 'MALWARE',
      job_id: 'job_gate0_parity',
      analysis_run_id: RUN_ID,
      artifact_id: ARTIFACT_ID,
      sha256: SHA,
    },
    sample_identity: {
      artifact_id: ARTIFACT_ID,
      identity_key: `sha256:${SHA}`,
      file_names: ['gate0_holdout.bin'],
      sha256: SHA,
      file_size_bytes: null,
      mime_type: null,
      format_class: 'PE',
    },
    analyzed_artifact: {
      artifact_id: ARTIFACT_ID,
      sha256: SHA,
      file_names: ['gate0_holdout.bin'],
      file_size_bytes: null,
      format_class: 'PE',
    },
    analysis_status: {
      pipeline_version: '1.0.0-malwareproductionpipeline-canonical',
      analysis_run_id: RUN_ID,
      executed: 2,
      deferred: 0,
      skipped: 0,
      plan_steps: [
        { step_id: 'planstep_gate0_lief', capability: 'tool:lief', status: 'OBSERVED' },
        { step_id: 'planstep_gate0_capa', capability: 'tool:capa', status: 'ERROR' },
      ],
    },
    tool_results: [toolResult('lief', 'OBSERVED'), toolResult('capa', 'ERROR')],
    infrastructure: { items: [] },
    behaviors: { items: [] },
    configuration: { items: [] },
    attack_mbc: { items: [] },
    family: {
      resolution_state: 'UNRESOLVED',
      resolved_family: null,
      candidates: [],
      supporting_evidence_ids: [],
      conflicting_evidence_ids: [],
    },
    conflicts: { items: [] },
    static_findings: {
      observation_count: 1,
      claim_count: 1,
      statements: [
        { statement: 'gate0 statement', grounds: [{ canonical_id: 'obs_gate0_1', canonical_kind: 'Observation' }] },
      ],
    },
    detection_artifacts: { derived_artifacts: [] },
    confidence: {
      items: [
        {
          assessment_id: 'csa_gate0_1',
          scope: 'claim',
          subject_id: 'clm_gate0_1',
          support: 0.5,
          basis_count: 1,
          evidence_ids: ['ev_gate0_1'],
          support_semantics: { metric: 'EVIDENCE_SUPPORT' },
        },
      ],
    },
    limitations: [
      { code: 'ERROR_ANALYZER', subject_id: 'planstep_gate0_capa', detail: 'capa ended in an analyzer error.' },
      { code: 'EMPTY_SECTION', subject_id: 'behaviors', detail: 'empty' },
      { code: 'EMPTY_SECTION', subject_id: 'configuration', detail: 'empty' },
      { code: 'EMPTY_SECTION', subject_id: 'infrastructure', detail: 'empty' },
      { code: 'EMPTY_SECTION', subject_id: 'attack_mbc', detail: 'empty' },
    ],
    grounding: {
      all_statements_grounded: true,
      grounded_statement_count: 1,
      ungrounded_statement_count: 0,
      ai_generated_facts: 0,
    },
    overall_status: 'SUCCEEDED',
  };
}

/** Read-gate verdict for a stored document (same shape both paths receive). */
function readGateRejections(doc: unknown): string[] {
  return validateStoredMalwareReport({ stored_id: REPORT_ID, stored_sha256: SHA, payload: doc });
}

describe('M16.2 Gate 0 — stored-document write/read parity', () => {
  it('valid stored document passes BOTH the write guard and the read gate', () => {
    const doc = validStoredDocument();
    expect(validateStoredDocumentPublicationRules(doc)).toEqual([]);
    expect(readGateRejections(doc)).toEqual([]);
  });

  it('A. a tool result without a plan step is rejected before INSERT and at read', () => {
    const doc = validStoredDocument();
    // floss produced a result but the plan does not account for it.
    doc.tool_results = [...doc.tool_results, toolResult('floss', 'OBSERVED')];

    const write = validateStoredDocumentPublicationRules(doc);
    const read = readGateRejections(doc);
    expect(write).toContain('tool_state:no_plan_step:floss');
    expect(read).toContain('tool_state:no_plan_step:floss');
    // Parity: the write guard sees the same violation the read gate does.
    expect(read).toEqual(expect.arrayContaining(write));
  });

  it('B. an ERROR analyzer without its limitation is rejected before INSERT and at read', () => {
    const doc = validStoredDocument();
    // Drop the ERROR_ANALYZER limitation that the crashing capa step requires.
    doc.limitations = doc.limitations.filter((l: any) => l.subject_id !== 'planstep_gate0_capa');

    const write = validateStoredDocumentPublicationRules(doc);
    const read = readGateRejections(doc);
    expect(write.some((e) => e.startsWith('tool_state:limitation_missing_or_collapsed:capa'))).toBe(true);
    expect(read.some((e) => e.startsWith('tool_state:limitation_missing_or_collapsed:capa'))).toBe(true);
    expect(read).toEqual(expect.arrayContaining(write));
  });

  it('C. an analyzer recorded OBSERVED while its plan step errored is rejected on both paths', () => {
    const doc = validStoredDocument();
    doc.tool_results = [toolResult('lief', 'OBSERVED'), toolResult('capa', 'OBSERVED')];

    const write = validateStoredDocumentPublicationRules(doc);
    const read = readGateRejections(doc);
    expect(write).toContain('tool_state:observed_vs_error:capa');
    expect(read).toContain('tool_state:observed_vs_error:capa');
  });

  it('D. a missing or empty overall_status is rejected before INSERT and at read', () => {
    const missing = validStoredDocument();
    delete missing.overall_status;
    expect(validateStoredDocumentPublicationRules(missing)).toContain('overall_status:absent');
    expect(readGateRejections(missing)).toContain('overall_status:absent');

    const blank = validStoredDocument();
    blank.overall_status = '   ';
    expect(validateStoredDocumentPublicationRules(blank)).toContain('overall_status:absent');
    expect(readGateRejections(blank)).toContain('overall_status:absent');
  });

  it('the shared rules are a function of the STORED SHAPE (tool_results + overall_status)', () => {
    // A projection-only object (no storage-level fields) is not a stored
    // document: the guard must say so rather than silently pass.
    expect(validateStoredDocumentPublicationRules(undefined)).toContain('stored_document:not_an_object');
    expect(validateStoredDocumentPublicationRules({})).toContain('tool_results:absent');
    expect(validateStoredDocumentPublicationRules({})).toContain('overall_status:absent');
  });
});
