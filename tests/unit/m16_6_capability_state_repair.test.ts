/**
 * M16.6 / D2 — capability observation status must be the capability analyzer's
 * OWN outcome.
 *
 * M16.5-F observed it on a real run: capa exited 1 (missing FLIRT signature
 * path) and the report's `capabilities.observation_status` became `NOT_RUN`,
 * which asserts the analyzer was never invoked. The states must stay distinct:
 *
 *   ERROR       != NO_RESULT       (a crashed analyzer is not one that ran)
 *   ERROR       != NOT_RUN         (a failed analyzer WAS invoked)
 *   NO_RESULT   != NOT_RUN
 *   OBSERVED    != anything else   (a canonical observation owns its status)
 */
import { describe, expect, test } from 'bun:test';

import {
  CAPABILITY_NON_OBSERVED_STATUSES,
  CAPABILITY_SOURCE_TOOL_ID,
  capabilityObservationStatus,
  projectCapabilitySection,
} from '../../packages/intelligence/src/malware/canonical/staticCapabilityLayer';
import { lintReportSemantics } from '../../packages/intelligence/src/malware/canonical/reportSemanticLint';

const SAMPLE = { artifact_id: 'art_gmf_test', analysis_run_id: 'ar_gva_test' };

const observation = (status: string) =>
  ({
    observation_id: 'obs_capability',
    observation_type: 'capability_indicators',
    source: 'capa',
    attributes: { analysis_status: status },
  }) as never;

describe('M16.6-D2 — capability status derivation', () => {
  test('the capability source tool is declared, not hard-coded at the call site', () => {
    expect(CAPABILITY_SOURCE_TOOL_ID).toBe('capa');
    expect([...CAPABILITY_NON_OBSERVED_STATUSES]).toEqual([
      'ERROR',
      'NO_RESULT',
      'UNAVAILABLE',
      'UNSUPPORTED',
    ]);
  });

  test('a canonical observation owns the status (healthy execution)', () => {
    expect(capabilityObservationStatus({ observation_status: 'OBSERVED', analyzer_status: null })).toBe('OBSERVED');
    // the observation wins even if a step status is present
    expect(capabilityObservationStatus({ observation_status: 'OBSERVED', analyzer_status: 'ERROR' })).toBe('OBSERVED');
  });

  test('a failed analyzer stays ERROR — never NOT_RUN, never NO_RESULT', () => {
    const status = capabilityObservationStatus({ observation_status: null, analyzer_status: 'ERROR' });
    expect(status).toBe('ERROR');
    expect(status).not.toBe('NOT_RUN');
    expect(status).not.toBe('NO_RESULT');
  });

  test('a real NO_RESULT stays NO_RESULT and is not NOT_RUN', () => {
    expect(capabilityObservationStatus({ observation_status: null, analyzer_status: 'NO_RESULT' })).toBe('NO_RESULT');
  });

  test('unavailable/unsupported are preserved verbatim', () => {
    expect(capabilityObservationStatus({ observation_status: null, analyzer_status: 'UNAVAILABLE' })).toBe('UNAVAILABLE');
    expect(capabilityObservationStatus({ observation_status: null, analyzer_status: 'UNSUPPORTED' })).toBe('UNSUPPORTED');
  });

  test('NOT_RUN means only "never invoked"', () => {
    expect(capabilityObservationStatus({ observation_status: null, analyzer_status: 'NOT_RUN' })).toBe('NOT_RUN');
    expect(capabilityObservationStatus({ observation_status: null, analyzer_status: null })).toBe('NOT_RUN');
    expect(capabilityObservationStatus({ observation_status: null })).toBe('NOT_RUN');
  });

  test('an OBSERVED analyzer that produced no canonical observation stays OBSERVED', () => {
    expect(capabilityObservationStatus({ observation_status: null, analyzer_status: 'OBSERVED' })).toBe('OBSERVED');
    // case-insensitive normalization of a valid terminal state
    expect(capabilityObservationStatus({ observation_status: null, analyzer_status: 'observed' })).toBe('OBSERVED');
  });
});

