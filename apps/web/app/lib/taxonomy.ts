/**
 * Canonical intelligence taxonomy tokens (web client mirror).
 *
 * DECISION (see PREVIEW_FIX_REPORT.md): the canonical `intelligence_type` token
 * for vulnerability intelligence records is the PLURAL `"vulnerabilities"`, and
 * the canonical uppercase category is `"VULNERABILITIES"`. This matches the
 * established report contract used by the canonical report fixtures
 * (tests/truthfulness_remediation.test.ts), the CISA-KEV producer in
 * workers/api/src/index.ts, the engineering docs, and the dominant existing data.
 *
 * The singular `"vulnerability"` is a legacy drift token produced by lowercasing
 * the uppercase signal-classifier category `"VULNERABILITY"`. It is normalised to
 * the canonical token at read time so legacy rows stay visible.
 *
 * This file mirrors `packages/intelligence/src/pipeline/canonical.ts`. The parity
 * test `tests/taxonomy_contract.test.ts` asserts the two stay identical so the
 * singular/plural drift becomes structurally impossible.
 */
export const VULNERABILITY_INTELLIGENCE_TYPE = "vulnerabilities";
export const VULNERABILITY_SOURCE_CATEGORY = "VULNERABILITIES";

/** Every spelling that has ever meant "vulnerability" in stored data. */
export const VULNERABILITY_TYPED_ALIASES = ["vulnerability", "vulnerabilities"] as const;

/** True when a category/type token refers to the vulnerability domain. */
export function isVulnerabilityType(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return VULNERABILITY_TYPED_ALIASES.includes(value.trim().toLowerCase() as (typeof VULNERABILITY_TYPED_ALIASES)[number]);
}

/** Map any known vulnerability spelling (any case) to the canonical token. */
export function canonicalIntelligenceType(category: unknown): string {
  const normalized = typeof category === "string" ? category.trim().toLowerCase() : "";
  return isVulnerabilityType(normalized) ? VULNERABILITY_INTELLIGENCE_TYPE : normalized;
}
