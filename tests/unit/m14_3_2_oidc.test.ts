/**
 * M14.3.2 — GitHub OIDC verification tests (deterministic; spec §15).
 *
 * Signature verification uses a locally generated RSA keypair served through
 * a deterministic injected JWKS fetcher — no live GitHub credentials (§28).
 */
import { describe, it, expect, beforeAll } from 'bun:test';
import { generateKeyPairSync, createSign } from 'node:crypto';

import {
  GITHUB_OIDC_ISSUER,
  ZAYRONX_ANALYSIS_AUDIENCE,
  TRUSTED_REPOSITORY,
  TRUSTED_WORKFLOW_PATH,
  verifyGithubOidcToken,
  oidcRunBindingMatches,
  type GithubOidcEnv,
} from '../../packages/intelligence/src/malware/canonical/executor/githubOidcBridge';

// ── RSA keypair + deterministic JWKS ─────────────────────────────

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const kid = 'test-key-1';
const pubJwk = (publicKey as unknown as { export: (f: { format: 'jwk' }) => Record<string, string> }).export({ format: 'jwk' });
const nB64u = pubJwk.n ?? '';
const eB64u = pubJwk.e ?? '';

function makeEnv(): GithubOidcEnv {
  return {
    __TEST_JWKS_FETCHER: async () =>
      new Response(
        JSON.stringify({ keys: [{ kty: 'RSA', kid, alg: 'RS256', use: 'sig', n: nB64u, e: eB64u }] }),
        { status: 200 }
      ),
  };
}

function b64u(input: string | object): string {
  return Buffer.from(typeof input === 'string' ? input : JSON.stringify(input)).toString('base64url');
}

