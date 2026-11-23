/**
 * Retry / recovery eligibility contract for analyst-grade CVE analysis.
 *
 * SCOPE — this module is a CONTRACT, not a runner. It classifies a terminal analysis
 * outcome into one of three dispositions (recover now, defer until a known time, or a
 * terminal state) and nothing in the ingest path calls it to schedule work:
 * automatic recovery is disabled (see `AUTOMATIC_RECOVERY_ENABLED`). The dispatch path
 * performs exactly ONE analyst invocation per dispatch, so enabling recovery is a
 * separate, deliberate change that must first satisfy the preconditions documented on
 * that flag.
 *
 * Dependency-free on purpose, so the classification is unit-testable in isolation and
 * cannot reach a provider or a database by accident.
 */
import type { DispatchOutcome } from './analysisDispatch';

/** Why an analysis attempt did not publish. Failure classes drive recovery eligibility. */
export type RecoveryFailureClass =
  /** Transport/5xx/timeout/unknown provider error. Retryable within the attempt cap. */
  | 'TRANSIENT'
  /** Confirmed current-period quota exhaustion. Deferrable to a known reset. */
  | 'QUOTA_EXHAUSTED'
  /** Permanent authentication/authorization failure. Never retried here. */
  | 'AUTH_PERMANENT'
  /** Deterministic fail-closed gate rejection (content). Retrying cannot change it. */
  | 'CONTENT_INVALID'
  /** Local circuit rejection: no outbound request was made; cooldown governs. */
  | 'CIRCUIT_OPEN'
  /** No usable failure signal. Treated as deferrable but never as a success. */
  | 'UNCLASSIFIED';

export type RecoveryDisposition =
  /** Retryable from the current execution path, within caps and idempotency. */
  | 'RECOVER_NOW'
  /** Retryable, but not before `defer_until_ms` (quota reset or circuit cooldown). */
  | 'DEFER'
  /** Do not retry: the state is terminal or unrecoverable. Never a publication claim. */
  | 'TERMINAL';

export type RecoveryTerminalState =
  | 'PUBLISHED'
  | 'NOT_ELIGIBLE'
  | 'ANALYST_UNAVAILABLE'
  | 'CONTENT_REJECTED'
  | 'AUTH_FAILURE'
  | 'CIRCUIT_OPEN_EXPIRED'
  | 'ATTEMPTS_EXHAUSTED'
  | 'QUOTA_RESET_UNKNOWN';

export interface RecoveryDecision {
  disposition: RecoveryDisposition;
  failure_class: RecoveryFailureClass;
  /** Stable, machine-readable reason for audit trails. */
  reason: string;
  /** Present only for DEFER. Epoch millis; never in the past. */
  defer_until_ms?: number;
  /** Present only for TERMINAL. */
  terminal_state?: RecoveryTerminalState;
}

/** Attempt cap for any future automated recovery. Two additional attempts, never more. */
export const MAX_RECOVERY_ATTEMPTS = 2;

/** Base backoff for an unclassified/transient deferral; doubles per attempt, capped. */
export const RECOVERY_BACKOFF_BASE_MS = 60_000;
export const RECOVERY_BACKOFF_CAP_MS = 15 * 60_000;

/**
 * Automatic recovery is DISABLED.
 *
 * The current execution path cannot enforce bounded retries deterministically:
 *  - the dispatch path performs exactly one analyst invocation, and
 *  - its only attempt ledger (`event_trace`, stage `AI_ANALYSIS_DISPATCH`) is written
 *    best-effort — a trace failure is deliberately swallowed so it can never affect
 *    ingestion — so it can neither count attempts reliably nor be transactional with
 *    the dispatch decision.
 *
 * Enabling this flag without first adding a durable, transactional attempt ledger would
 * allow unbounded (or, worse, double-counted) retries, so it stays false and the
 * decision function below is delivered as the tested contract only.
 */
export const AUTOMATIC_RECOVERY_ENABLED = false;

