/**
 * Analyst service RESULT contract.
 *
 * This is what the `VulnerabilityAnalyst` service-binding entrypoint returns to the
 * continuous-ingestion worker, and it deliberately keeps THREE independent facts apart,
 * because they fail independently and a caller must never infer one from another:
 *
 *  - `ok`              — transport success: the RPC answered (HTTP 2xx).
 *  - `analysis_status` — analysis success: a model-authored analysis existed (PASS/FAIL/…).
 *  - `publication`     — publication success: the run published, or the gate withheld it.
 *
 * plus the persistence attempt outcome (`publication_write`) and the structured provider
 * failure signals (`error_code`, `failure_class`).
 *
 * Dependency-free on purpose: the projection is the seam that was dropping the classifiable
 * signals, so it is unit-testable in isolation without importing the Worker runtime, a D1
 * binding, or an AI provider.
 */

export interface AnalystServiceResult {
  status: number;
  /** Transport success only. Never a claim that anything was analysed or published. */
  ok: boolean;
  cveId: string;
  reportPresent: boolean;
  /** The route's gate decision for THIS attempt: `PUBLISHED` or `WITHHELD`. */
  publication: string | null;
  /** Model analysis status (`PASS`/`FAIL`/`PARTIAL`/`UNGROUNDED`/`SKIPPED`). */
  analysis_status: string | null;
  /** Structured provider failure class from the adapter (never parsed from prose). */
  failure_class: string | null;
  /** Structured provider failure ORIGIN (`CIRCUIT_OPEN`, `PROVIDER_SKIPPED`, `HTTP_5xx`, …). */
  error_code: string | null;
  /** Persistence attempt outcome (`APPLIED`/`NOOP_BLOCKED`/`ERROR`). */
  publication_write: string | null;
  error?: string;
  latency_ms: number;
}

/** A non-empty trimmed string, or `null`. A malformed/absent field becomes `null`, never a guess. */
function token(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Project the guarded route's response payload onto the service result.
 *
 * The route emits `publication_decision`, `ai_analysis`, `ai_error_code`, `ai_failure_class`
 * and `publication_write`; dropping any of them here is exactly what made `CIRCUIT_OPEN`,
 * `PROVIDER_FAILED`, `GATE_BLOCKED` and `WITHHELD` unreachable at the dispatch layer. Each is
 * read by its exact field name and is NEVER inferred from `ok`, the HTTP status, a missing
 * field, or human-readable error text.
 *
 * Fails closed: an absent, non-string or malformed field projects to `null`, which the
 * dispatch contract classifies as unverified rather than as a success. The pre-existing
 * fields (`status`, `ok`, `cveId`, `reportPresent`, `error`, `latency_ms`) keep their exact
 * former meaning, so the change is additive for every existing consumer.
 */
export function projectAnalystServiceResult(input: {
  status: number;
  ok: boolean;
  cveId: string;
  payload: unknown;
  error?: string;
  latency_ms: number;
}): AnalystServiceResult {
  const payload = input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload)
    ? (input.payload as Record<string, unknown>)
    : {};
  return {
    status: input.status,
    ok: input.ok,
    cveId: input.cveId,
    reportPresent: !!payload.report,
    publication: token(payload.publication_decision),
    analysis_status: token(payload.ai_analysis),
    failure_class: token(payload.ai_failure_class),
    error_code: token(payload.ai_error_code),
    publication_write: token(payload.publication_write),
    ...(input.error ? { error: input.error } : {}),
    latency_ms: input.latency_ms,
  };
}
