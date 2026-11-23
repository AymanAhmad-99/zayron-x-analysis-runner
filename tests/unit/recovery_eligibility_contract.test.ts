import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  AUTOMATIC_RECOVERY_DISABLED_REASON,
  AUTOMATIC_RECOVERY_ENABLED,
  MAX_RECOVERY_ATTEMPTS,
  RECOVERY_BACKOFF_BASE_MS,
  RECOVERY_BACKOFF_CAP_MS,
  classifyRecoveryFailure,
  evaluateRecoveryDecision,
  recoveryBackoffMs,
} from '../../workers/ingest/src/recoveryEligibility';

const NOW = 1_760_000_000_000;

describe('RECOVERY CONTRACT — automatic recovery stays disabled', () => {
  test('the flag is off and carries the reason it cannot yet be enabled', () => {
    expect(AUTOMATIC_RECOVERY_ENABLED).toBe(false);
    expect(AUTOMATIC_RECOVERY_DISABLED_REASON.length).toBeGreaterThan(0);
    expect(MAX_RECOVERY_ATTEMPTS).toBe(2); // bounded: two additional attempts, never more
  });

  test('nothing on the ingest execution path schedules recovery (no cron, no queue, no loop)', () => {
    const ingestSource = readFileSync(new URL('../../workers/ingest/src/index.ts', import.meta.url), 'utf8');
    expect(ingestSource).not.toContain('evaluateRecoveryDecision');
    expect(ingestSource).not.toContain('recoveryBackoffMs');
    // The dispatch helper is the only analysis entry point and never retries internally.
    const dispatchSource = readFileSync(new URL('../../workers/ingest/src/analysisDispatch.ts', import.meta.url), 'utf8');
    expect(dispatchSource).not.toContain('evaluateRecoveryDecision');
  });
});

describe('RECOVERY CONTRACT — failure classification', () => {
  test('outcomes and signals map to stable failure classes', () => {
    expect(classifyRecoveryFailure('CIRCUIT_OPEN')).toBe('CIRCUIT_OPEN');
    expect(classifyRecoveryFailure('GATE_BLOCKED')).toBe('CONTENT_INVALID');
    expect(classifyRecoveryFailure('PROVIDER_FAILED', { error_code: 'QUOTA_EXHAUSTED' })).toBe('QUOTA_EXHAUSTED');
    expect(classifyRecoveryFailure('PROVIDER_FAILED', { failure_class: 'DAILY_NEURON_ALLOCATION_EXHAUSTED' })).toBe('QUOTA_EXHAUSTED');
    expect(classifyRecoveryFailure('PROVIDER_FAILED', { error_code: 'AUTH_FAILED' })).toBe('AUTH_PERMANENT');
    expect(classifyRecoveryFailure('PROVIDER_FAILED', { error_code: 'TIMEOUT' })).toBe('TRANSIENT');
    expect(classifyRecoveryFailure('PERSIST_FAILED', { error_code: 'UNAVAILABLE' })).toBe('TRANSIENT');
    expect(classifyRecoveryFailure('WITHHELD')).toBe('UNCLASSIFIED');
  });
});