export const AUTOMATIC_RECOVERY_DISABLED_REASON =
  'No durable, transactional attempt ledger exists on the dispatch path; a deterministic attempt cap cannot be enforced.';

export interface RecoverySignal {
  failure_class?: string | null;
  error_code?: string | null;
  analysis_status?: string | null;
  publication?: string | null;
}

const TRANSIENT_CODES = new Set(['UNAVAILABLE', 'TIMEOUT', 'RATE_LIMITED', 'NETWORK_ERROR']);
const AUTH_CODES = new Set(['AUTH_FAILED', 'UNAUTHORIZED', 'FORBIDDEN', 'INVALID_CREDENTIALS']);
const QUOTA_CODES = new Set(['QUOTA_EXHAUSTED', 'DAILY_NEURON_ALLOCATION_EXHAUSTED']);

/**
 * Map a dispatch outcome plus the analyst signal to a failure class.
 *
 * Fail-closed: an unrecognised code is `UNCLASSIFIED`, and `UNCLASSIFIED` is never
 * treated as publishable — it is only ever a deferral candidate.
 */
export function classifyRecoveryFailure(outcome: DispatchOutcome, signal?: RecoverySignal | null): RecoveryFailureClass {
  if (outcome === 'CIRCUIT_OPEN') return 'CIRCUIT_OPEN';
  if (outcome === 'GATE_BLOCKED') return 'CONTENT_INVALID';
  const code = typeof signal?.error_code === 'string' ? signal.error_code.trim().toUpperCase() : '';
  if (code && QUOTA_CODES.has(code)) return 'QUOTA_EXHAUSTED';
  if (code && AUTH_CODES.has(code)) return 'AUTH_PERMANENT';
  if (code && TRANSIENT_CODES.has(code)) return 'TRANSIENT';
  const failureClass = typeof signal?.failure_class === 'string' ? signal.failure_class.trim().toUpperCase() : '';
  if (failureClass === 'QUOTA_EXHAUSTED' || failureClass === 'DAILY_NEURON_ALLOCATION_EXHAUSTED') return 'QUOTA_EXHAUSTED';
  if (failureClass === 'AUTH_FAILED' || failureClass === 'AUTHENTICATION_FAILED') return 'AUTH_PERMANENT';
  if (outcome === 'PROVIDER_FAILED' || outcome === 'PERSIST_FAILED' || outcome === 'WITHHELD' || outcome === 'FAILED') {
    return code ? 'TRANSIENT' : 'UNCLASSIFIED';
  }
  return 'UNCLASSIFIED';
}

/** Exponential backoff for a deferral, bounded by the cap and never negative. */
export function recoveryBackoffMs(attempt: number): number {
  const bounded = Math.max(0, Math.floor(Number.isFinite(attempt) ? attempt : 0));
  return Math.min(RECOVERY_BACKOFF_CAP_MS, RECOVERY_BACKOFF_BASE_MS * 2 ** bounded);
}

export interface RecoveryDecisionInput {
  outcome: DispatchOutcome;
  /** Completed attempts for this CVE's current analysis revision. 0 on first failure. */
  attempt: number;
  signal?: RecoverySignal | null;
  /** Confirmed quota reset, epoch millis. Unknown reset defers the decision to a human. */
  quotaResetAtMs?: number | null;
  /** Local circuit cooldown expiry, epoch millis (read, never modified). */
  circuitCooldownUntilMs?: number | null;
  nowMs: number;
}

