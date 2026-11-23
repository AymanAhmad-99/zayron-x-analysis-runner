/**
 * M14.4 — OIDC workflow-claim shape regression tests.
 *
 * Root cause this suite pins: the control plane compared the token's
 * `workflow` claim against the workflow PATH. GitHub's real OIDC token carries
 * the workflow NAME in `workflow` and the path in `workflow_ref`
 * ("<owner>/<repo>/<path>@<ref>"), so every genuine runner token was rejected
 * as `wrong_workflow` (observed live: artifact fetch 401 + callback 401).
 *
 * These tests assert the fixed policy: the exact trusted workflow PATH must be
 * asserted by one of the two claims, and a sibling workflow in the trusted
 * repository must still be rejected.
 */
import { describe, it, expect, beforeAll } from 'bun:test';
import { generateKeyPairSync, createSign } from 'node:crypto';

import {
  GITHUB_OIDC_ISSUER,
  ZAYRONX_ANALYSIS_AUDIENCE,
  TRUSTED_REPOSITORY,
  TRUSTED_WORKFLOW_PATH,
  verifyGithubOidcToken,
  type GithubOidcEnv,
} from '../../packages/intelligence/src/malware/canonical/executor/githubOidcBridge';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const kid = 'm144-key-1';
const pubJwk = (publicKey as unknown as { export: (o: { format: 'jwk' }) => Record<string, string> }).export({ format: 'jwk' });

function makeEnv(): GithubOidcEnv {
  return {
    __TEST_JWKS_FETCHER: async () =>
      new Response(
        JSON.stringify({ keys: [{ kty: 'RSA', kid, alg: 'RS256', use: 'sig', n: pubJwk.n, e: pubJwk.e }] }),
        { status: 200 }
      ),
  };
}

function b64u(input: string | object): string {
  return Buffer.from(typeof input === 'string' ? input : JSON.stringify(input)).toString('base64url');
}

const NOW = 1_800_000_000;

function signToken(payload: Record<string, unknown>): string {
  const header = { alg: 'RS256', typ: 'JWT', kid };
  const input = `${b64u(header)}.${b64u(payload)}`;
  const sig = createSign('RSA-SHA256').update(input).sign(privateKey.export({ type: 'pkcs1', format: 'pem' }) as string);
  return `${input}.${sig.toString('base64url')}`;
}

/** GitHub's ACTUAL documented claim shape (workflow=name, workflow_ref=path@ref). */
function realGithubClaims(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iss: GITHUB_OIDC_ISSUER,
    aud: ZAYRONX_ANALYSIS_AUDIENCE,
    exp: NOW + 300,
    iat: NOW - 5,
    jti: 'm144-jti-1',
    repository: TRUSTED_REPOSITORY,
    repository_owner: 'AymanAhmad-99',
    workflow: 'ZAYRON Malware Validation (internal)', // the NAME, not a path
    workflow_ref: `${TRUSTED_REPOSITORY}/${TRUSTED_WORKFLOW_PATH}@refs/heads/main`,
    ref: 'refs/heads/main',
    ref_type: 'branch',
    run_id: '35684081429',
    run_attempt: '1',
    sha: 'a'.repeat(40),
    repository_visibility: 'public',
    event: 'workflow_dispatch',
    actor: 'AymanAhmad-99',
    ...over,
  };
}

describe('M14.4 OIDC workflow claim shapes — accept', () => {
  it('accepts the real GitHub shape (workflow=name, workflow_ref=repo/path@ref)', async () => {
    const v = await verifyGithubOidcToken(signToken(realGithubClaims()), makeEnv(), NOW);
    expect(v.valid).toBe(true);
    if (v.valid) expect(v.claims.workflow_ref).toBe(`${TRUSTED_REPOSITORY}/${TRUSTED_WORKFLOW_PATH}@refs/heads/main`);
  });

  it('accepts a tag-ref dispatch of the trusted workflow', async () => {
    const v = await verifyGithubOidcToken(
      signToken(realGithubClaims({ workflow_ref: `${TRUSTED_REPOSITORY}/${TRUSTED_WORKFLOW_PATH}@refs/tags/v1`, ref: 'refs/tags/v1', ref_type: 'tag' })),
      makeEnv(),
      NOW
    );
    expect(v.valid).toBe(true);
  });

  it('still accepts the canonical compact shape (workflow=path, workflow_ref=repo@ref)', async () => {
    const v = await verifyGithubOidcToken(
      signToken(realGithubClaims({ workflow: TRUSTED_WORKFLOW_PATH, workflow_ref: `${TRUSTED_REPOSITORY}@refs/heads/main` })),
      makeEnv(),
      NOW
    );
    expect(v.valid).toBe(true);
  });
});

describe('M14.4 OIDC workflow claim shapes — reject', () => {
  it('rejects a sibling workflow in the trusted repository (path in workflow_ref)', async () => {
    const v = await verifyGithubOidcToken(
      signToken(realGithubClaims({ workflow_ref: `${TRUSTED_REPOSITORY}/.github/workflows/other.yml@refs/heads/main` })),
      makeEnv(),
      NOW
    );
    expect(v).toEqual({ valid: false, code: 'wrong_workflow' });
  });

  it('rejects a repository-only workflow_ref when no exact path is asserted', async () => {
    const v = await verifyGithubOidcToken(
      signToken(realGithubClaims({ workflow_ref: `${TRUSTED_REPOSITORY}@refs/heads/main` })), // workflow = display name
      makeEnv(),
      NOW
    );
    expect(v).toEqual({ valid: false, code: 'wrong_workflow' });
  });

  it('rejects a workflow_ref with no fully-qualified ref', async () => {
    const v = await verifyGithubOidcToken(
      signToken(realGithubClaims({ workflow_ref: `${TRUSTED_REPOSITORY}/${TRUSTED_WORKFLOW_PATH}@main` })),
      makeEnv(),
      NOW
    );
    expect(v).toEqual({ valid: false, code: 'wrong_workflow' });
  });

  it('rejects a workflow_ref missing the ref separator entirely', async () => {
    const v = await verifyGithubOidcToken(
      signToken(realGithubClaims({ workflow_ref: `${TRUSTED_REPOSITORY}/${TRUSTED_WORKFLOW_PATH}` })),
      makeEnv(),
      NOW
    );
    expect(v).toEqual({ valid: false, code: 'wrong_workflow' });
  });

  it('rejects a trusted-path workflow_ref pointed at a different repository', async () => {
    const v = await verifyGithubOidcToken(
      signToken(realGithubClaims({ workflow_ref: `attacker/repo/${TRUSTED_WORKFLOW_PATH}@refs/heads/main` })),
      makeEnv(),
      NOW
    );
    expect(v).toEqual({ valid: false, code: 'wrong_workflow' });
  });
});
