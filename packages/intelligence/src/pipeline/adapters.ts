/**
 * Z.X.INTELLIGENCE — UNIFIED SOURCE ADAPTERS & INGESTION CONTRACT
 * 
 * Source-Agnostic Intelligence Ingestion Layer
 * Unifies: Telegram, CVE/Vulnerability Feeds, CISA KEV, NVD, GitHub Security Advisories,
 * Vendor Advisories, Security Research, Malware Intelligence, OSINT, and News.
 */

export type SourceType =
  | 'TELEGRAM'
  | 'CVE'
  | 'CISA_KEV'
  | 'NVD'
  | 'GITHUB_ADVISORY'
  | 'VENDOR_ADVISORY'
  | 'SECURITY_RESEARCH'
  | 'MALWARE_INTELLIGENCE'
  | 'OSINT'
  | 'SECURITY_NEWS'
  | 'RSS'
  | 'OTHER';

export interface UnifiedIngestionEvent {
  ingestion_id: string;
  source_type: SourceType;
  source_id: string;
  source_name: string;

  external_id: string;
  external_url?: string | null;

  published_at: string;
  observed_at: string;
  ingested_at: string;

  title: string;
  content: string;
  content_type: 'text/plain' | 'text/markdown' | 'application/json' | 'structured_advisory';

  language: string;
  region: string;

  raw_reference?: any;
  content_hash: string;

  metadata: {
    authority_tier: number;       // 1 (Highest / Authoritative) to 5 (Unverified)
    source_trust_score: number;   // 0.0 to 1.0
    is_authoritative?: boolean;
    is_syndicated?: boolean;      // True if republishing or derived from another primary source
    originating_source?: string;  // Primary attribution if syndicated
    cve_data?: StructuredCVERecord;
    vendor_data?: StructuredVendorAdvisory;
    [key: string]: any;
  };

  schema_version: '1.0.0';
}

export interface StructuredCVERecord {
  cve_id: string;
  vendor: string;
  product: string;
  affected_versions: string[];
  fixed_versions: string[];
  cvss: {
    version: '3.1' | '4.0' | '2.0' | 'UNKNOWN';
    score: number | 'UNKNOWN';
    vector?: string;
  };
  cwe: string[];
  references: string[];
  exploitation_status: 'CONFIRMED_IN_WILD' | 'PROOF_OF_CONCEPT_AVAILABLE' | 'SUSPECTED' | 'UNCONFIRMED' | 'UNKNOWN';
  kev_status: boolean;
  published_at: string;
  modified_at?: string;
}

export function validateStructuredCVERecord(input: unknown): { valid: boolean; errors: string[] } {
  const value = input as Partial<StructuredCVERecord> | null;
  const errors: string[] = [];
  if (!value || typeof value !== 'object') return { valid: false, errors: ['SOURCE_SCHEMA_INVALID: expected object'] };
  if (typeof value.cve_id !== 'string' || !/^CVE-\d{4}-\d{4,19}$/i.test(value.cve_id)) errors.push('SOURCE_SCHEMA_INVALID: cve_id');
  for (const field of ['vendor', 'product', 'published_at'] as const) if (typeof value[field] !== 'string') errors.push(`SOURCE_SCHEMA_INVALID: ${field}`);
  for (const field of ['affected_versions', 'fixed_versions', 'cwe', 'references'] as const) if (!Array.isArray(value[field]) || value[field].some(v => typeof v !== 'string')) errors.push(`SOURCE_SCHEMA_INVALID: ${field}`);
  if (!value.cvss || typeof value.cvss !== 'object') errors.push('SOURCE_SCHEMA_INVALID: cvss');
  if (typeof value.kev_status !== 'boolean') errors.push('SOURCE_SCHEMA_INVALID: kev_status');
  return { valid: errors.length === 0, errors };
}

