/**
 * Vulnerability AI analysis dispatch contract.
 *
 * This module is intentionally dependency-free so the dispatch decision logic can be
 * unit tested in isolation. It encodes the *existing* analyst-grade eligibility
 * contract (CISA KEV / exploited-in-wild / critical severity) and the idempotency +
 * failure-isolation rules for connecting continuous ingestion to the existing
 * analyst-grade CVE pipeline.
 *
 * It does NOT contain any AI provider logic and does NOT create a second AI
 * architecture: dispatch simply invokes the existing pipeline.
 */

/**
 * Dispatch outcomes.
 *
 * `DISPATCHED` means ONE thing only: the persisted report satisfies the actual
 * publication gate (re-read from the report store after the call). HTTP transport
 * success is NOT a dispatch success — a withheld analysis, a provider failure, a
 * local circuit rejection and a gate-blocked content rejection each have their own
 * outcome, so a withheld run can never be recorded as a completed dispatch.
 */
export type DispatchOutcome =
  | 'DISPATCHED'
  | 'REPORT_PRESENT'
  | 'NOT_ELIGIBLE'
  | 'ANALYST_UNAVAILABLE'
  /** Analysis ran; no publishable report exists and no more specific cause was recorded. */
  | 'WITHHELD'
  /** Provider/model failure recorded by the analysis boundary (transient or unknown). */
  | 'PROVIDER_FAILED'
  /** Local circuit rejection: the provider was never invoked (no outbound request). */
  | 'CIRCUIT_OPEN'
  /** Model output existed; the fail-closed gates withheld publication (content rejection). */
  | 'GATE_BLOCKED'
  /** Transport responded, but the boundary reported failure or nothing was persisted. */
  | 'PERSIST_FAILED'
  /** Transport success only: the result carried no publication signal. Never a success. */
  | 'UNVERIFIED'
  /** The call itself threw (transport/exception path). */
  | 'FAILED';

/** The fields an analysis boundary must expose for an outcome to be classifiable. */
export interface AnalystResultSignal {
  ok?: boolean;
  publication?: string | null;
  analysis_status?: string | null;
  failure_class?: string | null;
  error_code?: string | null;
  /** Persistence attempt outcome reported by the writer (`APPLIED`/`NOOP_BLOCKED`/`ERROR`). */
  publication_write?: string | null;
  reportPresent?: boolean;
  latency_ms?: number;
  error?: string;
}

/**
 * Classify why an analysis did NOT produce a publishable report.
 *
 * Fail-closed by construction: an absent or malformed result is `UNVERIFIED`, never
 * a success. The caller has already re-read the report store; this function is only
 * consulted when that re-read did not find a valid publication.
 */
export function classifyUnpublishedDispatch(result: unknown): DispatchOutcome {
  if (result === null || result === undefined || typeof result !== 'object') return 'UNVERIFIED';
  const r = result as AnalystResultSignal;

  // The persistence attempt outcome, from the DATABASE's own result. This is what separates
  // "this attempt published" from "an older valid publication was preserved", and it is
  // never inferred from the transport status.
  const writeOutcome = typeof r.publication_write === 'string' ? r.publication_write.trim().toUpperCase() : '';
  // A conditional no-op can only happen because a stored ANALYZED+PUBLISHED row was preserved
  // by the overwrite guard, so a valid publication IS present — but not one this attempt
  // created. It is REPORT_PRESENT (never a success claim for the attempt) and must never be
  // mislabelled as a provider or gate failure.
  if (writeOutcome === 'NOOP_BLOCKED') return 'REPORT_PRESENT';
  // The write errored, or the result was ambiguous: nothing was persisted by this attempt.
  if (writeOutcome === 'ERROR') return 'PERSIST_FAILED';

  const errorCode = typeof r.error_code === 'string' && r.error_code.trim().length > 0 ? r.error_code : null;
  // Origin token when the telemetry fix is deployed; the thrown message otherwise.
  if (errorCode === 'CIRCUIT_OPEN' || (errorCode !== null && /provider circuit open/i.test(errorCode))) return 'CIRCUIT_OPEN';
  const failureClass = typeof r.failure_class === 'string' && r.failure_class.trim().length > 0 ? r.failure_class : null;
  if (failureClass) return 'PROVIDER_FAILED';
  if (r.analysis_status === 'PASS') {
    // A publishable write that landed but whose re-read still did not satisfy the publication
    // gate cannot be claimed as a gate rejection: the attempt is unverified, never a success.
    if (writeOutcome === 'APPLIED' && r.publication === 'PUBLISHED') return 'UNVERIFIED';
    return 'GATE_BLOCKED';
  }
  if (r.publication === 'WITHHELD') return 'WITHHELD';
  if (r.ok === false) return 'PERSIST_FAILED';
  return 'UNVERIFIED';
}

export interface AnalysisEligibilityInput {
  sourceId?: string;
  catalog?: string;
  severity?: string;
}

/**
 * Reuses the existing analyst-grade eligibility contract. A canonical vulnerability is
 * eligible for AI analysis when it originates from CISA KEV, is flagged as CISA KEV
 * catalog data, or is critical severity. Everything else stays canonical-only
 * (equivalent to the pipeline's existing STORE_ONLY semantics).
 */
