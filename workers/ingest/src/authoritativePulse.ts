/**
 * Phase 4A — SELECTIVE UNFREEZE of the authoritative CVE pulse.
 *
 * `LEGACY_FREEZE="true"` is the production kill-switch for the LEGACY surface:
 * Telegram narrative ingestion, queue promotion, CISA/MSRC enqueues, the AI
 * smoke test and every mutation route. It is NOT a statement that
 * authoritative facts are untrusted — but until Phase 4A it also stopped
 * `scheduled()`, so the authoritative NVD + CISA KEV + FIRST EPSS corpus froze
 * at whatever the operator last seeded.
 *
 * `AUTHORITATIVE_CVE_CRON_ENABLED="true"` opens EXACTLY ONE path:
 * {@link runAuthoritativePulse}. The legacy paths stay closed for every value
 * of both flags, because `ingestHandlers.scheduled` returns immediately after
 * this pass while the freeze is active. Nothing here publishes outbound, reads
 * Telegram, or calls the collector.
 */
import { runAuthoritativeVulnIngest } from './authoritativeVulnIngest';
import { runCtiEnrichmentPass, type CtiEnrichmentSummary } from './ctiEnrichment';
import { runStrategicPass, type StrategicSummary } from './strategicCveAnalysis';

export const AUTHORITATIVE_CRON_FLAG = 'AUTHORITATIVE_CVE_CRON_ENABLED';

/** Bounded per-run window: a 2-day lookback keeps reruns idempotent and cheap. */
export const AUTHORITATIVE_PULSE_LIMITS = { limit: 25, days: 2 } as const;

export interface PulseEnv {
  DB: any;
  NVD_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  ENVIRONMENT?: string;
  STRATEGIC_ANALYST?: { analyze(input: { limit?: number }): Promise<StrategicSummary> };
  [key: string]: unknown;
}

export interface PulseSummary {
  trigger: string;
  started_at: string;
  duration_ms: number;
  fetched: number;
  upserted: number;
  epss_matched: number;
  kev_matched: number;
  /** CVE ids persisted by this pass (the enrichment input set). */
  cves: string[];
  /** Phase 5A — keyless CVE.org + OSV.dev enrichment of the ingested batch. */
  enrichment: CtiEnrichmentSummary | null;
  strategic: StrategicSummary | null;
  errors: string[];
}

/** An explicit, auditable flag — never inferred from ENVIRONMENT. */
export function authoritativeCronEnabled(env: { [AUTHORITATIVE_CRON_FLAG]?: string }): boolean {
  return env?.[AUTHORITATIVE_CRON_FLAG] === 'true';
}

/**
 * One bounded authoritative pass: verified facts in, then the budgeted
 * strategic-brief layer. Both halves are independently fallible, so a failure
 * is reported instead of taking the other half down.
 */
export async function runAuthoritativePulse(
  env: PulseEnv,
  options: { trigger?: string; limit?: number; days?: number; strategicLimit?: number; fetchFn?: typeof fetch } = {},
): Promise<PulseSummary> {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const summary: PulseSummary = {
    trigger: options.trigger || 'scheduled',
    started_at: startedAt,
    duration_ms: 0,
    fetched: 0,
    upserted: 0,
    epss_matched: 0,
    kev_matched: 0,
    cves: [],
    enrichment: null,
    strategic: null,
    errors: [],
  };

  try {
    const ingest = await runAuthoritativeVulnIngest(env as any, {
      limit: options.limit ?? AUTHORITATIVE_PULSE_LIMITS.limit,
      days: options.days ?? AUTHORITATIVE_PULSE_LIMITS.days,
      fetchFn: options.fetchFn,
    });
    summary.fetched = ingest.nvd_records;
    summary.upserted = ingest.persisted;
    summary.epss_matched = ingest.epss_matched;
    summary.kev_matched = ingest.kev_matched;
    summary.cves = [...ingest.cves];
    summary.errors.push(...ingest.errors);
  } catch (error) {
    summary.errors.push(`INGEST_FAILED:${String((error as Error)?.message || error).slice(0, 160)}`);
  }

  // Phase 5A — enrich BEFORE briefing. The strategic pass must read the CWE,
  // SSVC, provider attribution and distro/package matrix that the keyless
  // authorities publish; briefing first would freeze the pre-enrichment facts
  // into the prompt for a whole day.
  if (summary.cves.length > 0) {
    try {
      summary.enrichment = await runCtiEnrichmentPass(env as any, summary.cves, { fetchFn: options.fetchFn });
      summary.errors.push(...summary.enrichment.errors);
    } catch (error) {
      summary.errors.push(`ENRICHMENT_FAILED:${String((error as Error)?.message || error).slice(0, 160)}`);
    }
  }

  try {
    summary.strategic = await runStrategicPass(env, {
      limit: options.strategicLimit,
      fetchFn: options.fetchFn,
    });
  } catch (error) {
    summary.errors.push(`STRATEGIC_FAILED:${String((error as Error)?.message || error).slice(0, 160)}`);
  }

  summary.duration_ms = Date.now() - started;
  return summary;
}
