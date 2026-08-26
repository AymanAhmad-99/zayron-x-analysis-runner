import { SeverityLevel, ConfidenceState, ProvenanceRecord } from '@zayron/types';

// ── REGEX PATTERNS FOR TECHNICAL ENTITY EXTRACTION ───────────
const CVE_REGEX = /CVE-\d{4}-\d{4,7}/gi;
const IPV4_REGEX = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
const SHA256_REGEX = /\b[a-fA-F0-9]{64}\b/g;
const MD5_REGEX = /\b[a-fA-F0-9]{32}\b/g;
const DOMAIN_REGEX = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}\b/g;
const MITRE_TTP_REGEX = /\bT\d{4}(?:\.\d{3})?\b/gi;

// Known Threat Actor Keywords for heuristic identification
const KNOWN_ACTORS = [
  'APT28', 'APT29', 'Sandworm', 'Lazarus', 'Fancy Bear', 'Cozy Bear',
  'Volt Typhoon', 'Salt Typhoon', 'Flax Typhoon', 'Charming Kitten',
  'OilRig', 'MuddyWater', 'LockBit', 'BlackCat', 'ALPHV', 'Akira',
  'Cl0p', 'RansomHub', 'Scattered Spider', 'DarkSide', 'Conti'
];

// Known Malware Families
const KNOWN_MALWARE = [
  'Cobalt Strike', 'Mimikatz', 'QakBot', 'Emotet', 'AsyncRAT',
  'RedLine', 'Agent Tesla', 'Lumma', 'Vidar', 'PlugX', 'ShadowPad',
  'LockBit 3.0', 'BlackSuit', 'Medusa', 'Brute Ratel'
];

// Spam & Low-Value Signal Filter Keywords
const SPAM_KEYWORDS = [
  'crypto pump', 'binance signal', 'free giveaway', '100x gem',
  'join my vip', 'casino bonus', 'buy followers', 'telegram premium cheap',
  'airdrop', 'free spin', 'crypto trading bot'
];

// Casual Chatter / Low Intelligence Markers
const CHATTER_PREFIXES = [
  '> how can you tell', 'i have lots of stuff cooking', 'just a quick thought',
  'good morning everyone', 'anyone know if'
];

export interface ExtractedEntities {
  cves: string[];
  ipv4s: string[];
  sha256s: string[];
  md5s: string[];
  domains: string[];
  ttps: string[];
  actors: string[];
  malware: string[];
}

export type PublicationStatus = 'PUBLISHED' | 'DRAFT' | 'NEEDS_TRANSLATION' | 'NEEDS_REVIEW' | 'REJECTED';

export interface PipelineResult {
  isSpam: boolean;
  originalLanguage: string;
  contentHash: string;
  entities: ExtractedEntities;
  normalizedTitle: string;
  normalizedSummary: string;
  severity: SeverityLevel;
  confidenceScore: number;
  confidenceState: ConfidenceState;
  provenance: ProvenanceRecord;
  requiresAITranslation: boolean;
  isEnglishValid: boolean;
  isEligibleForArticle: boolean;
  publicationStatus: PublicationStatus;
  rejectionReason?: string;
}

/**
 * Computes a standard SHA-256 hash string for content idempotency.
 */
export async function computeContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function extractCves(text: string): string[] {
  const matches = text.match(CVE_REGEX) || [];
  return Array.from(new Set(matches.map(m => m.toUpperCase())));
}

export function extractIpv4(text: string): string[] {
  const matches = text.match(IPV4_REGEX) || [];
  return Array.from(new Set(matches));
}

export function extractSha256(text: string): string[] {
  const matches = text.match(SHA256_REGEX) || [];
  return Array.from(new Set(matches.map(m => m.toLowerCase())));
}

export function extractMd5(text: string): string[] {
  const matches = text.match(MD5_REGEX) || [];
  return Array.from(new Set(matches.map(m => m.toLowerCase())));
}

