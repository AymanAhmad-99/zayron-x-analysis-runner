/**
 * M14.3.4 — Final OIDC Handling and Deterministic Run Correlation (spec tests).
 *
 * A. Deterministic workflow-run correlation: run-name `ZAYRON-X analysis
 *    <job_id>`; selection is deterministic; ambiguity fails closed.
 * B. OIDC token handling: fresh per-step acquisition via the documented
 *    runner endpoint; JWT never crosses $GITHUB_OUTPUT / step outputs.
 * C. Security invariants preserved (artifact/callback run binding, schema).
 *
 * All deterministic; no live GitHub credentials.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  selectWorkflowRun,
  workflowRunName,
  type WorkflowRunResolution,
} from '../../packages/intelligence/src/malware/canonical/executor/githubValidationBridge';

// ── A. Deterministic run correlation (§4–§7) ──────────────────────

describe('M14.3.4 A — run-name correlation', () => {
  it('job_id = job_123 produces run name "ZAYRON-X analysis job_123"', () => {
    expect(workflowRunName('job_123')).toBe('ZAYRON-X analysis job_123');
  });

  it('resolves the EXACT matching run deterministically', () => {
    const candidates = [
      { id: '1001', name: 'ZAYRON-X analysis job_123' },
      { id: '1002', name: 'ZAYRON-X analysis job_other' },
      { id: '1003', name: 'some other workflow run' },
    ];
    const res = selectWorkflowRun(candidates, 'job_123');
    expect(res.status).toBe('resolved');
    expect((res as { run_id: string }).run_id).toBe('1001');
  });

  it('FAIL: same SHA, different job_id — does not match another job\'s run', () => {
    const candidates = [{ id: '2001', name: 'ZAYRON-X analysis job_other' }];
    const res = selectWorkflowRun(candidates, 'job_123');
    expect(res.status).toBe('pending');
  });

  it('FAIL: same event with a different run-name is ignored', () => {
    const candidates = [{ id: '3001', name: 'Manual build run' }];
    expect(selectWorkflowRun(candidates, 'job_123').status).toBe('pending');
  });

  it('FAIL: unrelated workflow run is ignored', () => {
    const candidates = [
      { id: '4001', name: 'CI on main' },
      { id: '4002', name: null },
      { id: '4003', name: undefined },
    ];
    expect(selectWorkflowRun(candidates as { id: string; name?: string | null }[], 'job_123').status).toBe('pending');
  });

  it('FAIL: zero matching runs → pending (BINDING_PENDING path)', () => {
    expect(selectWorkflowRun([], 'job_123').status).toBe('pending');
    expect(selectWorkflowRun([{ id: '1', name: 'unrelated' }], 'job_123').status).toBe('pending');
  });

  it('FAIL: MULTIPLE exact matches fail closed (ambiguous) — never an arbitrary pick', () => {
    const candidates = [
      { id: '5001', name: 'ZAYRON-X analysis job_123' },
      { id: '5002', name: 'ZAYRON-X analysis job_123' },
    ];
    const res = selectWorkflowRun(candidates, 'job_123');
    expect(res.status).toBe('ambiguous');
    expect((res as { run_ids: string[] }).run_ids.sort()).toEqual(['5001', '5002']);
  });

  it('name match is EXACT — prefix/suffix variants never bind', () => {
    const candidates = [
      { id: '6001', name: 'ZAYRON-X analysis job_123 (retry)' },
      { id: '6002', name: 'ZAYRON-X analysis pre_job_123' },
      { id: '6003', name: 'zayron-x analysis job_123' },
    ];
    expect(selectWorkflowRun(candidates, 'job_123').status).toBe('pending');
  });
});

// ── B. OIDC token handling — static workflow checks (§11/§12) ─────

const WORKFLOW = readFileSync('.github/workflows/zayron-malware-validation.yml', 'utf8');

describe('M14.3.4 B — OIDC handling in the workflow', () => {
  it('uses ACTIONS_ID_TOKEN_REQUEST_URL (documented runner endpoint)', () => {
    expect(WORKFLOW).toContain('ACTIONS_ID_TOKEN_REQUEST_URL');
  });

  it('uses ACTIONS_ID_TOKEN_REQUEST_TOKEN as the request bearer', () => {
    expect(WORKFLOW).toMatch(/Authorization: Bearer \$ACTIONS_ID_TOKEN_REQUEST_TOKEN/);
  });

  it('attaches the FIXED audience to every OIDC request', () => {
    expect(WORKFLOW).toMatch(/ACTIONS_ID_TOKEN_REQUEST_URL\}&audience=\$ZX_AUDIENCE/g);
    expect(WORKFLOW).toContain("ZX_OIDC_AUDIENCE: 'zayron-x-analysis-validation'");
  });

  it('requests a FRESH token in EACH consuming step (artifact, success cb, failure cb)', () => {
    const occurrences = (WORKFLOW.match(/ACTIONS_ID_TOKEN_REQUEST_URL\}&audience=/g) ?? []).length;
    expect(occurrences).toBe(3);
  });

  it('FAIL: GITHUB_API_URL/oidc is absent', () => {
    expect(WORKFLOW).not.toContain('$GITHUB_API_URL/oidc');
    expect(WORKFLOW).not.toContain('${GITHUB_API_URL}/oidc');
  });

  it('FAIL: hard-coded OIDC endpoint absent from run steps', () => {
    const runSteps = WORKFLOW.split(/- name:.*\n/).slice(1).join('\n');
    expect(runSteps).not.toContain('token.actions.githubusercontent.com');
  });

  it('FAIL: OIDC token is NEVER written to $GITHUB_OUTPUT', () => {
    // No GITHUB_OUTPUT write carries a token value.
    const writes = WORKFLOW.match(/.*GITHUB_OUTPUT.*/g) ?? [];
    for (const w of writes) {
      expect(w).not.toMatch(/token/i);
    }
    // And the dedicated old pattern is gone entirely.
    expect(WORKFLOW).not.toContain("printf 'token=");
  });

  it('FAIL: token is never exposed as a step output (steps.oidc absent)', () => {
    expect(WORKFLOW).not.toContain('steps.oidc');
    expect(WORKFLOW).not.toContain('id: oidc');
  });

  it('FAIL: arbitrary audience input is impossible', () => {
    expect(WORKFLOW).not.toMatch(/inputs\.audience/);
  });

  it('declares the deterministic run-name (§4)', () => {
    expect(WORKFLOW).toMatch(/run-name: ZAYRON-X analysis \$\{\{ inputs\.job_id \}\}/);
  });

  it('keeps exactly the five workflow_dispatch inputs (§10)', () => {
    const inputsMatch = WORKFLOW.match(/inputs:\n([\s\S]*?)\n\n#/);
    expect(inputsMatch).not.toBeNull();
    const names = [...(inputsMatch![1].matchAll(/^\s{6}(\w+):/gm))].map((m) => m[1]);
    expect(names.sort()).toEqual(
      ['analysis_run_id', 'artifact_id', 'job_id', 'sha256', 'toolchain_version'].sort()
    );
    for (const forbidden of ['callback_token', 'callback_url', 'sample_locator', 'token', 'auth', 'download_url', 'sample_url', 'run_name']) {
      expect(names).not.toContain(forbidden);
    }
  });

  it('keeps least-privilege permissions (contents: read, id-token: write only)', () => {
    expect(WORKFLOW).toMatch(/permissions:\n  contents: read\n  id-token: write/);
    expect(WORKFLOW).not.toMatch(/actions: write|contents: write|packages: write/);
  });

  it('never redefines ACTIONS_ID_TOKEN_REQUEST_TOKEN', () => {
    const envBlocks = WORKFLOW.match(/env:\n(?:.*\n)*?.*ACTIONS_ID_TOKEN_REQUEST_TOKEN:.*/g) ?? [];
    for (const block of envBlocks) {
      expect(block).not.toMatch(/ACTIONS_ID_TOKEN_REQUEST_TOKEN:\s*\$\{\{/);
    }
  });

  it('Authorization header is the only token transport (token never in URL/body)', () => {
    // Line-bounded: a token value never appears in a URL or a curl body.
    expect(WORKFLOW).not.toMatch(/audience=[^&\n]*token/i);
    expect(WORKFLOW).not.toMatch(/--data[^\n]*\$OIDC_TOKEN/);
  });
});

// ── C. Correlation invariants used by the control plane (§8/§9) ───

describe('M14.3.4 C — fail-closed semantics are typed outcomes', () => {
  it('pending/ambiguous/resolved are distinguishable without guessing', () => {
    const outcomes: WorkflowRunResolution[] = [
      { status: 'pending' },
      { status: 'resolved', run_id: 'r1' },
      { status: 'ambiguous', run_ids: ['r1', 'r2'] },
    ];
    expect(outcomes.map((o) => o.status)).toEqual(['pending', 'resolved', 'ambiguous']);
  });
});
