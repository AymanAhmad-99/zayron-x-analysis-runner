/**
 * PHASE 8B — honest OG-card copy and colour policy.
 *
 * The card is a claim: if it says CRITICAL ADVISORY, the CVE must be critical.
 * These helpers are pure so the severity/priority contract is unit-testable
 * without rendering a PNG, and the route cannot drift from it.
 */

export interface OgSeverityBand {
  key: 'critical' | 'high' | 'medium' | 'low';
  label: string;
  accentHex: string;
}

const CRITICAL: OgSeverityBand = { key: 'critical', label: 'CRITICAL ADVISORY', accentHex: '#FF4D00' };
const HIGH: OgSeverityBand = { key: 'high', label: 'HIGH SEVERITY ADVISORY', accentHex: '#F97316' };
const MEDIUM: OgSeverityBand = { key: 'medium', label: 'MEDIUM SEVERITY ADVISORY', accentHex: '#EAB308' };
const LOW: OgSeverityBand = { key: 'low', label: 'LOW / MONITOR ADVISORY', accentHex: '#94A3B8' };

function numeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** `#RRGGBB` → RGB tuple; unknown input falls back to the muted slate. */
export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim());
  if (!match) return [148, 163, 184];
  const value = match[1];
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/**
 * Severity band. CISA KEV membership alone is enough for CRITICAL: an actively
 * exploited advisory is never presented as anything softer, whatever its CVSS.
 * CVSS 4.7 is MEDIUM and can never render as CRITICAL.
 */
export function ogSeverityBand(input: { cvss?: unknown; kev?: boolean }): OgSeverityBand {
  const cvss = numeric(input?.cvss);
  if (input?.kev === true || (cvss !== null && cvss >= 9)) return CRITICAL;
  if (cvss !== null && cvss >= 7) return HIGH;
  if (cvss !== null && cvss >= 4) return MEDIUM;
  return LOW;
}

/**
 * Deterministic priority when no analyst brief exists. KEV beats everything;
 * a high EPSS with a verified PoC is next; a public exploit or high EPSS is
 * P2; everything else is monitored. Never `UNBRIEFED`.
 */
export function computeOgPriority(input: {
  kev?: boolean;
  cvss?: unknown;
  epss?: unknown;
  pocCount?: number;
}): string {
  const cvss = numeric(input?.cvss);
  const epss = numeric(input?.epss);
  const pocs = Math.max(0, Math.floor(Number(input?.pocCount) || 0));
  if (input?.kev === true) return 'P0 · KEV';
  if ((cvss !== null && cvss >= 9) || (pocs > 0 && epss !== null && epss >= 0.1)) return 'P1 · HIGH';
  if ((cvss !== null && cvss >= 7) || pocs > 0 || (epss !== null && epss >= 0.05)) return 'P2 · MEDIUM';
  return 'P3 · MONITOR';
}

/** `LISTED` / `LISTED_IN_KEV` / true → `LISTED · KEV`; anything else → `NOT LISTED`. */
export function formatKevCell(value: unknown): string {
  const raw = String(value ?? '').trim().toUpperCase();
  if (raw === 'LISTED' || raw === 'LISTED_IN_KEV' || raw === 'TRUE' || raw === 'YES') return 'LISTED · KEV';
  return 'NOT LISTED';
}

/** `PUBLIC POC · 3 REPOS` or a calm `NONE TRACKED`. */
export function formatPocCell(pocCount: unknown): string {
  const count = Math.max(0, Math.floor(Number(pocCount) || 0));
  return count > 0 ? `PUBLIC POC · ${count} REPO${count === 1 ? '' : 'S'}` : 'NONE TRACKED';
}

/** Institutional display form of a stored enum: `AUTHORITATIVE_VERIFIED` → `VERIFIED`. */
export function formatStoredState(value: unknown): string {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return 'N/A';
  if (raw === 'AUTHORITATIVE_VERIFIED') return 'VERIFIED';
  if (raw === 'NOT_LISTED' || raw === 'NOT_LISTED_IN_KEV') return 'NOT LISTED';
  return raw.replace(/_/g, ' ');
}
