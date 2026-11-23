/**
 * M16.3.7C §4 — VALIDATION scheduled() HARD GUARD (defence-in-depth).
 *
 * Proves that the isolated validation plane performs NO autonomous work in
 * scheduled(): no reconciliation, no auto-dispatch, no GitHub Actions, no
 * analyzer — even if a cron schedule were ever re-attached. Production
 * scheduling behaviour remains structurally reachable (no VALIDATION_MODE).
 *
 * No network, no dispatch, no malware execution, no D1 writes.
 */
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import worker, { isValidationMode, type Env } from '../../workers/malware-validation/src/index';

interface Probe {
  env: Env;
  dbAccesses: () => number;
}

/** An env whose DB throws on first use, so any touched DB path is observable. */
function envWithDbProbe(validationMode: boolean): Probe {
  let accesses = 0;
  const env = {
    DB: {
      prepare: () => {
        accesses += 1;
        throw new Error('DB_ACCESSED');
      },
    },
    VALIDATION_MODE: validationMode ? 'true' : undefined,
  } as unknown as Env;
  return { env, dbAccesses: () => accesses };
}

describe('M16.3.7C §4 — scheduled() autonomous-work guard', () => {
  it('VALIDATION MODE — scheduled() returns without touching D1 (no reconcile, no dispatch)', async () => {
    const { env, dbAccesses } = envWithDbProbe(true);
    expect(isValidationMode(env)).toBe(true);
    await expect(worker.scheduled({} as unknown, env)).resolves.toBeUndefined();
    expect(dbAccesses()).toBe(0);
  });

  it('PRODUCTION MODE — the reconciliation path remains reachable (behaviour preserved)', async () => {
    const { env, dbAccesses } = envWithDbProbe(false);
    expect(isValidationMode(env)).toBe(false);
    // The guard does not fire, so scheduled() reaches D1 reconciliation and the
    // probe rejects. This proves the production path is NOT compiled away.
    await expect(worker.scheduled({} as unknown, env)).rejects.toThrow('DB_ACCESSED');
    expect(dbAccesses()).toBeGreaterThan(0);
  });

  it('static — the barrier precedes any reconciliation/dispatch call', () => {
    const src = readFileSync('workers/malware-validation/src/index.ts', 'utf8');
    const body = src.match(/async scheduled\([\s\S]*?\n {2}\},/);
    expect(body).not.toBeNull();
    const text = body![0];
    const guardAt = text.indexOf('isValidationMode(env)');
    const reconcileAt = text.indexOf('reconcileStaleJobs(env)');
    expect(guardAt).toBeGreaterThan(-1);
    expect(reconcileAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(reconcileAt);
  });
});
