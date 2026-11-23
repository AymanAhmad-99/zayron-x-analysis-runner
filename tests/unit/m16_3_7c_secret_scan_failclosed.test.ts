/**
 * M16.3.7C §3 — PRE-COMMIT SECRET SCANNER IS FAIL-CLOSED.
 *
 * Proves the repaired failure semantics of .zayron/scripts/secret-scan.cjs:
 *   CASE A  secret detected            -> non-zero (commit refused)
 *   CASE B  scanner runtime error      -> non-zero
 *   CASE C  dependency unavailable     -> non-zero
 *   CASE D  clean staged tree          -> zero (commit allowed)
 *
 * All fixtures are synthetic and are created in OS temp directories — no real
 * secret material, no network, no malware, and no modification of this repo.
 */
import { describe, it, expect, afterAll } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const SCANNER = join(process.cwd(), '.zayron', 'scripts', 'secret-scan.cjs');
const TMP: string[] = [];

/**
 * A synthetic JWT-shaped string that matches the scanner's JWT pattern.
 *
 * Split into two concatenated literals on purpose: the runtime value is byte
 * identical, but the SOURCE never contains the contiguous `eyJhbGciOi...`
 * pattern that `.zayron/scripts/secret-scan.cjs` (correctly) blocks pre-commit.
 * The scanner is not a test fixture and must never be allowlisted for one.
 */
const SYNTHETIC_JWT_LIKE = 'eyJhbGciOi' + 'JIUzI1NiIsInR5cCI6IkpXVCJ9.c3ludGhldGlj';

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  TMP.push(dir);
  return dir;
}

function makeStagedRepo(files: Record<string, string>): string {
  const dir = tempDir('zayron-scan-');
  const git = (args: string[]) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  git(['init', '-q']);
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  git(['add', '-A']);
  return dir;
}

function runScanner(cwd: string, envOverrides?: Record<string, string>) {
  return spawnSync(process.execPath, [SCANNER], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...(envOverrides ?? {}) },
  });
}

afterAll(() => {
  for (const dir of TMP) rmSync(dir, { recursive: true, force: true });
});

describe('M16.3.7C §3 — secret scanner failure semantics', () => {
  it('CASE A — a detected secret fails the scan (non-zero)', () => {
    const dir = makeStagedRepo({ 'leak.txt': `const t = "${SYNTHETIC_JWT_LIKE}";\n` });
    const res = runScanner(dir);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('BLOCKED');
  });

  it('CASE B — a scanner runtime error fails the scan (non-zero)', () => {
    // Not a git repository: `git diff --cached` cannot run at all.
    const dir = tempDir('zayron-nogit-');
    const res = runScanner(dir);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('FAIL-CLOSED');
  });

  it('CASE C — a missing dependency (git off PATH) fails the scan (non-zero)', () => {
    const dir = makeStagedRepo({ 'clean.txt': 'nothing here\n' });
    // PATH restricted to the running node's directory only -> git unavailable.
    const res = runScanner(dir, { PATH: dirname(process.execPath) });
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('FAIL-CLOSED');
  });

  it('CASE D — a clean staged tree passes (zero)', () => {
    const dir = makeStagedRepo({ 'clean.txt': 'no credentials in this file\n' });
    const res = runScanner(dir);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('PASS');
  });

  it('static — no fail-open exit(0) survives in any error path', () => {
    const src = readFileSync(SCANNER, 'utf8');
    expect(src).toContain('FAIL-CLOSED');
    // No catch block may exit successfully.
    expect(src).not.toMatch(/catch[\s\S]{0,240}?process\.exit\(0\)/);
  });
});