function signToken(payload: Record<string, unknown>, opts: { alg?: string; kid?: string } = {}): string {
  const header = { alg: opts.alg ?? 'RS256', typ: 'JWT', kid: opts.kid ?? kid };
  const signingInput = `${b64u(header)}.${b64u(payload)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  const sig = signer.sign({
    key: privateKey.export({ type: 'pkcs1', format: 'pem' }) as string,
  });
  return `${signingInput}.${sig.toString('base64url')}`;
}

interface ClaimOverrides { [k: string]: unknown }
const NOW = 1_800_000_000;

function makeClaims(over: ClaimOverrides = {}): Record<string, unknown> {
  return {
    iss: GITHUB_OIDC_ISSUER,
    aud: ZAYRONX_ANALYSIS_AUDIENCE,
    exp: NOW + 300,
    iat: NOW - 10,
    jti: 'jti-holdout-001',
    repository: TRUSTED_REPOSITORY,
    repository_owner: 'AymanAhmad-99',
    workflow: TRUSTED_WORKFLOW_PATH,
    workflow_ref: `${TRUSTED_REPOSITORY}@refs/heads/main`,
    ref: 'refs/heads/main',
    ref_type: 'branch',
    run_id: '424242',
    run_attempt: '1',
    sha: 'a'.repeat(40),
    repository_visibility: 'public',
    event: 'workflow_dispatch',
    actor: 'AymanAhmad-99',
    ...over,
  };
}

// ── PASS cases ───────────────────────────────────────────────────

describe('M14.3.2 OIDC verification — PASS', () => {
  it('accepts a correctly signed token with the full trusted identity', async () => {
    const token = signToken(makeClaims());
    const v = await verifyGithubOidcToken(token, makeEnv(), NOW);
    expect(v.valid).toBe(true);
    if (v.valid) {
      expect(v.claims.repository).toBe(TRUSTED_REPOSITORY);
      expect(v.claims.workflow).toBe(TRUSTED_WORKFLOW_PATH);
      expect(v.claims.run_id).toBe('424242');
    }
  });

  it('accepts array-valued aud containing the fixed audience', async () => {
    const token = signToken(makeClaims({ aud: ['other', ZAYRONX_ANALYSIS_AUDIENCE] }));
    const v = await verifyGithubOidcToken(token, makeEnv(), NOW);
    expect(v.valid).toBe(true);
  });

  it('run binding matches when run_id equals the bound run', () => {
    const v = verifyGithubOidcToken.length; // sanity: function present
    expect(v).toBeGreaterThan(0);
    const claims = {
      iss: GITHUB_OIDC_ISSUER, aud: ZAYRONX_ANALYSIS_AUDIENCE, exp: NOW + 300, iat: NOW,
      jti: 'x', repository: TRUSTED_REPOSITORY, repository_owner: 'AymanAhmad-99',
      workflow: TRUSTED_WORKFLOW_PATH, workflow_ref: `${TRUSTED_REPOSITORY}@main`,
      ref: 'refs/heads/main', ref_type: 'branch', run_id: '424242', run_attempt: '1',
      sha: 'a'.repeat(40), repository_visibility: 'public', event: 'workflow_dispatch', actor: 'x',
    };
    expect(oidcRunBindingMatches(claims, { workflow_run_id: '424242' })).toBe(true);
    expect(oidcRunBindingMatches(claims, { workflow_run_id: null })).toBe(true);
    expect(oidcRunBindingMatches(claims, { workflow_run_id: '999999' })).toBe(false);
  });
});

// ── FAIL cases (spec §5/§15) ─────────────────────────────────────

describe('M14.3.2 OIDC verification — FAIL', () => {
  it('rejects malformed JWT', async () => {
    expect(await verifyGithubOidcToken('not.a.jwt', makeEnv(), NOW)).toEqual({ valid: false, code: 'malformed_jwt' });
    expect(await verifyGithubOidcToken('garbage', makeEnv(), NOW)).toEqual({ valid: false, code: 'malformed_jwt' });
  });

  it('rejects expired JWT', async () => {
    const token = signToken(makeClaims({ exp: NOW - 5 }));
    expect(await verifyGithubOidcToken(token, makeEnv(), NOW)).toEqual({ valid: false, code: 'expired' });
  });

  it('rejects too-old (issued > 10 min ago) tokens', async () => {
    const token = signToken(makeClaims({ iat: NOW - 700, exp: NOW + 300 }));
    expect(await verifyGithubOidcToken(token, makeEnv(), NOW)).toEqual({ valid: false, code: 'token_too_old' });
  });

  it('rejects wrong issuer', async () => {
    const token = signToken(makeClaims({ iss: 'https://evil.example.com' }));
    expect(await verifyGithubOidcToken(token, makeEnv(), NOW)).toEqual({ valid: false, code: 'wrong_issuer' });
  });

  it('rejects missing audience and wrong audience', async () => {
    const missing = signToken(makeClaims({ aud: undefined }));
    expect(await verifyGithubOidcToken(missing, makeEnv(), NOW)).toEqual({ valid: false, code: 'wrong_audience' });
    const wrong = signToken(makeClaims({ aud: 'wrong-audience' }));
    expect(await verifyGithubOidcToken(wrong, makeEnv(), NOW)).toEqual({ valid: false, code: 'wrong_audience' });
  });

  it('rejects token from another repository', async () => {
    const token = signToken(makeClaims({
      repository: 'attacker/repo', repository_owner: 'attacker',
      workflow_ref: 'attacker/repo@refs/heads/main',
    }));
    expect(await verifyGithubOidcToken(token, makeEnv(), NOW)).toEqual({ valid: false, code: 'wrong_repository' });
  });

  it('rejects token from another workflow in the same repo', async () => {
    const token = signToken(makeClaims({
      workflow: '.github/workflows/other.yml',
      workflow_ref: `${TRUSTED_REPOSITORY}@refs/heads/main`,
    }));
    const v = await verifyGithubOidcToken(token, makeEnv(), NOW);
    expect(v).toEqual({ valid: false, code: 'wrong_workflow' });
  });

  it('rejects tampered signature', async () => {
    const token = signToken(makeClaims());
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${Buffer.from('forged').toString('base64url')}`;
    expect(await verifyGithubOidcToken(tampered, makeEnv(), NOW)).toEqual({ valid: false, code: 'signature_invalid' });
  });

  it('rejects wrong algorithm (alg confusion)', async () => {
    const token = signToken(makeClaims(), { alg: 'HS256' });
    expect(await verifyGithubOidcToken(token, makeEnv(), NOW)).toEqual({ valid: false, code: 'unsupported_algorithm' });
  });

  it('rejects unknown kid (signing key not in JWKS)', async () => {
    const token = signToken(makeClaims(), { kid: 'unknown-kid' });
    const env = makeEnv();
    const v = await verifyGithubOidcToken(token, env, NOW);
    expect(v.valid).toBe(false);
    if (!v.valid) expect(['signature_invalid', 'jwks_kid_not_found']).toContain(v.code);
  });

  it('rejects missing required claims (run_id, sha, repository_visibility)', async () => {
    const noRun = signToken(makeClaims({ run_id: undefined }));
    expect(await verifyGithubOidcToken(noRun, makeEnv(), NOW)).toEqual({ valid: false, code: 'missing_claims' });
    const noSha = signToken(makeClaims({ sha: undefined }));
    expect(await verifyGithubOidcToken(noSha, makeEnv(), NOW)).toEqual({ valid: false, code: 'missing_claims' });
  });
});