export function extractDomains(text: string): string[] {
  const matches = text.match(DOMAIN_REGEX) || [];
  return Array.from(new Set(matches.map(m => m.toLowerCase())));
}

export function extractMitreAttacks(text: string): string[] {
  const matches = text.match(MITRE_TTP_REGEX) || [];
  return Array.from(new Set(matches.map(m => m.toUpperCase())));
}


/**
 * Detects native message language using character frequency heuristics.
 */
export function detectLanguage(text: string): string {
  if (/[\u0400-\u04FF]/.test(text)) return 'ru'; // Cyrillic (Russian/Ukrainian)
  if (/[\u0600-\u06FF]/.test(text)) {
    if (/[\u067E\u0686\u06AF\u0698\u06CC\u06A9]/.test(text) || /\b(در|به|از|که|این|است|برای|بدافزار|هشدار)\b/.test(text)) {
      return 'fa';
    }
    return 'ar'; // Arabic
  }
  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh'; // Chinese
  if (/[\uac00-\ud7a3]/.test(text)) return 'ko'; // Korean
  if (/[ğüşöçıİĞÜŞÖÇ]/.test(text)) return 'tr'; // Turkish
  return 'en';
}

/**
 * Validates that a string is strictly English with no foreign script leakage.
 */
export function validateEnglishQuality(text: string): { isValid: boolean; reason?: string } {
  if (!text || text.trim().length < 10) {
    return { isValid: false, reason: 'Text is too short for public intelligence' };
  }

  // Check for foreign scripts
  if (/[\u0400-\u04FF]/.test(text)) {
    return { isValid: false, reason: 'Contains Cyrillic script' };
  }
  if (/[\u0600-\u06FF]/.test(text)) {
    return { isValid: false, reason: 'Contains Arabic/Persian script' };
  }
  if (/[\u4e00-\u9fa5]/.test(text)) {
    return { isValid: false, reason: 'Contains Chinese script' };
  }
  if (/[\uac00-\ud7a3]/.test(text)) {
    return { isValid: false, reason: 'Contains Korean script' };
  }

  return { isValid: true };
}

/**
 * Fast spam, promotional noise, and low-value chatter filter.
 */
export function isSpamOrLowValue(text: string, entities?: ExtractedEntities): boolean {
  const lower = text.trim().toLowerCase();
  if (lower.length < 20) return true;

  if (SPAM_KEYWORDS.some((kw) => lower.includes(kw))) return true;

  // If casual chatter with 0 technical entities, filter out
  const hasTechnicalEntity = entities && (
    entities.cves.length > 0 ||
    entities.actors.length > 0 ||
    entities.malware.length > 0 ||
    entities.sha256s.length > 0 ||
    entities.ttps.length > 0
  );

  if (!hasTechnicalEntity) {
    if (CHATTER_PREFIXES.some((p) => lower.startsWith(p))) return true;
    // Check if text is just a question or personal remark without indicators
    if (lower.length < 50 && (lower.endsWith('?') || lower.startsWith('>'))) return true;
  }

  return false;
}

/**
 * Extracts technical entities from raw intelligence text.
 */
export function extractEntities(text: string): ExtractedEntities {
  const cves = Array.from(new Set(text.match(CVE_REGEX) || [])).map((s) => s.toUpperCase());
  const ipv4s = Array.from(new Set(text.match(IPV4_REGEX) || [])).filter(
    (ip) => !ip.startsWith('127.') && !ip.startsWith('0.') && !ip.startsWith('192.168.') && !ip.startsWith('10.')
  );
  const sha256s = Array.from(new Set(text.match(SHA256_REGEX) || [])).map((s) => s.toLowerCase());
  const md5s = Array.from(new Set(text.match(MD5_REGEX) || [])).map((s) => s.toLowerCase());
  const domains = Array.from(new Set(text.match(DOMAIN_REGEX) || [])).filter(
    (d) => !['t.me', 'telegram.org', 'google.com', 'github.com', 'x.com', 'twitter.com'].includes(d.toLowerCase())
  );
  const ttps = Array.from(new Set(text.match(MITRE_TTP_REGEX) || [])).map((s) => s.toUpperCase());

  const actors = KNOWN_ACTORS.filter((actor) =>
    new RegExp(`\\b${actor}\\b`, 'i').test(text)
  );

  const malware = KNOWN_MALWARE.filter((mw) =>
    new RegExp(`\\b${mw}\\b`, 'i').test(text)
  );

  return { cves, ipv4s, sha256s, md5s, domains, ttps, actors, malware };
}

