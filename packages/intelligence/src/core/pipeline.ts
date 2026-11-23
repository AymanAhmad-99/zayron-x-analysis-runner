import type {
  CanonicalRecord,
  EvidenceBundle,
  CoreClaim,
  ValidatedIntelligenceObject,
  CoreRelationship,
} from './types';
import { validateIntelligenceClaims } from './membership';
import { validateSemanticConsistency } from './consistency';
import { analysisProfileRegistry } from './profiles';

export interface PipelineExecutionResult {
  success: boolean;
  intelligenceObject?: ValidatedIntelligenceObject;
  errors: string[];
  warnings: string[];
}

/**
 * Universal Intelligence Pipeline Core Execution
 * 
 * Flow:
 * Canonical Truth + Evidence Bundle + Claims
 *   -> Analysis Profile Check
 *   -> Canonical Fact Integrity Check
 *   -> Evidence Membership Check
 *   -> Semantic & Temporal Consistency Check
 *   -> Assembly of Validated Intelligence Object
 */
export function executeIntelligenceCorePipeline(input: {
  canonical: CanonicalRecord;
  bundle: EvidenceBundle;
  claims: CoreClaim[];
  relationships?: CoreRelationship[];
  executiveSummary?: string;
  confidenceScore?: number;
}): PipelineExecutionResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Fetch Profile
  const profile = analysisProfileRegistry.get(input.canonical.domain);

  // 2. Validate Claims against Evidence and Canonical Truth
  const claimsResult = validateIntelligenceClaims(input.claims, {
    canonical: input.canonical,
    bundle: input.bundle,
  });

  if (!claimsResult.valid) {
    errors.push(...claimsResult.errors);
  }
  warnings.push(...claimsResult.warnings);

  // 3. Semantic & Temporal Consistency Check across all proposed claims
  const consistencyResult = validateSemanticConsistency(
    input.claims,
    input.canonical,
    input.bundle
  );

  if (!consistencyResult.valid) {
    errors.push(...consistencyResult.conflicts);
  }

  // 4. Critical Facts Presence Check
  for (const critical of profile.criticalFacts) {
    const hasCanonical = Boolean(input.canonical.canonicalFacts[critical]);
    const hasClaim = claimsResult.supportedClaims.some(c => c.predicate.toLowerCase().includes(critical.toLowerCase()));
    if (!hasCanonical && !hasClaim) {
      errors.push(`Missing critical intelligence field for ${input.canonical.domain}: "${critical}".`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
    };
  }

  // 5. Assemble Validated Intelligence Object
  const intelligenceObject: ValidatedIntelligenceObject = {
    objectId: input.canonical.objectId,
    domain: input.canonical.domain,
    canonicalRecord: input.canonical,
    evidenceBundle: input.bundle,
    validatedClaims: claimsResult.supportedClaims,
    relationships: input.relationships || [],
    executiveSummary: input.executiveSummary || 'Validated Intelligence Assessment.',
    confidenceScore: input.confidenceScore ?? 0.88,
    temporalScope: {
      assessmentTime: new Date().toISOString(),
    },
    unknowns: claimsResult.unsupportedClaims.map(u => `${u.claim.predicate}: UNKNOWN`),
    limitations: [
      'Analysis strictly bound to verified evidence references in evidence bundle.',
      'Unsubstantiated external attributions or claims filtered prior to publication.',
    ],
  };

  return {
    success: true,
    intelligenceObject,
    errors: [],
    warnings,
  };
}