export function mapCisaKevRecord(input: any): StructuredCVERecord {
  return {
    cve_id: String(input?.cveID || input?.cve_id || '').trim().toUpperCase(),
    vendor: String(input?.vendorProject || input?.vendor || 'UNKNOWN'),
    product: String(input?.product || 'UNKNOWN'),
    affected_versions: Array.isArray(input?.affected_versions) ? input.affected_versions.filter((v: unknown): v is string => typeof v === 'string') : [],
    fixed_versions: Array.isArray(input?.fixed_versions) ? input.fixed_versions.filter((v: unknown): v is string => typeof v === 'string') : [],
    cvss: input?.cvss && typeof input.cvss === 'object' ? input.cvss : { version: 'UNKNOWN', score: 'UNKNOWN' },
    cwe: Array.isArray(input?.cwes) ? input.cwes.filter((v: unknown): v is string => typeof v === 'string') : (Array.isArray(input?.cwe) ? input.cwe : []),
    references: Array.isArray(input?.references) ? input.references.filter((v: unknown): v is string => typeof v === 'string') : [],
    exploitation_status: input?.kev_status === true ? 'CONFIRMED_IN_WILD' : 'UNKNOWN',
    kev_status: input?.kev_status === true || Boolean(input?.dateAdded),
    published_at: String(input?.published_at || input?.dateAdded || new Date().toISOString()),
  };
}

export interface StructuredVendorAdvisory {
  vendor_name: string;
  advisory_id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  affected_products: Array<{ vendor: string; product: string; versions: string[] }>;
  remediation_guidance?: string[];
  workarounds?: string[];
}

export interface SourceAdapter<TInput = any> {
  readonly source_type: SourceType;
  readonly source_id: string;
  readonly source_name: string;
  readonly authority_tier: number;
  readonly default_trust: number;

  normalize(input: TInput): Promise<UnifiedIngestionEvent> | UnifiedIngestionEvent;
  validate(event: UnifiedIngestionEvent): { valid: boolean; errors: string[] };
}

/**
 * Deterministic hash generator for Unified Ingestion Events.
 */
export function computeEventContentHash(text: string): string {
  let hash = 0;
  const clean = text.trim();
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0') + clean.length.toString(16).padStart(4, '0');
}

/**
 * Telegram Source Adapter:
 * Encapsulates Telegram MTProto / Bot payload conversion into the Unified Ingestion Contract.
 */
