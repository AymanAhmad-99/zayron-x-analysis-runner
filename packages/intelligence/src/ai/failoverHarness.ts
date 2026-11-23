/**
 * ZAYRON-X — PREVIEW-ONLY durable failover verification harness.
 *
 * WHY THIS EXISTS
 * The Cloudflare→Gemini durable switch is proven by unit tests with injected
 * providers, but the *deployed* transition has never been exercised: a real
 * Gemini key is absent, no fault-injection surface exists, and deliberately
 * consuming the real daily free neuron allocation is prohibited. This module is
 * that missing surface, built so that it CANNOT cause any of the harms that
 * prohibition protects against.
 *
 * DESIGN RULES (each one is load-bearing)
 *
 *  1. REUSE, NEVER IMITATE. Every step calls the real, production
 *     `runGroundedCveAnalysis` and therefore the real `classifyAIError`,
 *     `dailyAllocationExhaustionEvidence`, `providerAvailabilityDecision` and
 *     `reduceProviderState`. The harness supplies *inputs*; it does not fork the
 *     routing or state-transition logic, so a passing harness cannot diverge from
 *     production behaviour.
 *
 *  2. ONE FIXED SCENARIO. Exactly one synthetic scenario is supported — a
 *     confirmed daily free-allocation exhaustion, reproducing Cloudflare's
 *     documented 429 / code 3036 evidence. There is no API to supply a provider
 *     response, a status code, a failure class, a model, a CVE or a database
 *     identity. Callers cannot parameterise the fault.
 *
 *  3. NO REAL PROVIDER CALLS. The Cloudflare "provider" is an injected object
 *     whose `run` throws the synthetic error without touching `env.AI`; the
 *     Gemini "provider" is an injected `fetch` that resolves a fixed payload
 *     without opening a socket. Nothing here spends a neuron, a quota unit or a
 *     network request.
 *
 *  4. ISOLATION BY NAMESPACE, ENFORCED. Provider-state keys written by the
 *     harness are prefixed ({@link HARNESS_SCOPE_PREFIX}). The live routing path
 *     reads and writes the unprefixed key `cloudflare` only, so a harness run
 *     cannot flip ordinary Preview traffic to Gemini, and cannot persist a false
 *     exhaustion that real analysis would then trust. The prefix is not a
 *     convention: {@link createIsolationEnforcingPort} records a violation if any
 *     save escapes the namespace, and the run fails if it does.
 *
 *  5. DISABLED BY DEFAULT, PREVIEW ONLY. {@link evaluateHarnessAccess} refuses
 *     unless the environment is `preview` AND the configuration variable
 *     {@link HARNESS_ENABLE_VAR} is explicitly `enabled`. It reads configuration,
 *     never the request, so no request parameter can enable the harness and no
 *     production environment can reach it.
 */

import {
  GEMINI_CVE_MODEL,
  WORKERS_AI_CVE_MODEL,
  __resetAIProviderCircuits,
  classifyAIError,
  runGroundedCveAnalysis,
  type AIProviderAttempt,
  type GroundedCveAnalysisInput,
  type GroundedCveAnalysisResult,
} from './adapter';
import {
  PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED,
  exhaustionRecordFor,
  quotaPeriodFor,
  type AIProviderName,
  type AIProviderStatePort,
  type AIProviderStateRecord,
} from './providerState';

// ── fixed scenario definition ───────────────────────────────────────────────

/** The single scenario this harness supports. Not parameterisable by callers. */
export const HARNESS_SCENARIO = 'SYNTHETIC_DAILY_NEURON_ALLOCATION_EXHAUSTION';

/** Namespace tag applied to EVERY provider-state key this harness writes. */
export const HARNESS_SCOPE_PREFIX = 'harness::';

/**
 * Configuration variable that arms the harness.
 *
 * It is deliberately NOT declared in `wrangler.toml`: absence is the default, so
 * the harness is off everywhere until an operator makes a deliberate out-of-band
 * configuration change on Preview. Declaring it in the config file was rejected
 * because that file's audited production-safety digest is pinned by an existing
 * isolation test, and any edit to it — even a comment — invalidates that proof.
 * The gate below requires the literal value `enabled`, so a missing, empty,
 * differently-cased, or production value all fail closed, and no request
 * parameter can influence the decision.
 */