/**
 * The retry eligibility contract.
 *
 * Rules, in order:
 *  1. A published/complete outcome needs no recovery. Neither does ineligibility or a
 *     missing analyst binding: those are configuration states, not transient failures.
 *  2. Gate-blocked / invalid content is TERMINAL — the fail-closed gate is deterministic,
 *     so retrying would only burn attempts and could never publish.
 *  3. Permanent authentication failure is TERMINAL (operator action required).
 *  4. Confirmed quota exhaustion is DEFER until the recorded reset; with no recorded
 *     reset it is TERMINAL (`QUOTA_RESET_UNKNOWN`) rather than a blind retry.
 *  5. A local circuit rejection is DEFER until the existing cooldown expires — the
 *     cooldown is read, never shortened.
 *  6. Everything else defers on exponential backoff while attempts remain, and is
 *     TERMINAL (`ATTEMPTS_EXHAUSTED`) once the cap is reached.
 */
export function evaluateRecoveryDecision(input: RecoveryDecisionInput): RecoveryDecision {
  const { outcome, nowMs } = input;
  const attempt = Math.max(0, Math.floor(Number.isFinite(input.attempt) ? input.attempt : 0));
  const failureClass = classifyRecoveryFailure(outcome, input.signal);

  if (outcome === 'DISPATCHED' || outcome === 'REPORT_PRESENT') {
    return { disposition: 'TERMINAL', failure_class: failureClass, reason: 'PUBLICATION_SATISFIED', terminal_state: 'PUBLISHED' };
  }
  if (outcome === 'NOT_ELIGIBLE') {
    return { disposition: 'TERMINAL', failure_class: failureClass, reason: 'NOT_ELIGIBLE', terminal_state: 'NOT_ELIGIBLE' };
  }
  if (outcome === 'ANALYST_UNAVAILABLE') {
    return { disposition: 'TERMINAL', failure_class: failureClass, reason: 'ANALYST_BINDING_ABSENT', terminal_state: 'ANALYST_UNAVAILABLE' };
  }
  if (failureClass === 'CONTENT_INVALID') {
    return { disposition: 'TERMINAL', failure_class: failureClass, reason: 'DETERMINISTIC_GATE_REJECTION', terminal_state: 'CONTENT_REJECTED' };
  }
  if (failureClass === 'AUTH_PERMANENT') {
    return { disposition: 'TERMINAL', failure_class: failureClass, reason: 'PERMANENT_AUTH_FAILURE', terminal_state: 'AUTH_FAILURE' };
  }
  if (failureClass === 'QUOTA_EXHAUSTED') {
    const reset = input.quotaResetAtMs;
    if (typeof reset !== 'number' || !Number.isFinite(reset)) {
      return { disposition: 'TERMINAL', failure_class: failureClass, reason: 'QUOTA_RESET_UNKNOWN', terminal_state: 'QUOTA_RESET_UNKNOWN' };
    }
    return {
      disposition: 'DEFER',
      failure_class: failureClass,
      reason: 'CONFIRMED_QUOTA_EXHAUSTION_DEFER_TO_RESET',
      defer_until_ms: Math.max(nowMs, reset),
    };
  }
  if (failureClass === 'CIRCUIT_OPEN') {
    const cooldown = input.circuitCooldownUntilMs;
    if (typeof cooldown === 'number' && Number.isFinite(cooldown) && cooldown > nowMs) {
      return {
        disposition: 'DEFER',
        failure_class: failureClass,
        reason: 'CIRCUIT_COOLDOWN_ACTIVE',
        defer_until_ms: cooldown,
      };
    }
    // Cooldown already elapsed: the existing dispatch path may try again on its own
    // cadence. Nothing here shortens a cooldown.
    return { disposition: 'RECOVER_NOW', failure_class: failureClass, reason: 'CIRCUIT_COOLDOWN_ELAPSED' };
  }
  if (attempt >= MAX_RECOVERY_ATTEMPTS) {
    return { disposition: 'TERMINAL', failure_class: failureClass, reason: 'ATTEMPT_CAP_REACHED', terminal_state: 'ATTEMPTS_EXHAUSTED' };
  }
  return {
    disposition: 'DEFER',
    failure_class: failureClass,
    reason: 'TRANSIENT_DEFER_BACKOFF',
    defer_until_ms: nowMs + recoveryBackoffMs(attempt),
  };
}
