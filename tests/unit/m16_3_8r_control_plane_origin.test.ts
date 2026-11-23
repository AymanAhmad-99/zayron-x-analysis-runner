/**
 * M16.3.8R — CROSS-ENVIRONMENT CONTROL-PLANE ORIGIN REPAIR (synthetic proof).
 *
 * Root cause (M16.3.8 run 36266928352): the runner workflow hard-coded ONE
 * control-plane origin (the staging/production origin) for BOTH the artifact
 * fetch and the callback, so a validation job could never fetch its own
 * specimen nor receive its callback.
 *
 * This suite proves the repaired invariant WITHOUT any network, GitHub dispatch,
 * D1/R2 mutation, or malware execution:
 *   CASE A  validation execution selects the validation origin
 *   CASE B  production execution selects the existing production origin
 *   CASE C  unknown execution mode is rejected (fail-closed)
 *   CASE D  arbitrary unallowlisted origin is rejected
 *   CASE E  artifact fetch construction uses the selected validated origin
 *   CASE F  callback construction uses the selected validated origin
 *   CASE G  run_id mismatch still fails
 *   CASE H  commit/ref mismatch still fails
 *   CASE I  validation mode cannot select the production origin
 *   CASE J  production path remains structurally available and unchanged
 *
 * All values are synthetic. No real secret/token/PEM appears here.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  VALIDATION_CONTROL_PLANE_ORIGIN,
  PRODUCTION_CONTROL_PLANE_ORIGIN,
  VALIDATION_CONTROL_PLANE_REF,
  PRODUCTION_CONTROL_PLANE_REF,
  CONTROL_PLANE_ORIGIN_ALLOWLIST,
  controlPlaneOriginForEnvironment,
  controlPlaneOriginForRef,
  controlPlaneArtifactUrl,
  controlPlaneCallbackUrl,
  isAllowlistedControlPlaneOrigin,
  isControlPlaneEnvironment,
} from '../../packages/intelligence/src/malware/canonical/executor/controlPlaneOrigin';

import {
  ALLOWED_VALIDATION_REF,
  EXPECTED_VALIDATION_COMMIT_SHA,
  resolveDispatchRef,
  validationBindingMismatch,
  type Env,
  type ValidationIdentity,
} from '../../workers/malware-validation/src/index';
import type { OidcClaims } from '../../packages/intelligence/src/malware/canonical/executor/githubOidcBridge';

const WORKFLOW_PATH = '.github/workflows/zayron-malware-validation.yml';
const workflow = readFileSync(WORKFLOW_PATH, 'utf-8');

const validationEnv = { VALIDATION_MODE: 'true' } as unknown as Env;
const productionEnv = {} as unknown as Env;

const RUN_ID = '3333333333';

function claims(overrides: Partial<OidcClaims> = {}): OidcClaims {
  return {
    iss: 'https://token.actions.githubusercontent.com',
    aud: 'zayron-x-analysis-validation',
    exp: 9_999_999_999,
    iat: 1_700_000_000,
    jti: 'jti-m168r',
    repository: 'AymanAhmad-99/zayron-x-analysis-runner',
    repository_owner: 'AymanAhmad-99',
    workflow: '.github/workflows/zayron-malware-validation.yml',
    workflow_ref: `AymanAhmad-99/zayron-x-analysis-runner@refs/heads/${VALIDATION_CONTROL_PLANE_REF}`,
    ref: `refs/heads/${VALIDATION_CONTROL_PLANE_REF}`,
    ref_type: 'branch',
    run_id: RUN_ID,
    run_attempt: '1',
    sha: EXPECTED_VALIDATION_COMMIT_SHA,
    repository_visibility: 'public',
    event: 'workflow_dispatch',
    actor: 'AymanAhmad-99',
    ...overrides,
  };
}

const identity: ValidationIdentity = {
  job_id: 'job_m168r_001',
  expected_ref: ALLOWED_VALIDATION_REF,
  expected_commit_sha: EXPECTED_VALIDATION_COMMIT_SHA,
  created_at: '2026-09-26T00:00:00.000Z',
};

// ── CASE A — validation selects the validation origin ─────────────────
describe('M16.3.8R CASE A — validation execution selects the validation origin', () => {
  it('environment selector maps validation -> validation origin', () => {
    const r = controlPlaneOriginForEnvironment('validation');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.origin).toBe(VALIDATION_CONTROL_PLANE_ORIGIN);
  });

  it('ref selector maps the allowlisted validation branch -> validation origin', () => {
    const r = controlPlaneOriginForRef(VALIDATION_CONTROL_PLANE_REF);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.environment).toBe('validation');
      expect(r.origin).toBe(VALIDATION_CONTROL_PLANE_ORIGIN);
    }
  });

  it('cross-layer: the worker dispatch ref for validation resolves to the validation origin', () => {
    const dispatchedRef = resolveDispatchRef(validationEnv);
    expect(dispatchedRef).toBe(ALLOWED_VALIDATION_REF);
    const r = controlPlaneOriginForRef(dispatchedRef);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.origin).toBe(VALIDATION_CONTROL_PLANE_ORIGIN);
  });
});

// ── CASE B — production selects the production origin ─────────────────
describe('M16.3.8R CASE B — production execution selects the existing production origin', () => {
  it('environment selector maps production -> production origin', () => {
    const r = controlPlaneOriginForEnvironment('production');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.origin).toBe(PRODUCTION_CONTROL_PLANE_ORIGIN);
  });

  it('ref selector maps the production branch -> production origin', () => {
    const r = controlPlaneOriginForRef(PRODUCTION_CONTROL_PLANE_REF);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.environment).toBe('production');
      expect(r.origin).toBe(PRODUCTION_CONTROL_PLANE_ORIGIN);
    }
  });

  it('cross-layer: the worker dispatch ref for production resolves to the production origin', () => {
    const dispatchedRef = resolveDispatchRef(productionEnv);
    expect(dispatchedRef).toBe('main');
    const r = controlPlaneOriginForRef(dispatchedRef);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.origin).toBe(PRODUCTION_CONTROL_PLANE_ORIGIN);
  });
});

// ── CASE C — unknown execution mode rejected ──────────────────────────
describe('M16.3.8R CASE C — unknown execution mode is rejected', () => {
  it('unknown environment label is rejected (fail-closed)', () => {
    for (const bogus of ['staging', 'dev', 'VALIDATION', '', 'validation ', undefined]) {
      const r = controlPlaneOriginForEnvironment(bogus);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('unknown_environment');
    }
    expect(isControlPlaneEnvironment('staging')).toBe(false);
  });

  it('unknown ref is rejected (fail-closed, no fallback origin)', () => {
    for (const ref of ['feature/x', 'refs/heads/release', '', 'main2']) {
      const r = controlPlaneOriginForRef(ref);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('unknown_ref');
    }
  });
});

// ── CASE D — arbitrary unallowlisted origin rejected ──────────────────
describe('M16.3.8R CASE D — arbitrary unallowlisted origin is rejected', () => {
  it('only the two fixed origins are allowlisted', () => {
    expect(isAllowlistedControlPlaneOrigin(VALIDATION_CONTROL_PLANE_ORIGIN)).toBe(true);
    expect(isAllowlistedControlPlaneOrigin(PRODUCTION_CONTROL_PLANE_ORIGIN)).toBe(true);
    for (const evil of [
      'https://evil.example',
      'http://zayron-x-malware-validation.aabusabih.workers.dev', // scheme downgrade
      `${VALIDATION_CONTROL_PLANE_ORIGIN}/../evil`,
      'https://zayron-x-malware-validation-validation.aabusabih.workers.dev.evil.example',
      '',
    ]) {
      expect(isAllowlistedControlPlaneOrigin(evil)).toBe(false);
      expect(controlPlaneArtifactUrl(evil, 'job')).toBeNull();
      expect(controlPlaneCallbackUrl(evil)).toBeNull();
    }
  });

  it('the allowlist has exactly two entries', () => {
    expect(Object.keys(CONTROL_PLANE_ORIGIN_ALLOWLIST).sort()).toEqual(['production', 'validation']);
  });

  it('the workflow never interpolates an input/ref into a control-plane URL', () => {
    // No endpoint URL may be built from a caller-controlled expression.
    expect(workflow).not.toMatch(/inputs\.[a-z_]+[^\n]*https?:\/\//);
    expect(workflow).not.toMatch(/\$\{\{\s*github\.(ref|event)[^}]*\}\}[^\n]*\/internal\/analysis/);
  });
});

// ── CASE E — artifact fetch uses the selected validated origin ────────
describe('M16.3.8R CASE E — artifact fetch construction uses the selected origin', () => {
  it('builds the job-bound artifact URL from an allowlisted origin only', () => {
    expect(controlPlaneArtifactUrl(VALIDATION_CONTROL_PLANE_ORIGIN, 'job_x')).toBe(
      `${VALIDATION_CONTROL_PLANE_ORIGIN}/internal/analysis/github/artifact?job_id=job_x`
    );
    expect(controlPlaneArtifactUrl(PRODUCTION_CONTROL_PLANE_ORIGIN, 'job_x')).toBe(
      `${PRODUCTION_CONTROL_PLANE_ORIGIN}/internal/analysis/github/artifact?job_id=job_x`
    );
  });

  it('the workflow artifact step targets the resolved $ZX_CONTROL_PLANE_ORIGIN', () => {
    expect(workflow).toContain('$ZX_CONTROL_PLANE_ORIGIN/internal/analysis/github/artifact?job_id=');
    // The origin is resolved from the allowlist, not from the environment block.
    expect(workflow).toMatch(/Resolve trusted control-plane origin \(allowlisted\)/);
    expect(workflow).toContain(`ZX_CONTROL_PLANE_ORIGIN=$ZX_ORIGIN`);
  });
});

// ── CASE F — callback uses the selected validated origin ──────────────
describe('M16.3.8R CASE F — callback construction uses the selected origin', () => {
  it('builds the callback URL from an allowlisted origin only', () => {
    expect(controlPlaneCallbackUrl(VALIDATION_CONTROL_PLANE_ORIGIN)).toBe(
      `${VALIDATION_CONTROL_PLANE_ORIGIN}/internal/analysis/github/callback`
    );
    expect(controlPlaneCallbackUrl(PRODUCTION_CONTROL_PLANE_ORIGIN)).toBe(
      `${PRODUCTION_CONTROL_PLANE_ORIGIN}/internal/analysis/github/callback`
    );
  });

  it('both the success callback and the failure callback use the same resolved origin', () => {
    const occurrences = workflow.match(/\$ZX_CONTROL_PLANE_ORIGIN\/internal\/analysis\/github\/callback/g) ?? [];
    expect(occurrences.length).toBe(2); // success callback + failure-status callback
    // The old hard-coded global env origin is gone.
    expect(workflow).not.toMatch(/^\s*ZX_CONTROL_PLANE_ORIGIN:\s/m);
  });
});

// ── CASE G — run_id mismatch still fails ──────────────────────────────
describe('M16.3.8R CASE G — run_id binding is preserved (mismatch fails closed)', () => {
  it('a token for a different run is rejected', () => {
    expect(
      validationBindingMismatch(claims({ run_id: '9999999999' }), identity, { workflow_run_id: RUN_ID })
    ).toBe('run_id_mismatch');
  });

  it('an unbound job is rejected', () => {
    expect(validationBindingMismatch(claims(), identity, { workflow_run_id: null })).toBe('run_id_unbound');
  });

  it('the exact bound run is accepted', () => {
    expect(validationBindingMismatch(claims(), identity, { workflow_run_id: RUN_ID })).toBeNull();
  });
});

// ── CASE H — ref / commit mismatch still fails ────────────────────────
describe('M16.3.8R CASE H — ref/SHA binding is preserved (mismatch fails closed)', () => {
  it('wrong branch is rejected', () => {
    expect(
      validationBindingMismatch(claims({ ref: 'refs/heads/main' }), identity, { workflow_run_id: RUN_ID })
    ).toBe('ref_mismatch');
  });

  it('wrong commit SHA is rejected', () => {
    expect(
      validationBindingMismatch(claims({ sha: 'c'.repeat(40) }), identity, { workflow_run_id: RUN_ID })
    ).toBe('commit_mismatch');
  });
});

// ── CASE I — validation cannot select the production origin ───────────
describe('M16.3.8R CASE I — validation mode cannot select the production origin', () => {
  it('the validation ref never resolves to the production origin', () => {
    const r = controlPlaneOriginForRef(ALLOWED_VALIDATION_REF);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.origin).toBe(VALIDATION_CONTROL_PLANE_ORIGIN);
      expect(r.origin).not.toBe(PRODUCTION_CONTROL_PLANE_ORIGIN);
    }
    expect(VALIDATION_CONTROL_PLANE_ORIGIN).not.toBe(PRODUCTION_CONTROL_PLANE_ORIGIN);
  });

  it('the workflow validation branch maps to the validation origin only', () => {
    const branch = workflow.match(/m16-3-1-bounded-diagnostics-sync\)([\s\S]*?);;/);
    expect(branch).not.toBeNull();
    const block = branch?.[1] ?? '';
    expect(block).toContain(VALIDATION_CONTROL_PLANE_ORIGIN);
    expect(block).not.toContain(`'${PRODUCTION_CONTROL_PLANE_ORIGIN}'`);
  });
});

// ── CASE J — production path preserved ────────────────────────────────
describe('M16.3.8R CASE J — production path remains available and unchanged', () => {
  it('the production origin is the historical staging origin (unchanged value)', () => {
    expect(PRODUCTION_CONTROL_PLANE_ORIGIN).toBe('https://zayron-x-malware-validation.aabusabih.workers.dev');
  });

  it('the workflow production branch maps main -> the production origin', () => {
    const branch = workflow.match(/\bmain\)([\s\S]*?);;/);
    expect(branch).not.toBeNull();
    const block = branch?.[1] ?? '';
    expect(block).toContain(`'${PRODUCTION_CONTROL_PLANE_ORIGIN}'`);
  });

  it('production dispatch logic is untouched (still resolves to main)', () => {
    expect(resolveDispatchRef(productionEnv)).toBe('main');
    expect(isControlPlaneEnvironment('production')).toBe(true);
  });

  it('an unknown ref fails closed instead of silently falling back to production', () => {
    expect(controlPlaneOriginForRef('some-unknown-branch').ok).toBe(false);
    expect(workflow).toContain('refusing to select an origin (fail-closed)');
  });
});
