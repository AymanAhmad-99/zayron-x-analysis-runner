/**
 * PHASE 8B — supply-chain advisory freshness policy.
 *
 * `/intelligence/malware` is judged on whether its newest row looks live. A
 * first-time visitor must never see a stale month above the fold, so the newest
 * 30 days render first and the historical tail sits behind an explicit toggle.
 */

export const ADVISORY_FRESH_WINDOW_DAYS = 30;

/** Published within the freshness window (inclusive), relative to `now`. */
export function isFreshAdvisory(publishedAt: unknown, now: Date = new Date()): boolean {
  const raw = typeof publishedAt === "string" ? publishedAt.trim() : "";
  if (!raw) return false;
  const parsed = new Date(raw.length <= 10 ? `${raw}T00:00:00Z` : raw);
  if (Number.isNaN(parsed.getTime())) return false;
  const age = now.getTime() - parsed.getTime();
  return age >= 0 && age <= ADVISORY_FRESH_WINDOW_DAYS * 86_400_000;
}
