import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { executeDeepIntelligenceAnalysisV2 } from '../../../packages/intelligence/src/engine_v2';

/**
 * Wave 4A — the outbound path uses GramJS (MTProto `client.sendMessage`), NOT
 * the Bot API. GramJS formats via `parseMode` ("html"), so any `<`, `>` or `&`
 * in analyst text must be escaped or Telegram rejects/truncates the message.
 */
function escapeTelegramHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Wave 4A — recognizes a GramJS FloodWaitError without importing the
 * `telegram/errors` subpath (not part of this worker's bundle graph). GramJS
 * exposes the wait on `.seconds` and the RPC message carries FLOOD_WAIT.
 */
function floodWaitSeconds(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const candidate = err as {
    seconds?: unknown;
    message?: unknown;
    errorMessage?: unknown;
    constructor?: { name?: string };
  };
  const name = candidate.constructor?.name ?? '';
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  const errorMessage = typeof candidate.errorMessage === 'string' ? candidate.errorMessage : '';
  const isFlood =
    name === 'FloodWaitError' ||
    message.includes('FLOOD_WAIT') ||
    errorMessage.includes('FLOOD_WAIT') ||
    message.startsWith('FLOOD');
  if (!isFlood) return null;
  const seconds = Number(candidate.seconds);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 30;
}

export interface Env {
  TELEGRAM_COLLECTOR_DO: DurableObjectNamespace;
  INGEST_QUEUE: Queue;
  DB: D1Database;
  ENVIRONMENT: string;
  API_ID: number;
  API_HASH: string;
  TELEGRAM_STRING_SESSION?: string;
  TELEGRAM_SESSION?: string;
  TELEGRAM_SESSION_STRING?: string;
  LEGACY_FREEZE?: string;
}

export type CollectorState = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'AUTH_REQUIRED' | 'AUTH_FAILED' | 'RECONNECTING' | 'DEGRADED' | 'FLOOD_WAIT' | 'DRAINING';

export interface CollectorTelemetry {
  status: CollectorState;
  session_active: boolean;
  messages_received: number;
  messages_dispatched: number;
  duplicates_dropped: number;
  errors_count: number;
  flood_wait_seconds_remaining: number;
  reconnect_attempts: number;
  last_received_at: string | null;
  last_success_at: string | null;
  last_error_message: string | null;
  uptime_seconds: number;
  monitored_channels: string[];
}

export interface TelegramSourceRecord {
  id: string;
  telegram_id?: string | null;
  handle: string | null;
  display_name: string;
  url: string | null;
  category: string;
  subcategories?: string[];
  topic: string;
  authority_tier: number;
  trust_score: number;
  enabled: boolean;
  status: 'ENABLED' | 'DISABLED' | 'BLOCKED' | 'INELIGIBLE';
  monitoring_status: 'OBSERVED' | 'MONITORED' | 'PAUSED' | 'DISABLED' | 'BLOCKED' | 'INELIGIBLE';
  verification_status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED' | 'VALIDATED' | 'NEW';
  eligibility_status?: 'ELIGIBLE' | 'INELIGIBLE' | 'BLOCKED' | 'UNSUPPORTED';
  collector_id: string;
  shard_id: string;
  message_count: number;
  error_count: number;
  last_error: string | null;
  last_seen_at: string | null;
  last_message_at?: string | null;
  last_successful_ingestion_at: string | null;
  created_at: string;
  updated_at: string;
}

export function computeShardForSource(key: string, shardCount: number = 6): string {
  const norm = (key || 'unassigned').trim().toLowerCase().replace(/^@+/, '');
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash << 5) - hash + norm.charCodeAt(i);
    hash |= 0;
  }
  const count = Math.max(1, shardCount);
  const shardNum = (Math.abs(hash) % count) + 1;
  return shardNum < 10 ? `shard_0${shardNum}` : `shard_${shardNum}`;
}

export function computeShardForHandle(handle: string): string {
  return computeShardForSource(handle, 6);
}

// Strictly banned from monitoring to eliminate recursive intelligence ingestion loops
export const BANNED_MONITORED_CHANNELS = new Set([
  'zayronxai',
  'zayron_x',
  'zayronx',
  'zayron_app',
]);

// ── CANONICAL INTELLIGENCE SCHEMA (VERSION 1.0.0) ──────────────────────────
export const SCHEMA_VERSION = '1.0.0';
export const CURRENT_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';
export const CURRENT_AI_MODEL_VERSION = 'v1.0';
export const CURRENT_PROMPT_VERSION = 'cti_analysis_v1';

export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
export type TriagePriority = 'P1' | 'P2' | 'P3' | 'P4';
export type ConfidenceRating = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type SignalGrade = 'HIGH_SIGNAL' | 'MEDIUM_SIGNAL' | 'LOW_SIGNAL' | 'NOISE' | 'DUPLICATE';

export interface ConfidenceVector {
  source_reliability: number;
  content_confidence: number;
  entity_confidence: number;
  overall_confidence: number;
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
  epistemic_status: 'OBSERVED' | 'REPORTED' | 'INFERRED' | 'UNKNOWN';
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
  categories: string[];
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

  report_type?: 'VULNERABILITY' | 'MALWARE' | 'THREAT_ACTOR' | 'CAMPAIGN' | 'GENERAL_CTI';
  structured_report?: any;
  knowledge_trace?: any[];
  epistemic_breakdown?: {
    verified_facts: string[];
    analyst_assessment: string[];
    unknowns: string[];
  };

  deduplication_key: string;
  content_hash: string;

  status: 'INGESTED' | 'NORMALIZED' | 'CLASSIFIED' | 'ANALYZING' | 'ANALYZED' | 'REVIEW_REQUIRED' | 'READY' | 'PUBLISHED' | 'UPDATED' | 'RETRACTED';
  publication_status: 'PUBLISHED' | 'REVIEW_REQUIRED' | 'FILTERED_NOISE' | 'QUARANTINED';

  created_at: string;
  updated_at: string;
}

export function calculateConfidenceVector(
  sourceTrust: number,
  contentQuality: number,
  entityDensity: number
): ConfidenceVector {
  const source_reliability = Math.max(0.1, Math.min(1.0, sourceTrust));
  const content_confidence = Math.max(0.1, Math.min(1.0, contentQuality));
  const entity_confidence = Math.max(0.1, Math.min(1.0, entityDensity));
  const rawScore = (source_reliability * 0.4) + (content_confidence * 0.3) + (entity_confidence * 0.3);
  const overall_confidence = Math.round(rawScore * 100) / 100;

  let rating: ConfidenceRating = 'LOW';
  if (overall_confidence >= 0.85) rating = 'VERY_HIGH';
  else if (overall_confidence >= 0.70) rating = 'HIGH';
  else if (overall_confidence >= 0.50) rating = 'MEDIUM';
  else if (overall_confidence >= 0.30) rating = 'LOW';
  else rating = 'VERY_LOW';

  return { source_reliability, content_confidence, entity_confidence, overall_confidence, rating };
}

export interface AdvisoryMetadata {
  vendor: string | null;
  cveId: string | null;
  cvssScore: number | null;
  cvssSeverity: ThreatSeverity | null;
  cvssVector: string | null;
  remotelyExploitable: boolean | null;
  affectedProduct: string | null;
  referenceUrls: string[];
}

export function parseAdvisoryMetadata(text: string): AdvisoryMetadata {
  if (!text) {
    return {
      vendor: null,
      cveId: null,
      cvssScore: null,
      cvssSeverity: null,
      cvssVector: null,
      remotelyExploitable: null,
      affectedProduct: null,
      referenceUrls: [],
    };
  }

  // 1. Issuing Vendor / Authority
  let vendor: string | null = null;
  if (/\b(redhat|red\s*hat)\b/i.test(text)) vendor = 'Red Hat';
  else if (/\b(microsoft|msrc)\b/i.test(text)) vendor = 'Microsoft';
  else if (/\b(debian)\b/i.test(text)) vendor = 'Debian';
  else if (/\b(ubuntu|canonical)\b/i.test(text)) vendor = 'Ubuntu';
  else if (/\b(cisa)\b/i.test(text)) vendor = 'CISA';
  else if (/\b(sonicwall)\b/i.test(text)) vendor = 'SonicWall';
  else if (/\b(palo\s*alto(?:\s*networks)?)\b/i.test(text)) vendor = 'Palo Alto Networks';
  else if (/\b(cisco)\b/i.test(text)) vendor = 'Cisco';

  if (!vendor) {
    const vendorMatch = text.match(/(?:Source|Vendor|Issuer|Origin):\s*([a-zA-Z0-9_\-\s]{2,25}?)(?:\.|\n|\r|,|;|$)/i);
    if (vendorMatch) vendor = vendorMatch[1].trim();
  }

  // 2. CVE Identifier
  const cveMatch = text.match(/\b(CVE-\d{4}-\d{4,7})\b/i);
  const cveId = cveMatch ? cveMatch[1].toUpperCase() : null;

  // 3. CVSS Score & Base Severity
  const cvssMatch = text.match(/CVSS(?:\s*v[34](?:\.[01])?)?(?:\s*Base)?\s*Score:\s*([0-9.]+)(?:\s*\((LOW|MEDIUM|HIGH|CRITICAL)\))?/i);
  let cvssScore: number | null = null;
  let cvssSeverity: ThreatSeverity | null = null;
  if (cvssMatch) {
    cvssScore = parseFloat(cvssMatch[1]);
    const explicitRating = cvssMatch[2]?.toUpperCase();
    if (explicitRating === 'CRITICAL' || explicitRating === 'HIGH' || explicitRating === 'MEDIUM' || explicitRating === 'LOW') {
      cvssSeverity = explicitRating as ThreatSeverity;
    } else {
      if (cvssScore >= 9.0) cvssSeverity = 'CRITICAL';
      else if (cvssScore >= 7.0) cvssSeverity = 'HIGH';
      else if (cvssScore >= 4.0) cvssSeverity = 'MEDIUM';
      else if (cvssScore > 0) cvssSeverity = 'LOW';
    }
  }

  // 4. CVSS Vector String
  const vectorMatch = text.match(/\b(CVSS:[34]\.[01]\/[A-Z0-9:\/]+)\b/i);
  const cvssVector = vectorMatch ? vectorMatch[1] : null;

  // 5. Remotely Exploitable
  const remoteMatch = text.match(/Remotely\s*Exploitable:\s*(True|False|Yes|No)/i);
  const remotelyExploitable = remoteMatch ? ['true', 'yes'].includes(remoteMatch[1].toLowerCase()) : null;

  // 6. Affected Product / Component
  const pkgMatch = text.match(/(?:A flaw was found in|flaw in|vulnerability in|package)\s+([a-zA-Z0-9_\-\.\/]+)/i);
  const affectedProduct = pkgMatch ? pkgMatch[1].replace(/[\.,]$/, '').trim() : null;

  // 7. Reference URLs
  const urlMatches = text.match(/https?:\/\/[^\s\)]+/gi) || [];
  const referenceUrls = Array.from(new Set(urlMatches));

  return {
    vendor,
    cveId,
    cvssScore,
    cvssSeverity,
    cvssVector,
    remotelyExploitable,
    affectedProduct,
    referenceUrls,
  };
}

