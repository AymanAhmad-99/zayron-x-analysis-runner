/**
 * M14.3.2 — Workflow schema gate (spec §2/§15).
 *
 * Reads the ACTUAL runner workflow (local canonical copy in
 * .github/workflows/zayron-malware-validation.yml) and proves the dispatch
 * input schema:
 *  - PASS: exactly the five logical inputs
 *  - FAIL: callback_token / sample_locator / callback_url and alias-style
 *    smuggling of sensitive values
 * Also proves architecture invariants: no local fallback, container isolation
 * flags, least-privilege permissions, OIDC usage.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

const WORKFLOW_PATH = '.github/workflows/zayron-malware-validation.yml';
const workflow = readFileSync(WORKFLOW_PATH, 'utf-8');

// Extract the workflow_dispatch inputs block.
const inputsMatch = workflow.match(/workflow_dispatch:\s*\n\s*inputs:\s*\n((?:\s{6,}\w+:\s*\n(?:\s{8,}.*\n)*)+)/);
const inputsBlock = inputsMatch ? inputsMatch[1] : '';
const inputNames = [...inputsBlock.matchAll(/^\s{6}(\w+):\s*$/gm)].map((m) => m[1]);

const ALLOWED_INPUTS = ['job_id', 'analysis_run_id', 'artifact_id', 'sha256', 'toolchain_version'];
const FORBIDDEN_INPUTS = [
  'callback_token', 'sample_locator', 'callback_url',
  'token', 'auth', 'download_url', 'sample_url', 'callback', 'endpoint',
  'artifact_url', 'signed_url', 'api_token', 'download_token',
];

describe('M14.3.2 workflow schema — dispatch inputs (spec §2)', () => {
  it('accepts exactly the five logical inputs', () => {
    expect(inputNames.sort()).toEqual([...ALLOWED_INPUTS].sort());
  });

  it('rejects the three forbidden inputs', () => {
    for (const forbidden of ['callback_token', 'sample_locator', 'callback_url']) {
      expect(inputNames).not.toContain(forbidden);
      expect(workflow).not.toMatch(new RegExp(`inputs\\..*${forbidden}`));
    }
  });

  it('rejects alias-style smuggling of sensitive values', () => {
    for (const alias of FORBIDDEN_INPUTS) {
      expect(inputNames).not.toContain(alias);
    }
    // No forbidden key may appear as an input declaration anywhere.
    for (const alias of FORBIDDEN_INPUTS) {
      expect(workflow).not.toMatch(new RegExp(`^\\s{6}${alias}:`, 'm'));
    }
  });

  it('does not reference inputs.sample_locator / inputs.callback_url / inputs.callback_token anywhere', () => {
    expect(workflow).not.toContain('inputs.sample_locator');
    expect(workflow).not.toContain('inputs.callback_url');
    expect(workflow).not.toContain('inputs.callback_token');
  });
});

describe('M14.3.2 workflow schema — OIDC + permissions (spec §3)', () => {
  it('grants id-token: write and contents: read only', () => {
    expect(workflow).toMatch(/permissions:\s*\n\s*contents:\s*read\s*\n\s*id-token:\s*write/);
    expect(workflow).not.toMatch(/contents:\s*write/);
    expect(workflow).not.toMatch(/actions:\s*write/);
    expect(workflow).not.toMatch(/packages:\s*write/);
    expect(workflow).not.toMatch(/deployments:\s*write/);
    expect(workflow).not.toMatch(/pull-requests:\s*write/);
  });

  it('requests the OIDC token with the fixed audience', () => {
    expect(workflow).toContain('id-token: write');
    expect(workflow).toMatch(/audience=.*zayron-x-analysis-validation|zayron-x-analysis-validation/);
  });

  it('pins third-party actions to immutable SHAs', () => {
    // actions/checkout@v4 must be pinned to a commit SHA.
    expect(workflow).toMatch(/uses:\s*actions\/checkout@[0-9a-f]{40}/);
    expect(workflow).not.toMatch(/uses:\s*actions\/checkout@v\d/);
  });
});

describe('M14.3.2 workflow schema — fixed endpoints (spec §8/§9)', () => {
  it('calls the fixed artifact endpoint, not an input URL', () => {
    expect(workflow).toContain('/internal/analysis/github/artifact');
    expect(workflow).not.toMatch(/SAMPLE_URL.*inputs/);
  });

  it('calls the fixed callback endpoint, not an input URL', () => {
    expect(workflow).toContain('/internal/analysis/github/callback');
  });

  it('authenticates artifact + callback with GitHub OIDC bearer token', () => {
    expect(workflow).toMatch(/ACTIONS_ID_TOKEN_REQUEST_TOKEN|actions\/github-token|github\.token/);
    expect(workflow).toMatch(/Authorization: Bearer \$OIDC_TOKEN/);
  });
});

describe('M14.3.2 workflow schema — architecture invariants (spec §13/§14)', () => {
  it('keeps the container network-isolated and sandboxed', () => {
    expect(workflow).toContain('--network none');
    expect(workflow).toContain('--cap-drop ALL');
    expect(workflow).toContain('--security-opt no-new-privileges');
    expect(workflow).toContain('--pids-limit 64');
    expect(workflow).toContain('--memory 2g');
    expect(workflow).toContain('--cpus 2');
    expect(workflow).not.toContain('--privileged');
    expect(workflow).not.toContain('--network host');
    expect(workflow).toContain('/tmp/zx-job/sample:ro'); // sample read-only mount
  });

  it('has no local analyzer fallback path', () => {
    expect(workflow).not.toMatch(/floss\s+\$|diec\s+\$|capa\s+\$|yr\s+scan/);
    // All tool invocations happen inside the container exec.
    expect(workflow).toContain('docker exec');
  });

  it('keeps toolchain version pinning', () => {
    expect(workflow).toContain("TOOLCHAIN_VERSION: 'toolchain-1.0.0'");
  });

  it('keeps the sha256 integrity gate before analysis', () => {
    expect(workflow).toMatch(/sha256 mismatch: integrity gate failed/);
  });

  it('keeps the bounded result payload gate', () => {
    expect(workflow).toMatch(/exceeds 8 MiB bound/);
  });

  it('destroys sample material after the run (if: always())', () => {
    expect(workflow).toMatch(/Securely destroy sample material/);
    expect(workflow).toMatch(/if:\s*always\(\)/);
  });

  it('never echoes authentication material', () => {
    expect(workflow).not.toMatch(/set -x/);
    expect(workflow).not.toMatch(/echo.*\$OIDC_TOKEN/);
    expect(workflow).not.toMatch(/echo.*\$CALLBACK_TOKEN/);
    expect(workflow).not.toContain('-v "$OIDC_TOKEN"');
  });
});
