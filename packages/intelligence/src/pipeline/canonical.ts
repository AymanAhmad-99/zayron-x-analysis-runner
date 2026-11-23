/**
 * Z.X.INTELLIGENCE — CANONICAL INTELLIGENCE PIPELINE CORE
 * 
 * Implements:
 * 1. Canonical Intelligence Object (Schema Version 1.0.0)
 * 2. Signal Quality Gate (High/Medium/Low Signal vs Noise)
 * 3. Multi-tag Classification Taxonomy (Primary + Secondary categories)
 * 4. Grounded Evidence & Provenance Model (Claim -> Evidence -> Telegram Source)
 * 5. Analytical Confidence Scoring Model (Source, Content, Entity, Overall)
 * 6. Cross-Source Corroboration & Deduplication
 * 7. Publication Gate (Deterministic rules before public visibility)
 */

export const SCHEMA_VERSION = '1.0.0';
export const CURRENT_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';
export const CURRENT_AI_MODEL_VERSION = 'v1.0';
export const CURRENT_PROMPT_VERSION = 'cti_analysis_v1';

export const INTELLIGENCE_CATEGORIES = [
  'NEWS',
  'THREAT_INTELLIGENCE',
  'VULNERABILITY',
  'CVE',
  'EXPLOIT',
  'MALWARE',
  'RANSOMWARE',
  'APT',
  'THREAT_ACTOR',
  'CAMPAIGN',
  'BREACH',
  'INCIDENT',
  'OSINT',
  'DFIR',
  'SOC',
  'BLUE_TEAM',
  'RED_TEAM',
  'PENTESTING',
  'REVERSE_ENGINEERING',
  'AI_SECURITY',
  'CLOUD_SECURITY',
  'NETWORK_SECURITY',
  'APPLICATION_SECURITY',
  'PROGRAMMING',
  'RESEARCH',
  'TOOLS',
  'COMMUNITY',
  'OTHER',
] as const;

export type IntelligenceCategory = (typeof INTELLIGENCE_CATEGORIES)[number];

/**
 * Canonical `intelligence_type` token for vulnerability intelligence records.
 *
 * DECISION: the canonical token is the PLURAL `vulnerabilities` (matching the
 * canonical report fixtures, the CISA-KEV producer in workers/api, the
 * engineering docs, and the dominant existing data). The singular
 * `vulnerability` is a legacy drift token produced by lowercasing the uppercase
 * signal category `VULNERABILITY`; it is normalised to the canonical token here
 * so singular/plural can no longer silently represent separate populations.
 *
 * Mirrored in apps/web/app/lib/taxonomy.ts (asserted by tests/taxonomy_contract.test.ts).
 */
export const VULNERABILITY_INTELLIGENCE_TYPE = 'vulnerabilities';
export const VULNERABILITY_SOURCE_CATEGORY = 'VULNERABILITIES';
export const VULNERABILITY_TYPED_ALIASES = ['vulnerability', 'vulnerabilities'] as const;

/** True when a category/type token refers to the vulnerability domain. */
export function isVulnerabilityType(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return (VULNERABILITY_TYPED_ALIASES as readonly string[]).includes(value.trim().toLowerCase());
}

/** Map any known vulnerability spelling (any case) to the canonical token. */
export function canonicalIntelligenceType(category: unknown): string {
  const normalized = typeof category === 'string' ? category.trim().toLowerCase() : '';
  return isVulnerabilityType(normalized) ? VULNERABILITY_INTELLIGENCE_TYPE : normalized;
}

/**
 * Every stored spelling the API must match for an incoming `category` filter.
 * A vulnerability alias expands to every known spelling so legacy singular
 * (`vulnerability`/`VULNERABILITY`) and canonical plural (`vulnerabilities`)
 * rows resolve to the SAME population. Other categories pass through unchanged.
 */
export function categoryFilterTokens(category: unknown): string[] {
  if (isVulnerabilityType(category)) return Array.from(new Set(VULNERABILITY_TYPED_ALIASES));
  return typeof category === 'string' && category.trim() ? [category.trim().toLowerCase()] : [];
}

export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
export type TriagePriority = 'P1' | 'P2' | 'P3' | 'P4';
export type ConfidenceRating = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type SignalGrade = 'HIGH_SIGNAL' | 'MEDIUM_SIGNAL' | 'LOW_SIGNAL' | 'NOISE' | 'DUPLICATE';

