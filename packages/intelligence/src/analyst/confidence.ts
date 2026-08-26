import { ConfidenceState, ContradictionRecord } from './contract';

export interface ConfidenceCalculationInput {
  sourceTiers: number[];
  sourceCount: number;
  independentSourceCount: number;
  evidenceWeights: number[];
  contradictions: ContradictionRecord[];
  hasAuthoritativeStandard: boolean; // Tier 0 match (CISA, NIST, MITRE)
  hasCryptographicEvidence: boolean; // Hash, PCAP, or verified signature
  hasDirectCveOrWildExploit: boolean;
}

export interface CalibratedConfidenceResult {
  score: number; // 0.00 to 1.00
  state: ConfidenceState;
  breakdown: {
    baseSourceTrust: number;
    corroborationBonus: number;
    evidenceStrengthBonus: number;
    contradictionPenalty: number;
    authoritativeAnchorBonus: number;
  };
  rationale: string;
}

/**
 * Calculates mathematical, system-controlled analytical confidence.
 * Strict principle: Confidence reflects epistemic certainty, completely decoupled from Threat Severity.
 */
export function calculateAnalyticalConfidence(input: ConfidenceCalculationInput): CalibratedConfidenceResult {
  // If 0 sources and 0 evidence exist -> INSUFFICIENT EVIDENCE
  if (input.sourceCount === 0 && input.evidenceWeights.length === 0) {
    return {
      score: 0.10,
      state: 'INSUFFICIENT_EVIDENCE',
      breakdown: {
        baseSourceTrust: 0.10,
        corroborationBonus: 0.0,
        evidenceStrengthBonus: 0.0,
        contradictionPenalty: 0.0,
        authoritativeAnchorBonus: 0.0,
      },
      rationale: 'Zero supporting evidence or verified telemetry sources available.',
    };
  }

  // 1. Base Source Trust from Highest Quality Available Source
  let baseSourceTrust = 0.50;
  if (input.sourceTiers.length > 0) {
    const minTier = Math.min(...input.sourceTiers);
    switch (minTier) {
      case 0: baseSourceTrust = 0.90; break; // Primary Standard / Advisory
      case 1: baseSourceTrust = 0.80; break; // Trusted Security Research
      case 2: baseSourceTrust = 0.65; break; // ZAYRON-X Telemetry
      case 3: baseSourceTrust = 0.45; break; // Secondary Journalism
      case 4: baseSourceTrust = 0.25; break; // Unverified Claim
      default: baseSourceTrust = 0.50; break;
    }
  }

  // 2. Corroboration Bonus (+0.05 per independent source, max +0.20)
  const corroborationBonus = Math.min(0.20, Math.max(0, (input.independentSourceCount - 1) * 0.07));

  // 3. Evidence Strength Bonus
  let evidenceStrengthBonus = 0.0;
  if (input.hasCryptographicEvidence) evidenceStrengthBonus += 0.08;
  if (input.hasDirectCveOrWildExploit) evidenceStrengthBonus += 0.07;
  if (input.evidenceWeights.length > 0) {
    const avgWeight = input.evidenceWeights.reduce((a, b) => a + b, 0) / input.evidenceWeights.length;
    evidenceStrengthBonus += avgWeight * 0.05;
  }
  evidenceStrengthBonus = Math.min(0.15, evidenceStrengthBonus);

  // 4. Authoritative Anchor Bonus (+0.10 if linked to CISA KEV, MITRE, or NIST standard)
  const authoritativeAnchorBonus = input.hasAuthoritativeStandard ? 0.10 : 0.0;

  // 5. Contradiction Penalty (-0.25 to -0.40 if unresolved conflicting claims exist)
  let contradictionPenalty = 0.0;
  if (input.contradictions.length > 0) {
    contradictionPenalty = Math.min(0.40, input.contradictions.length * 0.25);
  }

  // Final Calibrated Calculation
  let rawScore = baseSourceTrust + corroborationBonus + evidenceStrengthBonus + authoritativeAnchorBonus - contradictionPenalty;
  const finalScore = Math.round(Math.max(0.05, Math.min(0.99, rawScore)) * 100) / 100;

  // Determine Categorical Confidence State
  let state: ConfidenceState = 'MODERATE_CONFIDENCE';
  if (finalScore >= 0.90) {
    state = 'CONFIRMED';
  } else if (finalScore >= 0.75) {
    state = 'HIGH_CONFIDENCE';
  } else if (finalScore >= 0.50) {
    state = 'MODERATE_CONFIDENCE';
  } else if (finalScore >= 0.30) {
    state = 'LOW_CONFIDENCE';
  } else {
    state = 'UNVERIFIED';
  }

  let rationale = `Base trust ${Math.round(baseSourceTrust * 100)}% derived from Tier ${input.sourceTiers.length > 0 ? Math.min(...input.sourceTiers) : 'N/A'} sources.`;
  if (corroborationBonus > 0) rationale += ` Corroborated across ${input.independentSourceCount} independent observation points (+${Math.round(corroborationBonus * 100)}%).`;
  if (contradictionPenalty > 0) rationale += ` Penalized for ${input.contradictions.length} unresolved evidentiary contradictions (-${Math.round(contradictionPenalty * 100)}%).`;

  return {
    score: finalScore,
    state,
    breakdown: {
      baseSourceTrust,
      corroborationBonus,
      evidenceStrengthBonus,
      contradictionPenalty,
      authoritativeAnchorBonus,
    },
    rationale,
  };
}