export function evaluateSignalQuality(input: {
  text: string;
  hasEntities: boolean;
  cveCount: number;
  indicatorCount: number;
  sourceTrust: number;
}): { grade: SignalGrade; isPublishable: boolean; reason: string } {
  const text = input.text.trim();
  const lower = text.toLowerCase();

  if (text.length < 25) {
    return { grade: 'NOISE', isPublishable: false, reason: 'Message length too brief (<25 chars)' };
  }

  const spamTriggers = [
    /join\s+(my|our)\s+channel/i,
    /free\s+(bitcoin|crypto|usdt|airdrop)/i,
    /dm\s+for\s+(promo|rates|inquiries)/i,
    /subscribe\s+to\s+vip/i,
    /sponsored\s+post/i,
    /good\s+morning|good\s+night/i,
    /зарплата|опыт\s*:\s*\d|вакансия|обсуждается\s+на\s+собеседовании/i,
  ];

  for (const trigger of spamTriggers) {
    if (trigger.test(lower)) {
      return { grade: 'NOISE', isPublishable: false, reason: 'Matched promotional or conversational noise pattern' };
    }
  }

  if (input.cveCount > 0 || input.indicatorCount >= 2 || (input.hasEntities && input.sourceTrust >= 0.7)) {
    return { grade: 'HIGH_SIGNAL', isPublishable: true, reason: 'Contains verified technical indicators or CVE references' };
  }

  if (input.hasEntities || lower.includes('vulnerability') || lower.includes('exploit') || lower.includes('patch') || lower.includes('zero-day')) {
    return { grade: 'MEDIUM_SIGNAL', isPublishable: true, reason: 'Technical cybersecurity advisory or observation' };
  }

  if (text.length > 180 && input.sourceTrust >= 0.6) {
    return { grade: 'LOW_SIGNAL', isPublishable: false, reason: 'General discussion lacking specific actionable indicators' };
  }

  return { grade: 'NOISE', isPublishable: false, reason: 'Lacks technical depth or security indicators' };
}

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

export function evaluatePublicationGate(report: CanonicalIntelligenceObject): {
  passed: boolean;
  publicationStatus: 'PUBLISHED' | 'REVIEW_REQUIRED';
  violations: string[];
} {
  const violations: string[] = [];

  if (report.schema_version !== SCHEMA_VERSION) {
    violations.push(`Invalid schema version: ${report.schema_version}`);
  }

  const outboundProhibited = ['zayronxai', 'zayron_x', 'tg_zayronxai', 'tg_zayron_x', '-1003937861689'];
  if (
    outboundProhibited.includes(report.source_id.toLowerCase()) ||
    (report.source_handle && outboundProhibited.includes(report.source_handle.toLowerCase())) ||
    (report.telegram_source_id && outboundProhibited.includes(report.telegram_source_id))
  ) {
    violations.push('CRITICAL FIREWALL VIOLATION: Ingestion from outbound channel prohibited');
  }

  if (!report.title || report.title.trim().length < 8) {
    violations.push('Report title too brief (< 8 characters)');
  }
  if (!report.summary || report.summary.trim().length < 20) {
    violations.push('Report summary too brief (< 20 characters)');
  }
  if (!report.evidence || report.evidence.length === 0) {
    violations.push('No grounded evidence records attached to report claims');
  }
  if (!report.source_references || report.source_references.length === 0) {
    violations.push('Missing source provenance attribution');
  }
  if (report.confidence.overall_confidence < 0.35) {
    violations.push(`Confidence score (${report.confidence.overall_confidence}) below minimum publication threshold`);
  }

  // ── P0 QUALITY GATE CHECKS ──────────────────────────────────────────────
  // 1. Banned Boilerplate Check
  const bannedBoilerplate = [
    'Technical risk analysis indicates immediate exploitation feasibility.',
    'Defenders must audit external interfaces and apply verified patches.',
    'Adversary activity tracking across enterprise attack surfaces.',
  ];
  if (report.structured_report?.sections) {
    for (const sec of report.structured_report.sections) {
      for (const phrase of bannedBoilerplate) {
        if (sec.content && sec.content.includes(phrase)) {
          violations.push(`BANNED BOILERPLATE DETECTED: "${phrase}" in section ${sec.title}`);
        }
      }
    }
  }

  // 2. Ungrounded ATT&CK Mapping Check
  // T1190 must never appear unless the raw text or title explicitly provides evidence of public-facing web exploitation
  if (report.structured_report?.sections) {
    const attkSec = report.structured_report.sections.find((s: any) => s.title === 'ATT&CK MAPPING');
    if (attkSec && attkSec.content && attkSec.content.includes('T1190')) {
      const hasWebEvidence = /web\s*server|http\s*daemon|nginx|apache|iis|public-facing|ingress\s*port/i.test(report.body || report.summary);
      if (!hasWebEvidence) {
        violations.push('UNGROUNDED ATT&CK TECHNIQUE: T1190 asserted without behavioral server-exploit evidence');
      }
    }
  }

  // 3. Knowledge Trace Honesty Check
  // Cannot claim USED unless the chunk is actually attached and relevant
  if (report.knowledge_trace && report.knowledge_trace.length > 0) {
    const memoryForensicsUsed = report.knowledge_trace.some((k: any) => k.document_id === 'doc_ref_04_amf' && k.status === 'USED');
    const hasMemoryEvidence = /memory\s*dump|volatility|vad|in-memory|process\s*hollowing/i.test(report.body || report.summary);
    if (memoryForensicsUsed && !hasMemoryEvidence) {
      violations.push('FABRICATED KNOWLEDGE TRACE: Memory Forensics marked USED without memory telemetry');
    }
  }

  const passed = violations.length === 0;
  return {
    passed,
    publicationStatus: passed ? 'PUBLISHED' : 'REVIEW_REQUIRED',
    violations,
  };
}

export class TelegramCollectorDO {
  private ctx: DurableObjectState;
  private env: Env;
  private client: TelegramClient | null = null;
  private status: CollectorState = 'DISCONNECTED';
  private startTime: number = Date.now();
  private messagesReceived: number = 0;
  private messagesDispatched: number = 0;
  private duplicatesDropped: number = 0;
  private errorsCount: number = 0;
  private floodWaitRemaining: number = 0;
  private reconnectAttempts: number = 0;
  private lastReceivedAt: string | null = null;
  private lastSuccessAt: string | null = null;
  private lastErrorMessage: string | null = null;
  private monitoredChannels: string[] = [
    'cveNotify', 'PentestingNews', 'blueteamalerts', 'aptreports', 'xakep_ru',
    'thehackernews', 'vxunderground', 'seclabnews', 'anti_malware', 'iran_cyber'
  ];
  private sourcesRegistry: Map<string, TelegramSourceRecord> = new Map();
  private knownHashes: Set<string> = new Set();
  private isConnecting: boolean = false;

  // Canonical Intelligence Pipeline State
  private intelligenceReports: Map<string, CanonicalIntelligenceObject> = new Map();
  private messagesIngested: number = 0;
  private messagesNormalized: number = 0;
  private messagesFiltered: number = 0;
  private messagesAnalyzed: number = 0;
  private reportsCreated: number = 0;
  private reportsPublished: number = 0;
  private reportsReviewRequired: number = 0;
  private aiFailures: number = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;