export type ReportLifecycleStatus =
  | 'INGESTED'
  | 'NORMALIZED'
  | 'CLASSIFIED'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'REVIEW_REQUIRED'
  | 'READY'
  | 'PUBLISHED'
  | 'UPDATED'
  | 'RETRACTED';

export type CanonicalPublicationStatus = 'PUBLISHED' | 'REVIEW_REQUIRED' | 'FILTERED_NOISE' | 'QUARANTINED';

export type CanonicalEpistemicStatus = 'OBSERVED' | 'REPORTED' | 'INFERRED' | 'UNKNOWN';

export interface ConfidenceVector {
  source_reliability: number; // 0.0 to 1.0 (Authority tier & historical trust)
  content_confidence: number;  // 0.0 to 1.0 (Linguistic specificity & technical depth)
  entity_confidence: number;   // 0.0 to 1.0 (Valid CVEs, hashes, IPs, regex strength)
  overall_confidence: number;  // 0.0 to 1.0 (Weighted aggregate)
  rating: ConfidenceRating;
}

export interface CanonicalEvidenceItem {
  evidence_id: string;
  intelligence_id: string;
  claim: string;
  evidence_type: string;
  source_message_id: string;
  source_id: string;
  quoted_excerpt: string;
  source_timestamp: string;
  source_url: string;
  confidence: number;
  created_at: string;
}

export interface CanonicalSourceReference {
  source_id: string;
  handle: string | null;
  title: string;
  url: string | null;
  message_id: string;
  published_at: string;
  authority_tier: number;
}

export interface CanonicalEntities {
  actors: Array<{ name: string; slug: string; status: 'OBSERVED' | 'REPORTED' | 'SUSPECTED' | 'CONFIRMED' }>;
  malware: Array<{ name: string; slug: string; family?: string; status: 'OBSERVED' | 'REPORTED' | 'SUSPECTED' | 'CONFIRMED' }>;
  cves: Array<{ cve_id: string; description?: string; severity?: string; status: 'OBSERVED' | 'REPORTED' | 'CONFIRMED' }>;
  campaigns: Array<{ name: string; slug: string }>;
  tools: string[];
  techniques: Array<{ id: string; name: string; tactic: string }>;
  victims: string[];
  organizations: string[];
  regions: string[];
}

export interface CanonicalIndicator {
  type: 'ipv4' | 'domain' | 'url' | 'sha256' | 'md5' | 'email';
  value: string;
  context?: string;
}

export interface AIAnalysisBlock {
  threat_summary: string;
  why_it_matters: string;
  threat_type: string;
  recommended_actions: string[];
  timeline: Array<{ event: string; timestamp?: string }>;
  epistemic_status: CanonicalEpistemicStatus;
}

export interface CanonicalIntelligenceObject {
  intelligence_id: string;
  schema_version: '1.0.0';
  source_id: string;
  telegram_source_id: string | null;
  source_handle: string | null;
  source_title: string;
  source_category: string;
  source_language: string;
  source_region: string;

  message_id: string;
  message_timestamp: string;
  ingested_at: string;
  processed_at: string;

  title: string;
  summary: string;
  body: string;

  intelligence_type: string;
  categories: IntelligenceCategory[];
  subcategories: string[];

  severity: ThreatSeverity;
  priority: TriagePriority;
  confidence: ConfidenceVector;

  entities: CanonicalEntities;
  indicators: CanonicalIndicator[];

  evidence: CanonicalEvidenceItem[];
  citations: string[];
  source_references: CanonicalSourceReference[];

  ai_analysis?: AIAnalysisBlock;
  ai_model: string;
  ai_model_version: string;
  ai_prompt_version: string;

  structured_report?: any;
  knowledge_trace?: any[];
  epistemic_breakdown?: {
    verified_facts: string[];
    analyst_assessment: string[];
    unknowns: string[];
  };

  deduplication_key: string;
  content_hash: string;

  status: ReportLifecycleStatus;
  publication_status: CanonicalPublicationStatus;

  created_at: string;
  updated_at: string;
}

/**
 * Deterministically computes overall confidence vector and qualitative rating.
 */