describe('RECOVERY CONTRACT — decision table', () => {
  test('published, ineligible and unbound-analyst states are terminal', () => {
    for (const outcome of ['DISPATCHED', 'REPORT_PRESENT'] as const) {
      expect(evaluateRecoveryDecision({ outcome, attempt: 0, nowMs: NOW })).toMatchObject({ disposition: 'TERMINAL', terminal_state: 'PUBLISHED' });
    }
    expect(evaluateRecoveryDecision({ outcome: 'NOT_ELIGIBLE', attempt: 0, nowMs: NOW })).toMatchObject({ disposition: 'TERMINAL', terminal_state: 'NOT_ELIGIBLE' });
    expect(evaluateRecoveryDecision({ outcome: 'ANALYST_UNAVAILABLE', attempt: 0, nowMs: NOW })).toMatchObject({ disposition: 'TERMINAL', terminal_state: 'ANALYST_UNAVAILABLE' });
  });

  test('gate-blocked content and permanent auth failures are never retried', () => {
    const blocked = evaluateRecoveryDecision({ outcome: 'GATE_BLOCKED', attempt: 0, nowMs: NOW });
    expect(blocked).toMatchObject({ disposition: 'TERMINAL', failure_class: 'CONTENT_INVALID', terminal_state: 'CONTENT_REJECTED' });
    expect(blocked.defer_until_ms).toBeUndefined();
    const auth = evaluateRecoveryDecision({ outcome: 'PROVIDER_FAILED', attempt: 0, signal: { error_code: 'AUTH_FAILED' }, nowMs: NOW });
    expect(auth).toMatchObject({ disposition: 'TERMINAL', failure_class: 'AUTH_PERMANENT', terminal_state: 'AUTH_FAILURE' });
  });

  test('confirmed quota exhaustion defers to the recorded reset and not a moment earlier', () => {
    const reset = NOW + 3_600_000;
    const decision = evaluateRecoveryDecision({ outcome: 'PROVIDER_FAILED', attempt: 0, signal: { error_code: 'QUOTA_EXHAUSTED' }, quotaResetAtMs: reset, nowMs: NOW });
    expect(decision).toMatchObject({ disposition: 'DEFER', failure_class: 'QUOTA_EXHAUSTED', defer_until_ms: reset });
    // A reset already in the past cannot move the decision into the past.
    const past = evaluateRecoveryDecision({ outcome: 'PROVIDER_FAILED', attempt: 0, signal: { error_code: 'QUOTA_EXHAUSTED' }, quotaResetAtMs: NOW - 1, nowMs: NOW });
    expect(past.defer_until_ms).toBe(NOW);
  });

  test('quota exhaustion with no recorded reset is terminal instead of a blind retry', () => {
    expect(evaluateRecoveryDecision({ outcome: 'PROVIDER_FAILED', attempt: 0, signal: { error_code: 'QUOTA_EXHAUSTED' }, nowMs: NOW }))
      .toMatchObject({ disposition: 'TERMINAL', terminal_state: 'QUOTA_RESET_UNKNOWN' });
  });

  test('a local circuit rejection defers to the existing cooldown, which is never shortened', () => {
    const cooldown = NOW + 900_000;
    const active = evaluateRecoveryDecision({ outcome: 'CIRCUIT_OPEN', attempt: 0, circuitCooldownUntilMs: cooldown, nowMs: NOW });
    expect(active).toMatchObject({ disposition: 'DEFER', defer_until_ms: cooldown, reason: 'CIRCUIT_COOLDOWN_ACTIVE' });
    expect(active.defer_until_ms).toBe(cooldown);
    expect(evaluateRecoveryDecision({ outcome: 'CIRCUIT_OPEN', attempt: 0, circuitCooldownUntilMs: NOW - 1, nowMs: NOW }).disposition).toBe('RECOVER_NOW');
    expect(evaluateRecoveryDecision({ outcome: 'CIRCUIT_OPEN', attempt: 0, nowMs: NOW }).disposition).toBe('RECOVER_NOW');
  });

  test('transient failures defer on bounded backoff and then terminate at the cap', () => {
    const first = evaluateRecoveryDecision({ outcome: 'PROVIDER_FAILED', attempt: 0, signal: { error_code: 'TIMEOUT' }, nowMs: NOW });
    expect(first.disposition).toBe('DEFER');
    expect(first.defer_until_ms).toBe(NOW + RECOVERY_BACKOFF_BASE_MS);
    const second = evaluateRecoveryDecision({ outcome: 'PROVIDER_FAILED', attempt: 1, signal: { error_code: 'TIMEOUT' }, nowMs: NOW });
    expect(second.defer_until_ms).toBe(NOW + RECOVERY_BACKOFF_BASE_MS * 2);
    expect(evaluateRecoveryDecision({ outcome: 'PROVIDER_FAILED', attempt: MAX_RECOVERY_ATTEMPTS, nowMs: NOW }))
      .toMatchObject({ disposition: 'TERMINAL', terminal_state: 'ATTEMPTS_EXHAUSTED' });
    // Deterministic (idempotent) for identical inputs: a retry decision cannot drift.
    expect(evaluateRecoveryDecision({ outcome: 'PROVIDER_FAILED', attempt: 0, signal: { error_code: 'TIMEOUT' }, nowMs: NOW })).toEqual(first);
  });

  test('backoff is bounded and never negative', () => {
    expect(recoveryBackoffMs(0)).toBe(RECOVERY_BACKOFF_BASE_MS);
    expect(recoveryBackoffMs(99)).toBe(RECOVERY_BACKOFF_CAP_MS);
    expect(recoveryBackoffMs(-5)).toBe(RECOVERY_BACKOFF_BASE_MS);
  });

  test('a deferral is never reported for a terminal state and vice versa', () => {
    const outcomes = ['DISPATCHED', 'REPORT_PRESENT', 'NOT_ELIGIBLE', 'ANALYST_UNAVAILABLE', 'WITHHELD', 'PROVIDER_FAILED', 'CIRCUIT_OPEN', 'GATE_BLOCKED', 'PERSIST_FAILED', 'UNVERIFIED', 'FAILED'] as const;
    for (const outcome of outcomes) {
      const decision = evaluateRecoveryDecision({ outcome, attempt: 0, nowMs: NOW });
      if (decision.disposition === 'DEFER') {
        expect(decision.defer_until_ms).toBeGreaterThanOrEqual(NOW);
        expect(decision.terminal_state).toBeUndefined();
      }
      if (decision.disposition === 'TERMINAL') {
        expect(decision.terminal_state).toBeDefined();
        expect(decision.defer_until_ms).toBeUndefined();
      }
      // No decision ever claims publication from an unpublished outcome.
      if (outcome !== 'DISPATCHED' && outcome !== 'REPORT_PRESENT') expect(decision.terminal_state).not.toBe('PUBLISHED');
    }
  });
});