/**
 * Evaluates operational impact and assigns calibrated technical severity.
 */
export function calculateSeverity(entities: ExtractedEntities, text: string): SeverityLevel {
  const lower = text.toLowerCase();

  if (
    lower.includes('cvss 10') ||
    lower.includes('cvss 9') ||
    lower.includes('10.0') ||
    lower.includes('remote code execution') ||
    lower.includes('rce') ||
    lower.includes('zero-day') ||
    lower.includes('0-day') ||
    lower.includes('actively exploited') ||
    lower.includes('exploited in the wild') ||
    (entities.cves.length > 0 && (lower.includes('critical') || lower.includes('unauthenticated')))
  ) {
    return 'critical';
  }

  if (
    entities.cves.length > 0 ||
    entities.malware.length > 0 ||
    entities.actors.length > 0 ||
    lower.includes('ransomware') ||
    lower.includes('critical vulnerability') ||
    lower.includes('data breach') ||
    lower.includes('use-after-free')
  ) {
    return 'high';
  }

  if (entities.sha256s.length > 0 || entities.ipv4s.length > 0 || entities.ttps.length > 0) {
    return 'medium';
  }

  return 'low';
}

/**
 * Calculates multi-dimensional confidence score.
 */
export function calculateConfidence(
  sourceTrustScore: number,
  entities: ExtractedEntities,
  hasEvidence: boolean
): { score: number; state: ConfidenceState } {
  let score = sourceTrustScore * 0.45;

  if (entities.cves.length > 0) score += 0.25;
  if (entities.sha256s.length > 0 || entities.ipv4s.length > 0) score += 0.15;
  if (entities.actors.length > 0 || entities.malware.length > 0) score += 0.1;
  if (hasEvidence) score += 0.1;

  score = Math.min(Math.max(score, 0.1), 0.99);

  let state: ConfidenceState = 'MODERATE';
  if (score >= 0.9) state = 'CONFIRMED';
  else if (score >= 0.75) state = 'VERY_HIGH';
  else if (score >= 0.6) state = 'HIGH';
  else if (score >= 0.4) state = 'MODERATE';
  else state = 'LOW';

  return { score: Number(score.toFixed(2)), state };
}

/**
 * Cleans markdown, formatting artifacts, emojis, and links from text.
 */