export function calculateConfidenceVector(
  sourceTrust: number,
  contentQuality: number,
  entityDensity: number
): ConfidenceVector {
  const source_reliability = Math.max(0.1, Math.min(1.0, sourceTrust));
  const content_confidence = Math.max(0.1, Math.min(1.0, contentQuality));
  const entity_confidence = Math.max(0.1, Math.min(1.0, entityDensity));

  // Weighted formulation: 40% source reliability, 30% content specificity, 30% verified technical entities
  const rawScore = (source_reliability * 0.4) + (content_confidence * 0.3) + (entity_confidence * 0.3);
  const overall_confidence = Math.round(rawScore * 100) / 100;

  let rating: ConfidenceRating = 'LOW';
  if (overall_confidence >= 0.85) rating = 'VERY_HIGH';
  else if (overall_confidence >= 0.70) rating = 'HIGH';
  else if (overall_confidence >= 0.50) rating = 'MEDIUM';
  else if (overall_confidence >= 0.30) rating = 'LOW';
  else rating = 'VERY_LOW';

  return {
    source_reliability,
    content_confidence,
    entity_confidence,
    overall_confidence,
    rating,
  };
}

/**
 * Quality Gate: Filters out greetings, ads, spam forwards, and low-information promotional content.
 */
export function evaluateSignalQuality(input: {
  text: string;
  hasEntities: boolean;
  cveCount: number;
  indicatorCount: number;
  sourceTrust: number;
}): { grade: SignalGrade; isPublishable: boolean; reason: string } {
  const text = input.text.trim();
  const lower = text.toLowerCase();

  // Low content length
  if (text.length < 30) {
    return { grade: 'NOISE', isPublishable: false, reason: 'Message too brief (<30 chars) for intelligence extraction' };
  }

  // Promotional and conversational spam filter
  const spamTriggers = [
    /join\s+(my|our)\s+channel/i,
    /free\s+(bitcoin|crypto|usdt|airdrop)/i,
    /dm\s+for\s+(promo|rates|inquiries)/i,
    /subscribe\s+to\s+vip/i,
    /best\s+carding\s+method/i,
    /contact\s+@[\w_]+\s+for\s+access/i,
    /sponsored\s+post/i,
    /good\s+morning|good\s+night|gm\s+all|gn\s+everyone/i,
  ];

  for (const trigger of spamTriggers) {
    if (trigger.test(lower)) {
      return { grade: 'NOISE', isPublishable: false, reason: `Matched promotional or conversational noise pattern: ${trigger}` };
    }
  }

  // High Signal: Presence of CVE, indicators, or exploit PoC with reliable source
  if (input.cveCount > 0 || input.indicatorCount >= 2 || (input.hasEntities && input.sourceTrust >= 0.7)) {
    return { grade: 'HIGH_SIGNAL', isPublishable: true, reason: 'Contains verified technical indicators or CVE references' };
  }

  // Medium Signal: Technical discussion or security advisory text
  if (input.hasEntities || lower.includes('vulnerability') || lower.includes('exploit') || lower.includes('patch') || lower.includes('zero-day')) {
    return { grade: 'MEDIUM_SIGNAL', isPublishable: true, reason: 'Technical cybersecurity advisory or observation' };
  }

  // Low Signal: General tech news without specific indicators
  if (text.length > 200 && input.sourceTrust >= 0.6) {
    return { grade: 'LOW_SIGNAL', isPublishable: false, reason: 'General technical discussion lacking specific actionable indicators' };
  }

  return { grade: 'NOISE', isPublishable: false, reason: 'Lacks technical depth or security indicators' };
}

/**
 * Deterministic entity extraction across technical identifiers (CVEs, IPs, Hashes, TTPs, Actors, Malware).
 */
