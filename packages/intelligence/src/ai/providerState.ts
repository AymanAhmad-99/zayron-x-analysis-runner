/**
 * ZAYRON-X — durable AI provider state machine.
 *
 * PROBLEM THIS SOLVES
 * The shared adapter already knows how to *classify* a provider failure and it
 * already accepts a `shouldSkipProvider` hook, but nothing in production ever
 * passed one, and the only memory it kept was an isolate-local `Map` with a
 * 5-minute cooldown. Worker isolates are short-lived and numerous, so the
 * "Cloudflare is out of neurons today" fact was forgotten continuously: every
 * new CVE re-attempted Cloudflare first.
 *
 * This module owns the *decision* half of the state machine as PURE functions so
 * it is testable without D1, and defines the persistence PORT the caller
 * implements. The adapter consumes the port; it never talks to a database.
 *
 * GROUNDED EVIDENCE (Cloudflare Workers AI, read 2026-10-11)
 *   - Daily free-allocation exhaustion: HTTP 429, internal error code `3036`
 *     (a direct REST report also shows `4006`), message
 *     "You have used up your daily free allocation of 10,000 neurons. …".
 *     The free allocation is 10,000 neurons/day and resets at 00:00 UTC.
 *   - Capacity overload is a DIFFERENT condition: HTTP 429, code `3040`,
 *     "Capacity temporarily exceeded, please try again."
 * A bare 429 therefore does NOT mean the day's allocation is gone, which is why
 * exhaustion requires its own message/code evidence and why only THAT transition
 * is persisted for the remainder of the quota period.
 */

export type AIProviderName = 'cloudflare' | 'gemini';
export type AIProviderAvailability = 'AVAILABLE' | 'EXHAUSTED';

/** The only reason that justifies skipping a provider for the rest of the period. */
export const PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED = 'DAILY_NEURON_ALLOCATION_EXHAUSTED';

/** Cloudflare internal error codes observed for the two 429 conditions. */
export const CF_DAILY_ALLOCATION_ERROR_CODES = [3036, 4006] as const;
export const CF_CAPACITY_ERROR_CODES = [3040] as const;

export interface AIProviderStateRecord {
  provider: AIProviderName;
  availability: AIProviderAvailability;
  /** UTC day the observation belongs to. The free allocation resets at 00:00 UTC. */
  quota_period: string;
  /** Machine-readable reason; empty when `availability` is AVAILABLE. */
  reason: string;
  /** Bounded excerpt of the provider's OWN error. Never a synthesized explanation. */
  evidence: string;
  observed_at: string;
  /** Instant at which this record stops applying (next 00:00 UTC). */
  reset_at: string;
}

/**
 * Persistence port. Implementations must be durable across Worker instances
 * (D1 in this repository); an in-memory Map is explicitly NOT sufficient and
 * must not be introduced as this port's implementation.
 */
export interface AIProviderStatePort {
  load(provider: AIProviderName): Promise<AIProviderStateRecord | null>;
  save(record: AIProviderStateRecord): Promise<void>;
}

export interface AIProviderStateDecision {
  /** true ⇒ do NOT contact this provider at all for this request. */
  skip: boolean;
  reason: string | null;
  /** true ⇒ a persisted record existed but belongs to an earlier quota period. */
  periodRolledOver: boolean;
}

const EVIDENCE_LIMIT = 400;

function bounded(value: unknown): string {
  const text = typeof value === 'string' ? value : String(value ?? '');
  return text.replace(/\s+/g, ' ').trim().slice(0, EVIDENCE_LIMIT);
}

/** UTC day key for the Cloudflare free-allocation period (`YYYY-MM-DD`). */
export function quotaPeriodFor(instant: Date = new Date()): string {
  return instant.toISOString().slice(0, 10);
}

/** The instant the current allocation period ends: the next 00:00:00Z. */
export function nextQuotaReset(instant: Date = new Date()): string {
  const next = new Date(Date.UTC(
    instant.getUTCFullYear(),
    instant.getUTCMonth(),
    instant.getUTCDate() + 1,
    0, 0, 0, 0,
  ));
  return next.toISOString();
}

/** Extract a numeric provider error code from a thrown error/response body. */
export function providerErrorCode(error: unknown): number | null {
  const candidates: unknown[] = [
    (error as any)?.code,
    (error as any)?.status_code,
    (error as any)?.error?.code,
    (error as any)?.errors?.[0]?.code,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === 'string' && /^\d{3,5}$/.test(candidate.trim())) return Number(candidate.trim());
  }
  const message = error instanceof Error ? error.message : String(error ?? '');
  // Cloudflare surfaces its numeric code inline in the message for binding calls.
  const inline = message.match(/\b(?:code|error code)\D{0,4}(\d{3,5})\b/i);
  return inline ? Number(inline[1]) : null;
}

