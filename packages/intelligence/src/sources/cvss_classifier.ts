/**
 * ZAYRON-X — Deterministic Qualitative CVSS Severity Classifier
 *
 * Implements FIRST CVSS v3.1 / v4.0 standard qualitative severity rating scale:
 * - 0.0:        NONE
 * - 0.1 - 3.9:  LOW
 * - 4.0 - 6.9:  MEDIUM
 * - 7.0 - 8.9:  HIGH
 * - 9.0 - 10.0: CRITICAL
 *
 * Uses the open-source 'cvss' library for standardized rating resolution
 * with deterministic fallback to FIRST specification boundaries.
 */

import cvss from 'cvss';

export type QualitativeCvssSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' | 'UNKNOWN';

export function classifyCvssSeverity(scoreOrVector: string | number | null | undefined): QualitativeCvssSeverity {
  if (scoreOrVector === null || scoreOrVector === undefined) return 'UNKNOWN';

  // 1. If numeric score or string representation of a number provided
  const numScore = typeof scoreOrVector === 'number' ? scoreOrVector : parseFloat(String(scoreOrVector).trim());
  if (!isNaN(numScore) && isFinite(numScore)) {
    try {
      const rating = cvss.getRating(numScore);
      if (rating && typeof rating === 'string') {
        const upper = rating.toUpperCase();
        if (upper === 'CRITICAL' || upper === 'HIGH' || upper === 'MEDIUM' || upper === 'LOW' || upper === 'NONE') {
          return upper as QualitativeCvssSeverity;
        }
      }
    } catch {
      // Fall through to deterministic boundary check
    }

    // Deterministic FIRST CVSS v3.1 / v4.0 standard specification boundaries
    if (numScore >= 9.0) return 'CRITICAL';
    if (numScore >= 7.0) return 'HIGH';
    if (numScore >= 4.0) return 'MEDIUM';
    if (numScore > 0.0) return 'LOW';
    return 'NONE';
  }

  // 2. If vector string provided (e.g. CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
  const str = String(scoreOrVector).trim();
  if (str.startsWith('CVSS:')) {
    try {
      // Normalize version prefix for cvss library
      const normalizedVector = str.replace(/^CVSS:3\.1\//i, 'CVSS:3.0/');
      const baseScore = cvss.getBaseScore(normalizedVector);
      if (typeof baseScore === 'number' && baseScore >= 0) {
        return classifyCvssSeverity(baseScore);
      }
    } catch {
      // Vector parse error — fall through to UNKNOWN
    }
  }

  // 3. If standard severity label string provided (e.g. "CRITICAL", "HIGH")
  const upperStr = str.toUpperCase();
  if (upperStr === 'CRITICAL' || upperStr === 'HIGH' || upperStr === 'MEDIUM' || upperStr === 'LOW' || upperStr === 'NONE') {
    return upperStr as QualitativeCvssSeverity;
  }

  return 'UNKNOWN';
}
