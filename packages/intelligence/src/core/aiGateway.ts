import type {
  IntelligenceDomain,
  CanonicalRecord,
  EvidenceBundle,
  CoreClaim,
  AnalysisProfile,
} from './types';
import { analysisProfileRegistry } from './profiles';

export interface PromptPackContext {
  domain: IntelligenceDomain;
  profile: AnalysisProfile;
  canonicalId: string;
  canonicalFacts: Record<string, unknown>;
  evidenceItems: Array<{ evidenceId: string; source: string; statement: string; url: string }>;
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Universal AI Context Builder
 * 
 * Packages ONLY the minimal sufficient context:
 * 1. Analysis Profile (Schema & Output Contract)
 * 2. Canonical Truth (Immutable anchor)
 * 3. Evidence Items (Available for citation)
 * 
 * Never dumps raw unparsed 40+ source feeds.
 */
export function buildAIAnalysisPrompt(
  canonical: CanonicalRecord,
  bundle: EvidenceBundle
): PromptPackContext {
  const profile = analysisProfileRegistry.get(canonical.domain);

  const canonicalFactsSummary: Record<string, unknown> = {};
  for (const [key, fact] of Object.entries(canonical.canonicalFacts)) {
    canonicalFactsSummary[key] = fact.value;
  }

  const evidenceItems = bundle.items.map(e => ({
    evidenceId: e.evidenceId,
    source: e.sourceId,
    statement: e.statement,
    url: e.url,
  }));

  const systemPrompt = `You are the ZAYRON-X Cyber Threat Intelligence Analyst for domain: ${canonical.domain.toUpperCase()}.
Your objective is to produce an evidence-grounded threat assessment strictly adhering to the supplied schema and canonical facts.

CORE RULES:
1. Canonical truth is absolute. Never contradict or alter canonical facts.
2. Analyze ONLY the supplied evidence items. Do not use training memory or unrelated domain intelligence.
3. Every claim must reference at least one supplied evidence ID in evidence_refs.
4. If a fact is not established by the supplied evidence, state UNKNOWN or NOT_ESTABLISHED.
5. Return structured JSON only.`;

  const userPrompt = JSON.stringify({
    domain: canonical.domain,
    canonical_identity: canonical.primaryIdentifier,
    canonical_facts: canonicalFactsSummary,
    evidence_bundle: evidenceItems,
    required_profile_fields: profile.fields.map(f => ({ name: f.name, type: f.factType, required: f.required })),
  });

  return {
    domain: canonical.domain,
    profile,
    canonicalId: canonical.primaryIdentifier,
    canonicalFacts: canonicalFactsSummary,
    evidenceItems,
    systemPrompt,
    userPrompt,
  };
}