/**
 * The specific evidence that Cloudflare's DAILY free allocation is exhausted.
 *
 * Returns the bounded evidence string when the error unambiguously shows the
 * allocation is gone, otherwise `null`. Capacity/overload is rejected first so a
 * transient 3040 can never be mistaken for a spent daily quota.
 */
export function dailyAllocationExhaustionEvidence(error: unknown): string | null {
  const code = providerErrorCode(error);
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  // Capacity/overload is a transient condition, never a daily-quota fact.
  if (code !== null && (CF_CAPACITY_ERROR_CODES as readonly number[]).includes(code)) return null;
  if (/capacity temporarily exceeded|temporarily exceeded|capacity_exceeded/.test(normalized)) return null;

  const explicitCode = code !== null && (CF_DAILY_ALLOCATION_ERROR_CODES as readonly number[]).includes(code);
  const explicitMessage =
    /daily free allocation/.test(normalized) ||
    /used up your daily/.test(normalized) ||
    /free allocation of [\d,]+ neurons/.test(normalized) ||
    /out of neurons/.test(normalized) ||
    /neurons?_?exhaust|exhaust(ed|ing)?\s+(your\s+)?(daily\s+)?neurons/.test(normalized) ||
    /daily neuron (allocation|limit)/.test(normalized);

  if (!explicitCode && !explicitMessage) return null;
  return bounded(message || `cloudflare error code ${code}`);
}

/** Only a spent daily allocation is durable; everything else stays transient. */
export function isPersistentProviderFailure(failureClass: string | null): boolean {
  return failureClass === 'QUOTA_EXHAUSTED';
}

/** Build the durable record for a confirmed daily-allocation exhaustion. */
export function exhaustionRecordFor(
  provider: AIProviderName,
  evidence: string,
  now: Date = new Date(),
): AIProviderStateRecord {
  return {
    provider,
    availability: 'EXHAUSTED',
    quota_period: quotaPeriodFor(now),
    reason: PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED,
    evidence: bounded(evidence),
    observed_at: now.toISOString(),
    reset_at: nextQuotaReset(now),
  };
}

/** The record that clears a provider back to AVAILABLE for the current period. */
export function availableRecordFor(provider: AIProviderName, now: Date = new Date()): AIProviderStateRecord {
  return {
    provider,
    availability: 'AVAILABLE',
    quota_period: quotaPeriodFor(now),
    reason: '',
    evidence: '',
    observed_at: now.toISOString(),
    reset_at: nextQuotaReset(now),
  };
}

/**
 * Decide whether a provider may be attempted, given the persisted record.
 *
 * A record from an EARLIER quota period never blocks: the allocation reset, so
 * the provider is retried once and the stale record is reported as rolled over.
 */
export function providerAvailabilityDecision(
  record: AIProviderStateRecord | null | undefined,
  now: Date = new Date(),
): AIProviderStateDecision {
  if (!record || record.availability !== 'EXHAUSTED') {
    return { skip: false, reason: null, periodRolledOver: false };
  }
  if (record.quota_period !== quotaPeriodFor(now)) {
    return { skip: false, reason: null, periodRolledOver: true };
  }
  return { skip: true, reason: record.reason || PROVIDER_REASON_DAILY_ALLOCATION_EXHAUSTED, periodRolledOver: false };
}

/**
 * Pure reducer for one observed provider outcome.
 *
 * Returns the record to persist, or `null` when nothing durable changed.
 * ONLY a confirmed daily-allocation exhaustion writes state. Transient capacity
 * errors, rate limits, timeouts, authentication failures, model failures and
 * malformed requests deliberately never establish a durable switch, and a
 * successful call never *clears* one: per the switch contract the state is reset
 * only when the quota period rolls over (or by a separately authorized admin
 * action), not because one request happened to succeed.
 */
export function reduceProviderState(
  previous: AIProviderStateRecord | null | undefined,
  outcome: {
    provider: AIProviderName;
    success: boolean;
    failureClass: string | null;
    error?: unknown;
  },
  now: Date = new Date(),
): AIProviderStateRecord | null {
  if (outcome.success) return null;

  const evidence = dailyAllocationExhaustionEvidence(outcome.error);
  const confirmed =
    evidence !== null && isPersistentProviderFailure(outcome.failureClass);
  if (!confirmed) return null;

  // The same period is already recorded as exhausted: nothing new to persist, so
  // repeated CVEs do not rewrite the row (and cannot thrash the reset instant).
  if (
    previous &&
    previous.availability === 'EXHAUSTED' &&
    previous.quota_period === quotaPeriodFor(now)
  ) {
    return null;
  }
  return exhaustionRecordFor(outcome.provider, evidence, now);
}

/** Summarise a decision for the response/log surface without leaking secrets. */
export function describeProviderDecision(decision: AIProviderStateDecision): string {
  if (decision.skip) return `PROVIDER_SKIPPED:${decision.reason}`;
  if (decision.periodRolledOver) return 'PROVIDER_PERIOD_ROLLED_OVER';
  return 'PROVIDER_AVAILABLE';
}