export class TelegramSourceAdapter implements SourceAdapter<{
  sourceId: string;
  sourceName: string;
  externalMessageId: string;
  rawText: string;
  sourceUrl?: string;
  publishedAt?: string;
  channelUsername?: string | null;
  channelTitle?: string;
  authorityTier?: number;
  trustScore?: number;
}> {
  readonly source_type: SourceType = 'TELEGRAM';
  readonly source_id: string;
  readonly source_name: string;
  readonly authority_tier: number;
  readonly default_trust: number;

  constructor(sourceId: string = 'tg_global', sourceName: string = 'Telegram Source Network', authorityTier: number = 2, trustScore: number = 0.85) {
    this.source_id = sourceId;
    this.source_name = sourceName;
    this.authority_tier = authorityTier;
    this.default_trust = trustScore;
  }

  normalize(input: {
    sourceId: string;
    sourceName: string;
    externalMessageId: string;
    rawText: string;
    sourceUrl?: string;
    publishedAt?: string;
    channelUsername?: string | null;
    channelTitle?: string;
    authorityTier?: number;
    trustScore?: number;
  }): UnifiedIngestionEvent {
    const rawText = input.rawText.trim();
    const contentHash = computeEventContentHash(rawText);
    const firstLine = rawText.split('\n')[0].replace(/^[#*>\-\s]+/, '').slice(0, 100).trim();

    // Check for syndication indicator (e.g., "via @channel", "Forwarded from", "Source: ...")
    const isSyndicated = /forwarded\s+from|via\s+@|source:\s*https?:\/\//i.test(rawText);
    const originMatch = rawText.match(/via\s+@([\w_]+)|forwarded\s+from\s+([^\n\r]+)/i);
    const originatingSource = originMatch ? (originMatch[1] || originMatch[2]).trim() : undefined;

    return {
      ingestion_id: `ingest_${contentHash.slice(0, 12)}`,
      source_type: 'TELEGRAM',
      source_id: input.sourceId,
      source_name: input.sourceName || input.channelTitle || 'Telegram Channel',
      external_id: String(input.externalMessageId),
      external_url: input.sourceUrl || (input.channelUsername ? `https://t.me/${input.channelUsername}/${input.externalMessageId}` : null),
      published_at: input.publishedAt || new Date().toISOString(),
      observed_at: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      title: firstLine || 'Telegram Threat Telemetry',
      content: rawText,
      content_type: 'text/plain',
      language: 'en',
      region: 'GLOBAL',
      content_hash: contentHash,
      metadata: {
        authority_tier: input.authorityTier || this.authority_tier,
        source_trust_score: input.trustScore || this.default_trust,
        channel_username: input.channelUsername || null,
        is_syndicated: isSyndicated,
        originating_source: originatingSource,
      },
      schema_version: '1.0.0',
    };
  }

  validate(event: UnifiedIngestionEvent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!event.content || event.content.length < 10) errors.push('Telegram content length too brief');
    if (!event.external_id) errors.push('Missing external message ID');
    // Anti-recursion firewall: reject @zayronxai
    const prohibited = ['zayronxai', 'zayron_x', 'tg_zayronxai', '-1003937861689'];
    if (prohibited.includes(event.source_id.toLowerCase()) || (event.metadata.channel_username && prohibited.includes(event.metadata.channel_username.toLowerCase()))) {
      errors.push('CRITICAL FIREWALL: Outbound broadcast channel cannot be ingested');
    }
    return { valid: errors.length === 0, errors };
  }
}

/**
 * CVE / Vulnerability Feed Source Adapter:
 * Standardizes NVD, CISA KEV, and CVE feeds into the Unified Ingestion Contract.
 */
export class CVESourceAdapter implements SourceAdapter<StructuredCVERecord> {
  readonly source_type: SourceType = 'CVE';
  readonly source_id: string;
  readonly source_name: string;
  readonly authority_tier: number = 1;
  readonly default_trust: number = 0.98;

  constructor(sourceId: string = 'nvd-cve-feed', sourceName: string = 'National Vulnerability Database (NVD)') {
    this.source_id = sourceId;
    this.source_name = sourceName;
  }

  normalize(input: StructuredCVERecord): UnifiedIngestionEvent {
    const content = `
Vulnerability Identifier: ${input.cve_id}
Vendor: ${input.vendor || 'UNKNOWN'}
Product: ${input.product || 'UNKNOWN'}
Affected Versions: ${input.affected_versions.length > 0 ? input.affected_versions.join(', ') : 'UNKNOWN'}
Fixed Versions: ${input.fixed_versions.length > 0 ? input.fixed_versions.join(', ') : 'UNKNOWN'}
CVSS Score: ${typeof input.cvss.score === 'number' ? input.cvss.score : 'UNKNOWN'} (${input.cvss.version})
Exploitation Status: ${input.exploitation_status}
CISA KEV Enrolled: ${input.kev_status ? 'YES (Known Exploited Vulnerability)' : 'NO'}
References:
${input.references.map(r => `- ${r}`).join('\n')}
    `.trim();

    const contentHash = computeEventContentHash(`${input.cve_id}:${input.vendor}:${input.product}`);

    return {
      ingestion_id: `ingest_${input.cve_id.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      source_type: 'CVE',
      source_id: this.source_id,
      source_name: this.source_name,
      external_id: input.cve_id,
      external_url: `https://nvd.nist.gov/vuln/detail/${input.cve_id}`,
      published_at: input.published_at || new Date().toISOString(),
      observed_at: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      title: `${input.cve_id}: ${input.vendor} ${input.product} Vulnerability Advisory`,
      content,
      content_type: 'structured_advisory',
      language: 'en',
      region: 'GLOBAL',
      content_hash: contentHash,
      metadata: {
        authority_tier: this.authority_tier,
        source_trust_score: this.default_trust,
        is_authoritative: true,
        cve_data: input,
      },
      schema_version: '1.0.0',
    };
  }

  validate(event: UnifiedIngestionEvent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!event.external_id || !/^CVE-\d{4}-\d{4,7}$/i.test(event.external_id)) {
      errors.push(`Invalid CVE format identifier: ${event.external_id}`);
    }
    if (!event.metadata.cve_data) {
      errors.push('Missing structured cve_data in metadata');
    }
    return { valid: errors.length === 0, errors };
  }
}

/**
 * Vendor Advisory Source Adapter:
 * Standardizes vendor security advisories (e.g. Cisco, Microsoft, Apple, RedHat) into the Unified Ingestion Contract.
 */