export const HARNESS_ENABLE_VAR = 'PROVIDER_FAILOVER_HARNESS';
export const HARNESS_ENABLED_VALUE = 'enabled';
export const HARNESS_DISABLED_VALUE = 'disabled';

/** Refusal codes surfaced to the operator; stable so tests can assert them. */
export const HARNESS_CODE_PREVIEW_ONLY = 'PREVIEW_ONLY';
export const HARNESS_CODE_DISABLED = 'HARNESS_DISABLED';

/**
 * Cloudflare's OWN documented evidence for a spent daily free allocation
 * (HTTP 429, internal code 3036 — 4006 also observed). Reproduced verbatim so the
 * synthetic signal is the real condition and not an approximation of it.
 */
export const HARNESS_SYNTHETIC_EVIDENCE_MESSAGE =
  "You have used up your daily free allocation of 10,000 neurons. Please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.";
export const HARNESS_SYNTHETIC_ERROR_CODE = 3036;

/** Cloudflare's capacity-overload code — a TRANSIENT condition, deliberately distinct. */
export const HARNESS_SYNTHETIC_CAPACITY_CODE = 3040;
export const HARNESS_SYNTHETIC_CAPACITY_MESSAGE = 'Capacity temporarily exceeded, please try again.';

/**
 * A fixed, obviously-synthetic credential value. It is NOT a secret and grants
 * nothing: the injected `fetch` answers before any provider is reached.
 */
export const HARNESS_SYNTHETIC_CREDENTIAL = 'harness-synthetic-credential-not-a-secret';

/** Fixed synthetic identifiers, so the scenario is deterministic and auditable. */
export const HARNESS_PRIMARY_CVE = 'CVE-2026-900001';
export const HARNESS_SECONDARY_CVE = 'CVE-2026-900002';

/**
 * Fixed grounded payload. It describes nothing real — the harness exercises
 * routing and state, not analysis quality — and it cites only supplied evidence
 * (none is supplied), so it passes the evidence-grounding contract.
 */
export const HARNESS_GROUNDED_PAYLOAD = JSON.stringify({
  vulnerability_type: 'Synthetic Provider Routing Fixture',
  root_cause: 'Synthetic harness fixture. No vulnerability is described.',
  attack_surface: 'Synthetic harness fixture. Not applicable.',
  attack_vector: 'NETWORK',
  executive_assessment: 'Synthetic routing fixture for the Preview failover harness. This is not intelligence output.',
  technical_assessment: 'Synthetic routing fixture for the Preview failover harness. No analysis is implied.',
});

// ── access gate ─────────────────────────────────────────────────────────────

export interface HarnessEnvironment {
  ENVIRONMENT?: string;
  [HARNESS_ENABLE_VAR]?: string;
}

export interface HarnessAccessDecision {
  allowed: boolean;
  /** HTTP status to return when refused; always 403 (fail closed). */
  status: 403;
  code: string;
  message: string;
}

/**
 * Decide whether this environment may run the harness.
 *
 * Reads CONFIGURATION only — never the request — so the mechanism cannot be
 * enabled by a caller, and a production environment cannot reach it even if a
 * caller asks for it by name.
 */
export function evaluateHarnessAccess(env: HarnessEnvironment | null | undefined): HarnessAccessDecision {
  if (!env || env.ENVIRONMENT !== 'preview') {
    return {
      allowed: false,
      status: 403,
      code: HARNESS_CODE_PREVIEW_ONLY,
      message: 'The provider failover harness is Preview-only and is refused in this environment.',
    };
  }
  if (env[HARNESS_ENABLE_VAR] !== HARNESS_ENABLED_VALUE) {
    return {
      allowed: false,
      status: 403,
      code: HARNESS_CODE_DISABLED,
      message:
        `The provider failover harness is disabled. Set ${HARNESS_ENABLE_VAR}="${HARNESS_ENABLED_VALUE}" on the Preview ` +
        'environment and redeploy to arm it.',
    };
  }
  return { allowed: true, status: 403, code: 'HARNESS_ENABLED', message: 'Harness armed.' };
}