export function extractCanonicalEntities(text: string): {
  cves: Array<{ cve_id: string; description?: string; severity?: string; status: 'OBSERVED' | 'REPORTED' | 'CONFIRMED' }>;
  actors: Array<{ name: string; slug: string; status: 'OBSERVED' | 'REPORTED' | 'SUSPECTED' | 'CONFIRMED' }>;
  malware: Array<{ name: string; slug: string; family?: string; status: 'OBSERVED' | 'REPORTED' | 'SUSPECTED' | 'CONFIRMED' }>;
  techniques: Array<{ id: string; name: string; tactic: string }>;
  indicators: CanonicalIndicator[];
} {
  const cves: Array<{ cve_id: string; status: 'OBSERVED' | 'REPORTED' | 'CONFIRMED' }> = [];
  const actors: Array<{ name: string; slug: string; status: 'OBSERVED' | 'REPORTED' | 'SUSPECTED' | 'CONFIRMED' }> = [];
  const malware: Array<{ name: string; slug: string; status: 'OBSERVED' | 'REPORTED' | 'SUSPECTED' | 'CONFIRMED' }> = [];
  const techniques: Array<{ id: string; name: string; tactic: string }> = [];
  const indicators: CanonicalIndicator[] = [];

  // CVE extraction
  const cveMatches = text.match(/\b(CVE-\d{4}-\d{4,7})\b/gi);
  if (cveMatches) {
    const seen = new Set<string>();
    for (const c of cveMatches) {
      const up = c.toUpperCase();
      if (!seen.has(up)) {
        seen.add(up);
        cves.push({ cve_id: up, status: 'OBSERVED' });
      }
    }
  }

  // IPv4 extraction
  const ipMatches = text.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g);
  if (ipMatches) {
    const seen = new Set<string>();
    for (const ip of ipMatches) {
      if (!ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('127.') && !seen.has(ip)) {
        seen.add(ip);
        indicators.push({ type: 'ipv4', value: ip });
      }
    }
  }

  // SHA256 extraction
  const shaMatches = text.match(/\b[a-f0-9]{64}\b/gi);
  if (shaMatches) {
    const seen = new Set<string>();
    for (const sha of shaMatches) {
      const l = sha.toLowerCase();
      if (!seen.has(l)) {
        seen.add(l);
        indicators.push({ type: 'sha256', value: l });
      }
    }
  }

  // MITRE TTPs
  const ttpMatches = text.match(/\b(T\d{4}(?:\.\d{3})?)\b/g);
  if (ttpMatches) {
    const seen = new Set<string>();
    for (const t of ttpMatches) {
      const up = t.toUpperCase();
      if (!seen.has(up)) {
        seen.add(up);
        techniques.push({ id: up, name: 'MITRE ATT&CK Technique', tactic: 'Execution' });
      }
    }
  }

  // Known malware families
  const knownMalware = ['LockBit', 'BlackCat', 'Cobalt Strike', 'AgentTesla', 'RedLine', 'Vidar', 'Lumma', 'AsyncRAT', 'QakBot', 'TrickBot'];
  for (const mw of knownMalware) {
    if (new RegExp(`\\b${mw}\\b`, 'i').test(text)) {
      malware.push({ name: mw, slug: mw.toLowerCase().replace(/[^a-z0-9]+/g, '-'), status: 'OBSERVED' });
    }
  }

  // Known actors
  const knownActors = ['Sandworm', 'Volt Typhoon', 'Lazarus', 'APT28', 'APT29', 'Fancy Bear', 'FIN7', 'TA505'];
  for (const act of knownActors) {
    if (new RegExp(`\\b${act}\\b`, 'i').test(text)) {
      actors.push({ name: act, slug: act.toLowerCase().replace(/[^a-z0-9]+/g, '-'), status: 'REPORTED' });
    }
  }

  return { cves, actors, malware, techniques, indicators };
}

/**
 * Multi-tag classification of normalized message text.
 */
export function classifyIntelligenceSignal(text: string, title?: string): {
  primaryCategory: IntelligenceCategory;
  categories: IntelligenceCategory[];
  subcategories: string[];
} {
  const haystack = `${title || ''} ${text}`.toLowerCase();
  const matched = new Set<IntelligenceCategory>();
  const subcategories: string[] = [];

  if (/\b(cve-\d{4}-\d{4,7}|vulnerability|flaw|nvd|advisory)\b/i.test(haystack)) {
    matched.add('VULNERABILITY');
    matched.add('CVE');
    subcategories.push('SECURITY_ADVISORY');
  }

  if (/\b(zero-day|0-day|poc|exploit|rce|privilege escalation|sqli|buffer overflow)\b/i.test(haystack)) {
    matched.add('EXPLOIT');
    matched.add('VULNERABILITY');
    subcategories.push('EXPLOIT_POC');
  }

  if (/\b(ransomware|lockbit|blackcat|akira|clop|encryptor|extortion)\b/i.test(haystack)) {
    matched.add('RANSOMWARE');
    matched.add('MALWARE');
    subcategories.push('EXTORTION');
  }

  if (/\b(trojan|stealer|backdoor|c2|payload|rat|botnet|loader|infostealer|malware)\b/i.test(haystack)) {
    matched.add('MALWARE');
    subcategories.push('MALICIOUS_PAYLOAD');
  }

  if (/\b(apt\d+|fancy bear|cozy bear|lazarus|sandworm|volt typhoon|threat actor|espionage)\b/i.test(haystack)) {
    matched.add('APT');
    matched.add('THREAT_ACTOR');
    subcategories.push('STATE_SPONSORED');
  }

  if (/\b(breach|leak|data dump|stolen database|compromised|exfiltrat)\b/i.test(haystack)) {
    matched.add('BREACH');
    matched.add('INCIDENT');
    subcategories.push('DATA_LEAK');
  }

  if (/\b(osint|geoint|reconnaissance|shodan|censys|investigation)\b/i.test(haystack)) {
    matched.add('OSINT');
  }

  if (/\b(soc|siem|sigma|yara|snort|suricata|detection|incident response|dfir)\b/i.test(haystack)) {
    matched.add('BLUE_TEAM');
    matched.add('DFIR');
    matched.add('SOC');
  }

  if (/\b(pentest|red team|bypass|metasploit|burp|cobalt strike|payload generator)\b/i.test(haystack)) {
    matched.add('RED_TEAM');
    matched.add('PENTESTING');
  }

  if (/\b(reverse engineering|ghidra|ida pro|disassembly|decompil|radare)\b/i.test(haystack)) {
    matched.add('REVERSE_ENGINEERING');
  }

  if (/\b(llm|chatgpt|prompt injection|jailbreak|deepfake|artificial intelligence|ai security)\b/i.test(haystack)) {
    matched.add('AI_SECURITY');
  }

  if (/\b(aws|azure|gcp|kubernetes|k8s|cloud security|s3 bucket)\b/i.test(haystack)) {
    matched.add('CLOUD_SECURITY');
  }

  if (matched.size === 0) {
    matched.add('THREAT_INTELLIGENCE');
  }

  const categories = Array.from(matched);
  const primaryCategory = categories[0] || 'THREAT_INTELLIGENCE';

  return {
    primaryCategory,
    categories,
    subcategories: Array.from(new Set(subcategories)),
  };
}