describe('M16.6-D2 — capability section projection', () => {
  test('ERROR analyzer with zero indicators projects ERROR, not NOT_RUN', () => {
    const section = projectCapabilitySection({
      capabilities: [],
      observation: null,
      ...SAMPLE,
      analyzer_status: 'ERROR',
    });
    expect(section.observation_status).toBe('ERROR');
    expect(section.count).toBe(0);
    expect(section.items).toEqual([]);
  });

  test('NO_RESULT analyzer with zero indicators projects NO_RESULT', () => {
    const section = projectCapabilitySection({
      capabilities: [],
      observation: null,
      ...SAMPLE,
      analyzer_status: 'NO_RESULT',
    });
    expect(section.observation_status).toBe('NO_RESULT');
  });

  test('a successful zero-support run projects OBSERVED with count 0 (error is not absence)', () => {
    const section = projectCapabilitySection({
      capabilities: [],
      observation: observation('OBSERVED'),
      ...SAMPLE,
      analyzer_status: 'OBSERVED',
    });
    expect(section.observation_status).toBe('OBSERVED');
    expect(section.count).toBe(0);
    expect(section.execution_claimed).toBe(false);
  });

  test('an OBSERVED analyzer with zero canonical observations projects OBSERVED (real M16.5-F case)', () => {
    const section = projectCapabilitySection({
      capabilities: [],
      observation: null,
      ...SAMPLE,
      analyzer_status: 'OBSERVED',
    });
    expect(section.observation_status).toBe('OBSERVED');
    expect(section.observation_status).not.toBe('NOT_RUN');
    expect(section.count).toBe(0);
    expect(section.items).toEqual([]);
  });

  test('unsupported input is its own state, not a failure and not a negative', () => {
    const section = projectCapabilitySection({
      capabilities: [],
      observation: null,
      ...SAMPLE,
      analyzer_status: 'UNSUPPORTED',
    });
    expect(section.observation_status).toBe('UNSUPPORTED');
    expect(section.observation_status).not.toBe('ERROR');
    expect(section.observation_status).not.toBe('NOT_RUN');
  });

  test('callers that pass no analyzer status keep the previous default (no behaviour change)', () => {
    const section = projectCapabilitySection({ capabilities: [], observation: null, ...SAMPLE });
    expect(section.observation_status).toBe('NOT_RUN');
  });
});

describe('M16.6-D2 — semantic lint detects the collapse', () => {
  const doc = (declared: string, stepStatus: string) => ({
    capabilities: { observation_status: declared, count: 0, items: [] },
    analysis_status: {
      plan_steps: [
        { step_id: 'planstep_a', capability: 'static_analyzer', status: 'OBSERVED' },
        { step_id: 'planstep_b', capability: `tool:${CAPABILITY_SOURCE_TOOL_ID}`, status: stepStatus },
      ],
    },
  });

  test('ERROR collapsed into NOT_RUN is detected', () => {
    expect(lintReportSemantics(doc('NOT_RUN', 'ERROR'))).toContain('semantics:capability_status_mismatch:NOT_RUN:ERROR');
  });

  test('NO_RESULT collapsed into NOT_RUN is detected', () => {
    expect(lintReportSemantics(doc('NOT_RUN', 'NO_RESULT'))).toContain('semantics:capability_status_mismatch:NOT_RUN:NO_RESULT');
  });

  test('ERROR collapsed into NO_RESULT is detected', () => {
    expect(lintReportSemantics(doc('NO_RESULT', 'ERROR'))).toContain('semantics:capability_status_mismatch:NO_RESULT:ERROR');
  });

  test('OBSERVED collapsed into NOT_RUN is detected', () => {
    expect(lintReportSemantics(doc('NOT_RUN', 'OBSERVED'))).toContain('semantics:capability_status_mismatch:NOT_RUN:OBSERVED');
  });

  test('the truthful pairing is clean', () => {
    expect(lintReportSemantics(doc('ERROR', 'ERROR'))).toEqual([]);
    expect(lintReportSemantics(doc('NOT_RUN', 'NOT_RUN'))).toEqual([]);
    expect(lintReportSemantics(doc('OBSERVED', 'OBSERVED'))).toEqual([]);
  });
});