export function cleanRawText(text: string): string {
  return text
    .replace(/\[\s*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
}

/**
 * Synthesizes English technical title & summary from raw signal and extracted entities.
 */
export function synthesizeEnglishTechnicalSignal(params: {
  rawText: string;
  originalLanguage: string;
  entities: ExtractedEntities;
  severity: SeverityLevel;
  sourceName: string;
}): { normalizedTitle: string; normalizedSummary: string; requiresAITranslation: boolean } {
  const { rawText, originalLanguage, entities, severity, sourceName } = params;
  const isForeign = originalLanguage !== 'en';

  if (isForeign) {
    // Construct structured English technical representation preserving technical identifiers
    let titleParts: string[] = [];

    if (entities.cves.length > 0) {
      titleParts.push(`[${entities.cves[0]}]`);
    }
    if (entities.actors.length > 0) {
      titleParts.push(`Threat Actor ${entities.actors[0]}`);
    }
    if (entities.malware.length > 0) {
      titleParts.push(`Payload ${entities.malware[0]}`);
    }

    let normalizedTitle = '';
    if (titleParts.length > 0) {
      normalizedTitle = `${titleParts.join(' ')}: Intelligence Telemetry Signal Observed`;
    } else {
      normalizedTitle = `Security Advisory: Threat Signal Ingested from ${sourceName}`;
    }

    const entitySummary = [
      entities.cves.length > 0 ? `CVEs: ${entities.cves.join(', ')}` : null,
      entities.actors.length > 0 ? `Actors: ${entities.actors.join(', ')}` : null,
      entities.malware.length > 0 ? `Malware: ${entities.malware.join(', ')}` : null,
      entities.ipv4s.length > 0 ? `C2 Infrastructure: ${entities.ipv4s.join(', ')}` : null,
      entities.sha256s.length > 0 ? `Payload Hashes: ${entities.sha256s.slice(0, 2).join(', ')}` : null,
      entities.ttps.length > 0 ? `MITRE ATT&CK: ${entities.ttps.join(', ')}` : null,
    ].filter(Boolean).join('. ');

    const normalizedSummary = `Raw threat telemetry captured in ${originalLanguage.toUpperCase()} from ${sourceName}. ${entitySummary || 'Technical indicators extracted and correlated against threat database.'} Full raw text preserved for provenance analysis.`;

    return {
      normalizedTitle,
      normalizedSummary,
      requiresAITranslation: true,
    };
  }

  // English Signal Processing
  const cleaned = cleanRawText(rawText);
  const firstLine = cleaned.split('\n')[0].replace(/[#*`_~]/g, '').trim();
  
  let normalizedTitle = firstLine.slice(0, 120);
  if (entities.cves.length > 0 && !normalizedTitle.toUpperCase().includes('CVE-')) {
    normalizedTitle = `[${entities.cves[0]}] ${normalizedTitle}`;
  } else if (entities.actors.length > 0 && !normalizedTitle.toLowerCase().includes(entities.actors[0].toLowerCase())) {
    normalizedTitle = `Threat Advisory: ${entities.actors[0]} Activity Detected`;
  }

  const normalizedSummary = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ')
    .slice(0, 600)
    .trim();

  return {
    normalizedTitle,
    normalizedSummary,
    requiresAITranslation: false,
  };
}

/**
 * Evaluates publication eligibility for standalone public articles.
 * NOT every raw signal becomes an article.
 */
export function evaluatePublicationEligibility(params: {
  severity: SeverityLevel;
  confidenceScore: number;
  entities: ExtractedEntities;
  isEnglishValid: boolean;
  isForeign: boolean;
}): { isEligibleForArticle: boolean; publicationStatus: PublicationStatus; reason: string } {
  const { severity, confidenceScore, entities, isEnglishValid, isForeign } = params;

  if (!isEnglishValid) {
    return {
      isEligibleForArticle: false,
      publicationStatus: 'NEEDS_TRANSLATION',
      reason: 'Failed English quality gate (non-English or corrupt characters detected)',
    };
  }

  const hasHighValueEntity =
    entities.cves.length > 0 ||
    entities.actors.length > 0 ||
    entities.malware.length > 0 ||
    entities.ttps.length > 0;

  // Article Publication Gate:
  // Requires Critical/High severity OR (Moderate severity + High-Value Entity + Confidence >= 0.70)
  if (severity === 'critical' || severity === 'high') {
    if (confidenceScore >= 0.60) {
      return {
        isEligibleForArticle: true,
        publicationStatus: 'PUBLISHED',
        reason: 'High-severity intelligence with confirmed confidence',
      };
    }
  }

  if (hasHighValueEntity && confidenceScore >= 0.75) {
    return {
      isEligibleForArticle: true,
      publicationStatus: 'PUBLISHED',
      reason: 'Corroborated technical entity signal meeting publication threshold',
    };
  }

  // Lower severity or uncorroborated signals stay as internal intelligence events only
  return {
    isEligibleForArticle: false,
    publicationStatus: 'DRAFT',
    reason: 'Signal retained as internal intelligence event; below standalone publication threshold',
  };
}

/**
 * Master Pipeline Execution: Converts raw heterogeneous signal into canonical intelligence with English gate.
 */
export async function normalizeIntelligenceSignal(params: {
  sourceId: string;
  sourceName: string;
  sourceTrustScore: number;
  externalMessageId: string;
  rawText: string;
  sourceUrl?: string;
  publishedAt?: string;
}): Promise<PipelineResult> {
  const { sourceId, sourceName, sourceTrustScore, externalMessageId, rawText, sourceUrl, publishedAt } = params;

  const originalLanguage = detectLanguage(rawText);
  const contentHash = await computeContentHash(rawText);
  const entities = extractEntities(rawText);

  // 1. Noise / Spam Filter
  if (isSpamOrLowValue(rawText, entities)) {
    return {
      isSpam: true,
      originalLanguage,
      contentHash,
      entities: { cves: [], ipv4s: [], sha256s: [], md5s: [], domains: [], ttps: [], actors: [], malware: [] },
      normalizedTitle: '',
      normalizedSummary: '',
      severity: 'low',
      confidenceScore: 0,
      confidenceState: 'LOW',
      provenance: {
        sourceId,
        sourceMessageId: externalMessageId,
        sourceUrl,
        capturedAt: new Date().toISOString(),
        evidenceType: 'raw_message',
        hash: '',
        weight: 0,
      },
      requiresAITranslation: false,
      isEnglishValid: false,
      isEligibleForArticle: false,
      publicationStatus: 'REJECTED',
      rejectionReason: 'Spam, promotional keyword, or low-value chatter',
    };
  }

  // 2. Technical Severity & Confidence
  const severity = calculateSeverity(entities, rawText);
  const { score: confidenceScore, state: confidenceState } = calculateConfidence(
    sourceTrustScore,
    entities,
    entities.cves.length > 0 || entities.sha256s.length > 0
  );

  // 3. English Technical Synthesis
  const { normalizedTitle, normalizedSummary, requiresAITranslation } = synthesizeEnglishTechnicalSignal({
    rawText,
    originalLanguage,
    entities,
    severity,
    sourceName,
  });

  // 4. English Quality Validation Gate
  const titleValidation = validateEnglishQuality(normalizedTitle);
  const summaryValidation = validateEnglishQuality(normalizedSummary);
  const isEnglishValid = titleValidation.isValid && summaryValidation.isValid;

  // 5. Publication Eligibility
  const { isEligibleForArticle, publicationStatus, reason } = evaluatePublicationEligibility({
    severity,
    confidenceScore,
    entities,
    isEnglishValid,
    isForeign: originalLanguage !== 'en',
  });

  // 6. Provenance Record
  const provenance: ProvenanceRecord = {
    sourceId,
    sourceMessageId: externalMessageId,
    sourceUrl: sourceUrl || `https://t.me/${sourceId.replace('tg_', '')}/${externalMessageId}`,
    capturedAt: new Date().toISOString(),
    publishedAt: publishedAt || new Date().toISOString(),
    evidenceType: 'telegram_channel_signal',
    excerptReference: rawText.slice(0, 200),
    hash: contentHash,
    weight: sourceTrustScore,
  };

  return {
    isSpam: false,
    originalLanguage,
    contentHash,
    entities,
    normalizedTitle,
    normalizedSummary,
    severity,
    confidenceScore,
    confidenceState,
    provenance,
    requiresAITranslation,
    isEnglishValid,
    isEligibleForArticle,
    publicationStatus,
    rejectionReason: reason,
  };
}