    // Restore state from persistent storage
    this.ctx.blockConcurrencyWhile(async () => {
      await this.restoreState();
    });
  }

  private async restoreState(): Promise<void> {
    try {
      const stored = await this.ctx.storage.get<{
        messagesReceived?: number;
        messagesDispatched?: number;
        duplicatesDropped?: number;
        errorsCount?: number;
        monitoredChannels?: string[];
      }>('telemetry_state');

      if (stored) {
        this.messagesReceived = stored.messagesReceived || 0;
        this.messagesDispatched = stored.messagesDispatched || 0;
        this.duplicatesDropped = stored.duplicatesDropped || 0;
        this.errorsCount = stored.errorsCount || 0;
        if (stored.monitoredChannels && stored.monitoredChannels.length > 0) {
          this.monitoredChannels = stored.monitoredChannels;
        }
      }

      // Restore sources registry
      const storedRegistry = await this.ctx.storage.get<Record<string, TelegramSourceRecord>>('sources_registry');
      if (storedRegistry) {
        for (const [k, v] of Object.entries(storedRegistry)) {
          this.sourcesRegistry.set(k.toLowerCase(), v);
        }
      } else {
        // Seed default sources into registry
        for (const ch of this.monitoredChannels) {
          const handle = ch.toLowerCase();
          this.sourcesRegistry.set(handle, {
            id: `tg_${handle}`,
            handle,
            display_name: `@${ch}`,
            url: `https://t.me/${ch}`,
            category: 'Cyber Threat Intelligence',
            topic: 'Telemetry & Exploit Disclosures',
            authority_tier: 1,
            trust_score: 0.85,
            enabled: true,
            status: 'ENABLED',
            monitoring_status: 'MONITORED',
            verification_status: 'VERIFIED',
            collector_id: 'global-telegram-collector',
            shard_id: computeShardForHandle(handle),
            message_count: 0,
            error_count: 0,
            last_error: null,
            last_seen_at: null,
            last_successful_ingestion_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        await this.persistRegistry();
      }

      // Restore canonical intelligence reports
      const storedReports = await this.ctx.storage.get<CanonicalIntelligenceObject[]>('intel_reports');
      if (storedReports && Array.isArray(storedReports)) {
        for (const rep of storedReports) {
          if (rep.intelligence_id) {
            // Apply P0/P1 deterministic remediation on load
            const sanitized = this.ensureStructuredFields(rep);
            this.intelligenceReports.set(rep.intelligence_id, sanitized);
          }
        }
      }

      // Restore pipeline statistics
      const storedPipelineStats = await this.ctx.storage.get<{
        messagesIngested?: number;
        messagesNormalized?: number;
        messagesFiltered?: number;
        messagesAnalyzed?: number;
        reportsCreated?: number;
        reportsPublished?: number;
        reportsReviewRequired?: number;
        aiFailures?: number;
      }>('pipeline_stats');

      if (storedPipelineStats) {
        this.messagesIngested = storedPipelineStats.messagesIngested || 0;
        this.messagesNormalized = storedPipelineStats.messagesNormalized || 0;
        this.messagesFiltered = storedPipelineStats.messagesFiltered || 0;
        this.messagesAnalyzed = storedPipelineStats.messagesAnalyzed || 0;
        this.reportsCreated = storedPipelineStats.reportsCreated || 0;
        this.reportsPublished = storedPipelineStats.reportsPublished || 0;
        this.reportsReviewRequired = storedPipelineStats.reportsReviewRequired || 0;
        this.aiFailures = storedPipelineStats.aiFailures || 0;
      }

      // Check for available session and attempt connection
      const sessionStr = await this.ctx.storage.get<string>('telegram_session') ||
                         this.env.TELEGRAM_STRING_SESSION ||
                         this.env.TELEGRAM_SESSION ||
                         this.env.TELEGRAM_SESSION_STRING;
      if (sessionStr && this.status !== 'CONNECTED' && !this.isConnecting) {
        this.ctx.waitUntil(this.connect(sessionStr));
      }

      // Ensure periodic alarm is scheduled
      const currentAlarm = await this.ctx.storage.getAlarm();
      if (!currentAlarm) {
        await this.ctx.storage.setAlarm(Date.now() + 15000);
      }
    } catch (err: any) {
      console.error('[TelegramCollectorDO] State restore error:', err);
    }
  }

  private async persistState(): Promise<void> {
    try {
      await this.ctx.storage.put('telemetry_state', {
        messagesReceived: this.messagesReceived,
        messagesDispatched: this.messagesDispatched,
        duplicatesDropped: this.duplicatesDropped,
        errorsCount: this.errorsCount,
        monitoredChannels: this.monitoredChannels,
      });
      await this.ctx.storage.put('pipeline_stats', {
        messagesIngested: this.messagesIngested,
        messagesNormalized: this.messagesNormalized,
        messagesFiltered: this.messagesFiltered,
        messagesAnalyzed: this.messagesAnalyzed,
        reportsCreated: this.reportsCreated,
        reportsPublished: this.reportsPublished,
        reportsReviewRequired: this.reportsReviewRequired,
        aiFailures: this.aiFailures,
      });
    } catch (err: any) {
      console.error('[TelegramCollectorDO] State persist error:', err);
    }
  }

  async storeIntelligenceReport(report: CanonicalIntelligenceObject): Promise<void> {
    this.intelligenceReports.set(report.intelligence_id, report);
    if (this.intelligenceReports.size > 300) {
      const oldestKey = this.intelligenceReports.keys().next().value;
      if (oldestKey) this.intelligenceReports.delete(oldestKey);
    }
    try {
      const recent = Array.from(this.intelligenceReports.values()).slice(-200);
      await this.ctx.storage.put('intel_reports', recent);
      await this.persistState();
    } catch (err: any) {
      console.warn('[TelegramCollectorDO] Error persisting report:', err.message);
    }
  }

  getIntelligenceReports(filters?: {
    limit?: number;
    offset?: number;
    category?: string;
    severity?: string;
    status?: string;
    q?: string;
  }): { reports: CanonicalIntelligenceObject[]; total: number } {
    let list = Array.from(this.intelligenceReports.values());

    if (filters?.category) {
      const cat = filters.category.toUpperCase();
      list = list.filter(r => r.categories.includes(cat as any) || r.source_category.toUpperCase() === cat);
    }
    if (filters?.severity) {
      const sev = filters.severity.toUpperCase();
      list = list.filter(r => r.severity === sev);
    }
    if (filters?.status) {
      list = list.filter(r => r.publication_status === filters.status);
    } else {
      list = list.filter(r => r.publication_status === 'PUBLISHED');
    }
    if (filters?.q) {
      const q = filters.q.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.source_title.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = list.length;
    const offset = filters?.offset || 0;
    const limit = Math.min(filters?.limit || 20, 100);
    const paginated = list.slice(offset, offset + limit).map(r => this.ensureStructuredFields(r));

    return { reports: paginated, total };
  }

  private ensureStructuredFields(r: CanonicalIntelligenceObject): CanonicalIntelligenceObject {
    const rawText = r.body || r.summary || r.title || '';
    const meta = parseAdvisoryMetadata(rawText);

    const isVuln = (r.entities?.cves && r.entities.cves.length > 0) || r.intelligence_type === 'vulnerabilities' || !!meta.cveId;
    const isMalw = (r.entities?.malware && r.entities.malware.length > 0) || r.intelligence_type === 'malware';
    const reportType: 'VULNERABILITY' | 'MALWARE' | 'THREAT_ACTOR' | 'CAMPAIGN' | 'GENERAL_CTI' =
      isVuln ? 'VULNERABILITY' : isMalw ? 'MALWARE' : (r.entities?.actors && r.entities.actors.length > 0) ? 'THREAT_ACTOR' : 'GENERAL_CTI';

    // Phase 4: Knowledge Trace Honesty - Empty unless real retrieval executed
    const knowledgeTrace = Array.isArray(r.knowledge_trace) && r.knowledge_trace.length > 0 && !r.knowledge_trace.some((k: any) => k.document_id === 'doc_ref_17_nvd_cvss' || k.document_id === 'doc_ref_04_amf')
      ? r.knowledge_trace
      : [];

    // Phase 2: Provenance Correction - Distinguish issuing authority from collection channel
    const issuingAuthority = meta.vendor || (isVuln ? 'Vulnerability Disclosure Authority' : r.source_title);
    const collectionChannel = r.source_handle ? `@${r.source_handle}` : (r.source_title || 'Telegram Telemetry');

    // Phase 3: Severity Correction - CVSS authoritative, no keyword override
    let finalSeverity: ThreatSeverity = r.severity;
    if (meta.cvssSeverity) {
      finalSeverity = meta.cvssSeverity;
    }

    // Phase 6: ATT&CK Validation - Require behavioral evidence, never default to T1190
    const rawTechniques = r.entities?.techniques || [];
    const validatedTechniques = rawTechniques.filter(t => {
      if (t.id === 'T1190') {
        return /web\s*server|http\s*daemon|nginx|apache|iis|public-facing|ingress\s*port/i.test(rawText);
      }
      return true;
    });

    const attkMappingText = validatedTechniques.length > 0
      ? validatedTechniques.map(t => `- ${t.id}: ${t.name}`).join('\n')
      : 'No validated ATT&CK mapping established from current evidence.';

    // Grounded Epistemic Breakdown
    const epistemicBreakdown = {
      verified_facts: [
        meta.cveId ? `Vulnerability registered as ${meta.cveId}` : isVuln ? `Vulnerability registered as ${r.entities?.cves?.[0]?.cve_id || r.title}` : `Observed telemetry: ${r.title}`,
        meta.vendor ? `Issuing authority: ${meta.vendor}` : `Reported via channel ${collectionChannel}`,
        meta.cvssScore !== null ? `CVSS Base Score: ${meta.cvssScore} (${meta.cvssSeverity || 'UNKNOWN'})` : `Source collection vehicle: ${collectionChannel}`,
        `Payload verification hash: ${r.content_hash ? r.content_hash.slice(0, 16) : 'N/A'}...`,
      ],
      analyst_assessment: [
        meta.remotelyExploitable === true
          ? 'Advisory flags remote exploitability; perimeter asset inventory and patch verification recommended.'
          : 'Active threat telemetry indicates potential operational risk; review official advisory for scope.',
      ],
      unknowns: [
        'Full downstream enterprise victim footprint unobserved in initial reporting.',
        (r.entities?.actors && r.entities.actors.length > 0)
          ? 'Threat actor identified; secondary campaign coordination unconfirmed.'
          : 'No validated threat actor attribution identified in current corpus.',
      ],
    };

    // Phase 1 & 8: Remove Synthetic Boilerplate and Implement Truthful Sections
    const section03Content = isVuln
      ? (meta.affectedProduct
          ? `Advisory details security flaw in component: ${meta.affectedProduct}.` + (meta.cvssVector ? ` Vector: ${meta.cvssVector}.` : '')
          : (meta.cveId ? `Advisory references ${meta.cveId}. Specific component details subject to vendor errata.` : 'Technical root cause not detailed in initial vendor bulletin.'))
      : (r.entities?.malware?.[0]
          ? `Observed malware telemetry associated with ${r.entities.malware[0].name}.`
          : 'Capability profile awaiting behavioral sandbox execution.');

    const section04Content = isVuln
      ? (meta.remotelyExploitable !== null
          ? `Remotely exploitable: ${meta.remotelyExploitable ? 'YES' : 'NO'}. Exposure tracked across corresponding network attack surfaces.`
          : (meta.cveId ? `Tracking threat disclosure metrics and exposure surface for ${meta.cveId}.` : 'Vulnerability disclosure metrics tracked across security advisories.'))
      : (r.entities?.malware?.[0]
          ? `Adversary infrastructure and payload distribution tracking for ${r.entities.malware[0].name}.`
          : 'Threat intelligence telemetry observed across monitored security sources.');

    const section06Content = isVuln
      ? (meta.vendor
          ? `Consult official errata from ${meta.vendor} for verified patches and remediation.`
          : 'Review relevant vendor advisory before implementing network mitigations.')
      : 'Analyze extracted technical indicators in security monitoring infrastructure.';

    // Check if report is noise/recruitment spam to quarantine
    const isJobSpam = /зарплата|опыт\s*:\s*\d|вакансия|обсуждается\s+на\s+собеседовании/i.test(rawText);
    const publicationStatus = isJobSpam ? 'QUARANTINED' : (r.publication_status || 'PUBLISHED');
    const status = isJobSpam ? 'REVIEW_REQUIRED' : (r.status || 'PUBLISHED');

    const structuredReport = {
      report_type: reportType,
      report_version: '1.0.0',
      sections: [
        { section_number: '01', title: 'EXECUTIVE ASSESSMENT', category: 'ANALYST ASSESSMENT', content: r.summary },
        { section_number: '02', title: isVuln ? 'VERIFIED FACTS' : 'MALWARE IDENTITY', category: 'VERIFIED_FACTS', content: epistemicBreakdown.verified_facts.map(f => `- ${f}`).join('\n') },
        { section_number: '03', title: isVuln ? 'VULNERABILITY ANALYSIS' : 'CAPABILITY PROFILE', category: 'ANALYST ASSESSMENT', content: section03Content },
        { section_number: '04', title: 'THREAT INTELLIGENCE CONTEXT', category: 'ANALYST ASSESSMENT', content: section04Content },
        { section_number: '05', title: 'EVIDENCE MATRIX', category: 'PROVENANCE', content: `Evidence ID: ${r.evidence?.[0]?.evidence_id || 'evi_primary'} | Issuing Authority: ${issuingAuthority} | Collection Channel: ${collectionChannel} | Weight: ${r.confidence?.overall_confidence || 0.85}` },
        { section_number: '06', title: 'ANALYST ASSESSMENT', category: 'ANALYST ASSESSMENT', content: section06Content },
        { section_number: '07', title: 'ATT&CK MAPPING', category: 'ANALYST ASSESSMENT', content: attkMappingText },
        { section_number: '08', title: 'UNKNOWN / UNRESOLVED', category: 'UNKNOWN', content: epistemicBreakdown.unknowns.map(u => `- ${u}`).join('\n') },
        { section_number: '09', title: 'KNOWLEDGE APPLIED', category: 'METADATA', content: knowledgeTrace.length > 0 ? knowledgeTrace.map((k: any) => `- ${k.title}: ${k.status}`).join('\n') : 'No knowledge corpus documents utilized for this raw advisory signal.' },
        { section_number: '10', title: 'REFERENCES & PROVENANCE', category: 'PROVENANCE', content: `Issuing Authority: ${issuingAuthority}\nCollection Channel: ${collectionChannel}\nReferences:\n${meta.referenceUrls.length > 0 ? meta.referenceUrls.map(u => `- ${u}`).join('\n') : `- ${r.citations?.[0] || 'Original message citation preserved'}`}` },
      ],
      claims: [
        {
          claim_id: 'clm_01',
          claim_text: r.title,
          epistemic_status: isVuln ? 'OBSERVED_FACT' : 'REPORTED',
          source_provenance: {
            original_source: issuingAuthority,
            collection_source: collectionChannel,
          },
          confidence_score: r.confidence?.overall_confidence || 0.85,
        },
      ],
    };

    // Update source_references to preserve separated provenance
    const updatedSourceRefs = (r.source_references && r.source_references.length > 0)
      ? r.source_references.map(s => ({
          ...s,
          issuing_authority: issuingAuthority,
          collection_channel: collectionChannel,
        }))
      : [{
          source_id: r.source_id,
          handle: r.source_handle || null,
          title: issuingAuthority,
          url: r.source_references?.[0]?.url || null,
          message_id: r.message_id,
          published_at: r.message_timestamp || r.created_at,
          authority_tier: meta.vendor ? 1 : (r.source_references?.[0]?.authority_tier || 3),
        }];

    return {
      ...r,
      severity: finalSeverity,
      status: status as any,
      publication_status: publicationStatus as any,
      report_type: reportType,
      structured_report: structuredReport,
      knowledge_trace: knowledgeTrace,
      epistemic_breakdown: epistemicBreakdown,
      source_references: updatedSourceRefs as any,
    };
  }

  getIntelligenceReportById(id: string): CanonicalIntelligenceObject | null {
    const direct = this.intelligenceReports.get(id);
    if (direct) return this.ensureStructuredFields(direct);
    for (const r of this.intelligenceReports.values()) {
      if (r.intelligence_id === id || r.deduplication_key === id || r.content_hash.startsWith(id)) {
        return this.ensureStructuredFields(r);
      }
    }
    return null;
  }

  getIntelligenceStats() {
    return {
      messages_ingested: Math.max(this.messagesIngested, this.messagesReceived),
      messages_normalized: Math.max(this.messagesNormalized, this.messagesReceived),
      messages_filtered: this.messagesFiltered,
      messages_analyzed: Math.max(this.messagesAnalyzed, this.reportsCreated),
      reports_created: this.reportsCreated,
      reports_published: this.reportsPublished,
      reports_review_required: this.reportsReviewRequired,
      ai_failures: this.aiFailures,
      duplicates_prevented: this.duplicatesDropped,
    };
  }

  private async persistRegistry(): Promise<void> {
    try {
      const obj: Record<string, TelegramSourceRecord> = {};
      for (const [k, v] of this.sourcesRegistry.entries()) {
        obj[k] = v;
      }
      await this.ctx.storage.put('sources_registry', obj);
    } catch (err: any) {
      console.error('[TelegramCollectorDO] Registry persist error:', err);
    }
  }

  /**
   * Automatic taxonomy classifier for discovered Telegram channels.
   */
  classifySource(title: string, handle?: string | null): {
    category: string;
    subcategories: string[];
    authorityTier: number;
    trustScore: number;
  } {
    const text = `${title || ''} ${handle || ''}`.toLowerCase();
    const subcategories: string[] = [];
    let category = 'COMMUNITY';
    let authorityTier = 3;
    let trustScore = 0.50;

    if (/cve|vulnerabilit|0day|zeroday|nvd|exploit|patch|advisory|rce|poc/.test(text)) {
      category = 'VULNERABILITIES';
      subcategories.push('EXPLOITS', 'ADVISORIES');
      trustScore = 0.65;
      authorityTier = 2;
    } else if (/cti|threat|intel|malwr|apt|actor|adversary|campaign|cyber_watch|fresh_intel/.test(text)) {
      category = 'THREAT_INTELLIGENCE';
      subcategories.push('APT', 'THREAT_ACTORS');
      trustScore = 0.60;
      authorityTier = 2;
    } else if (/malware|ransom|lockbit|loader|trojan|stealer|botnet|rootkit|payload/.test(text)) {
      category = 'MALWARE';
      subcategories.push('RANSOMWARE', 'BOTNETS');
      trustScore = 0.60;
      authorityTier = 2;
    } else if (/revers|ida|ghidra|decompile|disasm|binwalk|binary|assembly/.test(text)) {
      category = 'REVERSE_ENGINEERING';
      subcategories.push('BINARY_ANALYSIS', 'TOOLS');
      trustScore = 0.55;
      authorityTier = 2;
    } else if (/osint|geoint|investigation|rozysk|tracking|reconnaissance/.test(text)) {
      category = 'OSINT';
      subcategories.push('INVESTIGATION', 'RECON');
      trustScore = 0.50;
      authorityTier = 3;
    } else if (/blueteam|soc|dfir|incident|siem|detection|hunting|sigma|forensic/.test(text)) {
      category = 'BLUE_TEAM';
      subcategories.push('DFIR', 'SOC');
      trustScore = 0.60;
      authorityTier = 2;
    } else if (/redteam|pentest|offensive|burp|bypass|hack|security/.test(text)) {
      category = 'RED_TEAM';
      subcategories.push('PENTESTING', 'OFFENSIVE_TOOLS');
      trustScore = 0.50;
      authorityTier = 3;
    } else if (/ai|llm|machine learning|deep learning|gpt|model|ai security/.test(text)) {
      category = 'AI_SECURITY';
      subcategories.push('AI', 'TOOLS');
      trustScore = 0.50;
      authorityTier = 3;
    } else if (/python|golang|rust|programming|dev|code|script|developer/.test(text)) {
      category = 'PROGRAMMING';
      subcategories.push('DEVELOPMENT', 'TOOLS');
      trustScore = 0.50;
      authorityTier = 3;
    } else if (/news|journalism|breach|leak|seclab|thehackernews|bleeping/.test(text)) {
      category = 'NEWS';
      subcategories.push('JOURNALISM', 'INDUSTRY_UPDATES');
      trustScore = 0.60;
      authorityTier = 2;
    } else if (/cloud|aws|azure|gcp|kubernetes|docker/.test(text)) {
      category = 'CLOUD_SECURITY';
      subcategories.push('INFRASTRUCTURE');
      trustScore = 0.55;
      authorityTier = 3;
    }

    return { category, subcategories, authorityTier, trustScore };
  }

  /**
   * Discovers all dialogs from the authenticated Telegram account,
   * validates eligibility, enforces Anti-Recursion Firewall,
   * classifies categories, assigns scalable shards, registers into DO SQLite,
   * and expands monitoredChannels dynamically!
   */
  async autoRegisterAllDiscovered(): Promise<{
    total_discovered: number;
    eligible_count: number;
    auto_registered_count: number;
    monitored_count: number;
    blocked_count: number;
    ineligible_count: number;
    channels: string[];
  }> {
    if (!this.client || this.status !== 'CONNECTED') {
      await this.connect();
    }
    if (!this.client || this.status !== 'CONNECTED') {
      throw new Error('Telegram client not connected');
    }

    const dialogs = await this.client.getDialogs({});
    const newChannels: string[] = [...this.monitoredChannels];
    let eligibleCount = 0;
    let autoRegisteredCount = 0;
    let blockedCount = 0;
    let ineligibleCount = 0;

    for (const d of dialogs as any[]) {
      const telegramId = d.id?.toString() || d.entity?.id?.toString() || '';
      const rawUsername = d.entity?.username || null;
      const handle = rawUsername ? rawUsername.trim().replace(/^@+/, '').toLowerCase() : null;
      const title = (d.title || d.entity?.title || d.name || '').trim();
      const entityType = d.entity?.broadcast ? 'channel' : (d.entity?.megagroup ? 'supergroup' : 'chat');

      // ── 1. ANTI-RECURSION FIREWALL GATE ──
      if (
        (handle && BANNED_MONITORED_CHANNELS.has(handle)) ||
        title.includes('ZAYRON-X') ||
        title.includes('Z.X.Intelligence')
      ) {
        blockedCount++;
        console.warn(`[TelegramCollectorDO] Anti-recursion guard: Strictly blocking outbound channel @${handle || title}`);
        if (handle) {
          this.monitoredChannels = this.monitoredChannels.filter(c => c !== handle);
        }
        continue;
      }

      // ── 2. INELIGIBLE DIALOGS (Personal Chats, 777000, etc.) ──
      if (telegramId === '777000' || entityType === 'chat' || (!handle && !telegramId)) {
        ineligibleCount++;
        continue;
      }

      // ── 3. ELIGIBLE CHANNEL / SUPERGROUP PROMOTION ──
      eligibleCount++;
      const lookupKey = handle || telegramId;

      // Classify the source
      const classification = this.classifySource(title, handle);
      const shardId = computeShardForSource(lookupKey, 6);

      // Check if already registered
      let existing = this.sourcesRegistry.get(lookupKey);
      if (!existing && handle) {
        existing = this.sourcesRegistry.get(handle);
      }

      if (!existing) {
        autoRegisteredCount++;
        const newRecord: TelegramSourceRecord = {
          id: handle ? `tg_${handle}` : `tg_${telegramId.replace(/^-+/, '')}`,
          handle: handle || null,
          telegram_id: telegramId,
          display_name: title || (handle ? `@${handle}` : `Channel ${telegramId}`),
          url: handle ? `https://t.me/${handle}` : null,
          category: classification.category,
          subcategories: classification.subcategories,
          topic: 'Cyber Threat Intelligence & Telemetry',
          authority_tier: classification.authorityTier,
          trust_score: classification.trustScore,
          enabled: true,
          status: 'ENABLED',
          monitoring_status: 'MONITORED',
          verification_status: 'VERIFIED',
          eligibility_status: 'ELIGIBLE',
          collector_id: 'global-telegram-collector',
          shard_id: shardId,
          message_count: 0,
          error_count: 0,
          last_error: null,
          last_seen_at: new Date().toISOString(),
          last_successful_ingestion_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        this.sourcesRegistry.set(lookupKey, newRecord);
        if (handle) this.sourcesRegistry.set(handle, newRecord);
      } else {
        existing.status = 'ENABLED';
        existing.enabled = true;
        existing.monitoring_status = 'MONITORED';
        existing.updated_at = new Date().toISOString();
      }

      if (handle && !newChannels.includes(handle)) {
        newChannels.push(handle);
      }
    }

    this.monitoredChannels = newChannels;
    await this.persistState();
    await this.persistRegistry();

    console.log(`[TelegramCollectorDO] Autonomous expansion complete: ${dialogs.length} dialogs evaluated, ${eligibleCount} eligible, ${this.sourcesRegistry.size} registered, ${this.monitoredChannels.length} active channels.`);

    return {
      total_discovered: dialogs.length,
      eligible_count: eligibleCount,
      auto_registered_count: autoRegisteredCount,
      monitored_count: this.monitoredChannels.length,
      blocked_count: blockedCount,
      ineligible_count: ineligibleCount,
      channels: this.monitoredChannels,
    };
  }

  /**
   * Periodic DO Alarm for keepalive, health check, dynamic source refresh,
   * and autonomous promotion of discovered Telegram sources.
   */
  async alarm(): Promise<void> {
    if (this.env.LEGACY_FREEZE === 'true') return;
    console.log('[TelegramCollectorDO] Alarm fired: verifying connectivity & syncing sources.');
    try {
      await this.syncSourcesFromD1();
      
      // If disconnected and session exists, attempt reconnect
      if (this.status !== 'CONNECTED' && !this.isConnecting) {
        const sessionStr = await this.ctx.storage.get<string>('telegram_session') ||
                           this.env.TELEGRAM_STRING_SESSION ||
                           this.env.TELEGRAM_SESSION ||
                           this.env.TELEGRAM_SESSION_STRING;
        if (sessionStr) {
          await this.connect(sessionStr);
        }
      }

      // If connected, automatically run discovery & autonomous source promotion
      if (this.status === 'CONNECTED' && this.client) {
        await this.autoRegisterAllDiscovered();
      }
    } catch (err: any) {
      console.error('[TelegramCollectorDO] Alarm execution error:', err);
    } finally {
      // Schedule next alarm in 60s
      await this.ctx.storage.setAlarm(Date.now() + 60000);
    }
  }

  /**
   * Synchronizes monitored threat channels dynamically from D1 sources table.
   */
  async syncSourcesFromD1(): Promise<string[]> {
    try {
      const { results } = await this.env.DB.prepare(
        "SELECT id, handle, display_name, url, category, topic, authority_tier, trust_score, enabled, monitoring_status, verification_status, shard_id FROM sources WHERE source_type = 'telegram' AND enabled = 1"
      ).all();

      const newChannels: string[] = [];
      for (const row of results as any[]) {
        const url = row.url || '';
        const display = row.display_name || '';
        let uname = row.handle || '';
        if (!uname) {
          if (url.includes('t.me/')) {
            uname = url.split('t.me/')[1]?.split('/')[0]?.replace('@', '');
          } else if (display.startsWith('@')) {
            uname = display.replace('@', '');
          }
        }
        uname = (uname || '').trim().replace(/^@+/, '').toLowerCase();
        
        if (uname && !newChannels.includes(uname)) {
          if (BANNED_MONITORED_CHANNELS.has(uname)) {
            console.warn(`[TelegramCollectorDO] Anti-recursion guard: refusing to monitor outbound channel @${uname}`);
            continue;
          }
          if (row.monitoring_status === 'DISABLED' || row.monitoring_status === 'PAUSED') {
            continue;
          }
          newChannels.push(uname);

          // Update DO registry entry
          const existing = this.sourcesRegistry.get(uname);
          this.sourcesRegistry.set(uname, {
            id: row.id || `tg_${uname}`,
            handle: uname,
            display_name: row.display_name || `@${uname}`,
            url: row.url || `https://t.me/${uname}`,
            category: row.category || 'Cyber Threat Intelligence',
            topic: row.topic || 'Telemetry & Exploit Disclosures',
            authority_tier: row.authority_tier ?? 1,
            trust_score: row.trust_score ?? 0.50,
            enabled: true,
            status: 'ENABLED',
            monitoring_status: row.monitoring_status || 'MONITORED',
            verification_status: row.verification_status || 'UNVERIFIED',
            collector_id: 'global-telegram-collector',
            shard_id: row.shard_id || computeShardForSource(uname, 6),
            message_count: existing?.message_count || 0,
            error_count: existing?.error_count || 0,
            last_error: existing?.last_error || null,
            last_seen_at: existing?.last_seen_at || null,
            last_successful_ingestion_at: existing?.last_successful_ingestion_at || null,
            created_at: existing?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      if (newChannels.length > 0) {
        this.monitoredChannels = newChannels;
        await this.persistState();
        await this.persistRegistry();
      }
      return this.monitoredChannels;
    } catch (err: any) {
      console.warn('[TelegramCollectorDO] D1 sync warning (relying on memory/SQLite):', err.message);
      return this.monitoredChannels;
    }
  }

  /**
   * Connects to Telegram MTProto session.
   */
  async connect(sessionString?: string): Promise<{ success: boolean; message: string }> {
    if (this.client && this.status === 'CONNECTED') {
      return { success: true, message: 'Already connected to Telegram MTProto' };
    }

    if (this.isConnecting) {
      return { success: false, message: 'Connection already in progress' };
    }

    this.isConnecting = true;
    this.status = 'CONNECTING';

    try {
      const sessionStr = sessionString ||
                         await this.ctx.storage.get<string>('telegram_session') ||
                         this.env.TELEGRAM_STRING_SESSION ||
                         this.env.TELEGRAM_SESSION ||
                         this.env.TELEGRAM_SESSION_STRING;

      if (!sessionStr) {
        this.status = 'AUTH_REQUIRED';
        this.isConnecting = false;
        return { success: false, message: 'Missing Telegram session string. POST to /session or provide TELEGRAM_STRING_SESSION secret.' };
      }

      const stringSession = new StringSession(sessionStr);
      this.client = new TelegramClient(stringSession, this.env.API_ID, this.env.API_HASH, {
        connectionRetries: 5,
        useWSS: true,
      });

      console.log('[TelegramCollectorDO] Initializing GramJS TelegramClient via WebSocket transport...');
      await this.client.connect();

      const isAuthorized = await this.client.checkAuthorization();
      if (!isAuthorized) {
        this.status = 'AUTH_FAILED';
        this.isConnecting = false;
        return { success: false, message: 'Telegram session invalid or revoked. Re-authentication required.' };
      }

      // Persist verified session
      await this.ctx.storage.put('telegram_session', sessionStr);

      this.status = 'CONNECTED';
      this.reconnectAttempts = 0;
      this.isConnecting = false;

      // Register live message handler
      this.client.addEventHandler(async (event: NewMessageEvent) => {
        await this.handleIncomingMessage(event);
      }, new NewMessage({}));

      // Ensure alarm is scheduled for lifecycle keepalive
      await this.ctx.storage.setAlarm(Date.now() + 60000);

      // Trigger automatic source expansion on connect
      try {
        await this.autoRegisterAllDiscovered();
      } catch (err: any) {
        console.warn('[TelegramCollectorDO] Initial auto-registration on connect warning:', err.message);
      }

      console.log(`[TelegramCollectorDO] Connected to Telegram MTProto. Monitoring ${this.monitoredChannels.length} channels.`);
      return { success: true, message: 'Connected to Telegram MTProto successfully' };
    } catch (err: any) {
      this.isConnecting = false;
      this.reconnectAttempts++;
      this.status = this.reconnectAttempts > 5 ? 'DEGRADED' : 'RECONNECTING';
      this.errorsCount++;
      this.lastErrorMessage = err.message || 'Connection error';
      console.error('[TelegramCollectorDO] MTProto Connection failed:', err);
      return { success: false, message: `Connection error: ${err.message}` };
    }
  }

  /**
   * Transforms raw Telegram telemetry into a verified Canonical Intelligence Object (Schema 1.0.0).
   * Executes: Normalization -> Quality Gate -> Entity Extraction -> Classification -> Confidence -> Grounded Evidence -> Publication Gate
   */
  processCanonicalSignal(params: {
    sourceId: string;
    telegramId?: string | null;
    handle?: string | null;
    title: string;
    messageId: string;
    rawText: string;
    sourceUrl?: string;
    publishedAt?: string;
    sourceTrust?: number;
    authorityTier?: number;
  }): CanonicalIntelligenceObject | null {
    const rawText = params.rawText.trim();
    if (!rawText || rawText.length < 15) return null;

    this.messagesIngested++;
    this.messagesNormalized++;

    // 1. Entity Extraction & Quality Gate
    const entities = extractCanonicalEntities(rawText);
    const quality = evaluateSignalQuality({
      text: rawText,
      hasEntities: entities.cves.length > 0 || entities.actors.length > 0 || entities.malware.length > 0,
      cveCount: entities.cves.length,
      indicatorCount: entities.indicators.length,
      sourceTrust: params.sourceTrust || 0.85,
    });

    if (!quality.isPublishable) {
      this.messagesFiltered++;
      return null;
    }

    this.messagesAnalyzed++;

    // 2. Deterministic Hash & Dedup Key
    let hash = 0;
    for (let i = 0; i < rawText.length; i++) {
      hash = (hash << 5) - hash + rawText.charCodeAt(i);
      hash |= 0;
    }
    const contentHash = Math.abs(hash).toString(16).padStart(16, '0') + (rawText.length.toString(16).padStart(4, '0'));
    const dedupKey = `${params.sourceId}:${params.messageId}:${contentHash.slice(0, 16)}`;

    // 3. Classification
    const classification = this.classifySource(rawText, params.handle || undefined);
    const primaryCategory = (classification.category as any) || 'THREAT_INTELLIGENCE';
    const categories = [primaryCategory, ...(classification.subcategories || [])];

    // 4. Advisory Metadata Extraction & Headline derivation
    const meta = parseAdvisoryMetadata(rawText);
    const firstLine = rawText.split('\n')[0].replace(/^[#*>\-\s]+/, '').slice(0, 100).trim();
    const title = meta.cveId
      ? `${meta.cveId}: ${firstLine || 'Vulnerability Disclosure'}`
      : entities.cves[0]
      ? `${entities.cves[0].cve_id}: ${firstLine || 'Vulnerability Disclosure'}`
      : entities.actors[0]
      ? `${entities.actors[0].name}: ${firstLine || 'Adversary Threat Activity'}`
      : entities.malware[0]
      ? `${entities.malware[0].name}: ${firstLine || 'Malware Telemetry'}`
      : (firstLine || 'Cyber Threat Intelligence Telemetry');

    const summary = rawText.length > 300 ? rawText.slice(0, 300) + '...' : rawText;

    // 5. Severity & Priority (Phase 3: CVSS authoritative, no keyword override)
    let severity: ThreatSeverity = 'MEDIUM';
    if (meta.cvssSeverity) {
      severity = meta.cvssSeverity;
    } else if (entities.cves.length > 0 && /rce|remote code execution|zero-day|0-day|in the wild|actively exploited/i.test(rawText)) {
      severity = 'CRITICAL';
    } else if (entities.cves.length > 0 || entities.malware.length > 0 || /exploit|privilege escalation|critical/i.test(rawText)) {
      severity = 'HIGH';
    } else if (/informational|advisory|guide|research|release/i.test(rawText)) {
      severity = 'LOW';
    }
    const priority: TriagePriority = severity === 'CRITICAL' ? 'P1' : severity === 'HIGH' ? 'P2' : 'P3';

    // 6. Analytical Confidence
    const confidence = calculateConfidenceVector(
      params.sourceTrust || 0.85,
      rawText.length > 200 ? 0.9 : 0.7,
      entities.cves.length > 0 ? 0.95 : entities.indicators.length > 0 ? 0.8 : 0.65
    );

    const intelId = `intel_${contentHash.slice(0, 16)}`;
    const evidenceId = `evi_${contentHash.slice(0, 12)}`;

    // 7. Grounded Evidence & Provenance (Phase 2: Distinguish issuing authority from collection channel)
    const isVuln = entities.cves.length > 0 || !!meta.cveId;
    const isMalw = entities.malware.length > 0;
    const issuingAuthority = meta.vendor || (isVuln ? 'Vulnerability Disclosure Authority' : params.title);
    const collectionChannel = params.handle ? `@${params.handle}` : params.title;

    const evidenceItem: CanonicalEvidenceItem = {
      evidence_id: evidenceId,
      intelligence_id: intelId,
      claim: title,
      evidence_type: isVuln ? 'CVE_DISCLOSURE' : 'TELEGRAM_TELEMETRY',
      source_message_id: params.messageId,
      source_id: params.sourceId,
      quoted_excerpt: summary.slice(0, 200),
      source_timestamp: params.publishedAt || new Date().toISOString(),
      source_url: params.sourceUrl || (params.handle ? `https://t.me/${params.handle}/${params.messageId}` : ''),
      confidence: confidence.overall_confidence,
      created_at: new Date().toISOString(),
    };

    const sourceRef: CanonicalSourceReference = {
      source_id: params.sourceId,
      handle: params.handle || null,
      title: issuingAuthority,
      url: params.sourceUrl || (params.handle ? `https://t.me/${params.handle}` : null),
      message_id: params.messageId,
      published_at: params.publishedAt || new Date().toISOString(),
      authority_tier: meta.vendor ? 1 : (params.authorityTier || 3),
    };

    // 8. AI Threat Analysis Block
    const aiAnalysis: AIAnalysisBlock = {
      threat_summary: summary,
      why_it_matters: isVuln
        ? (meta.remotelyExploitable === true
            ? 'Advisory flags remote exploitability; perimeter asset inventory and patch verification recommended.'
            : 'Active threat telemetry indicates potential operational risk; review official advisory for scope.')
        : `Telemetry indicates active operational risk associated with ${primaryCategory.toLowerCase()} vector.`,
      threat_type: primaryCategory,
      recommended_actions: isVuln
        ? [
            meta.vendor ? `Consult official errata from ${meta.vendor} for verified remediation.` : 'Review official advisory errata.',
            'Inspect network attack surfaces for affected component instances',
            'Verify patch deployment across production environments',
          ]
        : [
            'Inspect SIEM and perimeter firewalls for associated indicators',
            'Isolate compromised endpoints exhibiting corresponding behavior',
          ],
      timeline: [
        { event: 'Initial telemetry observation in Telegram source network', timestamp: params.publishedAt || new Date().toISOString() },
        { event: 'Canonical ingestion, normalization, and quality gate validation', timestamp: new Date().toISOString() },
      ],
      epistemic_status: isVuln ? 'OBSERVED' : 'REPORTED',
    };

    // 8. Domain-Aware Knowledge Retrieval & Epistemic Partitioning
    const reportType: 'VULNERABILITY' | 'MALWARE' | 'THREAT_ACTOR' | 'CAMPAIGN' | 'GENERAL_CTI' =
      isVuln ? 'VULNERABILITY' : isMalw ? 'MALWARE' : entities.actors.length > 0 ? 'THREAT_ACTOR' : 'GENERAL_CTI';

    // Phase 4: Knowledge Trace Honesty - Empty until true retrieval runs
    const knowledgeTrace: any[] = [];

    // Phase 6: ATT&CK Validation - Require behavioral evidence, never default to T1190
    const rawTechniques = entities.techniques || [];
    const validatedTechniques = rawTechniques.filter(t => {
      if (t.id === 'T1190') {
        return /web\s*server|http\s*daemon|nginx|apache|iis|public-facing|ingress\s*port/i.test(rawText);
      }
      return true;
    });

    const attkMappingText = validatedTechniques.length > 0
      ? validatedTechniques.map(t => `- ${t.id}: ${t.name}`).join('\n')
      : 'No validated ATT&CK mapping established from current evidence.';

    const epistemicBreakdown = {
      verified_facts: [
        meta.cveId ? `Vulnerability registered as ${meta.cveId}` : isVuln ? `Vulnerability identified as ${entities.cves[0]?.cve_id || title}` : `Observed telemetry from ${params.title}`,
        meta.vendor ? `Issuing authority: ${meta.vendor}` : `Signal ingested from ${params.handle ? `@${params.handle}` : params.sourceId} without synthetic modification`,
        meta.cvssScore !== null ? `CVSS Base Score: ${meta.cvssScore} (${meta.cvssSeverity || 'UNKNOWN'})` : `Source collection vehicle: ${collectionChannel}`,
        `Payload verification hash: ${contentHash.slice(0, 16)}...`,
      ],
      analyst_assessment: [
        meta.remotelyExploitable === true
          ? 'Advisory flags remote exploitability; perimeter asset inventory and patch verification recommended.'
          : 'Risk profile indicates active operational threat potential. Immediate validation of perimeter controls recommended.',
      ],
      unknowns: [
        'Complete downstream enterprise victim footprint unobserved in initial reporting.',
        entities.actors.length === 0 ? 'No validated threat actor attribution identified in current corpus.' : 'Affiliate coordination remains unconfirmed.',
      ],
    };

    // Phase 1: Clean Truthful Sections (Zero Synthetic Boilerplate)
    const section03Content = isVuln
      ? (meta.affectedProduct
          ? `Advisory details security flaw in component: ${meta.affectedProduct}.` + (meta.cvssVector ? ` Vector: ${meta.cvssVector}.` : '')
          : (meta.cveId ? `Advisory references ${meta.cveId}. Specific component details subject to vendor errata.` : 'Technical root cause not detailed in initial vendor bulletin.'))
      : (entities.malware[0]
          ? `Observed malware telemetry associated with ${entities.malware[0].name}.`
          : 'Capability profile awaiting behavioral sandbox execution.');

    const section04Content = isVuln
      ? (meta.remotelyExploitable !== null
          ? `Remotely exploitable: ${meta.remotelyExploitable ? 'YES' : 'NO'}. Exposure tracked across corresponding network attack surfaces.`
          : (meta.cveId ? `Tracking threat disclosure metrics and exposure surface for ${meta.cveId}.` : 'Vulnerability disclosure metrics tracked across security advisories.'))
      : (entities.malware[0]
          ? `Adversary infrastructure and payload distribution tracking for ${entities.malware[0].name}.`
          : 'Threat intelligence telemetry observed across monitored security sources.');

    const section06Content = isVuln
      ? (meta.vendor
          ? `Consult official errata from ${meta.vendor} for verified patches and remediation.`
          : 'Review relevant vendor advisory before implementing network mitigations.')
      : 'Analyze extracted technical indicators in security monitoring infrastructure.';

    const structuredReport = {
      report_type: reportType,
      report_version: '1.0.0',
      sections: [
        { section_number: '01', title: 'EXECUTIVE ASSESSMENT', category: 'ANALYST ASSESSMENT', content: summary },
        { section_number: '02', title: isVuln ? 'VERIFIED FACTS' : 'MALWARE IDENTITY', category: 'VERIFIED_FACTS', content: epistemicBreakdown.verified_facts.map(f => `- ${f}`).join('\n') },
        { section_number: '03', title: isVuln ? 'VULNERABILITY ANALYSIS' : 'CAPABILITY PROFILE', category: 'ANALYST ASSESSMENT', content: section03Content },
        { section_number: '04', title: 'THREAT INTELLIGENCE CONTEXT', category: 'ANALYST ASSESSMENT', content: section04Content },
        { section_number: '05', title: 'EVIDENCE MATRIX', category: 'PROVENANCE', content: `Evidence ID: ${evidenceId} | Issuing Authority: ${issuingAuthority} | Collection Channel: ${collectionChannel} | Weight: ${confidence.overall_confidence}` },
        { section_number: '06', title: 'ANALYST ASSESSMENT', category: 'ANALYST ASSESSMENT', content: section06Content },
        { section_number: '07', title: 'ATT&CK MAPPING', category: 'ANALYST ASSESSMENT', content: attkMappingText },
        { section_number: '08', title: 'UNKNOWN / UNRESOLVED', category: 'UNKNOWN', content: epistemicBreakdown.unknowns.map(u => `- ${u}`).join('\n') },
        { section_number: '09', title: 'KNOWLEDGE APPLIED', category: 'METADATA', content: knowledgeTrace.length > 0 ? knowledgeTrace.map((k: any) => `- ${k.title}: ${k.status}`).join('\n') : 'No knowledge corpus documents utilized for this raw advisory signal.' },
        { section_number: '10', title: 'REFERENCES & PROVENANCE', category: 'PROVENANCE', content: `Issuing Authority: ${issuingAuthority}\nCollection Channel: ${collectionChannel}\nReferences:\n${meta.referenceUrls.length > 0 ? meta.referenceUrls.map(u => `- ${u}`).join('\n') : `- ${params.sourceUrl || (params.handle ? `https://t.me/${params.handle}/${params.messageId}` : params.title)}`}` },
      ],
      claims: [
        {
          claim_id: 'clm_01',
          claim_text: title,
          epistemic_status: isVuln ? 'OBSERVED_FACT' : 'REPORTED',
          source_provenance: {
            original_source: issuingAuthority,
            collection_source: collectionChannel,
          },
          confidence_score: confidence.overall_confidence,
        },
      ],
    };

    const report: CanonicalIntelligenceObject = {
      intelligence_id: intelId,
      schema_version: '1.0.0',
      source_id: params.sourceId,
      telegram_source_id: params.telegramId || null,
      source_handle: params.handle || null,
      source_title: params.title,
      source_category: primaryCategory,
      source_language: 'en',
      source_region: 'GLOBAL',
      message_id: params.messageId,
      message_timestamp: params.publishedAt || new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      title,
      summary,
      body: rawText,
      intelligence_type: primaryCategory.toLowerCase(),
      categories: categories as any,
      subcategories: classification.subcategories || [],
      severity,
      priority,
      confidence,
      entities: {
        actors: entities.actors,
        malware: entities.malware,
        cves: entities.cves,
        campaigns: [],
        tools: [],
        techniques: validatedTechniques,
        victims: [],
        organizations: [],
        regions: ['GLOBAL'],
      },
      indicators: entities.indicators,
      evidence: [evidenceItem],
      citations: meta.referenceUrls.length > 0 ? meta.referenceUrls : [params.sourceUrl || (params.handle ? `https://t.me/${params.handle}/${params.messageId}` : params.title)],
      source_references: [sourceRef],
      ai_analysis: aiAnalysis,
      ai_model: CURRENT_AI_MODEL,
      ai_model_version: CURRENT_AI_MODEL_VERSION,
      ai_prompt_version: CURRENT_PROMPT_VERSION,
      report_type: reportType,
      structured_report: structuredReport,
      knowledge_trace: knowledgeTrace,
      epistemic_breakdown: epistemicBreakdown,
      deduplication_key: dedupKey,
      content_hash: contentHash,
      status: 'PUBLISHED',
      publication_status: 'PUBLISHED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 9. Publication Gate
    const pubGate = evaluatePublicationGate(report);
    if (!pubGate.passed) {
      report.status = 'REVIEW_REQUIRED';
      report.publication_status = 'REVIEW_REQUIRED';
      this.reportsReviewRequired++;
    } else {
      this.reportsPublished++;
    }

    this.reportsCreated++;
    this.ctx.waitUntil(this.storeIntelligenceReport(report));
    return report;
  }

  /**
   * Processes live message from Telegram and enqueues to zayron-ingest-queue.
   */
  async handleIncomingMessage(event: NewMessageEvent): Promise<void> {
    try {
      const message = event.message;
      const text = message.text || message.message || '';
      if (!text || text.trim().length < 10) return;

      const chat: any = await event.getChat();
      const channelTitle = chat?.title || 'Telegram Channel';
      const channelUsername = chat?.username ? chat.username.trim().replace(/^@+/, '').toLowerCase() : null;
      const channelId = chat?.id ? Number(chat.id) : 0;

      // ── STRICT ANTI-RECURSION FIREWALL ──────────────────────────────
      // Never ingest anything posted to or originating from our own outbound channel
      if (
        (channelUsername && BANNED_MONITORED_CHANNELS.has(channelUsername)) ||
        channelTitle.includes('ZAYRON-X') ||
        channelTitle.includes('Z.X.Intelligence')
      ) {
        console.warn(`[TelegramCollectorDO] Anti-recursion guard: Dropping incoming message from outbound channel @${channelUsername || channelTitle}`);
        return;
      }

      this.messagesReceived++;
      this.lastReceivedAt = new Date().toISOString();

      // Compute SHA-256 content hash
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(text.trim()));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (this.knownHashes.has(contentHash)) {
        this.duplicatesDropped++;
        return;
      }
      this.knownHashes.add(contentHash);
      if (this.knownHashes.size > 10000) {
        const first = this.knownHashes.values().next().value;
        if (first) this.knownHashes.delete(first);
      }

      // Auto-register source dynamically if not seen yet
      const lookupKey = channelUsername || String(channelId);
      let reg = this.sourcesRegistry.get(lookupKey);
      if (!reg && channelUsername) reg = this.sourcesRegistry.get(channelUsername);

      if (!reg) {
        const classification = this.classifySource(channelTitle, channelUsername);
        const newRecord: TelegramSourceRecord = {
          id: channelUsername ? `tg_${channelUsername}` : `tg_${Math.abs(channelId)}`,
          telegram_id: String(channelId),
          handle: channelUsername || null,
          display_name: channelTitle,
          url: channelUsername ? `https://t.me/${channelUsername}` : null,
          category: classification.category,
          subcategories: classification.subcategories,
          topic: 'Telemetry & Exploit Disclosures',
          authority_tier: classification.authorityTier,
          trust_score: classification.trustScore,
          enabled: true,
          status: 'ENABLED',
          monitoring_status: 'MONITORED',
          verification_status: 'VERIFIED',
          eligibility_status: 'ELIGIBLE',
          collector_id: 'global-telegram-collector',
          shard_id: computeShardForSource(lookupKey, 6),
          message_count: 1,
          error_count: 0,
          last_error: null,
          last_seen_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
          last_successful_ingestion_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.sourcesRegistry.set(lookupKey, newRecord);
        if (channelUsername) this.sourcesRegistry.set(channelUsername, newRecord);
        if (channelUsername && !this.monitoredChannels.includes(channelUsername)) {
          this.monitoredChannels.push(channelUsername);
        }
      } else {
        reg.message_count = (reg.message_count || 0) + 1;
        reg.last_seen_at = new Date().toISOString();
        reg.last_message_at = new Date().toISOString();
        reg.last_successful_ingestion_at = new Date().toISOString();
      }

      const messageId = Number(message.id);
      const timestamp = message.date ? Number(message.date) : Math.floor(Date.now() / 1000);

      const sourceId = channelUsername ? `tg_${channelUsername}` : `tg_${Math.abs(channelId)}`;

      // Construct canonical ingestion payload
      const payload = {
        sourceId,
        sourceName: channelTitle,
        externalMessageId: String(messageId),
        externalChannelId: String(channelId),
        contentHash,
        rawText: text,
        sourceUrl: channelUsername ? `https://t.me/${channelUsername}/${messageId}` : undefined,
        publishedAt: new Date(timestamp * 1000).toISOString(),
        receivedAt: new Date().toISOString(),
      };

      // ── Process through Canonical Intelligence Pipeline (Transforms into Verified Report) ──
      try {
        this.processCanonicalSignal({
          sourceId,
          telegramId: String(channelId),
          handle: channelUsername,
          title: channelTitle,
          messageId: String(messageId),
          rawText: text,
          sourceUrl: channelUsername ? `https://t.me/${channelUsername}/${messageId}` : undefined,
          publishedAt: new Date(timestamp * 1000).toISOString(),
          sourceTrust: reg?.trust_score || 0.85,
          authorityTier: reg?.authority_tier || 1,
        });
      } catch (procErr: any) {
        console.warn('[TelegramCollectorDO] Direct canonical pipeline processing error (continuing queue dispatch):', procErr.message);
      }

      // Dispatch directly to Cloudflare Queue
      await this.env.INGEST_QUEUE.send(payload);

      this.messagesDispatched++;
      this.lastSuccessAt = new Date().toISOString();
      await this.persistState();

      console.log(`[TelegramCollectorDO] Dispatched signal from ${channelTitle} [MsgID: ${messageId}] to INGEST_QUEUE`);
    } catch (err: any) {
      this.errorsCount++;
      this.lastErrorMessage = err.message || 'Message processing error';
      console.error('[TelegramCollectorDO] Message handler error:', err);
    }
  }

  /**
   * Fetches recent messages from a channel (for backfill / test verification).
   */
  async fetchChannelRecent(channelUsername: string, limit: number = 3): Promise<any[]> {
    if (!this.client || this.status !== 'CONNECTED') {
      throw new Error('Telegram client is not connected');
    }

    try {
      const entity = await this.client.getEntity(channelUsername);
      const messages = await this.client.getMessages(entity, { limit });
      const results = [];

      for (const msg of messages) {
        if (msg.text) {
          results.push({
            id: msg.id,
            date: msg.date,
            text: msg.text,
          });
        }
      }

      return results;
    } catch (err: any) {
      console.error(`[TelegramCollectorDO] Failed to fetch recent from @${channelUsername}:`, err);
      throw err;
    }
  }

  /**
   * Returns live telemetry state.
   */
  getHealthState(): CollectorTelemetry & {
    total_discovered?: number;
    total_registered?: number;
    total_monitored?: number;
    total_blocked?: number;
    total_ineligible?: number;
    auto_monitoring_enabled?: boolean;
    shard_distribution?: Record<string, number>;
  } {
    const seen = new Set<string>();
    let totalRegistered = 0;
    let totalMonitored = 0;
    let totalBlocked = 1; // @zayronxai firewall
    let totalIneligible = 0;
    const shardDistribution: Record<string, number> = {
      shard_01: 0,
      shard_02: 0,
      shard_03: 0,
      shard_04: 0,
      shard_05: 0,
      shard_06: 0,
    };

    for (const s of this.sourcesRegistry.values()) {
      const key = s.id || s.telegram_id || s.handle;
      if (key && !seen.has(key)) {
        seen.add(key);
        totalRegistered++;
        if (s.monitoring_status === 'MONITORED' && s.enabled) {
          totalMonitored++;
        }
        if (s.status === 'BLOCKED') totalBlocked++;
        if (s.status === 'INELIGIBLE') totalIneligible++;
        const sh = s.shard_id || 'shard_01';
        if (shardDistribution[sh] !== undefined) {
          shardDistribution[sh]++;
        } else {
          shardDistribution[sh] = 1;
        }
      }
    }

    return {
      status: this.status,
      session_active: this.status === 'CONNECTED',
      messages_received: this.messagesReceived,
      messages_dispatched: this.messagesDispatched,
      duplicates_dropped: this.duplicatesDropped,
      errors_count: this.errorsCount,
      flood_wait_seconds_remaining: this.floodWaitRemaining,
      reconnect_attempts: this.reconnectAttempts,
      last_received_at: this.lastReceivedAt,
      last_success_at: this.lastSuccessAt,
      last_error_message: this.lastErrorMessage,
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      monitored_channels: this.monitoredChannels,
      total_registered: totalRegistered,
      total_monitored: Math.max(totalMonitored, this.monitoredChannels.length),
      total_blocked: totalBlocked,
      total_ineligible: totalIneligible,
      auto_monitoring_enabled: true,
      shard_distribution: shardDistribution,
    };
  }

  /**
   * HTTP request handler for the Durable Object instance.
   */
  async fetch(request: Request): Promise<Response> {
    if ((this.env as any).LEGACY_FREEZE === 'true' && request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Legacy production mutation surface is frozen', code: 'LEGACY_FROZEN' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/health' || path === '/status') {
      return new Response(JSON.stringify({
        status: 'SUCCESS',
        collector: this.getHealthState(),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/connect' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      const result = await this.connect(body?.session);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/session' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      if (!body?.session) {
        return new Response(JSON.stringify({ error: 'Missing session string' }), { status: 400 });
      }
      await this.ctx.storage.put('telegram_session', body.session);
      return new Response(JSON.stringify({ status: 'SUCCESS', message: 'Session stored in Durable Object SQLite' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/me' && request.method === 'GET') {
      try {
        if (!this.client || this.status !== 'CONNECTED') {
          await this.connect();
        }
        const me = await this.client!.getMe() as any;
        return new Response(JSON.stringify({
          status: 'SUCCESS',
          account: {
            id: me?.id?.toString(),
            firstName: me?.firstName,
            lastName: me?.lastName,
            username: me?.username,
            phone: me?.phone ? `***${me.phone.slice(-4)}` : null,
            bot: me?.bot || false,
          }
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    if (path === '/dialogs' && request.method === 'GET') {
      try {
        if (!this.client || this.status !== 'CONNECTED') {
          await this.connect();
        }
        const dialogs = await this.client!.getDialogs({});
        const list = dialogs.map((d: any) => ({
          id: d.id?.toString(),
          title: d.title || d.name,
          isChannel: d.isChannel,
          isGroup: d.isGroup,
          isUser: d.isUser,
          unreadCount: d.unreadCount,
          entity: {
            id: d.entity?.id?.toString(),
            username: d.entity?.username,
            title: d.entity?.title,
            adminRights: d.entity?.adminRights ? true : false,
            creator: d.entity?.creator ? true : false,
            broadcast: d.entity?.broadcast ? true : false,
            megagroup: d.entity?.megagroup ? true : false,
          }
        }));
        return new Response(JSON.stringify({ status: 'SUCCESS', count: list.length, dialogs: list }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    if (path === '/sources/auto-register' && request.method === 'POST') {
      try {
        const res = await this.autoRegisterAllDiscovered();
        return new Response(JSON.stringify({
          status: 'SUCCESS',
          ...res,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    if (path === '/publish' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({})) as any;
        const target = body?.target || body?.channel;
        const message = body?.message;
        if (!target || !message) {
          return new Response(JSON.stringify({ error: 'Missing target or message' }), { status: 400 });
        }
        if (!this.client || this.status !== 'CONNECTED') {
          await this.connect();
        }
        const entity = await this.client!.getEntity(target);
        // GramJS (MTProto) parameters — `parseMode` (not the Bot API
        // `parse_mode`) and `linkPreview`. The alert always carries the
        // canonical report link, so the preview stays enabled.
        const sent = await this.client!.sendMessage(entity, {
          message: escapeTelegramHtml(String(message)),
          parseMode: 'html',
          linkPreview: true,
        }) as any;
        return new Response(JSON.stringify({
          status: 'SUCCESS',
          message_id: sent.id,
          date: sent.date,
          chat_id: sent.chatId?.toString() || sent.peerId?.channelId?.toString(),
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        // Wave 4A: a Telegram flood-wait is a retryable upstream condition, not
        // a generic 500. Surface it as 429 + Retry-After so the API's queue
        // consumer can retry with the exact delay Telegram requested.
        const waitSeconds = floodWaitSeconds(err);
        if (waitSeconds !== null) {
          return new Response(JSON.stringify({
            error: 'FLOOD_WAIT',
            code: 'TELEGRAM_FLOOD_WAIT',
            retry_after_seconds: waitSeconds,
          }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(waitSeconds),
            },
          });
        }
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    if (path === '/sources' && request.method === 'GET') {
      const seen = new Set<string>();
      const list: TelegramSourceRecord[] = [];
      for (const s of this.sourcesRegistry.values()) {
        const key = s.id || s.telegram_id || s.handle;
        if (key && !seen.has(key)) {
          seen.add(key);
          list.push(s);
        }
      }
      return new Response(JSON.stringify({
        status: 'SUCCESS',
        count: list.length,
        sources: list,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/sources/add' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      const handle = (body?.handle || '').trim().replace(/^@+/, '').toLowerCase();
      if (!handle) {
        return new Response(JSON.stringify({ error: 'Missing handle' }), { status: 400 });
      }
      if (BANNED_MONITORED_CHANNELS.has(handle)) {
        return new Response(JSON.stringify({ error: 'Anti-recursion firewall: cannot monitor outbound channel' }), { status: 400 });
      }
      if (!this.monitoredChannels.includes(handle)) {
        this.monitoredChannels.push(handle);
      }
      this.sourcesRegistry.set(handle, {
        id: `tg_${handle}`,
        handle,
        display_name: body.displayName || `@${handle}`,
        url: `https://t.me/${handle}`,
        category: body.category || 'Cyber Threat Intelligence',
        topic: body.topic || 'Telemetry & Exploit Disclosures',
        authority_tier: body.authorityTier ?? 3,
        trust_score: body.trustScore ?? 0.50,
        enabled: true,
        status: 'ENABLED',
        monitoring_status: 'MONITORED',
        verification_status: body.verificationStatus || 'NEW',
        collector_id: 'global-telegram-collector',
        shard_id: computeShardForHandle(handle),
        message_count: 0,
        error_count: 0,
        last_error: null,
        last_seen_at: null,
        last_successful_ingestion_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await this.persistState();
      await this.persistRegistry();
      return new Response(JSON.stringify({ status: 'SUCCESS', message: `Added @${handle} to monitored sources`, source: this.sourcesRegistry.get(handle) }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/sources/toggle' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      const handle = (body?.handle || '').trim().replace(/^@+/, '').toLowerCase();
      const enabled = Boolean(body?.enabled);
      const reg = this.sourcesRegistry.get(handle);
      if (!reg) {
        return new Response(JSON.stringify({ error: 'Source not found' }), { status: 404 });
      }
      reg.enabled = enabled;
      reg.status = enabled ? 'ENABLED' : 'DISABLED';
      reg.monitoring_status = enabled ? 'MONITORED' : 'DISABLED';
      reg.updated_at = new Date().toISOString();
      if (!enabled) {
        this.monitoredChannels = this.monitoredChannels.filter(c => c !== handle);
      } else if (!this.monitoredChannels.includes(handle)) {
        this.monitoredChannels.push(handle);
      }
      await this.persistState();
      await this.persistRegistry();
      return new Response(JSON.stringify({ status: 'SUCCESS', source: reg }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/sync' && request.method === 'POST') {
      const sources = await this.syncSourcesFromD1();
      return new Response(JSON.stringify({ status: 'SUCCESS', channels: sources }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/dispatch-signal' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      const channel = body?.channel || 'cveNotify';
      try {
        if (!this.client || this.status !== 'CONNECTED') {
          await this.connect();
        }
        const entity = await this.client!.getEntity(channel);
        const messages = await this.client!.getMessages(entity, { limit: 1 });
        if (!messages || messages.length === 0 || !messages[0].text) {
          return new Response(JSON.stringify({ error: 'No message found' }), { status: 404 });
        }

        const msg = messages[0];
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(msg.text.trim()));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const payload = {
          sourceId: `tg_${channel}`,
          sourceName: `@${channel}`,
          externalMessageId: String(msg.id),
          contentHash,
          rawText: msg.text,
          sourceUrl: `https://t.me/${channel}/${msg.id}`,
          publishedAt: msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
          receivedAt: new Date().toISOString(),
        };

        await this.env.INGEST_QUEUE.send(payload);
        this.messagesReceived++;
        this.messagesDispatched++;
        this.lastReceivedAt = new Date().toISOString();
        this.lastSuccessAt = new Date().toISOString();
        await this.persistState();

        return new Response(JSON.stringify({
          status: 'SUCCESS',
          message: 'Signal dispatched directly from Cloudflare DO to INGEST_QUEUE',
          payload: {
            sourceId: payload.sourceId,
            messageId: payload.externalMessageId,
            contentHash: payload.contentHash,
            preview: msg.text.slice(0, 100),
            rawText: msg.text,
          }
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // GET /channel-history
    if (path === '/channel-history' && request.method === 'GET') {
      try {
        const channel = url.searchParams.get('channel') || 'zayronxai';
        const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100);
        const offsetId = url.searchParams.get('offset_id') ? Number(url.searchParams.get('offset_id')) : undefined;
        const reverse = url.searchParams.get('reverse') === 'true';
        if (!this.client || this.status !== 'CONNECTED') {
          await this.connect();
        }
        const entity = await this.client!.getEntity(channel);
        const messages = await this.client!.getMessages(entity, { limit, offsetId, reverse });
        const allMessages = messages.map((m: any) => ({
          id: m.id,
          date: m.date ? new Date(m.date * 1000).toISOString() : null,
          text: m.text,
        }));
        return new Response(JSON.stringify({
          status: 'SUCCESS',
          channel: (entity as any).username || channel,
          title: (entity as any).title,
          date_created: (entity as any).date ? new Date((entity as any).date * 1000).toISOString() : null,
          total_messages: (messages as any).total ?? messages.length,
          latest_message_id: messages[0]?.id,
          oldest_message_id: messages[messages.length - 1]?.id,
          messages: allMessages,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // ── CANONICAL INTELLIGENCE CORE API ROUTES ────────────────────────

    // GET /intelligence/stats
    if (path === '/intelligence/stats' && request.method === 'GET') {
      const stats = this.getIntelligenceStats();
      return new Response(JSON.stringify({
        status: 'SUCCESS',
        stats,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /intelligence/latest
    if (path === '/intelligence/latest' && request.method === 'GET') {
      const res = this.getIntelligenceReports({ limit: 10 });
      return new Response(JSON.stringify({
        status: 'SUCCESS',
        total: res.total,
        reports: res.reports,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /intelligence/trending
    if (path === '/intelligence/trending' && request.method === 'GET') {
      const res = this.getIntelligenceReports({ limit: 10 });
      // Sort critical/high first, then highest confidence
      res.reports.sort((a, b) => {
        const sevOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFORMATIONAL: 0 };
        const diff = (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0);
        if (diff !== 0) return diff;
        return b.confidence.overall_confidence - a.confidence.overall_confidence;
      });
      return new Response(JSON.stringify({
        status: 'SUCCESS',
        total: res.total,
        reports: res.reports,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /intelligence (Search, Category, Severity, Pagination)
    if (path === '/intelligence' && request.method === 'GET') {
      const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100);
      const offset = Number(url.searchParams.get('offset')) || 0;
      const category = url.searchParams.get('category') || undefined;
      const severity = url.searchParams.get('severity') || undefined;
      const status = url.searchParams.get('status') || undefined;
      const q = url.searchParams.get('q') || undefined;

      const res = this.getIntelligenceReports({ limit, offset, category, severity, status, q });
      return new Response(JSON.stringify({
        status: 'SUCCESS',
        total: res.total,
        limit,
        offset,
        reports: res.reports,
        stats: this.getIntelligenceStats(),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST /intelligence (Store/Ingest Canonical Intelligence Object)
    if (path === '/intelligence' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => null) as any;
        if (!body || !body.intelligence_id) {
          return new Response(JSON.stringify({ error: 'Missing canonical intelligence object' }), { status: 400 });
        }
        await this.storeIntelligenceReport(body);
        return new Response(JSON.stringify({ status: 'SUCCESS', intelligence_id: body.intelligence_id }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // POST /intelligence/process-signal (Direct telemetry execution through 11-layer pipeline)
    if (path === '/intelligence/process-signal' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({})) as any;
        const rawText = body?.rawText || body?.text;
        if (!rawText) {
          return new Response(JSON.stringify({ error: 'Missing rawText in request body' }), { status: 400 });
        }

        const report = this.processCanonicalSignal({
          sourceId: body.sourceId || 'tg_cveNotify',
          telegramId: body.telegramId || null,
          handle: body.handle || 'cveNotify',
          title: body.title || '@cveNotify',
          messageId: body.messageId || String(Date.now()),
          rawText,
          sourceUrl: body.sourceUrl,
          publishedAt: body.publishedAt || new Date().toISOString(),
          sourceTrust: body.sourceTrust || 0.85,
          authorityTier: body.authorityTier || 1,
        });

        if (!report) {
          return new Response(JSON.stringify({
            status: 'FILTERED',
            reason: 'Message classified as noise or below technical threshold for public intelligence report',
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({
          status: 'SUCCESS',
          report,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // POST /intelligence/preview (Controlled Staging/Evaluation Path for Deep Intelligence Engine v2)
    if (path === '/intelligence/preview' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({})) as any;
        const rawText = body?.rawText || body?.text;
        if (!rawText) {
          return new Response(JSON.stringify({ error: 'Missing rawText in request body' }), { status: 400 });
        }

        // 1. Current Truthful Report (v1 baseline)
        const v1Report = this.processCanonicalSignal({
          sourceId: body.sourceId || 'tg_cveNotify',
          telegramId: body.telegramId || null,
          handle: body.handle || 'cveNotify',
          title: body.title || '@cveNotify',
          messageId: body.messageId || String(Date.now()),
          rawText,
          sourceUrl: body.sourceUrl,
          publishedAt: body.publishedAt || new Date().toISOString(),
          sourceTrust: body.sourceTrust || 0.85,
          authorityTier: body.authorityTier || 1,
        });

        // 2. New Deep Analytical Engine v2 Analysis
        const v2Analysis = executeDeepIntelligenceAnalysisV2({
          sourceId: body.sourceId || 'tg_cveNotify',
          telegramId: body.telegramId || null,
          handle: body.handle || 'cveNotify',
          channelTitle: body.title || '@cveNotify',
          messageId: body.messageId || String(Date.now()),
          rawText,
          sourceUrl: body.sourceUrl,
          publishedAt: body.publishedAt || new Date().toISOString(),
          sourceTrust: body.sourceTrust || 0.85,
          authorityTier: body.authorityTier || 1,
          skipKnowledgeRetrieval: body.skipKnowledgeRetrieval || false,
        });

        return new Response(JSON.stringify({
          status: 'SUCCESS',
          evaluation_mode: 'CONTROLLED_STAGING_PREVIEW',
          v2_report: v2Analysis.report,
          v2_quality_gate: v2Analysis.qualityGate,
          comparison: {
            v1_truthful_sections_count: v1Report?.structured_report?.sections?.length || 0,
            v2_deep_sections_count: v2Analysis.report.sections.length,
            v1_claims_count: v1Report?.structured_report?.claims?.length || 0,
            v2_grounded_claims_count: v2Analysis.report.claims.length,
            v2_depth: v2Analysis.report.depth,
            v2_exploit_status: v2Analysis.report.enrichment.exploit_status,
            v2_in_cisa_kev: v2Analysis.report.enrichment.cisa_kev.is_in_kev,
            v2_contradictions_count: v2Analysis.report.contradictions.length,
            v2_quality_gate_passed: v2Analysis.qualityGate.passed,
          },
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // GET /intelligence/preview (Samples recent reports through Engine v2 preview)
    if (path === '/intelligence/preview' && request.method === 'GET') {
      try {
        const recent = Array.from(this.intelligenceReports.values()).slice(-3);
        const previews = recent.map(r => {
          const rawText = r.body || r.summary || r.title || '';
          return executeDeepIntelligenceAnalysisV2({
            sourceId: r.source_id,
            telegramId: r.telegram_source_id,
            handle: r.source_handle,
            channelTitle: r.source_title,
            messageId: r.message_id,
            rawText,
            publishedAt: r.message_timestamp || r.created_at,
          });
        });

        return new Response(JSON.stringify({
          status: 'SUCCESS',
          evaluation_mode: 'CONTROLLED_STAGING_PREVIEW',
          count: previews.length,
          previews: previews.map(p => ({
            report: p.report,
            quality_gate: p.qualityGate,
          })),
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // POST /intelligence/backfill-recent (Fetches recent messages from top channels into verified reports)
    if (path === '/intelligence/backfill-recent' && request.method === 'POST') {
      try {
        if (!this.client || this.status !== 'CONNECTED') {
          await this.connect();
        }
        const channelsToBackfill = ['cveNotify', 'thehackernews', 'vxunderground', 'blueteamalerts'];
        const generatedReports: CanonicalIntelligenceObject[] = [];

        for (const ch of channelsToBackfill) {
          try {
            const entity = await this.client!.getEntity(ch);
            const messages = await this.client!.getMessages(entity, { limit: 3 });
            for (const msg of messages) {
              if (msg.text && msg.text.trim().length > 30) {
                const rep = this.processCanonicalSignal({
                  sourceId: `tg_${ch}`,
                  telegramId: null,
                  handle: ch,
                  title: `@${ch}`,
                  messageId: String(msg.id),
                  rawText: msg.text,
                  sourceUrl: `https://t.me/${ch}/${msg.id}`,
                  publishedAt: msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
                  sourceTrust: 0.90,
                  authorityTier: 1,
                });
                if (rep) generatedReports.push(rep);
              }
            }
          } catch (chErr: any) {
            console.warn(`[TelegramCollectorDO] Backfill error for @${ch}:`, chErr.message);
          }
        }

        return new Response(JSON.stringify({
          status: 'SUCCESS',
          count: generatedReports.length,
          reports: generatedReports,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // GET /intelligence/:id
    if (path.startsWith('/intelligence/')) {
      const id = decodeURIComponent(path.replace('/intelligence/', '').trim());
      const report = this.getIntelligenceReportById(id);
      if (report) {
        return new Response(JSON.stringify({
          status: 'SUCCESS',
          report,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: `Intelligence report ${id} not found` }), { status: 404 });
    }

    return new Response('Not Found', { status: 404 });
  }
}
