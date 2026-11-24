/**
 * AI analyst-assessment output contract (Gate 3A.3).
 *
 * The search/analysis route previously extracted the first `{…}` substring with a
 * regex and JSON.parse'd it. That accepted truncated, prose-wrapped or
 * shape-invalid objects and persisted them as a successful `ai_runs` row with a
 * null `error_code` — the silent FALLBACK the audit found (11 of 22 rows).
 *
 * This module is the single, versioned contract:
 *   - strict JSON extraction (fenced output tolerated, prose tolerated only when
 *     it wraps exactly one complete object)
 *   - required-key/type validation with a machine-readable failure code
 *   - no repair logic here: the caller performs exactly ONE repair attempt and
 *     records the resulting code.
 *
 * Kept free of Worker/Cloudflare imports so the contract is unit-testable.
 */

export const AI_ANALYST_PROMPT_VERSION = 'ai_analyst_assessment.v2';

export const AI_THREAT_LEVELS: ReadonlySet<string> = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export const AI_CONFIDENCE_STATES: ReadonlySet<string> = new Set(['CONFIRMED', 'CORROBORATED', 'ASSESSED', 'CLAIMED']);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Validate the exact response contract. Returns a machine-readable code or null. */
export function validateAiAssessmentShape(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'SCHEMA_INVALID:not_object';
  const v = value as Record<string, unknown>;
  if (typeof v.assessment !== 'string' || v.assessment.trim().length < 20) return 'SCHEMA_INVALID:assessment';
  if (typeof v.threat_level !== 'string' || !AI_THREAT_LEVELS.has(v.threat_level.toUpperCase())) return 'SCHEMA_INVALID:threat_level';
  if (typeof v.confidence_score !== 'number' || !Number.isFinite(v.confidence_score) || v.confidence_score < 0 || v.confidence_score > 1) return 'SCHEMA_INVALID:confidence_score';
  if (typeof v.confidence_state !== 'string' || !AI_CONFIDENCE_STATES.has(v.confidence_state.toUpperCase())) return 'SCHEMA_INVALID:confidence_state';
  if (!isStringArray(v.key_findings)) return 'SCHEMA_INVALID:key_findings';
  if (!isStringArray(v.recommended_mitigations)) return 'SCHEMA_INVALID:recommended_mitigations';
  if (!Array.isArray(v.source_citations)) return 'SCHEMA_INVALID:source_citations';
  for (const citation of v.source_citations as unknown[]) {
    if (!citation || typeof citation !== 'object') return 'SCHEMA_INVALID:source_citations';
    const c = citation as Record<string, unknown>;
    if (typeof c.claim !== 'string' || typeof c.evidence_id !== 'string') return 'SCHEMA_INVALID:source_citations';
  }
  return null;
}

/** Strict parse + schema validation of one model completion. */
export function parseAiAssessmentOutput(raw: unknown): { value: Record<string, unknown> | null; error: string | null } {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return { value: null, error: 'EMPTY_MODEL_OUTPUT' };
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const candidate = unfenced.startsWith('{') ? unfenced : (unfenced.match(/\{[\s\S]*\}/)?.[0] ?? '');
  if (!candidate) return { value: null, error: 'JSON_OBJECT_NOT_FOUND' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return { value: null, error: 'JSON_PARSE_ERROR' };
  }
  const shapeError = validateAiAssessmentShape(parsed);
  if (shapeError) return { value: null, error: shapeError };
  return { value: parsed as Record<string, unknown>, error: null };
}