export function isVulnerabilityAnalysisEligible(input: AnalysisEligibilityInput): boolean {
  const severity = String(input?.severity || '').toUpperCase();
  return (
    input?.sourceId === 'cisa-kev' ||
    input?.catalog === 'CISA KEV' ||
    severity === 'CRITICAL'
  );
}

export interface IntelligenceReportRow {
  status?: string | null;
  publication_status?: string | null;
  structured_report_json?: unknown;
}

/**
 * A structured report is considered present and valid only when it is fully
 * ANALYZED + PUBLISHED and carries a non-empty structured report payload. This is the
 * same validity contract the API read path uses, so we never dispatch duplicate work
 * for a CVE that already has a retrievable report.
 */
export function reportIsValid(row: IntelligenceReportRow | null | undefined): boolean {
  if (!row) return false;
  const structured = row.structured_report_json;
  return (
    row.status === 'ANALYZED' &&
    row.publication_status === 'PUBLISHED' &&
    typeof structured === 'string' &&
    structured.length > 2
  );
}

export interface DispatchDependencies {
  cveId: string;
  /** Returns true if a valid structured report already exists for the CVE. */
  hasValidReport: (cveId: string) => Promise<boolean>;
  /** The existing analyst-grade pipeline, reached via an internal service binding. */
  analyst?: { analyzeVulnerability(input: { cveId: string }): Promise<unknown> };
  /** Optional eligibility override; when false the CVE is skipped (NOT_ELIGIBLE). */
  eligible?: boolean;
  onTrace?: (stage: string, status: string) => Promise<void> | void;
  onError?: (error: unknown) => void;
  /**
   * Called with the terminal outcome of an analysis that did NOT publish. This is
   * the observability seam for withheld/provider-failed/circuit-open/gate-blocked
   * outcomes; it must never make the dispatch throw or retry.
   */
  onUnpublished?: (outcome: DispatchOutcome, result: unknown) => void;
}

// Single-flight barrier keyed by CVE for the current isolate. Independent of the DB
// idempotency (ON CONFLICT in the report store), this ensures a single queue batch that
// contains the same CVE more than once produces exactly one effective analysis job.
const IN_FLIGHT = new Map<string, Promise<DispatchOutcome>>();

/** Test-only reset of the isolate-local single-flight barrier. */
export function __resetAnalysisDispatchState(): void {
  IN_FLIGHT.clear();
}

const trace = async (dep: DispatchDependencies, stage: string, status: string) => {
  try {
    await dep.onTrace?.(stage, status);
  } catch {
    /* tracing must never affect dispatch */
  }
};

async function runDispatch(dep: DispatchDependencies): Promise<DispatchOutcome> {
  if (dep.eligible === false) return 'NOT_ELIGIBLE';
  if (!dep.analyst) return 'ANALYST_UNAVAILABLE';
  try {
    if (await dep.hasValidReport(dep.cveId)) return 'REPORT_PRESENT';
    await trace(dep, 'AI_ANALYSIS_DISPATCH', 'STARTED');
    let result: unknown = null;
    try {
      result = await dep.analyst.analyzeVulnerability({ cveId: dep.cveId });
    } catch (error) {
      // Failure isolation: never rethrow. The canonical vulnerability is already durable;
      // a failed dispatch is recorded and the caller continues. Returning (rather than
      // throwing) is also what keeps the queue message from being redelivered in a loop.
      await trace(dep, 'AI_ANALYSIS_DISPATCH', 'FAILED');
      try {
        dep.onError?.(error);
      } catch {
        /* ignore */
      }
      return 'FAILED';
    }
    // The PERSISTED report decides success, not the transport result. Exactly one
    // analyst invocation happens per dispatch (bounded); no internal retry loop exists.
    if (await dep.hasValidReport(dep.cveId)) {
      await trace(dep, 'AI_ANALYSIS_DISPATCH', 'COMPLETED');
      return 'DISPATCHED';
    }
    const outcome = classifyUnpublishedDispatch(result);
    await trace(dep, 'AI_ANALYSIS_DISPATCH', outcome);
    try {
      dep.onUnpublished?.(outcome, result);
    } catch {
      /* observability must never affect dispatch */
    }
    return outcome;
  } catch (error) {
    // A failure of the verification read itself is isolated exactly like any other.
    await trace(dep, 'AI_ANALYSIS_DISPATCH', 'FAILED');
    try {
      dep.onError?.(error);
    } catch {
      /* ignore */
    }
    return 'FAILED';
  } finally {
    IN_FLIGHT.delete(dep.cveId);
  }
}

/**
 * Dispatch one canonical vulnerability to the existing analyst-grade pipeline.
 *
 * Guarantees:
 *  - never throws (failure isolated from canonical persistence)
 *  - idempotent: skips when a valid report already exists
 *  - single-flight: concurrent dispatches for the same CVE coalesce to one job
 *  - bounded: exactly one analyst invocation per dispatch, no internal retry loop
 *  - publishes-or-says-why: `DISPATCHED` requires a re-read report that satisfies the
 *    publication gate; every other terminal state is named explicitly
 */
export function dispatchVulnerabilityAnalysis(dep: DispatchDependencies): Promise<DispatchOutcome> {
  const existing = IN_FLIGHT.get(dep.cveId);
  if (existing) return existing;
  const promise = runDispatch(dep);
  IN_FLIGHT.set(dep.cveId, promise);
  return promise;
}
