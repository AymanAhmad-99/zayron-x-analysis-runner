export const AI_CLASSIFICATIONS = [
  'OBSERVED_FACT',
  'REPORTED_CLAIM',
  'INFERENCE',
  'ANALYST_ASSESSMENT',
  'UNKNOWN',
] as const;

export type CanonicalAIResponse = {
  summary: string;
  assessment: string;
  classification: typeof AI_CLASSIFICATIONS[number];
  knowledge_used: string[];
  evidence_used: string[];
  limitations: string[];
};

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  const single = asString(value);
  return single ? [single] : [];
}

export function parseWorkersAIResponse(raw: unknown): CanonicalAIResponse | null {
  const candidate = raw && typeof raw === 'object' ? raw as Record<string, unknown> : undefined;
  const choice = Array.isArray(candidate?.choices) ? candidate.choices[0] as Record<string, unknown> | undefined : undefined;
  const message = choice?.message && typeof choice.message === 'object' ? choice.message as Record<string, unknown> : undefined;
  const response = candidate?.response ?? candidate?.output_text ?? message?.content ?? raw;
  let parsed: Record<string, unknown>;
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    parsed = response as Record<string, unknown>;
  } else {
    if (typeof response !== 'string') return null;
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  const summary = asString(parsed.summary) || asString(parsed.executive_assessment);
  const assessment = asString(parsed.assessment) || asString(parsed.what_happened);
  const classification = AI_CLASSIFICATIONS.includes(parsed.classification as typeof AI_CLASSIFICATIONS[number])
    ? parsed.classification as typeof AI_CLASSIFICATIONS[number]
    : 'UNKNOWN';
  if (!summary || !assessment) return null;
  const result: CanonicalAIResponse = {
    summary,
    assessment,
    classification,
    knowledge_used: asStringArray(parsed.knowledge_used),
    evidence_used: asStringArray(parsed.evidence_used),
    limitations: asStringArray(parsed.limitations),
  };
  if (!Array.isArray(parsed.knowledge_used) || !Array.isArray(parsed.evidence_used) || !Array.isArray(parsed.limitations)) return null;
  return result;
}

export function validateGroundedAIResponse(
  result: CanonicalAIResponse,
  validKnowledgeIds: Set<string>,
  validEvidenceIds: Set<string>,
): boolean {
  if (!result || typeof result !== 'object' || typeof result.summary !== 'string' || typeof result.assessment !== 'string'
    || !Array.isArray(result.knowledge_used) || !Array.isArray(result.evidence_used) || !Array.isArray(result.limitations)) return false;
  return result.knowledge_used.every((id) => validKnowledgeIds.has(id))
    && result.evidence_used.every((id) => validEvidenceIds.has(id));
}