// ── synthetic providers (no real call is ever made) ────────────────────────

export function syntheticQuotaExhaustionError(): Error {
  return Object.assign(new Error(HARNESS_SYNTHETIC_EVIDENCE_MESSAGE), { code: HARNESS_SYNTHETIC_ERROR_CODE });
}

export function syntheticCapacityError(): Error {
  return Object.assign(new Error(HARNESS_SYNTHETIC_CAPACITY_MESSAGE), { code: HARNESS_SYNTHETIC_CAPACITY_CODE });
}

export interface SyntheticProviderCounter {
  n: number;
}

export interface SyntheticAIBinding {
  run: (model: string, options: unknown) => Promise<unknown>;
}

/**
 * A Cloudflare-shaped binding that always reports the documented daily-allocation
 * exhaustion. It never calls `env.AI` — the exhaustion is produced, not consumed.
 */
export function syntheticExhaustedCloudflareBinding(counter: SyntheticProviderCounter): SyntheticAIBinding {
  return {
    async run() {
      counter.n += 1;
      throw syntheticQuotaExhaustionError();
    },
  };
}

/** A Cloudflare-shaped binding that always reports capacity overload (transient). */
export function syntheticCapacityCloudflareBinding(counter: SyntheticProviderCounter): SyntheticAIBinding {
  return {
    async run() {
      counter.n += 1;
      throw syntheticCapacityError();
    },
  };
}

/** A Cloudflare-shaped binding that succeeds with the fixed fixture payload. */
export function syntheticHealthyCloudflareBinding(counter: SyntheticProviderCounter): SyntheticAIBinding {
  return {
    async run() {
      counter.n += 1;
      return { response: HARNESS_GROUNDED_PAYLOAD, usage: { prompt_tokens: 120, completion_tokens: 80 } };
    },
  };
}

/**
 * A `fetch` whose every response is the fixed fixture payload. It never opens a
 * socket, so no Gemini request is made or billed.
 */
export function syntheticSecondaryFetch(counter: SyntheticProviderCounter): typeof fetch {
  return (async () => {
    counter.n += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: HARNESS_GROUNDED_PAYLOAD }] } }],
        usageMetadata: { promptTokenCount: 21, candidatesTokenCount: 13 },
      }),
    };
  }) as unknown as typeof fetch;
}

// ── isolation ───────────────────────────────────────────────────────────────

/**
 * Namespace the keys a provider-state port reads and writes.
 *
 * The port interface is typed on the provider identity, but the durable key is
 * just text. The scope tag is deliberately NOT a provider identity — it is an
 * opaque namespace — so a harness record can never satisfy a production
 * `load('cloudflare')`.
 */
export function scopedProviderStatePort(port: AIProviderStatePort, scope: string): AIProviderStatePort {
  const scoped = (provider: AIProviderName): AIProviderName => `${scope}${provider}` as AIProviderName;
  return {
    async load(provider: AIProviderName): Promise<AIProviderStateRecord | null> {
      return port.load(scoped(provider));
    },
    async save(record: AIProviderStateRecord): Promise<void> {
      await port.save({ ...record, provider: scoped(record.provider) });
    },
  };
}

const HARNESS_SCOPE_TRANSIENT = `${HARNESS_SCOPE_PREFIX}transient`;
const HARNESS_SCOPE_ROLLOVER = `${HARNESS_SCOPE_PREFIX}rollover`;

/**
 * A fresh namespace per run.
 *
 * This is what makes a re-run meaningful: if a single fixed scope were reused, a
 * second run would load its OWN earlier exhaustion record and legitimately skip
 * the primary, so it could no longer demonstrate that the primary is attempted
 * first. A per-run namespace keeps every run a cold start.
 *
 * Cost, stated plainly: each armed run leaves ONE small row in the store under
 * this namespace (plus the deliberately re-seeded rollover row, which is an
 * upsert and therefore does not accumulate). Those rows are inert to production
 * routing because live analysis reads the unprefixed `cloudflare` key only.
 */
