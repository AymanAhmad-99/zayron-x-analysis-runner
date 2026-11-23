import type { VulnerabilityEditorialDto } from './editorialDto';

export interface ConsistencyCheckResult {
  valid: boolean;
  conflicts: string[];
}

/**
 * Cross-Field Intelligence Consistency Validator
 * 
 * Enforces ontological harmony across all sections of the public editorial DTO:
 * - Executive Judgment vs Vulnerability Profile
 * - Key Findings vs Technical Assessment
 * - Authentication vs Preconditions
 * - Attack Surface vs Endpoint details
 * - Exploitation Status vs KEV / in-the-wild claims
 * 
 * Contradictions cause the publication gate to FAIL.
 */
export function validateCrossFieldConsistency(dto: VulnerabilityEditorialDto): ConsistencyCheckResult {
  const conflicts: string[] = [];

  const allText = [
    dto.executiveAssessment,
    ...dto.keyFindings.map(f => `${f.title}: ${f.detail}`),
    dto.technicalAssessment.mechanism || '',
    dto.technicalAssessment.preconditions || '',
    dto.technicalAssessment.boundary || '',
    dto.technicalAssessment.exploitationPath || '',
    dto.technicalAssessment.consequence || '',
  ].join(' \n ');

  // 1. Authentication Consistency
  const isUnauthenticatedInProfile = dto.vulnerabilityProfile.authentication.toLowerCase().includes('unauthenticated') ||
                                    dto.vulnerabilityProfile.authentication.toLowerCase().includes('none');
  
  if (isUnauthenticatedInProfile) {
    if (/\b(authenticated user|privileged operator|requires authentication|valid credentials required)\b/i.test(allText)) {
      conflicts.push('Authentication conflict: Profile specifies unauthenticated remote access, but narrative states authenticated user or credentials required.');
    }
  } else {
    if (/\b(unauthenticated remote|no credentials required|pre-auth)\b/i.test(allText)) {
      conflicts.push('Authentication conflict: Narrative indicates unauthenticated access, but profile specifies authenticated requirements.');
    }
  }

  // 2. Exploitation Status Consistency
  if (dto.vulnerabilityProfile.exploitStatus === 'KNOWN_EXPLOITED_EXTERNAL') {
    if (/no in-the-wild exploitation evidence/i.test(allText) || /no evidence of exploitation/i.test(allText)) {
      conflicts.push('Exploitation conflict: Profile specifies KNOWN_EXPLOITED_EXTERNAL (CISA KEV), but narrative asserts "No In-the-Wild Exploitation Evidence".');
    }
  } else if (dto.vulnerabilityProfile.exploitStatus === 'NO_EVIDENCE') {
    if (/cisa kev/i.test(allText) || /known exploited/i.test(allText)) {
      conflicts.push('Exploitation conflict: Profile specifies NO_EVIDENCE, but narrative references CISA KEV or confirmed known exploitation.');
    }
  }

  // 3. Attack Surface Consistency
  if (dto.vulnerabilityProfile.attackSurface && dto.vulnerabilityProfile.attackSurface !== 'Remote Network Interface') {
    const surface = dto.vulnerabilityProfile.attackSurface.toLowerCase();
    if (surface.includes('api') && !allText.toLowerCase().includes('api') && !allText.toLowerCase().includes('interface') && !allText.toLowerCase().includes('endpoint')) {
      conflicts.push(`Attack surface conflict: Declared attack surface "${dto.vulnerabilityProfile.attackSurface}" is absent from narrative.`);
    }
  }

  // 4. Severity & CVSS Consistency
  if (dto.vulnerabilityProfile.cvssScore === '10.0' || parseFloat(dto.vulnerabilityProfile.cvssScore || '0') >= 9.0) {
    if (dto.vulnerabilityProfile.severity !== 'CRITICAL' && dto.vulnerabilityProfile.severity !== 'HIGH') {
      conflicts.push(`Severity conflict: CVSS score is ${dto.vulnerabilityProfile.cvssScore} but severity is declared as ${dto.vulnerabilityProfile.severity}.`);
    }
  }

  // 5. Technical Consequence & Impact Consistency
  if (dto.vulnerabilityProfile.impact.toLowerCase().includes('code execution') || dto.vulnerabilityProfile.impact.toLowerCase().includes('root')) {
    if (dto.technicalAssessment.consequence && !/code execution|root|privilege|compromise/i.test(dto.technicalAssessment.consequence)) {
      conflicts.push('Impact conflict: Profile indicates code execution/root privileges, but technical consequence contradicts.');
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
  };
}
