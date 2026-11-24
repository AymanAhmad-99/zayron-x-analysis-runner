/**
 * Phase 4A — the authoritative pulse uses ONE strategic engine, wherever the
 * credential lives.
 *
 * `workers/api` holds the model credential in Preview and exposes it through a
 * service-binding entrypoint, so the ingest cron prefers that binding when it
 * exists. In production no such binding is configured: the engine then runs
 * in-worker against `env.GEMINI_API_KEY`, and an absent key is the documented
 * clean `MISSING_CREDENTIAL` skip (deterministic advisories are unaffected).
 */
import {
  runStrategicCveAnalysis as runInWorker,
  type StrategicEnv,
  type StrategicSummary,
} from '../../../packages/intelligence/src/vulnerability/strategicRunner';

export {
  STRATEGIC_WORKFLOW,
  STRATEGIC_SELECTION_SQL,
  GEMINI_STRATEGIC_MODEL,
  countStrategicRunsToday,
  runStrategicCveAnalysis,
} from '../../../packages/intelligence/src/vulnerability/strategicRunner';
export type { StrategicEnv, StrategicSummary } from '../../../packages/intelligence/src/vulnerability/strategicRunner';

export interface StrategicDispatcherEnv extends StrategicEnv {
  /** Preview-only internal RPC into the API worker's strategic engine. */
  STRATEGIC_ANALYST?: { analyze(input: { limit?: number }): Promise<StrategicSummary> };
}

/** Prefer the credential-owning worker; fall back to the in-worker engine. */
export async function runStrategicPass(
  env: StrategicDispatcherEnv,
  options: { limit?: number; fetchFn?: typeof fetch } = {},
): Promise<StrategicSummary> {
  if (env.STRATEGIC_ANALYST && typeof env.STRATEGIC_ANALYST.analyze === 'function') {
    try {
      return await env.STRATEGIC_ANALYST.analyze({ limit: options.limit });
    } catch (error) {
      console.error(JSON.stringify({
        type: 'STRATEGIC_ANALYST_RPC_FAILED',
        error: String((error as Error)?.message || error).slice(0, 200),
      }));
      // Fail soft into the in-worker engine; a missing key there is a clean skip.
    }
  }
  return runInWorker(env, options);
}
