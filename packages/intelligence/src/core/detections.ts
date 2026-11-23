/**
 * ZAYRON-X MITRE ATT&CK & Detection Validation Framework
 * 
 * Provides versioned ATT&CK mapping and syntactical/schema validation for
 * generated detections (Sigma rules, YARA rules).
 */

export interface AttackTechnique {
  techniqueId: string; // e.g. T1059.004
  techniqueName: string;
  tactics: string[];
  attackVersion: string; // e.g. "v14.1"
  observedBehavior: string;
  supportingEvidenceRefs: string[];
  confidence: number;
}

export interface GeneratedDetection {
  detectionId: string;
  format: 'SIGMA' | 'YARA' | 'SNORT';
  ruleContent: string;
  sourceClaims: string[];
  evidenceRefs: string[];
  assumptions: string[];
  confidence: number;
  falsePositiveRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  environmentRequirements: string[];
  validationStatus: 'VALID' | 'SYNTAX_ERROR' | 'INVALID_SCHEMA' | 'UNVERIFIED';
  validationErrors?: string[];
}

/**
 * Validates ATT&CK technique grounding:
 * Explicitly rejects technique inference solely based on semantic similarity without evidence.
 */
export function validateAttackGrounding(technique: AttackTechnique): { valid: boolean; error?: string } {
  if (!technique.techniqueId || !/^T\d{4}(?:\.\d{3})?$/.test(technique.techniqueId)) {
    return { valid: false, error: `Malformed ATT&CK technique identifier: "${technique.techniqueId}".` };
  }
  if (!technique.attackVersion || !technique.attackVersion.startsWith('v')) {
    return { valid: false, error: 'ATT&CK versioning must be explicitly specified (e.g. "v14.1").' };
  }
  if (!technique.supportingEvidenceRefs || technique.supportingEvidenceRefs.length === 0) {
    return { valid: false, error: `Technique ${technique.techniqueId} rejected: Must have explicit supporting evidence references.` };
  }
  if (!technique.observedBehavior || technique.observedBehavior.length < 10) {
    return { valid: false, error: `Technique ${technique.techniqueId} rejected: Observed behavior must be documented.` };
  }
  return { valid: true };
}

/**
 * Validates Sigma Rule Schema according to Sigma specification.
 */
export function validateSigmaRule(ruleContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredKeys = ['title:', 'status:', 'description:', 'logsource:', 'detection:', 'condition:'];
  for (const key of requiredKeys) {
    if (!ruleContent.includes(key)) {
      errors.push(`Missing mandatory Sigma rule section: "${key}".`);
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates YARA Rule Syntax and logical structure.
 */
export function validateYaraRule(ruleContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!/rule\s+[a-zA-Z0-9_]+\s*\{/.test(ruleContent)) {
    errors.push('YARA declaration header missing or malformed: Expected "rule <identifier> {".');
  }
  if (!/condition\s*:/.test(ruleContent)) {
    errors.push('Mandatory "condition:" section missing in YARA rule.');
  }
  if (!/\}\s*$/.test(ruleContent.trim())) {
    errors.push('Unterminated YARA rule block: Missing closing brace "}".');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