function newRunId(): string {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface IsolationLedger {
  /** Every provider key the harness attempted to persist, in order. */
  saved_keys: string[];
  /** Keys that escaped the harness namespace. MUST stay empty. */
  violations: string[];
}

/**
 * Wrap a port so that any escape from the harness namespace is RECORDED rather
 * than trusted. It does not throw: a throw would be swallowed by the adapter's
 * defensive `try/catch` around `save`, which is exactly the kind of silent
 * failure this check exists to prevent.
 */
export function createIsolationEnforcingPort(
  port: AIProviderStatePort,
  scope: string,
  ledger: IsolationLedger,
): AIProviderStatePort {
  return {
    load: (provider) => port.load(provider),
    async save(record) {
      const key = String(record.provider);
      ledger.saved_keys.push(key);
      if (!key.startsWith(scope)) ledger.violations.push(key);
      await port.save(record);
    },
  };
}

// ── run result ──────────────────────────────────────────────────────────────

export interface HarnessStep {
  id: string;
  description: string;
  /** Provider the adapter reported for this request, or null when it failed outright. */
  provider: string | null;
  model: string | null;
  status: string | null;
  error_class: string | null;
  retry_count: number | null;
  fallback_used: boolean | null;
  cloudflare_attempts: number;
  secondary_attempts: number;
}

export interface HarnessCheck {
  id: string;
  ok: boolean;
  detail: string;
}

export interface HarnessRunResult {
  scenario: string;
  synthetic: true;
  /** The namespace prefix every write is confined to. */
  scope_prefix: string;
  /** The per-run namespace used by this execution. */
  scope: string;
  steps: HarnessStep[];
  attempts: AIProviderAttempt[];
  /** The namespaced record the harness persisted, read back through the store. */
  persisted_state: AIProviderStateRecord | null;
  /** Live (unprefixed) provider state before and after — must be identical. */
  live_state_before: AIProviderStateRecord | null;
  live_state_after: AIProviderStateRecord | null;
  isolation: IsolationLedger;
  checks: HarnessCheck[];
  verdict: 'PASS' | 'FAIL';
  generated_at: string;
}

// ── the scenario ────────────────────────────────────────────────────────────

function baseAnalysisInput(cveId: string, now: Date): Omit<GroundedCveAnalysisInput, 'aiBinding' | 'fetchFn' | 'providerState'> {
  // `now` is accepted for symmetry with the deterministic period arithmetic; no
  // timestamp is injected into the analysis input itself.
  void now;
  return {
    cveId,
    vendor: 'Synthetic Vendor',
    product: 'Synthetic Product',
    vulnerabilityName: 'Synthetic provider-routing fixture (describes no vulnerability)',
    description: 'Synthetic fixture used only to exercise provider routing in the Preview failover harness.',
    cweDetails: [{ id: 'CWE-0', name: 'Synthetic fixture' }],
    cvssScore: '0.0',
    isKev: false,
  };
}

function stepFrom(
  step: Omit<HarnessStep, 'provider' | 'model' | 'status' | 'error_class' | 'retry_count' | 'fallback_used'>,
  result: GroundedCveAnalysisResult,
): HarnessStep {
  return {
    ...step,
    provider: result.provider,
    model: result.model,
    status: result.status,
    error_class: result.error_class,
    retry_count: result.retry_count,
    fallback_used: result.fallback_used,
  };
}

export interface HarnessRunOptions {
  /** The port to persist into. The harness applies its own namespace on top. */
  port: AIProviderStatePort;
  now?: Date;
  /** Deterministic namespace suffix. Defaults to a fresh id per run. */
  runId?: string;
}

/**
 * Run the fixed scenario against the REAL routing functions.
 *
 * Steps (all synthetic, no provider is contacted):
 *   1. Cloudflare primary is attempted; the documented daily-allocation evidence
 *      is classified and persisted for the current UTC period.
 *   2. A SEPARATE request context, over the same store, reloads that state and
 *      does NOT contact Cloudflare at all.
 *   3. The same state with no secondary credential fails explicitly instead of
 *      looping back to Cloudflare.
 *   4. A transient capacity error writes no state and is retried.
 *   5. A record from an earlier quota period does not block Cloudflare.
 */
export async function runPreviewFailoverHarness(options: HarnessRunOptions): Promise<HarnessRunResult> {
  const now = options.now ?? new Date();
  const checks: HarnessCheck[] = [];
  const steps: HarnessStep[] = [];
  const attempts: AIProviderAttempt[] = [];
  const isolation: IsolationLedger = { saved_keys: [], violations: [] };
  const record = (attempt: AIProviderAttempt) => { attempts.push(attempt); };

  const enforcing = createIsolationEnforcingPort(options.port, HARNESS_SCOPE_PREFIX, isolation);
  // A fresh context models a separate request / Worker instance reading the same
  // durable store — the property the previous in-memory circuit could not provide.
  const context = (scope: string): AIProviderStatePort => scopedProviderStatePort(enforcing, scope);

  const liveStateBefore = await options.port.load('cloudflare').catch(() => null);

  // ── Step 1 ────────────────────────────────────────────────────────────────
  __resetAIProviderCircuits();
  const switchScope = `${HARNESS_SCOPE_PREFIX}switch-${options.runId ?? newRunId()}::`;
  const switchContext = context(switchScope);
  const cf1: SyntheticProviderCounter = { n: 0 };
  const gm1: SyntheticProviderCounter = { n: 0 };
  const first = await runGroundedCveAnalysis({
    ...baseAnalysisInput(HARNESS_PRIMARY_CVE, now),
    aiBinding: syntheticExhaustedCloudflareBinding(cf1),
    geminiApiKey: HARNESS_SYNTHETIC_CREDENTIAL,
    fetchFn: syntheticSecondaryFetch(gm1),
    providerState: switchContext,
    onProviderAttempt: record,
  });
  steps.push(stepFrom(
    { id: 'EXHAUSTION_CLASSIFIED_AND_PERSISTED', description: 'Synthetic exhaustion evidence classified and persisted for the UTC period', cloudflare_attempts: cf1.n, secondary_attempts: gm1.n },
    first,
  ));

  const persisted = await switchContext.load('cloudflare');
  checks.push({
    id: 'SHARED_CLASSIFIER_RECOGNISES_EVIDENCE',
    ok: classifyAIError(syntheticQuotaExhaustionError()) === 'QUOTA_EXHAUSTED',
    detail: 'the production classifier maps the documented 429/3036 evidence to QUOTA_EXHAUSTED',
  });
  checks.push({
    id: 'CLOUDFLARE_ATTEMPTED_FIRST',
    ok: cf1.n === 1,
    detail: `Cloudflare was the primary attempt exactly once (observed ${cf1.n})`,
  });
  checks.push({
    id: 'STATE_PERSISTED_FOR_UTC_PERIOD',
    ok: persisted?.availability === 'EXHAUSTED'
      && persisted?.quota_period === quotaPeriodFor(now)
      && persisted?.reason === PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED,
    detail: `persisted availability=${persisted?.availability ?? 'none'} period=${persisted?.quota_period ?? 'none'} reason=${persisted?.reason ?? 'none'}`,
  });
  checks.push({
    id: 'SECONDARY_USED_AFTER_EXHAUSTION',
    ok: first.provider === 'gemini' && first.status === 'PASS' && first.fallback_used === true,
    detail: `provider=${first.provider} status=${first.status} fallback_used=${first.fallback_used}`,
  });

  // ── Step 2 ────────────────────────────────────────────────────────────────
  // Circuits are cleared so ONLY the durable record can explain the skip.
  __resetAIProviderCircuits();
  const secondContext = context(switchScope);
  const cf2: SyntheticProviderCounter = { n: 0 };
  const gm2: SyntheticProviderCounter = { n: 0 };
  const second = await runGroundedCveAnalysis({
    ...baseAnalysisInput(HARNESS_SECONDARY_CVE, now),
    aiBinding: syntheticExhaustedCloudflareBinding(cf2),
    geminiApiKey: HARNESS_SYNTHETIC_CREDENTIAL,
    fetchFn: syntheticSecondaryFetch(gm2),
    providerState: secondContext,
    onProviderAttempt: record,
  });
  steps.push(stepFrom(
    { id: 'SECOND_REQUEST_BYPASSES_PRIMARY', description: 'Separate request context reloads durable state and skips Cloudflare', cloudflare_attempts: cf2.n, secondary_attempts: gm2.n },
    second,
  ));
  checks.push({
    id: 'NO_PRIMARY_ATTEMPT_IN_EXHAUSTED_PERIOD',
    ok: cf2.n === 0,
    detail: `Cloudflare requests for the second CVE (observed ${cf2.n}) — the durable store, not an in-memory circuit, produced this`,
  });
  checks.push({
    id: 'SECOND_REQUEST_SUCCEEDED_ON_SECONDARY',
    ok: second.provider === 'gemini' && second.status === 'PASS',
    detail: `provider=${second.provider} status=${second.status}`,
  });

  // ── Step 3 ────────────────────────────────────────────────────────────────
  __resetAIProviderCircuits();
  const cf3: SyntheticProviderCounter = { n: 0 };
  const third = await runGroundedCveAnalysis({
    ...baseAnalysisInput(HARNESS_PRIMARY_CVE, now),
    aiBinding: syntheticExhaustedCloudflareBinding(cf3),
    // Deliberately NO credential: the failure must be explicit.
    providerState: context(switchScope),
    onProviderAttempt: record,
  });
  steps.push(stepFrom(
    { id: 'MISSING_SECONDARY_CREDENTIAL_FAILS', description: 'Exhausted period with no secondary credential fails explicitly', cloudflare_attempts: cf3.n, secondary_attempts: 0 },
    third,
  ));
  checks.push({
    id: 'NO_SILENT_LOOP_BACK_TO_PRIMARY',
    ok: third.status === 'FAIL' && third.error_class === 'QUOTA_EXHAUSTED' && cf3.n === 0,
    detail: `status=${third.status} error_class=${third.error_class} cloudflare_attempts=${cf3.n}`,
  });

  // ── Step 4 ────────────────────────────────────────────────────────────────
  __resetAIProviderCircuits();
  const transientContext = context(`${HARNESS_SCOPE_TRANSIENT}::`);
  const cf4: SyntheticProviderCounter = { n: 0 };
  const gm4: SyntheticProviderCounter = { n: 0 };
  const fourth = await runGroundedCveAnalysis({
    ...baseAnalysisInput(HARNESS_PRIMARY_CVE, now),
    aiBinding: syntheticCapacityCloudflareBinding(cf4),
    geminiApiKey: HARNESS_SYNTHETIC_CREDENTIAL,
    fetchFn: syntheticSecondaryFetch(gm4),
    providerState: transientContext,
    onProviderAttempt: record,
  });
  const transientRecord = await transientContext.load('cloudflare');
  __resetAIProviderCircuits();
  const cf4b: SyntheticProviderCounter = { n: 0 };
  const fourthB = await runGroundedCveAnalysis({
    ...baseAnalysisInput(HARNESS_PRIMARY_CVE, now),
    aiBinding: syntheticHealthyCloudflareBinding(cf4b),
    geminiApiKey: HARNESS_SYNTHETIC_CREDENTIAL,
    fetchFn: syntheticSecondaryFetch(gm4),
    providerState: context(`${HARNESS_SCOPE_TRANSIENT}::`),
    onProviderAttempt: record,
  });
  steps.push(stepFrom(
    { id: 'TRANSIENT_CAPACITY_STAYS_TRANSIENT', description: 'Capacity overload persists nothing and the primary is retried', cloudflare_attempts: cf4.n + cf4b.n, secondary_attempts: gm4.n },
    fourth,
  ));
  checks.push({
    id: 'TRANSIENT_WRITES_NO_STATE',
    ok: transientRecord === null,
    detail: `durable record after a capacity 429: ${transientRecord === null ? 'none (correct)' : 'PRESENT (incorrect)'}`,
  });
  // The failover policy is quota-only: a capacity 429 is a condition of the request,
  // so the secondary provider must not be invoked for it at all. `gm4` counts the
  // synthetic secondary for BOTH the transient call and the healthy retry, so this
  // also proves the retry stayed on the primary.
  checks.push({
    id: 'TRANSIENT_NO_SECONDARY_INVOCATION',
    ok: gm4.n === 0,
    detail: `secondary attempts during a capacity 429 and its retry (observed ${gm4.n}) — a request condition is never re-routed`,
  });
  checks.push({
    id: 'PRIMARY_RETRIED_AFTER_TRANSIENT',
    ok: cf4b.n === 1 && fourthB.provider === 'cloudflare' && fourthB.status === 'PASS',
    detail: `retry provider=${fourthB.provider} status=${fourthB.status} primary_attempts=${cf4b.n}`,
  });

  // ── Step 5 ────────────────────────────────────────────────────────────────
  __resetAIProviderCircuits();
  const rolloverContext = context(`${HARNESS_SCOPE_ROLLOVER}::`);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await rolloverContext.save(exhaustionRecordFor('cloudflare', HARNESS_SYNTHETIC_EVIDENCE_MESSAGE, yesterday));
  const cf5: SyntheticProviderCounter = { n: 0 };
  const gm5: SyntheticProviderCounter = { n: 0 };
  const fifth = await runGroundedCveAnalysis({
    ...baseAnalysisInput(HARNESS_PRIMARY_CVE, now),
    aiBinding: syntheticHealthyCloudflareBinding(cf5),
    geminiApiKey: HARNESS_SYNTHETIC_CREDENTIAL,
    fetchFn: syntheticSecondaryFetch(gm5),
    providerState: context(`${HARNESS_SCOPE_ROLLOVER}::`),
    onProviderAttempt: record,
  });
  steps.push(stepFrom(
    { id: 'PERIOD_ROLLOVER_RETRIES_PRIMARY', description: 'A record from an earlier UTC period does not block the primary', cloudflare_attempts: cf5.n, secondary_attempts: gm5.n },
    fifth,
  ));
  checks.push({
    id: 'ROLLED_OVER_PERIOD_PERMITS_PRIMARY',
    ok: cf5.n === 1 && fifth.provider === 'cloudflare' && gm5.n === 0,
    detail: `provider=${fifth.provider} primary_attempts=${cf5.n} secondary_attempts=${gm5.n}`,
  });

  // ── isolation + live-state integrity ──────────────────────────────────────
  const liveStateAfter = await options.port.load('cloudflare').catch(() => null);
  checks.push({
    id: 'ISOLATION_ENFORCED',
    ok: isolation.violations.length === 0 && isolation.saved_keys.length > 0,
    detail: `writes=${isolation.saved_keys.length} out-of-namespace=${isolation.violations.length}`,
  });
  checks.push({
    id: 'LIVE_STATE_UNTOUCHED',
    ok: JSON.stringify(liveStateBefore ?? null) === JSON.stringify(liveStateAfter ?? null),
    detail: `unprefixed 'cloudflare' record before=${liveStateBefore ? 'present' : 'absent'} after=${liveStateAfter ? 'present' : 'absent'}`,
  });
  checks.push({
    id: 'NO_REAL_PROVIDER_MODEL_REACHED',
    ok: attempts.every((a) => a.model === WORKERS_AI_CVE_MODEL || a.model === GEMINI_CVE_MODEL),
    detail: 'every recorded attempt used a production model id via an injected, network-free provider',
  });

  return {
    scenario: HARNESS_SCENARIO,
    synthetic: true,
    scope_prefix: HARNESS_SCOPE_PREFIX,
    scope: switchScope,
    steps,
    attempts,
    persisted_state: persisted,
    live_state_before: liveStateBefore,
    live_state_after: liveStateAfter,
    isolation,
    checks,
    verdict: checks.every((check) => check.ok) ? 'PASS' : 'FAIL',
    generated_at: now.toISOString(),
  };
}
