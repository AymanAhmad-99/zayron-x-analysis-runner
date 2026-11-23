import { afterAll, describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * INGEST PREVIEW DEPLOY GUARD — argument validation must fail closed.
 *
 * The measured defect (2026-10-13): `workers/ingest/scripts/deploy-preview.mjs`
 * tested only `process.argv.includes("--dry-run")`, ignored every other flag, and
 * spawned `wrangler deploy --env preview` regardless. An audit probe of
 * `--env production` was therefore silently accepted and performed a REAL
 * preview deployment. This file is the regression suite for that failure.
 *
 * Every refusal path is proven to start NO deployment using the
 * `ZAYRON_WRANGLER_BIN` seam: a fake Wrangler records its own invocation to a
 * marker file, so "did a deploy start?" is observed rather than assumed.
 */

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..');
const DEPLOY = path.join(REPO_ROOT, 'workers', 'ingest', 'scripts', 'deploy-preview.mjs');
const REAL_CONFIG = path.join(REPO_ROOT, 'workers', 'ingest', 'wrangler.toml');
const VALID_FIXTURE = path.join(
  REPO_ROOT,
  'tests',
  'fixtures',
  'deployment-guard',
  'ingest_preview_valid.toml',
);

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-guard-'));

afterAll(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

const read = (p: string) => fs.readFileSync(p, 'utf8');

/** Materialise a project directory whose wrangler.toml is `tomlText`. */
function project(tomlText: string, label: string) {
  const dir = path.join(sandbox, `${label}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'wrangler.toml'), tomlText);
  const marker = path.join(dir, 'WRANGLER_WAS_INVOKED.json');
  const fake = path.join(dir, 'fake-wrangler.mjs');
  fs.writeFileSync(
    fake,
    [
      "import fs from 'node:fs';",
      'const marker = process.env.ZAYRON_FAKE_MARKER;',
      'fs.writeFileSync(marker, JSON.stringify(process.argv.slice(2)));',
      'process.exit(Number(process.env.ZAYRON_FAKE_EXIT || 0));',
    ].join('\n'),
  );
  return { dir, marker, fake, configPath: path.join(dir, 'wrangler.toml') };
}

function deploy(dir: string, marker: string, fake: string, args: string[]) {
  const r = spawnSync(process.execPath, [DEPLOY, '--project-dir', dir, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, ZAYRON_WRANGLER_BIN: fake, ZAYRON_FAKE_MARKER: marker },
  });
  const spawned = fs.existsSync(marker);
  return {
    status: r.status,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
    spawned,
    argv: spawned ? (JSON.parse(read(marker)) as string[]) : null,
  };
}

function expectRefusal(
  result: ReturnType<typeof deploy>,
  code: string,
): void {
  expect(result.status).toBe(1);
  expect(result.spawned).toBe(false);
  expect(result.stderr).toContain(`REFUSED (${code})`);
  expect(result.stderr).toContain('no deployment was started');
}

describe('a valid preview target is accepted', () => {
  it('--dry-run validates the target, exits 0 and never invokes Wrangler', () => {
    const p = project(read(VALID_FIXTURE), 'valid');
    const result = deploy(p.dir, p.marker, p.fake, ['--dry-run']);
    expect(result.status).toBe(0);
    expect(result.spawned).toBe(false);
    expect(result.stdout).toContain('target verified');
    expect(result.stdout).toContain('zayron-x-ingest-preview');
  });

  it('a real deploy invokes Wrangler with ONLY the validated config and --env preview', () => {
    const p = project(read(VALID_FIXTURE), 'valid');
    const result = deploy(p.dir, p.marker, p.fake, []);
    expect(result.status).toBe(0);
    expect(result.spawned).toBe(true);
    expect(result.argv).toEqual(['deploy', '--config', p.configPath, '--env', 'preview']);
  });

  it('--env preview is accepted as a convenience flag', () => {
    const p = project(read(VALID_FIXTURE), 'valid');
    const result = deploy(p.dir, p.marker, p.fake, ['--env', 'preview', '--dry-run']);
    expect(result.status).toBe(0);
    expect(result.spawned).toBe(false);
  });

  it('the REAL workers/ingest/wrangler.toml is still a valid preview target', () => {
    const p = project(read(REAL_CONFIG), 'real');
    const result = deploy(p.dir, p.marker, p.fake, ['--dry-run']);
    expect(result.status).toBe(0);
    expect(result.spawned).toBe(false);
  });
});

describe('the 2026-10-13 incident: an unsupported flag cannot start a deployment', () => {
  it('--env production alone is refused and spawns nothing (the exact probe that deployed)', () => {
    const p = project(read(VALID_FIXTURE), 'valid');
    const result = deploy(p.dir, p.marker, p.fake, ['--env', 'production']);
    expectRefusal(result, 'WRONG_ENVIRONMENT_FLAG');
  });

  it('--env=production is refused', () => {
    const p = project(read(VALID_FIXTURE), 'valid');
    expectRefusal(deploy(p.dir, p.marker, p.fake, ['--env=production']), 'WRONG_ENVIRONMENT_FLAG');
  });

  it('--env with a missing value is refused', () => {
    const p = project(read(VALID_FIXTURE), 'valid');
    expectRefusal(deploy(p.dir, p.marker, p.fake, ['--env']), 'WRONG_ENVIRONMENT_FLAG');
  });

  it('an unknown name override is refused', () => {
    const p = project(read(VALID_FIXTURE), 'valid');
    expectRefusal(deploy(p.dir, p.marker, p.fake, ['--name', 'zayron-x-ingest']), 'BAD_ARGUMENT');
  });

  it('a config override attempt is refused', () => {
    const p = project(read(VALID_FIXTURE), 'valid');
    expectRefusal(deploy(p.dir, p.marker, p.fake, ['--config', 'x.toml']), 'BAD_ARGUMENT');
  });

  it('a route/env var override attempt is refused', () => {
    const p = project(read(VALID_FIXTURE), 'valid');
    expectRefusal(deploy(p.dir, p.marker, p.fake, ['--var', 'ENVIRONMENT:production']), 'BAD_ARGUMENT');
  });

  it('a valueless --project-dir is refused', () => {
    const p = project(read(VALID_FIXTURE), 'valid');
    const result = spawnSync(process.execPath, [DEPLOY, '--project-dir'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: { ...process.env, ZAYRON_WRANGLER_BIN: p.fake, ZAYRON_FAKE_MARKER: p.marker },
    });
    expect(result.status).toBe(1);
    expect(fs.existsSync(p.marker)).toBe(false);
    expect(result.stderr).toContain('REFUSED (BAD_ARGUMENT)');
  });

  it('every refusal path leaves the Wrangler marker unwritten', () => {
    const cases: string[][] = [
      ['--env', 'production'],
      ['--env=production'],
      ['--env'],
      ['--name', 'zayron-x-ingest'],
      ['--config', 'x.toml'],
      ['--var', 'ENVIRONMENT:production'],
      ['--dry-run', '--name', 'zayron-x-ingest'],
    ];
    for (const args of cases) {
      const p = project(read(VALID_FIXTURE), 'refusal');
      const result = deploy(p.dir, p.marker, p.fake, args);
      expect(result.status).toBe(1);
      expect(result.spawned).toBe(false);
    }
  });
});

describe('target validation still refuses a non-preview or mis-bound config', () => {
  it('a config with no [env.preview] section is refused', () => {
    const p = project('name = "zayron-x-ingest"\nmain = "src/index.ts"\n', 'no-preview');
    expectRefusal(deploy(p.dir, p.marker, p.fake, ['--dry-run']), 'NO_PREVIEW_SECTION');
  });

  it('a preview section bound to the production database is refused', () => {
    const forged = read(VALID_FIXTURE)
      .replace('database_name = "zayron-x-preview-db"', 'database_name = "zayron-x-db"')
      .replace('database_id = "34962f8f-abd1-4b0b-8bd7-b4eab59bd902"', 'database_id = "c19c8f45-801b-4034-bd76-402e5e5389b5"');
    const p = project(forged, 'prod-db');
    expectRefusal(deploy(p.dir, p.marker, p.fake, ['--dry-run']), 'BAD_DATABASE');
  });

  it('a preview section naming a non-preview worker is refused', () => {
    const forged = read(VALID_FIXTURE).replace('name = "zayron-x-ingest-preview"', 'name = "zayron-x-ingest"');
    const p = project(forged, 'bad-name');
    expectRefusal(deploy(p.dir, p.marker, p.fake, ['--dry-run']), 'BAD_WORKER_NAME');
  });

  it('a preview section pointing at the production queue is refused', () => {
    const forged = read(VALID_FIXTURE).replace(/zayron-ingest-queue-preview/g, 'zayron-ingest-queue');
    const p = project(forged, 'prod-queue');
    expectRefusal(deploy(p.dir, p.marker, p.fake, ['--dry-run']), 'BAD_QUEUE_PRODUCER');
  });
});