export class VendorAdvisorySourceAdapter implements SourceAdapter<StructuredVendorAdvisory & { references?: string[]; publishedAt?: string }> {
  readonly source_type: SourceType = 'VENDOR_ADVISORY';
  readonly source_id: string;
  readonly source_name: string;
  readonly authority_tier: number = 1;
  readonly default_trust: number = 0.95;

  constructor(vendorName: string) {
    this.source_id = `vendor_${vendorName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    this.source_name = `${vendorName} Security Advisory Operations`;
  }

  normalize(input: StructuredVendorAdvisory & { references?: string[]; publishedAt?: string }): UnifiedIngestionEvent {
    const content = `
Vendor Advisory: ${input.advisory_id}
Organization: ${input.vendor_name}
Title: ${input.title}
Assessed Severity: ${input.severity}
Products Affected:
${input.affected_products.map(p => `- ${p.vendor} ${p.product} (Versions: ${p.versions.join(', ') || 'UNKNOWN'})`).join('\n')}

Remediation Recommendations:
${input.remediation_guidance ? input.remediation_guidance.map(r => `- ${r}`).join('\n') : 'Consult vendor documentation for patches.'}
    `.trim();

    const contentHash = computeEventContentHash(`${input.vendor_name}:${input.advisory_id}`);

    return {
      ingestion_id: `ingest_${contentHash.slice(0, 12)}`,
      source_type: 'VENDOR_ADVISORY',
      source_id: this.source_id,
      source_name: this.source_name,
      external_id: input.advisory_id,
      external_url: input.references?.[0] || null,
      published_at: input.publishedAt || new Date().toISOString(),
      observed_at: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      title: `${input.vendor_name}: ${input.title}`,
      content,
      content_type: 'structured_advisory',
      language: 'en',
      region: 'GLOBAL',
      content_hash: contentHash,
      metadata: {
        authority_tier: this.authority_tier,
        source_trust_score: this.default_trust,
        is_authoritative: true,
        vendor_data: input,
      },
      schema_version: '1.0.0',
    };
  }

  validate(event: UnifiedIngestionEvent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!event.title) errors.push('Missing advisory title');
    if (!event.external_id) errors.push('Missing advisory identifier');
    return { valid: errors.length === 0, errors };
  }
}

/**
 * Security Research / OSINT Source Adapter:
 * Standardizes technical blog posts, whitepapers, and researcher disclosures.
 */
export class SecurityResearchSourceAdapter implements SourceAdapter<{
  researcher: string;
  articleId: string;
  title: string;
  body: string;
  url?: string;
  publishedAt?: string;
  tier?: number;
  trustScore?: number;
}> {
  readonly source_type: SourceType = 'SECURITY_RESEARCH';
  readonly source_id: string;
  readonly source_name: string;
  readonly authority_tier: number;
  readonly default_trust: number;

  constructor(researcher: string, tier: number = 2, trustScore: number = 0.85) {
    this.source_id = `research_${researcher.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    this.source_name = `${researcher} Research Group`;
    this.authority_tier = tier;
    this.default_trust = trustScore;
  }

  normalize(input: {
    researcher: string;
    articleId: string;
    title: string;
    body: string;
    url?: string;
    publishedAt?: string;
    tier?: number;
    trustScore?: number;
  }): UnifiedIngestionEvent {
    const content = input.body.trim();
    const contentHash = computeEventContentHash(`${input.researcher}:${input.title}:${content.slice(0, 100)}`);

    return {
      ingestion_id: `ingest_${contentHash.slice(0, 12)}`,
      source_type: 'SECURITY_RESEARCH',
      source_id: this.source_id,
      source_name: this.source_name,
      external_id: input.articleId,
      external_url: input.url || null,
      published_at: input.publishedAt || new Date().toISOString(),
      observed_at: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      title: input.title,
      content,
      content_type: 'text/markdown',
      language: 'en',
      region: 'GLOBAL',
      content_hash: contentHash,
      metadata: {
        authority_tier: input.tier || this.authority_tier,
        source_trust_score: input.trustScore || this.default_trust,
        researcher_name: input.researcher,
      },
      schema_version: '1.0.0',
    };
  }

  validate(event: UnifiedIngestionEvent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!event.title || event.title.length < 5) errors.push('Research title too brief');
    if (!event.content || event.content.length < 30) errors.push('Research body content too brief');
    return { valid: errors.length === 0, errors };
  }
}
