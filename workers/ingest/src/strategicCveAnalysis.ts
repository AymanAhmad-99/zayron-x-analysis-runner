/**
 * Phase 4A — the authoritative pulse uses ONE strategic engine, wherever the
 * provider binding lives.
 *
 * `workers/api` owns the Workers AI binding (Phase 4A.2: `@cf/google/gemma-4-26b-a4b-it`
 * primary, `@cf/ibm-granite/granite-4.0-h-micro` fallback) and exposes the pass through a
 * service-binding entrypoint, so the ingest cron prefers that binding when it exists. When
 * it is absent the engine runs in-worker, which works because ingest also holds `env.AI`;
 * only a worker with NO provider binding reports the documented clean
 * `MISSING_CREDENTIAL` skip, and the deterministic advisories are unaffected.
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
  STRATEGIC_ANALYST?: { analyze(input: { limit?: number; cveIds?: string[] }): Promise<StrategicSummary> };
}

/** Prefer the credential-owning worker; fall back to the in-worker engine. */
export async function runStrategicPass(
  env: StrategicDispatcherEnv,
  options: { limit?: number; fetchFn?: typeof fetch; cveIds?: string[] } = {},
): Promise<StrategicSummary> {
  if (env.STRATEGIC_ANALYST && typeof env.STRATEGIC_ANALYST.analyze === 'function') {
    try {
      return await env.STRATEGIC_ANALYST.analyze({ limit: options.limit, cveIds: options.cveIds });
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
