/**
 * PHASE 8B — shared display formatter for stored enums.
 *
 * Values such as `AUTHORITATIVE_VERIFIED`, `NOT_LISTED` and `NOT_ESTABLISHED`
 * are storage vocabulary, not English. Every UI surface renders them through
 * this one helper so no raw underscore ever reaches a reader.
 */

const ACRONYMS = new Set([
  'API', 'CVE', 'CVSS', 'CISA', 'EPSS', 'KEV', 'NVD', 'POC', 'SSVC', 'ATT', 'CK', 'OSV', 'CWE',
]);

export function humanizeEnum(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return raw
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((token) => {
      const upper = token.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Federal remediation deadline indicator for a CISA BOD 22-01 due date.
 * Returns null when the date is absent or unparseable; never guesses.
 */
export function kevComplianceStatus(
  dueDate: unknown,
  now: Date = new Date(),
): { label: string; overdue: boolean; days: number } | null {
  const raw = typeof dueDate === 'string' ? dueDate.trim() : '';
  if (!raw) return null;
  const parsed = new Date(raw.length <= 10 ? `${raw}T00:00:00Z` : raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const ms = parsed.getTime() - now.getTime();
  const days = Math.ceil(ms / 86_400_000);
  if (days < 0) return { label: `OVERDUE BY ${Math.abs(days)} DAY${Math.abs(days) === 1 ? '' : 'S'}`, overdue: true, days };
  if (days === 0) return { label: 'DUE TODAY', overdue: false, days };
  return { label: `${days} DAY${days === 1 ? '' : 'S'} REMAINING`, overdue: false, days };
}