/**
 * Strict Publication Gate: Evaluates whether a report meets non-negotiable verification criteria
 * before being made publicly visible on the website.
 */
export function evaluatePublicationGate(report: CanonicalIntelligenceObject): {
  passed: boolean;
  publicationStatus: CanonicalPublicationStatus;
  violations: string[];
} {
  const violations: string[] = [];

  // 1. Schema check
  if (report.schema_version !== SCHEMA_VERSION) {
    violations.push(`Invalid schema version: expected ${SCHEMA_VERSION}, received ${report.schema_version}`);
  }

  // 2. Anti-Recursion Firewall verification
  const outboundProhibited = [
    'zayronxai',
    'zayron_x',
    'tg_zayronxai',
    'tg_zayron_x',
    '-1003937861689',
  ];
  if (
    outboundProhibited.includes(report.source_id.toLowerCase()) ||
    (report.source_handle && outboundProhibited.includes(report.source_handle.toLowerCase())) ||
    (report.telegram_source_id && outboundProhibited.includes(report.telegram_source_id))
  ) {
    violations.push('CRITICAL FIREWALL VIOLATION: Ingestion from outbound broadcast channel is prohibited');
  }

  // 3. Title and Summary length requirements
  if (!report.title || report.title.trim().length < 8) {
    violations.push('Report title too brief (< 8 characters)');
  }
  if (!report.summary || report.summary.trim().length < 25) {
    violations.push('Report executive summary too brief (< 25 characters)');
  }
  if (!report.body || report.body.trim().length < 50) {
    violations.push('Report body too brief (< 50 characters)');
  }

  // 4. Timestamp validity
  if (!report.message_timestamp || isNaN(new Date(report.message_timestamp).getTime())) {
    violations.push('Invalid message timestamp');
  }

  // 5. Evidence presence: At least 1 grounded evidence item linking claim to source
  if (!report.evidence || report.evidence.length === 0) {
    violations.push('No grounded evidence records attached to report claims');
  }

  // 6. Source attribution presence
  if (!report.source_references || report.source_references.length === 0) {
    violations.push('Missing source provenance attribution');
  }

  // 7. Minimum confidence floor for automatic publication
  if (report.confidence.overall_confidence < 0.35) {
    violations.push(`Confidence score (${report.confidence.overall_confidence}) below minimum publication threshold (0.35)`);
  }

  const passed = violations.length === 0;
  return {
    passed,
    publicationStatus: passed ? 'PUBLISHED' : 'REVIEW_REQUIRED',
    violations,
  };
}

/**
 * Generates an idempotent deduplication key for cross-source and temporal clustering.
 */
export function generateDeduplicationKey(sourceId: string, messageId: string, contentHash: string): string {
  return `${sourceId}:${messageId}:${contentHash.slice(0, 16)}`;
}
