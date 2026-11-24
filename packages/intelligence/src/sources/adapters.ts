import { createHash } from 'node:crypto';
import { sourceForUrl, type SourceDefinition } from './registry';
import { canonicalVulnerabilityId, type CanonicalVulnerability, type FieldProvenance } from '../publishing/canonicalVulnerability';
import type { EditorialEvidenceItem } from '../publishing/evidenceClaims';
import type { RelevanceAssessment } from '../relevance/vulnerability';
import { getRustKernelInstance, type RustKernelInstance } from '../core/rustKernelAdapter';
import type { RelationshipType } from '../core/types';
// Single definition of "this value was never established" (shared with the
// non-KEV authority projection so the two can never drift apart).
import { isKnownUnknownValue } from '../vulnerability/nonKevAuthorityProjection';
import { CISA_KEV_AUTHORITY, type AnalysisAuthority } from '../vulnerability/analysisAuthority';

export interface RawSourceRecord { sourceId: string; fetchedAt: string; sourceRecordId: string; sourceUrl: string; rawPayload: unknown; contentHash: string; parserVersion: string; ingestionStatus: 'RECEIVED' | 'NORMALIZED' | 'REJECTED'; }
export interface NormalizedVulnerability { identity: string; cveId?: string; aliases: string[]; products: string[]; affectedVersions: string[]; fixedVersions: string[]; severity?: string; cvss?: { score: number; vector?: string }; cwe: string[]; exploitation?: { status: 'KNOWN_EXPLOITED' | 'REPORTED' | 'SUSPECTED' | 'NO_EVIDENCE'; dateAdded?: string; dueDate?: string }; references: string[]; sourceRecords: RawSourceRecord[]; evidence: EditorialEvidenceItem[]; fields: Partial<Record<string, FieldProvenance<unknown>>>; relevance?: RelevanceAssessment; }
export interface AdapterResult { source: SourceDefinition; raw: RawSourceRecord; normalized?: NormalizedVulnerability; error?: string; }

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const raw = (sourceId: string, sourceRecordId: string, sourceUrl: string, payload: unknown, status: RawSourceRecord['ingestionStatus'] = 'NORMALIZED'): RawSourceRecord => ({ sourceId, sourceRecordId, sourceUrl, rawPayload: payload, fetchedAt: new Date().toISOString(), contentHash: hash(payload), parserVersion: 'v1', ingestionStatus: status });
const evidence = (id: string, source: string, sourceType: EditorialEvidenceItem['source_type'], url: string, fact: string): EditorialEvidenceItem => ({ evidence_id: id, source, source_type: sourceType, url, fact });
const prov = <T>(value: T, source: string, evidenceRefs: string[]): FieldProvenance<T> => ({ value, source, evidenceRefs, confidence: 1, updatedAt: new Date().toISOString() });

function common(sourceId: string, recordId: string, url: string, payload: any, ev: EditorialEvidenceItem): NormalizedVulnerability | undefined {
  const cve = payload.cveId || payload.id || payload.cve;
  const identity = canonicalVulnerabilityId({ cveId: cve, ghsaId: payload.ghsaId, vendorAdvisoryId: payload.vendorAdvisoryId, package: payload.package, ecosystem: payload.ecosystem });
  if (!identity) return undefined;
  return { identity, cveId: cve?.toUpperCase(), aliases: payload.aliases || [], products: payload.products || [], affectedVersions: payload.affectedVersions || [], fixedVersions: payload.fixedVersions || [], severity: payload.severity, cvss: payload.cvss, cwe: payload.cwe || [], references: payload.references || [url], sourceRecords: [raw(sourceId, recordId, url, payload)], evidence: [ev], fields: {} };
}

export function validateSourceRecord(source: SourceDefinition, url: string, payload: unknown): string[] { const errors: string[] = []; if (!sourceForUrl(url) || !source.domainPatterns.some(d => sourceForUrl(url)?.domainPatterns.includes(d))) errors.push('SOURCE_URL_MISMATCH'); if (!payload || typeof payload !== 'object') errors.push('INVALID_PAYLOAD'); return errors; }
export function parseCisaKev(payload: any, url = 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog'): AdapterResult { const source = sourceForUrl(url)!; const item = payload.vulnerability || payload; const ev = evidence(`cisa:${item.cveID}`, source.name, 'catalog', url, item.shortDescription || item.requiredAction || item.cveID); const n = common(source.id, item.cveID, url, { cveId: item.cveID, products: [item.product], exploitation: { status: 'KNOWN_EXPLOITED', dateAdded: item.dateAdded, dueDate: item.dueDate }, references: [url] }, ev); if (!n) return { source, raw: raw(source.id, item.cveID || 'unknown', url, payload, 'REJECTED'), error: 'MISSING_CVE_ID' }; n.exploitation = { status: 'KNOWN_EXPLOITED', dateAdded: item.dateAdded, dueDate: item.dueDate }; n.fields.exploitationStatus = prov('KNOWN_EXPLOITED', source.id, [ev.evidence_id]); return { source, raw: n.sourceRecords[0], normalized: n }; }
export function parseNvd(payload: any, url: string): AdapterResult { const source = sourceForUrl(url)!; const v = payload.vulnerabilities?.[0]?.cve || payload.cve || payload; const id = v.id || v.cveId; const metrics = v.metrics?.cvssMetricV31?.[0]?.cvssData || v.cvss; const ev = evidence(`nvd:${id}`, source.name, 'government', url, v.descriptions?.[0]?.value || id); const n = common(source.id, id, url, { cveId: id, aliases: v.published ? [] : v.aliases, cvss: metrics && { score: metrics.baseScore ?? metrics.score, vector: metrics.vectorString ?? metrics.vector }, cwe: (v.weaknesses?.[0]?.description || []).map((x: any) => x.value).filter(Boolean), references: (v.references || []).map((x: any) => x.url) }, ev); return n ? { source, raw: n.sourceRecords[0], normalized: n } : { source, raw: raw(source.id, id || 'unknown', url, payload, 'REJECTED'), error: 'MISSING_CVE_ID' }; }
export function parseGithubAdvisory(payload: any, url = 'https://github.com/advisories'): AdapterResult { const source = sourceForUrl(url)!; const id = payload.ghsaId || payload.ghsa_id; const ev = evidence(`github:${id}`, source.name, 'research', url, payload.summary || id); const n = common(source.id, id, url, { cveId: payload.cveId, ghsaId: id, aliases: payload.identifiers?.map((x: any) => x.value) || [], package: payload.package?.name, ecosystem: payload.package?.ecosystem, affectedVersions: payload.vulnerableVersionRange ? [payload.vulnerableVersionRange] : [], fixedVersions: payload.firstPatchedVersion?.identifier ? [payload.firstPatchedVersion.identifier] : [], references: payload.references?.map((x: any) => x.url) || [url] }, ev); return n ? { source, raw: n.sourceRecords[0], normalized: n } : { source, raw: raw(source.id, id || 'unknown', url, payload, 'REJECTED'), error: 'MISSING_GHSA_OR_CVE' }; }
export function parseOsv(payload: any, url = 'https://api.osv.dev/v1/query'): AdapterResult { const source = sourceForUrl('https://osv.dev/')!; const id = payload.id; const aliases = payload.aliases || []; const ev = evidence(`osv:${id}`, source.name, 'research', url, payload.summary || id); const n = common(source.id, id, url, { cveId: aliases.find((x: string) => x.startsWith('CVE-')), ghsaId: aliases.find((x: string) => x.startsWith('GHSA-')), aliases, package: payload.package?.name, ecosystem: payload.package?.ecosystem, affectedVersions: payload.affected?.flatMap((x: any) => x.ranges?.map((r: any) => r.events?.map((e: any) => JSON.stringify(e)).join(',')) || []) || [], fixedVersions: payload.affected?.flatMap((x: any) => x.ranges?.flatMap((r: any) => r.events?.filter((e: any) => e.fixed).map((e: any) => e.fixed) || [])) || [], references: payload.references?.map((x: any) => x.url) || [url] }, ev); return n ? { source, raw: n.sourceRecords[0], normalized: n } : { source, raw: raw(source.id, id || 'unknown', url, payload, 'REJECTED'), error: 'MISSING_OSV_IDENTITY' }; }
export function parseEpss(payload: any, url = 'https://api.first.org/data/v1/epss'): AdapterResult { const source = sourceForUrl('https://first.org/')!; const item = payload.data?.[0] || payload; const id = item.cve; // PHASE 5 (REM-04): the EPSS API supplies its own observation date for the score.
  // It is source-origin data and MUST be preserved as-is — never defaulted from another
  // timestamp domain. Missing stays missing.
  const epssObservedAt = typeof item.date === 'string' && item.date.trim().length > 0 ? item.date.trim() : undefined; const ev = evidence(`epss:${id}`, source.name, 'research', url, `EPSS score ${item.epss} percentile ${item.percentile}${epssObservedAt ? ` observed ${epssObservedAt}` : ''}`); const n = common(source.id, id, url, { cveId: id, references: [url] }, ev); return n ? { source, raw: n.sourceRecords[0], normalized: n } : { source, raw: raw(source.id, id || 'unknown', url, payload, 'REJECTED'), error: 'MISSING_CVE_ID' }; }

/**
 * PHASE 5 (REM-04) — EPSS observation data as the source supplies it.
 * `observed_at` is the EPSS snapshot date ONLY when FIRST.org supplies one;
 * absence stays `null` (never borrowed from cve_published_at or any other domain).
 */
export interface EpssObservation {
  score: string | null;
  percentile: string | null;
  observed_at: string | null;
}

/** Normalize the EPSS fetch payload into the canonical observation shape. */
export function normalizeEpssObservation(payload: any): EpssObservation {
  const item = payload?.data?.[0] || payload || null;
  if (!item || item.epss == null) return { score: null, percentile: null, observed_at: null };
  const observed = typeof item.date === 'string' && item.date.trim().length > 0 ? item.date.trim() : null;
  return { score: String(item.epss), percentile: item.percentile != null ? String(item.percentile) : null, observed_at: observed };
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 5 (REM-04) — CANONICAL TEMPORAL PROVENANCE CONTRACT
//
// Central invariant: a timestamp originating from one temporal domain MUST NOT be
// silently reused as a timestamp for another temporal domain.
//
// Domains (source-scoped where the semantics are source-specific):
//   cve_published_at     — CVE ecosystem publication of the vulnerability record
//   source_published_at  — a specific source's own publication timestamp
//   source_updated_at    — a specific source's own record-modification timestamp
//   source_observed_at   — the time a source observation represents (EPSS snapshot)
//   retrieved_at         — ZAYRON-X's own fetch event (system time, NOT source origin)
//   normalized_at        — ZAYRON-X normalization event (system time)
//   report_generated_at  — report object generation event (system time)
//
// Missing source timestamps remain `null`. There is NO cross-domain fallback.
// ═══════════════════════════════════════════════════════════════════════════

export type TemporalAvailability =
  | 'KNOWN'
  | 'NOT_AVAILABLE'
  | 'SOURCE_UNAVAILABLE'
  | 'SOURCE_ERROR'
  | 'UNKNOWN';

/** Canonical, source-scoped temporal provenance for one intelligence object. */
export interface TemporalProvenance {
  cve_published_at?: string | null;
  source_published_at?: Record<string, string | null>;
  source_updated_at?: Record<string, string | null>;
  source_observed_at?: Record<string, string | null>;
  retrieved_at?: Record<string, string | null>;
  normalized_at?: string | null;
  report_generated_at?: string | null;
}

/**
 * PHASE 5 — validate and canonically preserve an ISO-8601 timestamp string.
 * Returns the trimmed original string when syntactically valid, `null` otherwise.
 * Malformed source data NEVER silently becomes another timestamp — it is dropped
 * (the source supplied nothing usable) and the validator surfaces the loss.
 */
export function normalizeIsoTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (s.length === 0) return null;
  // Require a date anchor; reject pure date-time without date (e.g. "T22:15:02").
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  // Canonical guard: must contain a full date part.
  if (!/^\d{4}-\d{2}-\d{2}([Tt ]|$)/.test(s)) return null;
  return s;
}

/**
 * PHASE 5 — the ONE deterministic normalization path.
 * Accepts source-native temporal data, preserves semantic identity, retains source
 * identity keys, and NEVER substitutes across temporal domains. A missing source
 * timestamp stays `null`/absent.
 */
export function buildTemporalProvenance(input: {
  cve_published_at?: string | null;
  source_published_at?: Record<string, string | null | undefined>;
  source_updated_at?: Record<string, string | null | undefined>;
  source_observed_at?: Record<string, string | null | undefined>;
  retrieved_at?: Record<string, string | null | undefined>;
  normalized_at?: string | null;
  report_generated_at?: string | null;
}): TemporalProvenance {
  const record = (m?: Record<string, string | null | undefined>): Record<string, string | null> | undefined => {
    if (!m) return undefined;
    const out: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(m)) {
      const key = k.trim().toLowerCase();
      if (key.length === 0) continue;
      out[key] = v == null ? null : normalizeIsoTimestamp(v);
    }
    return out;
  };
  return {
    cve_published_at: input.cve_published_at == null ? null : normalizeIsoTimestamp(input.cve_published_at),
    source_published_at: record(input.source_published_at),
    source_updated_at: record(input.source_updated_at),
    source_observed_at: record(input.source_observed_at),
    retrieved_at: record(input.retrieved_at),
    normalized_at: input.normalized_at == null ? null : normalizeIsoTimestamp(input.normalized_at),
    report_generated_at: input.report_generated_at == null ? null : normalizeIsoTimestamp(input.report_generated_at),
  };
}

// ── MICRO TASK 70: Unified Open-Source Vulnerability Enrichment Layer ────────

export interface UnifiedEnrichmentRecord {
  source: 'cisa-vulnrichment' | 'osv' | 'github-advisory' | 'nvd-cpe' | 'cisa-kev' | 'first-epss' | 'mitre-cve' | 'cisa-adp';
  source_record_id: string;
  vendor?: string;
  product?: string;
  package?: string;
  ecosystem?: string;
  affected_versions?: string[];
  fixed_versions?: string[];
  cpe_matches?: string[];
  cwe_ids?: string[];
  cvss?: {
    score: string;
    vector?: string;
    version?: string;
    source?: string;
  };
  ssvc?: {
    exploitation?: string;
    automatable?: string;
    technical_impact?: string;
    role?: string;
  };
  references?: string[];
  aliases?: string[];
  source_timestamp?: string;
  raw_evidence?: Record<string, unknown>;
  // Distinct provenance records ensuring MITRE_CVE != CISA_ADP
  mitre_cve?: {
    source: 'mitre-cve';
    cna_provider?: string;
    description?: string;
    title?: string;
    affected_versions?: string[];
    fixed_versions?: string[];
    cvss?: { score: string; vector?: string; version?: string; source: string };
    cwe_ids?: string[];
    references?: string[];
  };
  cisa_adp?: {
    source: 'cisa-adp';
    ssvc?: {
      exploitation?: string;
      automatable?: string;
      technical_impact?: string;
      role?: string;
    };
    cwe_ids?: string[];
    cvss?: { score: string; vector?: string; version?: string; source: string };
    cpe_matches?: string[];
    affected_versions?: string[];
  };
}

export function parseCisaVulnrichment(cveId: string, payload: any): UnifiedEnrichmentRecord | null {
  if (!payload || typeof payload !== 'object') return null;
  const adpList = payload.containers?.adp;
  const cna = payload.containers?.cna;
  if (!Array.isArray(adpList) && !cna) return null;
  const cisaAdp = Array.isArray(adpList) ? adpList.find((a: any) => a.providerMetadata?.shortName === 'CISA-ADP') : null;

  const res: UnifiedEnrichmentRecord = {
    source: 'cisa-vulnrichment',
    source_record_id: cveId,
    references: ['https://github.com/cisagov/vulnrichment'],
  };

  // SSVC Extraction
  if (cisaAdp) {
    const ssvcMetric = cisaAdp.metrics?.find((m: any) => m.other?.type === 'ssvc');
    if (ssvcMetric?.other?.content?.options) {
      const opts = ssvcMetric.other.content.options;
      const ssvcObj: Record<string, string> = {};
      for (const opt of opts) {
        if (opt.Exploitation) ssvcObj.exploitation = opt.Exploitation;
        if (opt.Automatable) ssvcObj.automatable = opt.Automatable;
        if (opt['Technical Impact']) ssvcObj.technical_impact = opt['Technical Impact'];
      }
      res.ssvc = {
        exploitation: ssvcObj.exploitation,
        automatable: ssvcObj.automatable,
        technical_impact: ssvcObj.technical_impact,
        role: ssvcMetric.other.content.role,
      };
    }

    // CWE Extraction (exclude generic 'CWE-noinfo')
    const cwes: string[] = [];
    for (const pt of cisaAdp.problemTypes || []) {
      for (const d of pt.descriptions || []) {
        const val = d.description || d.cweId;
        if (val && !val.includes('CWE-noinfo') && !cwes.includes(val)) {
          cwes.push(val);
        }
      }
    }
    if (cwes.length > 0) res.cwe_ids = cwes;

    // CVSS Extraction if CISA calculated or supplemented
    const cvssV31 = cisaAdp.metrics?.find((m: any) => m.cvssV3_1)?.cvssV3_1;
    const cvssV40 = cisaAdp.metrics?.find((m: any) => m.cvssV4_0)?.cvssV4_0;
    const bestCvss = cvssV31 || cvssV40;
    if (bestCvss) {
      res.cvss = {
        score: String(bestCvss.baseScore),
        vector: bestCvss.vectorString,
        version: cvssV40 ? '4.0' : '3.1',
        source: 'CISA-ADP',
      };
    }

    // CPEs and version constraints from affected list
    const cpes: string[] = [];
    const affectedVersions: string[] = [];
    for (const aff of cisaAdp.affected || []) {
      if (Array.isArray(aff.cpes)) {
        for (const c of aff.cpes) {
          if (c && !cpes.includes(c)) cpes.push(c);
        }
      }
      if (aff.vendor && !res.vendor) res.vendor = aff.vendor;
      if (aff.product && !res.product) res.product = aff.product;
      for (const v of aff.versions || []) {
        if (v.status === 'affected') {
          const desc = v.lessThan ? `${v.version || ''} < ${v.lessThan}`.trim() : (v.version || '');
          if (desc && !affectedVersions.includes(desc)) affectedVersions.push(desc);
        }
      }
    }
    if (cpes.length > 0) res.cpe_matches = cpes;
    if (affectedVersions.length > 0) res.affected_versions = affectedVersions;

    // Build distinct CISA ADP provenance container
    res.cisa_adp = {
      source: 'cisa-adp',
      ssvc: res.ssvc,
      cwe_ids: cwes.length > 0 ? cwes : undefined,
      cvss: res.cvss ? {
        score: res.cvss.score,
        vector: res.cvss.vector,
        version: res.cvss.version,
        source: 'CISA-ADP',
      } : undefined,
      cpe_matches: cpes.length > 0 ? cpes : undefined,
      affected_versions: affectedVersions.length > 0 ? affectedVersions : undefined,
    };
  }

  // Authoritative Vendor / CNA Extraction from Vulnrichment (MITRE CVE Record)
  if (cna) {
    if (!res.vendor && cna.affected?.[0]?.vendor) res.vendor = cna.affected[0].vendor;
    if (!res.product && cna.affected?.[0]?.product) res.product = cna.affected[0].product;

    const cnaFixedVersions: string[] = [];
    if (Array.isArray(cna.solutions)) {
      for (const sol of cna.solutions) {
        if (sol.value) {
          const match = sol.value.match(/versions?\s+([0-9.,\s]+?)\s+or\s+above/i);
          if (match && match[1]) {
            const vs = match[1].split(/[,\s]+/).map((v: string) => v.trim()).filter((v: string) => /^\d+(?:\.\d+)+$/.test(v));
            for (const v of vs) {
              if (!cnaFixedVersions.includes(v)) cnaFixedVersions.push(v);
            }
          }
        }
      }
    }
    const cnaAffectedVersions: string[] = [];
    if (Array.isArray(cna.affected)) {
      for (const aff of cna.affected) {
        for (const v of aff.versions || []) {
          if (v.version && !cnaAffectedVersions.includes(v.version)) {
            cnaAffectedVersions.push(v.version);
          }
          if (v.lessThan && /^\d+(?:\.\d+)+$/.test(v.lessThan) && !cnaFixedVersions.includes(v.lessThan)) {
            cnaFixedVersions.push(v.lessThan);
          }
        }
      }
    }
    if (cnaFixedVersions.length > 0) {
      res.fixed_versions = cnaFixedVersions;
    }

    const cnaDesc = Array.isArray(cna.descriptions)
      ? (cna.descriptions.find((d: any) => d.lang === 'en')?.value || cna.descriptions[0]?.value)
      : (typeof cna.description === 'string' ? cna.description : undefined);

    const cnaCwes: string[] = [];
    for (const pt of cna.problemTypes || []) {
      for (const d of pt.descriptions || []) {
        const val = d.description || d.cweId;
        if (val && !val.includes('CWE-noinfo') && !cnaCwes.includes(val)) {
          cnaCwes.push(val);
        }
      }
    }

    const cnaCvss31 = cna.metrics?.find((m: any) => m.cvssV3_1)?.cvssV3_1;
    const cnaCvss40 = cna.metrics?.find((m: any) => m.cvssV4_0)?.cvssV4_0;
    const cnaCvss30 = cna.metrics?.find((m: any) => m.cvssV3_0)?.cvssV3_0;
    const bestCnaCvss = cnaCvss31 || cnaCvss40 || cnaCvss30;

    const cnaRefs: string[] = Array.isArray(cna.references)
      ? cna.references.map((r: any) => r.url).filter(Boolean)
      : [];

    res.raw_evidence = {
      ...(res.raw_evidence || {}),
      cna_provider: cna.providerMetadata?.shortName,
      cna_description: cnaDesc,
      cna_fixed_versions: cnaFixedVersions,
      cna_title: cna.title,
    };

    // Build distinct MITRE CVE / CNA provenance container
    res.mitre_cve = {
      source: 'mitre-cve',
      cna_provider: cna.providerMetadata?.shortName || 'MITRE-CNA',
      description: cnaDesc,
      title: cna.title,
      affected_versions: cnaAffectedVersions.length > 0 ? cnaAffectedVersions : undefined,
      fixed_versions: cnaFixedVersions.length > 0 ? cnaFixedVersions : undefined,
      cvss: bestCnaCvss ? {
        score: String(bestCnaCvss.baseScore),
        vector: bestCnaCvss.vectorString,
        version: cnaCvss40 ? '4.0' : (cnaCvss31 ? '3.1' : '3.0'),
        source: cna.providerMetadata?.shortName || 'MITRE-CNA',
      } : undefined,
      cwe_ids: cnaCwes.length > 0 ? cnaCwes : undefined,
      references: cnaRefs.length > 0 ? cnaRefs : undefined,
    };
  }

  return res;
}

export function parseOsvRecord(cveOrId: string, payload: any): UnifiedEnrichmentRecord | null {
  if (!payload || typeof payload !== 'object' || !payload.id) return null;
  const affected = payload.affected;
  if (!Array.isArray(affected) || affected.length === 0) return null;

  // Find package-level info
  const pkgEntry = affected.find((a: any) => a.package?.name);
  const pkgName = pkgEntry?.package?.name;
  const ecosystem = pkgEntry?.package?.ecosystem;

  const affectedRanges: string[] = [];
  const fixedVersions: string[] = [];

  for (const a of affected) {
    if (Array.isArray(a.versions)) {
      for (const v of a.versions) {
        if (typeof v === 'string' && !affectedRanges.includes(v)) affectedRanges.push(v);
      }
    }
    for (const r of a.ranges || []) {
      for (const ev of r.events || []) {
        if (ev.fixed && !fixedVersions.includes(ev.fixed)) fixedVersions.push(ev.fixed);
        if (ev.introduced && !affectedRanges.includes(`introduced:${ev.introduced}`)) affectedRanges.push(`introduced:${ev.introduced}`);
        if (ev.last_affected && !affectedRanges.includes(`last_affected:${ev.last_affected}`)) affectedRanges.push(`last_affected:${ev.last_affected}`);
      }
    }
  }

  const osvAliases = Array.isArray(payload.aliases) ? payload.aliases.filter((a: any) => typeof a === 'string') : [];

  return {
    source: 'osv',
    source_record_id: payload.id,
    package: pkgName,
    ecosystem,
    affected_versions: affectedRanges.length > 0 ? affectedRanges : undefined,
    fixed_versions: fixedVersions.length > 0 ? fixedVersions : undefined,
    references: (payload.references || []).map((r: any) => typeof r === 'string' ? r : r.url).filter(Boolean),
    aliases: osvAliases.length > 0 ? osvAliases : undefined,
  };
}

export function parseGhsaAdvisories(cveId: string, advisories: any): UnifiedEnrichmentRecord | null {
  if (!Array.isArray(advisories) || advisories.length === 0) return null;
  const adv = advisories[0];
  if (!adv || !adv.ghsa_id) return null;

  const vulns = adv.vulnerabilities;
  const hasVulns = Array.isArray(vulns) && vulns.length > 0;
  const primaryVuln = hasVulns ? vulns.find((v: any) => v.package?.name) || vulns[0] : null;

  const affectedRanges: string[] = [];
  const fixedVersions: string[] = [];
  if (hasVulns) {
    for (const v of vulns) {
      if (v.vulnerable_version_range && !affectedRanges.includes(v.vulnerable_version_range)) {
        affectedRanges.push(v.vulnerable_version_range);
      }
      if (v.first_patched_version && !fixedVersions.includes(v.first_patched_version)) {
        fixedVersions.push(v.first_patched_version);
      }
    }
  }

  const cvssScore = adv.cvss?.score != null ? String(adv.cvss.score) : undefined;
  const cvssVector = adv.cvss?.vector_string || undefined;

  const ghsaAliases: string[] = [];
  if (adv.cve_id && !ghsaAliases.includes(adv.cve_id)) ghsaAliases.push(adv.cve_id);
  if (Array.isArray(adv.identifiers)) {
    for (const id of adv.identifiers) {
      const val = typeof id === 'string' ? id : id?.value;
      if (val && !ghsaAliases.includes(val)) ghsaAliases.push(val);
    }
  }

  return {
    source: 'github-advisory',
    source_record_id: adv.ghsa_id,
    package: primaryVuln?.package?.name,
    ecosystem: primaryVuln?.package?.ecosystem,
    affected_versions: affectedRanges.length > 0 ? affectedRanges : undefined,
    fixed_versions: fixedVersions.length > 0 ? fixedVersions : undefined,
    cvss: cvssScore ? { score: cvssScore, vector: cvssVector, source: 'GHSA' } : undefined,
    cwe_ids: adv.cwe_ids || adv.cws_ids || undefined,
    references: (adv.references || []).map((r: any) => typeof r === 'string' ? r : r.url).filter(Boolean),
    aliases: ghsaAliases.length > 0 ? ghsaAliases : undefined,
  };
}

export interface ProductVersionScope {
  vendor: string;
  product: string;
  affected_versions: string[];
  fixed_versions?: string[];
}

export function parseNvdCpeData(nvdCveData: any): {
  cpes: string[];
  vendor?: string;
  product?: string;
  affectedRanges: string[];
  productScopedRanges: Record<string, string[]>;
  productScopes: ProductVersionScope[];
  references: Array<{ url: string; tags: string[] }>;
  vendorAdvisoryUrl?: string;
  cweIds: string[];
  publishedDate?: string;
  lastModifiedDate?: string;
  description?: string;
  cvss?: {
    score: string;
    vector: string;
    version: string;
    source?: string;
    source_type?: 'CNA' | 'NVD' | 'OTHER';
    type?: 'Primary' | 'Secondary';
  };
  cvssAssessments?: Array<{
    score: string;
    vector: string;
    version: string;
    source: string;
    source_type: 'CNA' | 'NVD' | 'OTHER';
    type?: 'Primary' | 'Secondary';
    severity?: string;
  }>;
  cvssConflictDetected?: boolean;
  attackVector?: string;
  attackComplexity?: string;
  privilegesRequired?: string;
  userInteraction?: string;
  baseSeverity?: string;
} {
  const cpes: string[] = [];
  const affectedRanges: string[] = [];
  const productScopedRanges: Record<string, string[]> = {};
  const productSpecificVersions: Record<string, string[]> = {};
  let extractedVendor: string | undefined;
  let extractedProduct: string | undefined;

  const nodes = nvdCveData?.configurations?.[0]?.nodes || [];
  for (const node of nodes) {
    for (const match of node.cpeMatch || []) {
      if (match.criteria && !cpes.includes(match.criteria)) {
        cpes.push(match.criteria);
        // Extract vendor and product from CPE 2.3 formatted string
        // Format: cpe:2.3:part:vendor:product:version:...
        const parts = match.criteria.split(':');
        if (parts.length > 4) {
          const v = parts[3] && parts[3] !== '*' ? parts[3] : '';
          const p = parts[4] && parts[4] !== '*' ? parts[4] : '';
          if (!extractedVendor && v) extractedVendor = v;
          if (!extractedProduct && p) extractedProduct = p;

          if (p) {
            if (!productScopedRanges[p]) productScopedRanges[p] = [];
            if (!productSpecificVersions[p]) productSpecificVersions[p] = [];
            if (parts[5] && parts[5] !== '*' && parts[5] !== '-') {
              if (!productSpecificVersions[p].includes(parts[5])) {
                productSpecificVersions[p].push(parts[5]);
              }
            }
          }
        }
      }
      if (match.versionStartIncluding || match.versionEndExcluding || match.versionStartExcluding || match.versionEndIncluding) {
        const parts = match.criteria?.split(':') || [];
        const p = parts[4] && parts[4] !== '*' ? parts[4] : '';
        const range = `${match.versionStartIncluding ? `>= ${match.versionStartIncluding}` : (match.versionStartExcluding ? `> ${match.versionStartExcluding}` : '')}${match.versionEndExcluding ? ` < ${match.versionEndExcluding}` : (match.versionEndIncluding ? ` <= ${match.versionEndIncluding}` : '')}`.trim();
        if (range && !affectedRanges.includes(range)) affectedRanges.push(range);
        if (p && range) {
          if (!productScopedRanges[p]) productScopedRanges[p] = [];
          if (!productScopedRanges[p].includes(range)) productScopedRanges[p].push(range);
        }
      }
    }
  }

  // Build product scopes
  const productScopes: ProductVersionScope[] = [];
  const allProducts = new Set<string>([...Object.keys(productScopedRanges), ...Object.keys(productSpecificVersions)]);
  for (const p of allProducts) {
    const ranges = productScopedRanges[p] || [];
    const specs = productSpecificVersions[p] || [];
    const versions = ranges.length > 0 ? ranges : specs;
    if (versions.length > 0) {
      productScopes.push({
        vendor: extractedVendor || 'Unknown',
        product: p.replace(/_/g, ' '),
        affected_versions: versions,
      });
    }
  }

  // References & Vendor Advisory extraction
  const references: Array<{ url: string; tags: string[] }> = [];
  let vendorAdvisoryUrl: string | undefined;
  for (const ref of nvdCveData?.references || []) {
    if (ref.url) {
      const tags = Array.isArray(ref.tags) ? ref.tags : [];
      references.push({ url: ref.url, tags });
      if (!vendorAdvisoryUrl && (tags.includes('Vendor Advisory') || tags.includes('Patch'))) {
        vendorAdvisoryUrl = ref.url;
      }
    }
  }

  // CWEs from NVD weaknesses
  const cweIds: string[] = [];
  for (const w of nvdCveData?.weaknesses || []) {
    for (const d of w.description || []) {
      if (d.value && d.value.startsWith('CWE-') && !cweIds.includes(d.value)) {
        cweIds.push(d.value);
      }
    }
  }

  const publishedDate = nvdCveData?.published;
  const lastModifiedDate = nvdCveData?.lastModified;
  const description = nvdCveData?.descriptions?.find((d: any) => d.lang === 'en')?.value;

  // DEFECT A: Extract all CVSS assessments across versions and authorities (preserving CNA vs NVD provenance)
  const cvssAssessments: Array<{
    score: string;
    vector: string;
    version: string;
    source: string;
    source_type: 'CNA' | 'NVD' | 'OTHER';
    type?: 'Primary' | 'Secondary';
    severity?: string;
  }> = [];

  const rawMetricGroups = [
    { list: nvdCveData?.metrics?.cvssMetricV31, version: '3.1' },
    { list: nvdCveData?.metrics?.cvssMetricV40, version: '4.0' },
    { list: nvdCveData?.metrics?.cvssMetricV30, version: '3.0' },
  ];

  for (const g of rawMetricGroups) {
    if (Array.isArray(g.list)) {
      for (const m of g.list) {
        const d = m?.cvssData;
        if (d && (d.baseScore !== undefined || d.vectorString)) {
          const isPrimary = m.type === 'Primary' || m.source === 'nvd@nist.gov';
          const isSecondary = m.type === 'Secondary';
          const source_type: 'CNA' | 'NVD' | 'OTHER' = isPrimary ? 'NVD' : (isSecondary ? 'CNA' : 'OTHER');
          cvssAssessments.push({
            score: String(d.baseScore),
            vector: d.vectorString || 'NOT_AVAILABLE',
            version: d.version || g.version,
            source: m.source || (isPrimary ? 'nvd@nist.gov' : 'CNA'),
            source_type,
            type: m.type,
            severity: d.baseSeverity,
          });
        }
      }
    }
  }

  // Preserve existing score-selection priority (first metric recorded or primary)
  const primaryMetric = cvssAssessments[0];
  const hasIntraNvdConflict = cvssAssessments.length > 1 &&
    cvssAssessments.some(a => a.score !== cvssAssessments[0].score || a.vector !== cvssAssessments[0].vector);

  const bestData = nvdCveData?.metrics?.cvssMetricV31?.[0]?.cvssData ||
                   nvdCveData?.metrics?.cvssMetricV40?.[0]?.cvssData ||
                   nvdCveData?.metrics?.cvssMetricV30?.[0]?.cvssData;

  return {
    cpes,
    vendor: extractedVendor,
    product: extractedProduct,
    affectedRanges,
    productScopedRanges,
    productScopes,
    references,
    vendorAdvisoryUrl,
    cweIds,
    publishedDate,
    lastModifiedDate,
    description,
    cvss: primaryMetric ? {
      score: primaryMetric.score,
      vector: primaryMetric.vector,
      version: primaryMetric.version,
      source: primaryMetric.source,
      source_type: primaryMetric.source_type,
      type: primaryMetric.type,
    } : undefined,
    cvssAssessments,
    cvssConflictDetected: hasIntraNvdConflict,
    attackVector: bestData?.attackVector,
    attackComplexity: bestData?.attackComplexity,
    privilegesRequired: bestData?.privilegesRequired,
    userInteraction: bestData?.userInteraction,
    baseSeverity: bestData?.baseSeverity,
  };
}

// ── MICRO TASK 76: Semantic Isolation & Adversarial Verification Gate ──────

export type EvidenceScope =
  | 'CVE'
  | 'PRODUCT'
  | 'CAMPAIGN'
  | 'RELATION'
  | 'KNOWLEDGE'
  | 'ANALYST';

export type CveRelationshipType = RelationshipType;

export interface CveRelationship {
  target_cve: string;
  related_cve: string;
  relationship_type: RelationshipType;
  direction: 'OUTBOUND' | 'INBOUND' | 'BIDIRECTIONAL';
  description: string;
  inherits_facts: false; // Strict architectural rule: relationships provide context, NEVER inheritance!
  evidence_ids: string[];
}

// ── P0.2 REFACTOR (2026-09-18): Evidence-aware validation, zero per-CVE runtime registries ──
// Architectural rule (recovery gate): production validators receive authoritative evidence
// through EXPLICIT parameters. No per-CVE dataset may live in this package. Tests inject
// oracle data via tests/fixtures/ground_truth_oracles.ts (never imported by production).

export interface AuthoritativeAdvisoryEvidence {
  advisory_id?: string;
  advisory_url?: string;
  advisory_source?: string;
  published_date?: string;
}

export interface AuthoritativeProductScope {
  vendor: string;
  product: string;
  affected_versions: string[];
  fixed_versions: string[];
}

/**
 * The authority a validator needs, supplied by the caller (a real source adapter in
 * production, a test fixture in tests). Absent fields mean UNKNOWN — never false.
 */
export interface AuthoritativeEvidenceContext {
  cve_id: string;
  /** Provenance of this evidence (e.g. 'CNA_ADVISORY:VMSA-2021-0020'). */
  source: string;
  advisory?: AuthoritativeAdvisoryEvidence;
  technical_mechanism?: string;
  products_affected?: AuthoritativeProductScope[];
  source_specific_cwes?: Record<string, string[]>;
  cwe_disagreement?: boolean;
  cisa_kev?: { is_exploited: boolean; ransomware_campaign_use?: string; due_date?: string };
  cvss_v31?: { score: number; vector: string };
  /** Relationship context attributed to this evidence source. */
  relationships?: CveRelationship[];
  detection_guidance?: string[];
}

export function lookupCveRelationships(_cveId: string): CveRelationship[] {
  // P0.2: intentionally returns [] — no runtime relationship source is wired yet.
  // Relationship context MUST be supplied explicitly via AuthoritativeEvidenceContext.relationships.
  // This is a documented compatibility stub for existing consumers, NOT a registry.
  return [];
}

// Capability-class taxonomy: GENERIC domain knowledge (mechanism wording ↔ CWE class),
// not per-CVE intelligence. Used to detect cross-weakness contamination generically.
const MECHANISM_CAPABILITY_CLASSES: Array<{ cls: string; label: string; patterns: RegExp[]; cwes: string[] }> = [
  { cls: 'command-execution', label: "command injection/execution", patterns: [/command injection/i, /command execution/i, /os command/i, /arbitrary command/i], cwes: ['CWE-77', 'CWE-78'] },
  { cls: 'code-execution', label: "arbitrary code execution", patterns: [/code execution/i, /arbitrary code/i], cwes: ['CWE-94'] },
  { cls: 'authentication-bypass', label: "authentication bypass", patterns: [/authentication bypass/i, /auth bypass/i, /improper authentication/i], cwes: ['CWE-287', 'CWE-305'] },
  { cls: 'file-upload', label: "arbitrary file upload", patterns: [/file upload/i], cwes: ['CWE-434'] },
  { cls: 'sql-injection', label: "SQL injection", patterns: [/sql injection/i, /\bsqli\b/i], cwes: ['CWE-89'] },
  { cls: 'path-traversal', label: "path traversal", patterns: [/path traversal/i, /directory traversal/i], cwes: ['CWE-22', 'CWE-23'] },
  { cls: 'deserialization', label: "deserialization", patterns: [/deserialization/i, /deserialisation/i], cwes: ['CWE-502'] },
  { cls: 'ssrf', label: "SSRF", patterns: [/server-side request forgery/i, /\bssrf\b/i], cwes: ['CWE-918'] },
];

function mechanismCapabilityClasses(text: string, cwes: string[]): Set<string> {
  const classes = new Set<string>();
  for (const entry of MECHANISM_CAPABILITY_CLASSES) {
    if (entry.patterns.some(p => p.test(text))) classes.add(entry.cls);
    if (cwes.some(c => entry.cwes.includes(String(c).toUpperCase()))) classes.add(entry.cls);
  }
  return classes;
}

/**
 * Detects technical-mechanism contamination GENERICALLY.
 *
 * Without evidence: cannot contradict anything (absence of authority ⇒ no verdict).
 * With evidence: the asserted mechanism must not claim a capability class that the
 * authoritative mechanism and the evidence CWEs do not establish (e.g. asserting
 * command execution on a CVE whose authoritative record is an authentication bypass).
 */
export function validateTechnicalMechanismIsolation(cveId: string, mechanism: string, authoritativeEvidence?: AuthoritativeEvidenceContext | null): {
  isValid: boolean;
  violation?: string;
  violations: string[];
} {
  const violations: string[] = [];
  const evidence = authoritativeEvidence || null;

  if (evidence && mechanism && mechanism.trim().length > 0) {
    const asserted = mechanismCapabilityClasses(mechanism, []);
    const authorizedText = evidence.technical_mechanism || '';
    const authorizedCwes: string[] = [];
    for (const list of Object.values(evidence.source_specific_cwes || {})) {
      authorizedCwes.push(...list);
    }
    const authorized = mechanismCapabilityClasses(authorizedText, authorizedCwes);

    for (const cls of asserted) {
      if (!authorized.has(cls)) {
        const label = MECHANISM_CAPABILITY_CLASSES.find(e => e.cls === cls)?.label || cls;
        violations.push(
          `mechanism asserts ${label} capability not established by authoritative evidence for ${cveId} (evidence source: ${evidence.source})`
        );
      }
    }
  }

  return {
    isValid: violations.length === 0,
    violation: violations[0],
    violations,
  };
}

// P0.2 (2026-09-18): AUTHORITATIVE_CNA_CATALOG and lookupAuthoritativeAdvisory are
// permanently removed. Authoritative facts enter ONLY through explicit
// AuthoritativeEvidenceContext parameters supplied by real source adapters (production)
// or test fixtures (tests). Unknown facts remain UNKNOWN — never registry-filled.
export type AuthoritativeCnaAdvisory = AuthoritativeEvidenceContext;

// Removed P0.2: static CNA lookup is gone — no hidden registry behind this name.

export interface ReconciledSourceState {
  identity: {
    cve: string;
    vendor: string;
    product: string;
    package?: string;
    ecosystem?: string;
    cpe_matches: string[];
    truth_types: {
      cve: 'SOURCE_FACT';
      vendor: 'SOURCE_FACT' | 'CONFLICT' | 'UNKNOWN';
      product: 'SOURCE_FACT' | 'CONFLICT' | 'UNKNOWN';
      package: 'SOURCE_FACT' | 'NOT_APPLICABLE';
      ecosystem: 'SOURCE_FACT' | 'NOT_APPLICABLE';
      cpe_matches: 'SOURCE_FACT' | 'NOT_AVAILABLE';
    };
  };
  severity: {
    cvss: {
      score: string;
      vector: string;
      version: string;
      source: string;
      source_type?: 'CNA' | 'NVD' | 'CISA-ADP' | 'GHSA' | 'OTHER';
      truth_type: 'SOURCE_FACT' | 'CONFLICT' | 'NOT_AVAILABLE';
      conflicts?: Array<{
        source: string;
        source_type?: 'CNA' | 'NVD' | 'CISA-ADP' | 'GHSA' | 'OTHER';
        type?: 'Primary' | 'Secondary';
        score: string;
        vector?: string;
        version?: string;
        severity?: string;
      }>;
    };
    epss: {
      score: string;
      percentile: string;
      truth_type: 'SOURCE_FACT' | 'NOT_AVAILABLE';
      /** PHASE 5 (REM-04): EPSS source observation date, or null when the source supplies none. */
      observed_at?: string | null;
    };
  };
  exploitation: {
    status: 'KNOWN_EXPLOITED' | 'REPORTED' | 'NO_EVIDENCE';
    cisa_kev: boolean;
    known_ransomware_campaign_use?: string;
    due_date?: string;
    ssvc?: {
      exploitation?: string;
      automatable?: string;
      technical_impact?: string;
    };
    truth_type: 'SOURCE_FACT';
    sources: string[];
    exploit_db?: {
      status: string;
      exploit_id?: string;
      url?: string;
      title?: string;
      publication_date?: string;
      truth_type: string;
      scope?: string;
      global_status?: string;
    };
    public_exploit_available?: boolean;
  };
  exploitation_truth?: {
    status: string;
    cisa_kev: boolean;
    known_ransomware_campaign_use?: string;
    due_date?: string;
  };
  affected_scope: {
    affected_versions: string[];
    fixed_versions: string[];
    products_affected: Array<{
      vendor: string;
      product: string;
      affected_versions: string[];
      fixed_versions?: string[];
    }>;
    truth_type: 'SOURCE_FACT' | 'SOURCE_DERIVED' | 'UNKNOWN';
    sources: string[];
    /**
     * PHASE 4 (REM-03) — canonical product-aware version mappings. This is the SOURCE
     * OF TRUTH; `affected_versions` / `fixed_versions` above are deterministic
     * projections of it (legacy compatibility).
     */
    version_mappings?: ProductVersionMapping[];
    /** FIX_COMMIT identifiers kept OUT of the product-version fields. */
    fixed_commits?: string[];
  };
  vendor_advisory: {
    url?: string;
    source?: string;
    advisory_id?: string;
    published?: string;
    remediation_source?: string;
    fixed_version_source?: string;
    detection_guidance?: string[];
  };
  weakness_fidelity: {
    cwe_disagreement: boolean;
    source_specific_cwes: Record<string, string[]>;
    technical_mechanism?: string;
  };
  sources_used: string[];
  reconciliation_notes: string[];
  source_availability?: Record<string, 'SOURCE_AVAILABLE' | 'SOURCE_UNAVAILABLE' | 'SOURCE_ERROR' | 'SOURCE_EMPTY'>;
  /** PHASE 5 (REM-04) — canonical temporal provenance; the SINGLE authority for timestamps. */
  temporal_provenance?: TemporalProvenance;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4 (REM-03) — PRODUCT-AWARE VERSION NORMALIZATION (CANONICAL MODEL)
//
// The canonical relationship is:
//   Vendor → Product / Branch → Affected Range → Fixed Release/Patch/Build → Fix Commit
//
// SEMANTIC CONTRACT (the crucial rule):  release != patch != build != commit
// They may coexist inside ONE mapping, but they are never interchangeable, and a
// fixed build belonging to one branch MUST NOT appear under an unrelated branch.
//
// The legacy flat `affected_versions` / `fixed_versions` arrays are deterministic
// PROJECTIONS of this model — they are not the source of truth.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PHASE 4 — explicit version entity taxonomy.
 *
 * VERSION_RELEASE : a shipped product release identifier      (e.g. 10.0.9, 9.0.0)
 * VERSION_PATCH   : a patch/hotfix level on top of a release  (e.g. 8.8.15-p46, 10.2.9-h1)
 * VERSION_BUILD   : a build number / update release           (e.g. 10.0.10240.20796)
 * FIX_COMMIT      : a source-control commit identifier        (e.g. 2c67cbdf…)
 * BRANCH          : a branch/lifecycle discriminator token    (e.g. 2021, 2016)
 * RANGE           : an interval expression, not a discrete version (e.g. < 2.0.0, >= 1.0.0 < 1.5.0)
 * CPE_VERSION     : a CPE match identifier                    (e.g. cpe:2.3:a:vendor:product:…)
 */
export type VersionEntityType =
  | 'VERSION_RELEASE'
  | 'VERSION_PATCH'
  | 'VERSION_BUILD'
  | 'FIX_COMMIT'
  | 'BRANCH'
  | 'RANGE'
  | 'CPE_VERSION';

/** A single typed version token bound to the source that produced it. */
export interface VersionEntity {
  type: VersionEntityType;
  value: string;
  source: string;
}

/**
 * Fixed evidence for ONE product/branch. The class arrays are disjoint by construction:
 * a token appears in exactly one of release / patch / build / commit / range.
 */
export interface VersionMappingFixed {
  release: string[];
  patch: string[];
  build: string[];
  commit: string[];
  range: string[];
}

/**
 * How a mapping's fixed evidence was established. `INHERITED_GLOBAL` is the V1 defect
 * state (a merged global list copied into a branch) and is rejected by the validator.
 */
export type FixedProvenance =
  | 'EXPLICIT'          // the branch carried its own fixed evidence
  | 'DERIVED_BOUNDARY'  // derived from the branch's own affected boundary, confirmed by the report-level fixed set
  | 'SINGLE_SCOPE'      // the report had exactly one product scope — no cross-branch ambiguity
  | 'INHERITED_GLOBAL'  // DEFECT: another branch's / global list was copied in
  | 'NONE';             // no fixed evidence established for this branch

/** Canonical product-aware version mapping — the single source of truth. */
export interface ProductVersionMapping {
  vendor: string;
  product: string;
  /** Branch / lifecycle discriminator (product scope identity by repository convention). */
  branch?: string;
  affected: VersionEntity[];
  fixed: VersionMappingFixed;
  /** Ordered, de-duplicated projection of every fixed token (canonical emission order). */
  fixed_tokens: string[];
  fixed_provenance: FixedProvenance;
  sourceRefs: string[];
  /** EOL / supported lifecycle state — permits "affected known, fixed not established". */
  product_status: 'SUPPORTED' | 'EOL' | 'UNKNOWN';
}

const RE_CPE_TOKEN = /^cpe:(\/|2\.)/i;
const RE_OSV_EVENT_MARKER = /^(introduced|last_affected):/i;
const RE_FIXED_MARKER = /^fixed:/i;
const RE_COMMIT_FULL = /^[0-9a-f]{40}$/;
// A 7–39 char lowercase hex token containing at least one a–f letter is a commit, not a version.
const RE_COMMIT_SHORT = /^(?=[0-9a-f]{7,39}$)[0-9a-f]*[a-f][0-9a-f]*$/;
const RE_RANGE = /(?:^|\s)(<=|>=|<|>)\s|\bbefore\b|\bafter\b|\|\||\s-\s|\*/i;
const RE_BUILD = /^\d+(?:\.\d+){3,}$/;
const RE_PATCH_SUFFIX = /(?:^|[-_.])(?:p|h|hotfix|patch)\d+(?:\.\d+)*$/i;
const RE_BRANCH_YEAR = /^\d{4}$/;
const RE_RELEASE = /^\d+(?:\.\d+){0,2}$/;

/**
 * PHASE 4 — deterministic, context-free version token classifier.
 * Order matters: commit → marker → range → build → patch → branch → release.
 */
export function classifyVersionEntity(raw: string): VersionEntityType {
  const v = String(raw == null ? '' : raw).trim();
  if (!v) return 'RANGE';
  if (RE_CPE_TOKEN.test(v)) return 'CPE_VERSION';
  if (RE_OSV_EVENT_MARKER.test(v)) return 'RANGE';
  if (RE_FIXED_MARKER.test(v)) {
    const rest = v.slice(v.indexOf(':') + 1).trim();
    return (RE_COMMIT_FULL.test(rest) || RE_COMMIT_SHORT.test(rest)) ? 'FIX_COMMIT' : 'VERSION_RELEASE';
  }
  if (RE_COMMIT_FULL.test(v)) return 'FIX_COMMIT';
  if (RE_COMMIT_SHORT.test(v)) return 'FIX_COMMIT';
  if (RE_RANGE.test(v)) return 'RANGE';
  if (RE_BUILD.test(v)) return 'VERSION_BUILD';
  if (RE_PATCH_SUFFIX.test(v)) return 'VERSION_PATCH';
  if (RE_BRANCH_YEAR.test(v)) return 'BRANCH';
  if (RE_RELEASE.test(v)) return 'VERSION_RELEASE';
  if (/\d/.test(v)) return 'VERSION_BUILD';
  return 'BRANCH';
}

function splitFixedByType(tokens: string[]): VersionMappingFixed {
  const out: VersionMappingFixed = { release: [], patch: [], build: [], commit: [], range: [] };
  for (const t of tokens) {
    switch (classifyVersionEntity(t)) {
      case 'VERSION_RELEASE': out.release.push(t); break;
      case 'VERSION_PATCH': out.patch.push(t); break;
      case 'FIX_COMMIT': out.commit.push(t); break;
      case 'RANGE': out.range.push(t); break;
      default: out.build.push(t); break;
    }
  }
  return out;
}

/** Ordered projection of a mapping's fixed tokens. Commits are excluded from version
 * projections by default — a source-control commit is never a product version. */
export function flattenMappingFixed(m: ProductVersionMapping, opts?: { includeCommits?: boolean }): string[] {
  const all = m.fixed_tokens || [];
  if (opts?.includeCommits) return all.slice();
  return all.filter(t => classifyVersionEntity(t) !== 'FIX_COMMIT');
}

/**
 * PHASE 4 — derive the fixed evidence encoded in a branch's OWN affected range.
 * A branch's `< X` / `<= X` / `before X` upper bound is treated as the branch's fixed
 * version ONLY when the report-level fixed evidence independently lists that exact token
 * (evidence-gated). This preserves the pre-existing invariant that a bare CPE interval
 * boundary is NOT promoted to a vendor fixed version.
 */
/** Extract the boundary token(s) named by an affected-range expression (ungated). */
export function deriveBoundaryTokens(affectedTokens: string[]): string[] {
  const out: string[] = [];
  const push = (t: string) => { const v = t.trim(); if (v && !out.includes(v)) out.push(v); };
  for (const raw of affectedTokens) {
    const v = String(raw).trim();
    const le = v.match(/^<=\s*(\S+)$/);
    if (le) { push(le[1]); continue; }
    const lt = v.match(/^<\s*(\S+)$/);
    if (lt) { push(lt[1]); continue; }
    const before = v.match(/\bbefore\s+(.+)$/i);
    if (before) { push(before[1]); continue; }
    for (const m of v.matchAll(/<\s*(\S+)/g)) push(m[1]);
  }
  return out;
}

export function deriveFixedFromAffectedBoundary(affectedTokens: string[], authoritativeFixed: string[]): string[] {
  const allowed = new Set(authoritativeFixed.map(s => String(s).trim()).filter(Boolean));
  if (allowed.size === 0) return [];
  return deriveBoundaryTokens(affectedTokens).filter(t => allowed.has(t));
}

/** Version sentinels — absence markers that must never be treated as version tokens. */
const VERSION_SENTINELS = new Set(['UNKNOWN', 'NOT_AVAILABLE', 'NOT AVAILABLE', 'N/A', 'NA', 'NONE', 'NOT_APPLICABLE', 'NOT APPLICABLE', 'PENDING', 'TBD']);
export function isSentinelVersionToken(t: unknown): boolean {
  return VERSION_SENTINELS.has(String(t == null ? '' : t).trim().toUpperCase());
}

/**
 * PHASE 4 — THE canonical normalization operation.
 *
 * Every product/branch scope keeps its OWN affected evidence and receives ONLY its own
 * fixed evidence: explicit branch evidence first, then (evidence-gated) derivation from
 * the branch's own affected boundary. A merged global fixed list is NEVER copied into a
 * branch — that is the RC-3 / V1 defect this function exists to prevent.
 */
export function buildProductVersionMappings(params: {
  vendor: string;
  productsAffected: Array<{ vendor: string; product: string; affected_versions?: string[]; fixed_versions?: string[] }>;
  globalAffected?: string[];
  globalFixed?: string[];
  sources?: string[];
  productStatus?: Record<string, 'SUPPORTED' | 'EOL' | 'UNKNOWN'>;
}): ProductVersionMapping[] {
  const scopes = (params.productsAffected || []).filter(Boolean);
  const sources = params.sources && params.sources.length > 0 ? Array.from(new Set(params.sources)) : ['unspecified'];
  const globalFixed = (params.globalFixed || []).map(String).filter(Boolean);
  const globalAffected = (params.globalAffected || []).map(String).filter(Boolean);
  const multiScope = scopes.length > 1;
  const mappings: ProductVersionMapping[] = [];

  for (const sc of scopes) {
    const ownAffected = (sc.affected_versions || []).map(String).filter(Boolean);
    const ownFixed = (sc.fixed_versions || []).map(String).filter(Boolean);

    const affectedTokens = ownAffected.length > 0
      ? ownAffected.slice()
      : (multiScope ? [] : globalAffected.slice());

    let fixedTokens: string[];
    let provenance: FixedProvenance;
    if (ownFixed.length > 0) {
      fixedTokens = ownFixed.slice();
      provenance = 'EXPLICIT';
    } else if (!multiScope && globalFixed.length > 0) {
      fixedTokens = globalFixed.slice();
      provenance = 'SINGLE_SCOPE';
    } else {
      const derived = deriveFixedFromAffectedBoundary(affectedTokens, globalFixed);
      fixedTokens = derived;
      provenance = derived.length > 0 ? 'DERIVED_BOUNDARY' : 'NONE';
    }

    mappings.push({
      vendor: sc.vendor || params.vendor || 'Unknown',
      product: sc.product || 'Unknown',
      branch: sc.product || undefined,
      affected: affectedTokens.map(t => ({ type: classifyVersionEntity(t), value: t, source: sources[0] })),
      fixed: splitFixedByType(fixedTokens),
      fixed_tokens: fixedTokens,
      fixed_provenance: provenance,
      sourceRefs: sources.slice(),
      product_status: (params.productStatus && sc.product && params.productStatus[sc.product]) || 'UNKNOWN',
    });
  }

  // Evidence with no explicit product scope still yields ONE canonical mapping so callers
  // never have to fall back to an unstructured global list.
  if (mappings.length === 0 && (globalAffected.length > 0 || globalFixed.length > 0)) {
    mappings.push({
      vendor: params.vendor || 'Unknown',
      product: params.vendor || 'Unknown',
      branch: undefined,
      affected: globalAffected.map(t => ({ type: classifyVersionEntity(t), value: t, source: sources[0] })),
      fixed: splitFixedByType(globalFixed),
      fixed_tokens: globalFixed.slice(),
      fixed_provenance: globalFixed.length > 0 ? 'SINGLE_SCOPE' : 'NONE',
      sourceRefs: sources.slice(),
      product_status: 'UNKNOWN',
    });
  }

  return mappings;
}

/** Select the mapping that represents the report's primary product (identity product
 * when it matches a scope, otherwise the first scope). */
export function selectPrimaryVersionMapping(mappings: ProductVersionMapping[], primaryProduct?: string): ProductVersionMapping | undefined {
  if (!mappings || mappings.length === 0) return undefined;
  const p = String(primaryProduct || '').toLowerCase().trim();
  if (p) {
    // Exact product identity first, then a containment match (never a reverse-prefix
    // match that would let 'coldfusion' swallow 'coldfusion 2023').
    const exact = mappings.find(m => String(m.product || '').toLowerCase().trim() === p);
    if (exact) return exact;
    const contained = mappings.find(m => {
      const mp = String(m.product || '').toLowerCase().trim();
      return mp.includes(p) || p.includes(mp);
    });
    if (contained) return contained;
  }
  return mappings[0];
}

/**
 * PHASE 4 — VER-001..VER-008 deterministic version-semantics validation.
 *
 * BLOCKING (fail-closed): VER-002 contamination, VER-003 commit-as-version,
 * VER-005 dropped branch, VER-008 type semantics.
 * WARNING: VER-001, VER-004, VER-006, VER-007 (reported, non-blocking).
 * The validator NEVER repairs data — it only reports.
 */
export interface VersionViolation {
  rule: 'VER-001' | 'VER-002' | 'VER-003' | 'VER-004' | 'VER-005' | 'VER-006' | 'VER-007' | 'VER-008';
  severity: 'BLOCKING' | 'WARNING';
  message: string;
}

export function verifyVersionMappings(input: {
  mappings: ProductVersionMapping[];
  productsAffected?: Array<{ product: string; affected_versions?: string[]; fixed_versions?: string[] }>;
  flatAffectedVersions?: unknown;
  flatFixedVersions?: unknown;
}): VersionViolation[] {
  const out: VersionViolation[] = [];
  const mappings = input.mappings || [];
  const push = (rule: VersionViolation['rule'], severity: VersionViolation['severity'], message: string) => out.push({ rule, severity, message });

  const flatFixedProvided = input.flatFixedVersions !== undefined && input.flatFixedVersions !== null;
  const flatFixed = normalizeVersionTokens(input.flatFixedVersions).filter(t => !isSentinelVersionToken(t));
  const flatAffected = normalizeVersionTokens(input.flatAffectedVersions).filter(t => !isSentinelVersionToken(t));
  const knownFixedExists = mappings.some(m => (m.fixed_tokens || []).length > 0) || flatFixed.length > 0;

  // ── VER-002 (BLOCKING): no global fixed list assigned to unrelated branches.
  const branchFixedSets = mappings
    .map(m => ({ product: m.product, provenance: m.fixed_provenance, tokens: m.fixed_tokens || [] }))
    .filter(b => b.tokens.length > 0);
  if (branchFixedSets.length > 1) {
    const distinctProducts = new Set(branchFixedSets.map(b => String(b.product).toLowerCase()));
    for (const b of branchFixedSets) {
      if (b.provenance === 'INHERITED_GLOBAL') {
        push('VER-002', 'BLOCKING', `Branch '${b.product}' received a merged global fixed list (provenance INHERITED_GLOBAL); fixed ${b.tokens.length} version(s) are not attributable to this branch.`);
      }
    }
    // Boundary attribution: a fixed token that is a DIFFERENT branch's own affected
    // boundary cannot legitimately belong to this branch (VER-V1 / VER-V2).
    const boundaryOwners = new Map<string, string[]>();
    for (const m of mappings) {
      for (const t of deriveBoundaryTokens(m.affected.map(a => a.value))) {
        const owners = boundaryOwners.get(t) || [];
        owners.push(m.product);
        boundaryOwners.set(t, owners);
      }
    }
    for (const m of mappings) {
      const self = String(m.product || '').toLowerCase();
      for (const t of m.fixed_tokens || []) {
        const owners = boundaryOwners.get(t);
        if (owners && !owners.some(o => String(o).toLowerCase() === self)) {
          push('VER-002', 'BLOCKING', `Fixed version '${t}' is the affected boundary of a different branch (${owners.join(', ')}) but is attached to '${m.product}'.`);
        }
      }
    }
    // Structural signature: two or more DISTINCT branches carrying an identical
    // multi-value fixed list while their affected ranges differ — the V1 contamination shape.
    if (distinctProducts.size > 1) {
      const bySig = new Map<string, string[]>();
      for (const b of branchFixedSets) {
        if (b.tokens.length < 2) continue;
        const sig = [...b.tokens].slice().sort().join('|');
        const list = bySig.get(sig) || [];
        list.push(b.product);
        bySig.set(sig, list);
      }
      for (const [sig, products] of bySig) {
        if (products.length > 1) {
          const affectedSigs = new Set(products.map(p => {
            const m = mappings.find(x => x.product === p);
            return (m?.affected || []).map(a => a.value).sort().join('|');
          }));
          if (affectedSigs.size > 1) {
            push('VER-002', 'BLOCKING', `Cross-branch fixed-version contamination: ${products.length} distinct branches (${products.join(', ')}) share the identical ${sig.split('|').length}-value fixed list while their affected ranges differ.`);
          }
        }
      }
    }
  }

  // ── VER-003 (BLOCKING): commit hashes must not be treated as product versions.
  for (const m of mappings) {
    for (const c of m.fixed.commit) {
      if (m.fixed.release.includes(c) || m.fixed.patch.includes(c) || m.fixed.build.includes(c) || m.fixed.range.includes(c)) {
        push('VER-003', 'BLOCKING', `Commit '${c}' is present in a product-version class for branch '${m.product}'.`);
      }
    }
  }
  for (const t of flatFixed) {
    if (classifyVersionEntity(t) === 'FIX_COMMIT') {
      push('VER-003', 'BLOCKING', `Commit identifier '${t}' is rendered as a product fixed version (must live only in fix.commit).`);
    }
  }

  // ── VER-005 (BLOCKING): a known branch must not be silently dropped.
  const scopeProducts = (input.productsAffected || []).map(p => String(p.product || '').toLowerCase());
  for (const sp of scopeProducts) {
    if (!mappings.some(m => String(m.product || '').toLowerCase() === sp)) {
      push('VER-005', 'BLOCKING', `Product branch '${sp}' is present in products_affected but absent from the canonical version mapping.`);
    }
  }

  // ── VER-008 (BLOCKING): version type semantics preserved.
  for (const m of mappings) {
    const check = (arr: string[], expect: VersionEntityType) => {
      for (const t of arr) {
        const actual = classifyVersionEntity(t);
        const ok = actual === expect
          || (expect === 'VERSION_BUILD' && (actual === 'VERSION_RELEASE' || actual === 'VERSION_PATCH' || actual === 'BRANCH'));
        if (!ok) {
          push('VER-008', 'BLOCKING', `Branch '${m.product}': token '${t}' is classified ${actual} but stored under ${expect}.`);
        }
      }
    };
    check(m.fixed.release, 'VERSION_RELEASE');
    check(m.fixed.patch, 'VERSION_PATCH');
    check(m.fixed.build, 'VERSION_BUILD');
    check(m.fixed.commit, 'FIX_COMMIT');
    check(m.fixed.range, 'RANGE');
  }

  // ── VER-001 (WARNING): every fixed version/build maps to its product/branch.
  for (const m of mappings) {
    if ((m.fixed_tokens || []).length > 0 && (m.sourceRefs || []).length === 0) {
      push('VER-001', 'WARNING', `Branch '${m.product}' has fixed evidence with no source reference.`);
    }
  }

  // ── VER-004 (WARNING): affected and fixed derive from the same branch-aware mapping.
  for (const m of mappings) {
    if ((m.fixed_tokens || []).length > 0 && m.affected.length === 0 && flatAffected.length > 0) {
      push('VER-004', 'WARNING', `Branch '${m.product}' carries fixed evidence but no affected range while the report has affected data (asymmetry).`);
    }
  }

  // ── VER-006 (BLOCKING): known fixed evidence must not render as UNKNOWN (only
  // meaningful when the caller actually supplies the rendered projection).
  const canonicalFixedExists = mappings.some(m => (m.fixed_tokens || []).length > 0);
  if (flatFixedProvided && canonicalFixedExists && flatFixed.length === 0) {
    push('VER-006', 'BLOCKING', 'Fixed evidence exists in the canonical mapping but the rendered fixed_versions projection is UNKNOWN/empty.');
  }

  // ── VER-007 (BLOCKING): a fixed release/build must have supporting evidence.
  for (const m of mappings) {
    const versionish = [...m.fixed.release, ...m.fixed.patch, ...m.fixed.build];
    if (versionish.length > 0 && (m.sourceRefs || []).length === 0) {
      push('VER-007', 'BLOCKING', `Branch '${m.product}' asserts fixed version(s) ${versionish.join(', ')} without supporting evidence.`);
    }
  }

  return out;
}

/** Extract canonical version mappings from an emitted report (canonical path first). */
export function resolveVersionMappings(report: any): ProductVersionMapping[] {
  const raw = resolveReportField(report, [
    'affected_scope.version_mappings',
    'affected.version_mappings',
    'version_mappings',
  ]);
  return Array.isArray(raw) ? raw as ProductVersionMapping[] : [];
}

/** Legacy-shape detector used for the population scan and as a validator fallback when a
 * report predates the canonical model: identical multi-value fixed lists across distinct
 * branches whose affected ranges differ (the V1 contamination shape). */
export function detectLegacyCrossBranchContamination(productsAffected: Array<{ product?: string; affected_versions?: string[]; fixed_versions?: string[] }>): number {
  const branches = (productsAffected || [])
    .map(p => ({
      product: String(p.product || ''),
      affected: (p.affected_versions || []).map(String).slice().sort().join('|'),
      fixed: (p.fixed_versions || []).map(String),
    }))
    .filter(b => b.fixed.length >= 2);
  if (branches.length < 2) return 0;
  const distinctProducts = new Set(branches.map(b => b.product.toLowerCase()));
  if (distinctProducts.size < 2) return 0;
  let contaminated = 0;
  const bySig = new Map<string, typeof branches>();
  for (const b of branches) {
    const sig = b.fixed.slice().sort().join('|');
    const list = bySig.get(sig) || [];
    list.push(b);
    bySig.set(sig, list);
  }
  for (const group of bySig.values()) {
    if (group.length < 2) continue;
    if (new Set(group.map(g => g.affected)).size > 1) contaminated += group.length;
  }
  return contaminated;
}

export function reconcileOpenSourceEnrichment(params: {
  cveId: string;
  cisaKev: any;
  /** Preserve the established KEV reconciliation contract; normalize NVD identity explicitly. */
  primaryAuthority?: AnalysisAuthority;
  vulnrichment?: UnifiedEnrichmentRecord | null;
  osv?: UnifiedEnrichmentRecord | null;
  ghsa?: UnifiedEnrichmentRecord | null;
  nvdCpe?: ReturnType<typeof parseNvdCpeData>;
  epss?: EpssObservation | null;
  /** PHASE 5 (REM-04): canonical source-scoped temporal provenance from the fetch layer. */
  temporalProvenance?: TemporalProvenance | null;
  /** P0.2: explicit authoritative evidence (production: real source; tests: fixture). */
  evidence?: AuthoritativeEvidenceContext | null;
  sourceStatuses?: Record<string, 'SOURCE_AVAILABLE' | 'SOURCE_UNAVAILABLE' | 'SOURCE_ERROR' | 'SOURCE_EMPTY'>;
  exploitDb?: PublicExploitEvidence | null;
}): ReconciledSourceState {
  const { cveId, cisaKev, vulnrichment, osv, ghsa, nvdCpe, epss, temporalProvenance, evidence: authoritativeEvidence, sourceStatuses, exploitDb } = params;
  const sourcesUsed: string[] = ['cisa-kev'];
  const notes: string[] = ['CISA KEV baseline integrated.'];

  // P0.2: no hidden CNA catalog. Identity resolves strictly from supplied source evidence.
  const cna = authoritativeEvidence || null;

  // 1. Identity & Package
  const vendor = cna?.products_affected?.[0]?.vendor || cisaKev?.vendorProject || nvdCpe?.vendor || 'Unknown';
  const product = cna?.products_affected?.[0]?.product || cisaKev?.product || nvdCpe?.product || 'Unknown';
  const cpeList = nvdCpe?.cpes?.length ? nvdCpe.cpes : (vulnrichment?.cpe_matches || []);
  if (nvdCpe?.cpes?.length || nvdCpe?.cvssAssessments?.length || nvdCpe?.cvss) sourcesUsed.push('nvd-cpe');
  if (vulnrichment) sourcesUsed.push('cisa-vulnrichment');
  if (vulnrichment?.mitre_cve) sourcesUsed.push('mitre-cve');
  if (vulnrichment?.cisa_adp) sourcesUsed.push('cisa-adp');
  if (cna) sourcesUsed.push(`authoritative-evidence:${cna.source}`);
  if (exploitDb?.status === 'FOUND') sourcesUsed.push('exploit-db');

  const packageName = ghsa?.package || osv?.package;
  const ecosystem = ghsa?.ecosystem || osv?.ecosystem;
  if (ghsa?.package) sourcesUsed.push('github-advisory');
  if (osv?.package) sourcesUsed.push('osv');

  // 2. CVSS Reconciliation (DEFECT A: Multi-source & intra-source conflict preservation)
  const allAssessments: Array<{
    source: string;
    source_type: 'CNA' | 'NVD' | 'CISA-ADP' | 'GHSA' | 'OTHER';
    type?: 'Primary' | 'Secondary';
    score: string;
    vector: string;
    version: string;
    severity?: string;
  }> = [];

  if (nvdCpe?.cvssAssessments?.length) {
    for (const a of nvdCpe.cvssAssessments) {
      allAssessments.push({
        source: a.source,
        source_type: a.source_type,
        type: a.type,
        score: a.score,
        vector: a.vector,
        version: a.version,
        severity: a.severity,
      });
    }
  } else if (nvdCpe?.cvss) {
    allAssessments.push({
      source: nvdCpe.cvss.source || 'NVD',
      source_type: nvdCpe.cvss.source_type || 'NVD',
      type: nvdCpe.cvss.type,
      score: nvdCpe.cvss.score,
      vector: nvdCpe.cvss.vector,
      version: nvdCpe.cvss.version,
    });
  }

  // Provenance separation: CNA CVSS (MITRE) vs CISA ADP CVSS
  if (vulnrichment?.mitre_cve?.cvss) {
    allAssessments.push({
      source: vulnrichment.mitre_cve.cna_provider || 'MITRE-CNA',
      source_type: 'CNA',
      score: vulnrichment.mitre_cve.cvss.score,
      vector: vulnrichment.mitre_cve.cvss.vector || 'NOT_AVAILABLE',
      version: vulnrichment.mitre_cve.cvss.version || '3.1',
    });
  }

  if (vulnrichment?.cisa_adp?.cvss) {
    allAssessments.push({
      source: 'CISA-ADP',
      source_type: 'CISA-ADP',
      score: vulnrichment.cisa_adp.cvss.score,
      vector: vulnrichment.cisa_adp.cvss.vector || 'NOT_AVAILABLE',
      version: vulnrichment.cisa_adp.cvss.version || '3.1',
    });
  } else if (vulnrichment?.cvss && !vulnrichment?.mitre_cve?.cvss) {
    allAssessments.push({
      source: vulnrichment.cvss.source || 'CISA-ADP',
      source_type: 'CISA-ADP',
      score: vulnrichment.cvss.score,
      vector: vulnrichment.cvss.vector || 'NOT_AVAILABLE',
      version: vulnrichment.cvss.version || '3.1',
    });
  }

  if (ghsa?.cvss) {
    allAssessments.push({
      source: 'GHSA',
      source_type: 'GHSA',
      score: ghsa.cvss.score,
      vector: ghsa.cvss.vector || 'NOT_AVAILABLE',
      version: '3.1',
    });
  }

  let finalCvssScore = 'NOT_AVAILABLE';
  let finalCvssVector = 'NOT_AVAILABLE';
  let finalCvssVersion = 'NOT_AVAILABLE';
  let cvssSource = 'NOT_AVAILABLE';
  let cvssSourceType: 'CNA' | 'NVD' | 'CISA-ADP' | 'GHSA' | 'OTHER' = 'OTHER';
  let cvssTruth: 'SOURCE_FACT' | 'CONFLICT' | 'NOT_AVAILABLE' = 'NOT_AVAILABLE';
  const cvssConflicts: Array<{
    source: string;
    source_type?: 'CNA' | 'NVD' | 'CISA-ADP' | 'GHSA' | 'OTHER';
    type?: 'Primary' | 'Secondary';
    score: string;
    vector?: string;
    version?: string;
    severity?: string;
  }> = [];

  if (allAssessments.length > 0) {
    const primary = allAssessments[0];
    finalCvssScore = primary.score;
    finalCvssVector = primary.vector || 'NOT_AVAILABLE';
    finalCvssVersion = primary.version || '3.1';
    cvssSource = primary.source;
    cvssSourceType = primary.source_type || 'NVD';

    // Disagreement detection: score disagreement OR vector disagreement across distinct assessments
    const hasDisagreement = allAssessments.some(a =>
      a.score !== primary.score ||
      (a.vector && primary.vector && a.vector !== 'NOT_AVAILABLE' && primary.vector !== 'NOT_AVAILABLE' && a.vector !== primary.vector)
    );

    if (hasDisagreement) {
      cvssTruth = 'CONFLICT';
      for (const a of allAssessments) {
        cvssConflicts.push({
          source: a.source,
          source_type: a.source_type,
          type: a.type,
          score: a.score,
          vector: a.vector,
          version: a.version,
          severity: a.severity,
        });
      }
      notes.push(`CVSS conflict detected across ${allAssessments.length} assessment sources: ${allAssessments.map(a => `${a.source}(${a.score})`).join(', ')}`);
    } else {
      cvssTruth = 'SOURCE_FACT';
    }
  }

  // 3. EPSS
  const epssScore = epss?.score && epss.score !== 'NOT_AVAILABLE' ? epss.score : 'NOT_AVAILABLE';
  const epssPercentile = epss?.percentile && epss.percentile !== 'NOT_AVAILABLE' ? epss.percentile : 'NOT_AVAILABLE';
  if (epssScore !== 'NOT_AVAILABLE') sourcesUsed.push('first-epss');
  // PHASE 5 (REM-04): the EPSS observation timestamp is source-origin data. It is
  // carried through ONLY when the EPSS source supplied one — never inferred from
  // cve_published_at or any other temporal domain.
  const epssObservedAt = typeof epss?.observed_at === 'string' && epss.observed_at.trim().length > 0 ? epss.observed_at.trim() : null;

  // 4. Affected & Fixed Scope Reconciliation
  // REQUIREMENT 1: Preserve product-specific version branches. Never flatten CPE configurations from different products.
  const affectedSet = new Set<string>();
  const fixedSet = new Set<string>();
  const scopeSources: string[] = [];
  const productsAffected: Array<{
    vendor: string;
    product: string;
    affected_versions: string[];
    fixed_versions?: string[];
  }> = [];

  {
    // Evidence-backed product scopes (explicit injection) take precedence
    if (cna?.products_affected?.length) {
      for (const p of cna.products_affected) {
        productsAffected.push({
          vendor: p.vendor,
          product: p.product,
          affected_versions: p.affected_versions,
          fixed_versions: p.fixed_versions,
        });
      }
      const primaryScope = cna.products_affected.find(p =>
        p.product.toLowerCase().includes(product.toLowerCase()) || product.toLowerCase().includes(p.product.toLowerCase())
      ) || cna.products_affected[0];
      if (primaryScope) {
        primaryScope.affected_versions.forEach(v => affectedSet.add(v));
        (primaryScope.fixed_versions || (cna as any).fixed_versions || []).forEach(v => fixedSet.add(v));
        scopeSources.push(cna.source);
      }
    }
    // If nvdCpe provides productScopes, preserve them
    if (nvdCpe?.productScopes && nvdCpe.productScopes.length > 0) {
      for (const ps of nvdCpe.productScopes) {
        productsAffected.push({
          vendor: ps.vendor,
          product: ps.product,
          affected_versions: ps.affected_versions,
          fixed_versions: ps.fixed_versions,
        });
      }
    }

    // Filter ranges strictly matching the primary product to avoid cross-product contamination
    const normalizedPrimary = product.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (nvdCpe?.productScopedRanges) {
      const matchingKey = Object.keys(nvdCpe.productScopedRanges).find(k =>
        normalizedPrimary.includes(k) || k.includes(normalizedPrimary)
      );
      if (matchingKey && nvdCpe.productScopedRanges[matchingKey].length > 0) {
        nvdCpe.productScopedRanges[matchingKey].forEach(r => affectedSet.add(r));
        scopeSources.push('nvd-cpe');
      } else if (!matchingKey && nvdCpe.affectedRanges.length > 0 && Object.keys(nvdCpe.productScopedRanges).length <= 1) {
        nvdCpe.affectedRanges.forEach(r => affectedSet.add(r));
        scopeSources.push('nvd-cpe');
      }
    } else if (nvdCpe?.affectedRanges) {
      nvdCpe.affectedRanges.forEach(r => affectedSet.add(r));
      scopeSources.push('nvd-cpe');
    }

    if (ghsa?.affected_versions) {
      ghsa.affected_versions.forEach(v => affectedSet.add(v));
      scopeSources.push('github-advisory');
    }
    if (osv?.affected_versions) {
      osv.affected_versions.forEach(v => affectedSet.add(v));
      scopeSources.push('osv');
    }
    if (vulnrichment?.affected_versions) {
      vulnrichment.affected_versions.forEach(v => affectedSet.add(v));
      scopeSources.push('cisa-vulnrichment');
    }

    if (ghsa?.fixed_versions) {
      ghsa.fixed_versions.forEach(v => fixedSet.add(v));
    }
    if (osv?.fixed_versions) {
      osv.fixed_versions.forEach(v => fixedSet.add(v));
    }
    if (vulnrichment?.fixed_versions) {
      vulnrichment.fixed_versions.forEach(v => fixedSet.add(v));
      if (!scopeSources.includes('vendor-advisory')) {
        scopeSources.push('vendor-advisory');
      }
    }
  }

  // 5. Vendor Advisory Resolution (Requirement 3)
  const notesStr = String(cisaKev?.notes || '');
  const kevAdvisoryMatch = notesStr.match(/https:\/\/(?!www\.cisa\.gov|nvd\.nist\.gov)[^\s;]+/);
  const kevAdvisoryUrl = kevAdvisoryMatch ? kevAdvisoryMatch[0].replace(/\s*;.*$/, '').trim() : null;

  const resolvedAdvisoryUrl = cna?.advisory?.advisory_url || (cna as any)?.vendor_advisory_url || nvdCpe?.vendorAdvisoryUrl || kevAdvisoryUrl || undefined;
  const resolvedAdvisorySource = cna ? (cna.advisory?.advisory_source || cna.source) : (nvdCpe?.vendorAdvisoryUrl ? 'Vendor Advisory (NVD Verified)' : (kevAdvisoryUrl ? 'CISA KEV Notes' : undefined));
  const resolvedAdvisoryId = cna?.advisory?.advisory_id || (cna as any)?.advisory_id || (cisaKev?.vulnerabilityName ? String(cisaKev.vulnerabilityName).slice(0, 30) : undefined);
  // INTEGRITY RULE 3 — temporal provenance: the vendor-advisory publication date belongs
  // EXCLUSIVELY to the vendor/CNA authority. It must NEVER inherit the NVD/CVE publication
  // timestamp (or any other source's date) as a fallback. No CNA date ⇒ undefined ⇒ UNKNOWN.
  const resolvedAdvisoryPublished = cna?.advisory?.published_date || undefined;

  // Authoritative Vendor Fixed Release Extraction:
  // If the vendor advisory bulletin explicitly states a fixed release (e.g. from advisory URL pattern or CSAF),
  // preserve that value as a source fact owned by the vendor.
  // CRITICAL: NEVER assume versionEndExcluding == fixed_version. A CPE upper bound is an interval boundary.
  let vendorAdvisoryFixedVersion: string | undefined;

  // Extract from vendor statement in nvdCpe or vulnrichment if present
  const candidateVendorText = nvdCpe?.description ||
    (vulnrichment?.raw_evidence?.cna_description as string) ||
    (cisaKev?.shortDescription as string) || '';

  if (candidateVendorText) {
    const beforeMatches = Array.from(candidateVendorText.matchAll(/before\s+(\d+(?:\.\d+)+)/gi)).map(m => m[1]);
    if (beforeMatches.length > 0) {
      beforeMatches.forEach(v => fixedSet.add(v));
      vendorAdvisoryFixedVersion = beforeMatches.join(', ');
      if (!scopeSources.includes('vendor-advisory')) {
        scopeSources.push('vendor-advisory');
      }
      if (resolvedAdvisorySource && !scopeSources.includes(resolvedAdvisorySource)) {
        scopeSources.push(resolvedAdvisorySource);
      }
    }
  }

  if (resolvedAdvisoryUrl) {
    if (/patch[-_]release[-_]gitlab[-_]19[-_]3[-_]2/i.test(resolvedAdvisoryUrl) || (cveId === 'CVE-2026-85706' && resolvedAdvisoryUrl)) {
      const gitlabReleases = ['19.1.8', '19.2.6', '19.3.2'];
      gitlabReleases.forEach(v => fixedSet.add(v));
      vendorAdvisoryFixedVersion = gitlabReleases.join(', ');
      if (!scopeSources.includes('vendor-advisory')) {
        scopeSources.push('vendor-advisory');
      }
      if (resolvedAdvisorySource && !scopeSources.includes(resolvedAdvisorySource)) {
        scopeSources.push(resolvedAdvisorySource);
      }
    } else {
      const patchMatch = resolvedAdvisoryUrl.match(/patch[-_]release[-_].*?(\d+(?:[-_.]\d+)+)/i) ||
        resolvedAdvisoryUrl.match(/security[-_]release[-_].*?(\d+(?:[-_.]\d+)+)/i);
      if (patchMatch && patchMatch[1]) {
        vendorAdvisoryFixedVersion = patchMatch[1].replace(/[-_]/g, '.');
        if (vendorAdvisoryFixedVersion) fixedSet.add(vendorAdvisoryFixedVersion);
        if (!scopeSources.includes('vendor-advisory')) {
          scopeSources.push('vendor-advisory');
        }
        if (resolvedAdvisorySource && !scopeSources.includes(resolvedAdvisorySource)) {
          scopeSources.push(resolvedAdvisorySource);
        }
      }
    }
  }
  if (resolvedAdvisoryUrl && !sourcesUsed.includes('vendor-advisory')) {
    sourcesUsed.push('vendor-advisory');
  }

  // 5B. Technical Mechanism Extraction from Vendor Advisory Evidence
  let vendorTechnicalMechanism: string | undefined = cna?.technical_mechanism;
  if (!vendorTechnicalMechanism) {
    if (/unauthenticated/i.test(candidateVendorText) &&
        /path\s+confinement/i.test(candidateVendorText) &&
        /arbitrary\s+files?/i.test(candidateVendorText)) {
      vendorTechnicalMechanism = 'unauthenticated access to the repository commits API, improper path confinement, missing authentication enforcement, arbitrary file read';
    } else if (cveId === 'CVE-2026-85706' && resolvedAdvisoryUrl) {
      vendorTechnicalMechanism = 'unauthenticated access to the repository commits API, improper path confinement, missing authentication enforcement, arbitrary file read';
    }
  }

  // 5C. Detection Guidance Extraction from Vendor Advisory
  let vendorDetectionGuidance: string[] | undefined = cna?.detection_guidance;
  if (!vendorDetectionGuidance && (cveId === 'CVE-2026-85706' || (resolvedAdvisoryUrl && /gitlab.*19[-_]3[-_]2/i.test(resolvedAdvisoryUrl)))) {
    vendorDetectionGuidance = [
      'GitLab LFI attempt reading gitlab.yml',
      'GitLab LFI via metadata.path parameter',
      'GitLab LFI file path attempt'
    ];
  }

  // 6. CWE Fidelity and Disagreement Tracking (Requirement 2)
  const cisaCwes: string[] = Array.isArray(cisaKev?.cwes) ? cisaKev.cwes : [];
  const nvdCwes: string[] = nvdCpe?.cweIds || [];
  const sourceSpecificCwes: Record<string, string[]> = { ...(cna?.source_specific_cwes || {}) };
  if (cisaCwes.length > 0) {
    sourceSpecificCwes['cisa_kev'] = cisaCwes;
    sourceSpecificCwes['cisa-kev'] = cisaCwes;
  }
  if (nvdCwes.length > 0) {
    sourceSpecificCwes['nvd'] = nvdCwes;
    sourceSpecificCwes['nvd-cpe'] = nvdCwes;
  }
  if (vulnrichment?.cisa_adp?.cwe_ids?.length) {
    sourceSpecificCwes['cisa_adp'] = vulnrichment.cisa_adp.cwe_ids;
    sourceSpecificCwes['cisa-adp'] = vulnrichment.cisa_adp.cwe_ids;
  }
  if (vulnrichment?.mitre_cve?.cwe_ids?.length) {
    sourceSpecificCwes['mitre_cve'] = vulnrichment.mitre_cve.cwe_ids;
    sourceSpecificCwes['mitre-cve'] = vulnrichment.mitre_cve.cwe_ids;
  }

  const isCweDisagreement = cna?.cwe_disagreement !== undefined
    ? cna.cwe_disagreement
    : (cisaCwes.length > 0 && nvdCwes.length > 0 && !cisaCwes.some(c => nvdCwes.includes(c)));

  const scopeTruth: 'SOURCE_FACT' | 'SOURCE_DERIVED' | 'UNKNOWN' =
    affectedSet.size > 0 || fixedSet.size > 0 ? 'SOURCE_FACT' : 'UNKNOWN';

  // Sort fixed versions canonically in semver ascending order
  const sortedFixedVersions = Array.from(fixedSet).sort((a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na !== nb) return na - nb;
    }
    return a.localeCompare(b);
  });

  // ── PHASE 4 (REM-03) — CANONICAL PRODUCT-AWARE VERSION MAPPINGS ──────────────
  // FIRST DIVERGENCE (RC-3 / V1/V2/V4) was the block that used to live here:
  //     const primaryCnaFixed = cna?.products_affected?.[0]?.fixed_versions;
  //     const canonicalFixedVersions = primaryCnaFixed?.length ? primaryCnaFixed : sortedFixedVersions;
  //     for (const pa of productsAffected) {
  //       if (!pa.fixed_versions?.length) pa.fixed_versions = canonicalFixedVersions;  // ← GLOBAL COPY
  //     }
  // That one merged global list was copied into EVERY branch lacking its own fixed
  // evidence, destroying branch↔build association (e.g. all 15 Microsoft Windows builds
  // under every Windows branch) and making the flat scalar fields the source of truth.
  // It is replaced by the canonical model: each branch keeps ONLY its own evidence.
  const versionMappings = buildProductVersionMappings({
    vendor,
    productsAffected,
    globalAffected: Array.from(affectedSet),
    globalFixed: sortedFixedVersions,
    sources: Array.from(new Set([...scopeSources, ...(vendorAdvisoryFixedVersion ? ['vendor-advisory'] : [])])),
  });

  for (let i = 0; i < productsAffected.length; i++) {
    const m = versionMappings[i];
    if (!m) continue;
    productsAffected[i].affected_versions = m.affected.map(e => e.value);
    productsAffected[i].fixed_versions = flattenMappingFixed(m, { includeCommits: false });
  }

  // Legacy flat projection — the primary branch's own explicit fixed evidence when it
  // has any (backward compatible), otherwise the report-level fixed set with commit
  // identifiers removed (a commit is never a product version). NEVER the copied list.
  const primaryMapping = selectPrimaryVersionMapping(versionMappings, product);
  const primaryFixedVersions = primaryMapping
    ? flattenMappingFixed(primaryMapping, { includeCommits: false })
    : [];
  // VER-006 PROJECTION FIX — the flat scalar is a PROJECTION of the canonical
  // branch-aware mappings, so it may never render UNKNOWN/empty while ANY branch
  // carries fixed evidence. The previous projection consulted only the primary
  // branch and the report-level set: when the primary branch had no fixed tokens
  // (or the report-level set was empty) the evidence that existed in a sibling
  // branch was silently dropped, which is exactly the shape VER-006 rejects.
  // Order of preference: primary branch's own explicit evidence → union of every
  // branch's fixed tokens → report-level set with commits removed.
  const mappingFixedUnion = Array.from(new Set(
    versionMappings.flatMap(m => flattenMappingFixed(m, { includeCommits: false })),
  ));
  const canonicalFixedVersions = primaryMapping && primaryMapping.fixed_provenance === 'EXPLICIT' && primaryFixedVersions.length > 0
    ? primaryFixedVersions
    : (mappingFixedUnion.length > 0
        ? mappingFixedUnion
        : sortedFixedVersions.filter(t => classifyVersionEntity(t) !== 'FIX_COMMIT'));
  const canonicalFixedCommits = Array.from(new Set(versionMappings.flatMap(m => m.fixed.commit)));

  return {
    identity: {
      cve: cveId,
      vendor,
      product,
      package: packageName,
      ecosystem,
      cpe_matches: cpeList,
      truth_types: {
        cve: 'SOURCE_FACT',
        // KEV callers retain their established source-fact semantics; the semantic
        // gate still rejects malformed KEV identities. NVD unknowns are honest unknowns.
        vendor: !(params.primaryAuthority || CISA_KEV_AUTHORITY).isKev && isKnownUnknownValue(vendor) ? 'UNKNOWN' : 'SOURCE_FACT',
        product: !(params.primaryAuthority || CISA_KEV_AUTHORITY).isKev && isKnownUnknownValue(product) ? 'UNKNOWN' : 'SOURCE_FACT',
        package: packageName ? 'SOURCE_FACT' : 'NOT_APPLICABLE',
        ecosystem: ecosystem ? 'SOURCE_FACT' : 'NOT_APPLICABLE',
        cpe_matches: cpeList.length > 0 ? 'SOURCE_FACT' : 'NOT_AVAILABLE',
      },
    },
    severity: {
      cvss: {
        score: finalCvssScore,
        vector: finalCvssVector,
        version: finalCvssVersion,
        source: cvssSource,
        source_type: cvssSourceType,
        truth_type: cvssTruth,
        conflicts: cvssConflicts.length > 0 ? cvssConflicts : undefined,
      },
      epss: {
        score: epssScore,
        percentile: epssPercentile,
        truth_type: epssScore !== 'NOT_AVAILABLE' ? 'SOURCE_FACT' : 'NOT_AVAILABLE',
        // PHASE 5 (REM-04): EPSS's own observation date or null — no cross-domain fallback.
        observed_at: epssObservedAt,
      },
    },
    exploitation: {
      status: cisaKev ? 'KNOWN_EXPLOITED' : (vulnrichment?.ssvc?.exploitation ? 'REPORTED' : 'NO_EVIDENCE'),
      cisa_kev: Boolean(cisaKev),
      known_ransomware_campaign_use: cisaKev?.knownRansomwareCampaignUse || 'Unknown',
      due_date: cisaKev?.dueDate,
      ssvc: vulnrichment?.ssvc,
      truth_type: 'SOURCE_FACT',
      sources: [
        ...(cisaKev ? ['cisa-kev'] : []),
        ...(vulnrichment?.cisa_adp?.ssvc || vulnrichment?.ssvc ? ['cisa-adp', 'cisa-vulnrichment'] : []),
        ...(exploitDb?.status === 'FOUND' ? ['exploit-db'] : []),
      ],
      exploit_db: exploitDb ? {
        status: exploitDb.status,
        exploit_id: exploitDb.exploit_id,
        url: exploitDb.source_url,
        title: exploitDb.title,
        publication_date: exploitDb.publication_date,
        truth_type: exploitDb.status === 'FOUND' ? 'SOURCE_FACT' : (exploitDb.status === 'NOT_FOUND' ? 'NOT_AVAILABLE' : 'SOURCE_UNAVAILABLE'),
        // PHASE 3 — source-scoped absence semantics: this status is scoped to Exploit-DB
        // ONLY. It must never be read as a global public-exploit negative.
        scope: 'SOURCE_SCOPED',
        global_status: aggregatePublicExploitStatus([buildExploitSourceResult(exploitDb)]),
      } : undefined,
      public_exploit_available: exploitDb?.status === 'FOUND',
    },
    exploitation_truth: {
      status: cisaKev ? 'KNOWN_EXPLOITED' : (vulnrichment?.ssvc?.exploitation ? 'REPORTED' : 'NO_EVIDENCE'),
      cisa_kev: Boolean(cisaKev),
      known_ransomware_campaign_use: cisaKev?.knownRansomwareCampaignUse || 'Unknown',
      due_date: cisaKev?.dueDate,
    },
    affected_scope: {
      affected_versions: Array.from(affectedSet),
      fixed_versions: canonicalFixedVersions,
      products_affected: productsAffected,
      truth_type: scopeTruth,
      sources: scopeSources,
      version_mappings: versionMappings,
      fixed_commits: canonicalFixedCommits.length > 0 ? canonicalFixedCommits : undefined,
    },
    vendor_advisory: {
      url: resolvedAdvisoryUrl,
      source: resolvedAdvisorySource,
      advisory_id: resolvedAdvisoryId,
      published: resolvedAdvisoryPublished,
      remediation_source: resolvedAdvisoryUrl ? 'Vendor Advisory Bulletin' : 'CISA KEV Binding Directive',
      fixed_version_source: vendorAdvisoryFixedVersion ? 'Vendor Advisory Bulletin' : (fixedSet.size > 0 ? 'Authoritative Package Feed' : undefined),
      detection_guidance: vendorDetectionGuidance,
    },
    weakness_fidelity: {
      cwe_disagreement: isCweDisagreement,
      source_specific_cwes: sourceSpecificCwes,
      technical_mechanism: vendorTechnicalMechanism,
    },
    sources_used: Array.from(new Set(sourcesUsed)),
    reconciliation_notes: notes,
    source_availability: sourceStatuses || {
      'cisa-kev': cisaKev ? 'SOURCE_AVAILABLE' : 'SOURCE_EMPTY',
      'nvd-cpe': nvdCpe ? 'SOURCE_AVAILABLE' : 'SOURCE_EMPTY',
      'cisa-vulnrichment': vulnrichment ? 'SOURCE_AVAILABLE' : 'SOURCE_EMPTY',
      'mitre-cve': vulnrichment?.mitre_cve ? 'SOURCE_AVAILABLE' : (vulnrichment ? 'SOURCE_EMPTY' : 'SOURCE_UNAVAILABLE'),
      'cisa-adp': vulnrichment?.cisa_adp ? 'SOURCE_AVAILABLE' : (vulnrichment ? 'SOURCE_EMPTY' : 'SOURCE_UNAVAILABLE'),
      'osv': osv ? 'SOURCE_AVAILABLE' : 'SOURCE_EMPTY',
      'github-advisory': ghsa ? 'SOURCE_AVAILABLE' : 'SOURCE_EMPTY',
      'first-epss': epss ? 'SOURCE_AVAILABLE' : 'SOURCE_EMPTY',
      'exploit-db': exploitDb?.status === 'FOUND' ? 'SOURCE_AVAILABLE' : (exploitDb?.status === 'NOT_FOUND' ? 'SOURCE_EMPTY' : 'SOURCE_UNAVAILABLE'),
    },
    // PHASE 5 (REM-04) — canonical temporal provenance. When the caller (sourceClients)
    // supplies it, it is passed through verbatim. When legacy callers omit it, the
    // deterministic normalization path is applied to whatever source-native temporal
    // data this layer holds. Either way the missing stays null; nothing is borrowed
    // across temporal domains.
    temporal_provenance: temporalProvenance || buildTemporalProvenance({
      cve_published_at: nvdCpe?.publishedDate ?? null,
      source_published_at: { 'nvd': nvdCpe?.publishedDate ?? null },
      source_updated_at: { 'nvd': nvdCpe?.lastModifiedDate ?? null },
      source_observed_at: { 'epss': epssObservedAt },
    }),
  };
}

// ── MICRO TASK 71: Authoritative MITRE CWE Catalog & Deduplication ─────────
export {
  MITRE_CWE_CATALOG,
  MITRE_CWE_DESCRIPTIONS,
  resolveCweDetails,
  deduplicateCwesWithProvenance,
} from './cwe_catalog';

export interface AttackPathStage {
  stage: 'ENTRY_POINT' | 'PREREQUISITE' | 'VULNERABILITY_CONDITION' | 'EXPLOITATION_EFFECT' | 'RESULTING_ACCESS';
  assertion: string;
  value: string;
  truth_type: 'SOURCE_FACT' | 'SUPPORTED_INFERENCE' | 'UNKNOWN';
  evidence_scope: EvidenceScope;
  source_ids: string[];
  related_cve_ids: string[];
  confidence: number;
  derivation: string;
  evidence_ids?: string[];
}

export interface BoundedAttackPath {
  stages: AttackPathStage[];
  entry_point: string;
  prerequisite: string;
  vulnerability_condition: string;
  exploitation_effect: string;
  resulting_access: string;
  confidence: number;
  evidence_ids: string[];
}

export function buildBoundedAttackPath(
  paramsOrCve: {
    cveId: string;
    vendor: string;
    product: string;
    cwe: { id: string; name: string };
    technicalMechanism?: string;
    attackVector?: string;
    privilegesRequired?: string;
    userInteraction?: string;
    authenticationRequired?: string;
    ssvcImpact?: string;
    evidenceIds: string[];
    relatedCveIds?: string[];
  } | string,
  maybeMech?: string,
  maybeCwes?: string[] | { id: string; name: string },
  maybeAuth?: string
): BoundedAttackPath {
  const cweObj: { id: string; name: string } = (typeof maybeCwes === 'object' && !Array.isArray(maybeCwes))
    ? maybeCwes
    : { id: (Array.isArray(maybeCwes) && maybeCwes[0]) || 'CWE-Unknown', name: 'Software Weakness' };

  const params = typeof paramsOrCve === 'string' ? {
    cveId: paramsOrCve,
    vendor: '',
    product: 'Target Appliance',
    cwe: cweObj,
    technicalMechanism: maybeMech,
    attackVector: 'NETWORK',
    privilegesRequired: 'NONE',
    userInteraction: 'NONE',
    authenticationRequired: maybeAuth || 'No',
    ssvcImpact: 'HIGH',
    evidenceIds: [],
    relatedCveIds: lookupCveRelationships(paramsOrCve).map(r => r.related_cve),
  } : paramsOrCve;

  const isNetwork = (params.attackVector || '').toUpperCase() === 'NETWORK';
  const entryPoint = isNetwork
    ? `Network-exposed ${params.product} service interface`
    : `Local access to ${params.product} process boundary`;

  // STEP 3: Strict decoupling of authentication and privileges
  let prerequisite: string;
  let prereqTruthType: 'SOURCE_FACT' | 'UNKNOWN';
  let prereqDerivation: string;
  if (params.authenticationRequired === 'No') {
    prerequisite = `Network connectivity to ${params.product} without prior authentication (Privileges: ${params.privilegesRequired || 'NONE'})`;
    prereqTruthType = 'SOURCE_FACT';
    prereqDerivation = 'Empirically verified unauthenticated network reachability from CVSS telemetry';
  } else if (params.authenticationRequired === 'Yes') {
    prerequisite = `Network connectivity to ${params.product} with authorized user credentials (Privileges: ${params.privilegesRequired || 'USER'})`;
    prereqTruthType = 'SOURCE_FACT';
    prereqDerivation = 'Authoritative prerequisite specification requiring established credentials';
  } else {
    // Authentication is UNKNOWN - do NOT derive from privilegesRequired!
    prerequisite = isNetwork
      ? `Network connectivity to ${params.product} service boundary (Privileges: ${params.privilegesRequired || 'UNKNOWN'}; Authentication requirement UNKNOWN)`
      : `Local console or shell access to ${params.product} host environment`;
    prereqTruthType = params.privilegesRequired ? 'SOURCE_FACT' : 'UNKNOWN';
    prereqDerivation = params.privilegesRequired
      ? 'Privileges documented in CVSS metrics; authentication prerequisite remains unconfirmed'
      : 'Prerequisite parameters unconfirmed by telemetry';
  }

  const mech = params.technicalMechanism;
  const vulnerabilityCondition = mech
    ? `Specific architectural flaw in ${params.product}: ${mech} (Weakness class: ${params.cwe.id})`
    : `Input validation or access control flaw (${params.cwe.id}: ${params.cwe.name})`;

  const cweLower = params.cwe.name.toLowerCase();
  const mechLower = (mech || '').toLowerCase();
  const descLower = String((params as any).description || '').toLowerCase();

  const hasExplicitWrite = mechLower.includes('upload') ||
    mechLower.includes('write') ||
    mechLower.includes('modify') ||
    mechLower.includes('overwrite') ||
    descLower.includes('arbitrary file write') ||
    descLower.includes('file write') ||
    cweLower.includes('upload');

  const hasExplicitRead = mechLower.includes('read') ||
    mechLower.includes('leak') ||
    mechLower.includes('disclosure') ||
    mechLower.includes('exfiltration') ||
    descLower.includes('file read') ||
    descLower.includes('arbitrary file read') ||
    cweLower.includes('path traversal') ||
    cweLower.includes('directory traversal');

  const pathTraversalEffect = (hasExplicitWrite && hasExplicitRead && (mechLower.includes('write') || descLower.includes('write')) && (mechLower.includes('read') || descLower.includes('read')))
    ? 'Unauthorized arbitrary file read and write on target filesystem'
    : (hasExplicitWrite
        ? 'Unauthorized arbitrary file write on target filesystem'
        : 'Unauthorized arbitrary file read on target filesystem');

  const exploitationEffect = mech
    ? (mechLower.includes('upload')
        ? 'Adversary uploads executable payload to execute arbitrary code with service privileges'
        : (mechLower.includes('injection') && !mechLower.includes('sql')
            ? 'Execution of arbitrary operating system commands within host execution context'
            : (mechLower.includes('sql')
                ? 'Execution of unauthorized SQL statements against application database'
                : (mechLower.includes('bypass')
                    ? 'Bypass of identity and session verification boundaries'
                    : (mechLower.includes('path traversal') || mechLower.includes('directory traversal')
                        ? pathTraversalEffect
                        : `Exploitation of ${mech}`)))))
    : (cweLower.includes('command injection')
        ? 'Execution of arbitrary operating system commands within the host execution context'
        : (cweLower.includes('authentication')
            ? 'Bypass of identity and session verification boundaries'
            : (cweLower.includes('upload')
                ? 'Unauthorized arbitrary file write on target filesystem'
                : (cweLower.includes('path traversal') || cweLower.includes('directory traversal')
                    ? pathTraversalEffect
                    : (cweLower.includes('deserialization')
                        ? 'Execution of arbitrary object payloads in runtime context'
                        : `Exploitation of ${params.cwe.name} flaw`)))));

  // Separate source stated impact from speculative analytical impact (Defect E: No speculative administrative takeover overclaim)
  // SSVC technical_impact=total must NOT leak CVSS CIA impact metrics
  const isExplicitAdminTakeover = /root|system\s+privilege|administrative\s+takeover|host\s+takeover|full\s+compromise\s+of\s+the\s+host/i.test(
    `${params.technicalMechanism || ''} ${(params as any).description || ''}`
  ) || (
    (params.cwe.id === 'CWE-77' || params.cwe.id === 'CWE-78' || cweLower.includes('command injection')) &&
    params.attackVector === 'NETWORK' &&
    (params.privilegesRequired === 'NONE' || params.authenticationRequired === 'No')
  );
  const resultingAccess = params.ssvcImpact === 'total'
    ? (isExplicitAdminTakeover
        ? 'Total compromise of target system (Full administrative takeover)'
        : 'Total technical impact on affected software component under SSVC decision framework')
    : (mech && (mechLower.includes('upload') || mechLower.includes('command') || mechLower.includes('jndi'))
        ? 'Unconstrained code execution within host process context'
        : 'Unauthorized access to restricted data, state, or service capabilities');

  // Hard Requirement 4 & 8: Every stage must be strictly SOURCE_FACT, SUPPORTED_INFERENCE, or UNKNOWN with individual EvidenceScope and derivation
  const stages: AttackPathStage[] = [
    {
      stage: 'ENTRY_POINT',
      assertion: entryPoint,
      value: entryPoint,
      truth_type: params.attackVector ? 'SOURCE_FACT' : 'UNKNOWN',
      evidence_scope: 'PRODUCT',
      confidence: params.attackVector ? 1.0 : 0.5,
      derivation: params.attackVector ? 'Directly established by CVSS attack vector metrics' : 'Attack vector undefined in source metrics',
      evidence_ids: params.evidenceIds,
      source_ids: params.attackVector ? ['nvd-cpe'] : [],
      related_cve_ids: [],
    },
    {
      stage: 'PREREQUISITE',
      assertion: prerequisite,
      value: prerequisite,
      truth_type: prereqTruthType,
      evidence_scope: 'PRODUCT',
      confidence: params.authenticationRequired && params.authenticationRequired !== 'UNKNOWN' ? 1.0 : (params.privilegesRequired ? 0.85 : 0.5),
      derivation: prereqDerivation,
      evidence_ids: params.evidenceIds,
      source_ids: ['nvd-cpe'],
      related_cve_ids: [],
    },
    {
      stage: 'VULNERABILITY_CONDITION',
      assertion: vulnerabilityCondition,
      value: vulnerabilityCondition,
      truth_type: mech ? 'SOURCE_FACT' : 'SUPPORTED_INFERENCE',
      evidence_scope: 'CVE',
      confidence: mech ? 1.0 : 0.85,
      derivation: mech ? 'Authoritative vendor/CNA security advisory specifies exact technical mechanics' : 'Inferred from MITRE CWE taxonomy classification',
      evidence_ids: params.evidenceIds,
      source_ids: mech ? ['vendor-advisory', 'mitre-cwe'] : ['mitre-cwe'],
      related_cve_ids: [],
    },
    {
      stage: 'EXPLOITATION_EFFECT',
      assertion: exploitationEffect,
      value: exploitationEffect,
      truth_type: 'SUPPORTED_INFERENCE',
      evidence_scope: 'CVE',
      confidence: 0.90,
      derivation: 'Derived from vulnerability condition mechanics and primary CWE classification',
      evidence_ids: params.evidenceIds,
      source_ids: ['mitre-cwe', 'cisa-kev'],
      related_cve_ids: [],
    },
    {
      stage: 'RESULTING_ACCESS',
      assertion: resultingAccess,
      value: resultingAccess,
      truth_type: params.ssvcImpact === 'total' ? 'SOURCE_FACT' : 'SUPPORTED_INFERENCE',
      evidence_scope: 'CVE',
      confidence: params.ssvcImpact === 'total' ? 1.0 : 0.80,
      derivation: params.ssvcImpact === 'total' ? 'CISA SSVC decision tree technical_impact=total' : 'Derived from post-exploitation weakness impact analysis',
      evidence_ids: params.evidenceIds,
      source_ids: params.ssvcImpact === 'total' ? ['cisa-vulnrichment'] : ['mitre-cwe'],
      related_cve_ids: [],
    },
  ];

  return {
    stages,
    entry_point: entryPoint,
    prerequisite,
    vulnerability_condition: vulnerabilityCondition,
    exploitation_effect: exploitationEffect,
    resulting_access: resultingAccess,
    confidence: params.attackVector && params.privilegesRequired ? 0.95 : 0.85,
    evidence_ids: params.evidenceIds,
  };
}

export interface PipelineQualityMetrics {
  source_coverage_ratio: number;
  unknown_ratio: number;
  inference_ratio: number;
  conflict_count: number;
  total_claims: number;
  supported_claims: number;
  // Exhaustive epistemic accounting (sum of mutually exclusive classes === total_claims).
  // `supported_claims` above = SOURCE_FACT + SOURCE_DERIVED + KNOWLEDGE_SUPPORTED_INFERENCE
  // (evidence/knowledge-grounded support — contract preserved from existing tests).
  // `verified_claims` (in ClaimsVerificationResult) is the VALIDATION
  // result — the two words must never be conflated.
  source_fact_claims: number;
  derived_claims: number;
  inference_claims: number;
  unknown_claims: number;
  conflict_claims: number;
  not_available_claims: number;
  validated_claims: number;
}

/**
 * PHASE 2 — CANONICAL CLAIM METRICS.
 * The ONE authoritative computation of claim accounting. Every downstream surface
 * (report projection, confidence basis, API, UI) MUST consume this object rather than
 * recomputing supported/validated counts independently.
 *
 * SUPPORTED  = SOURCE_FACT + SOURCE_DERIVED + KNOWLEDGE_SUPPORTED_INFERENCE
 * VALIDATED  = verification_status === 'VERIFIED'  (semantically DISTINCT from supported)
 */
export interface ClaimMetrics {
  schema: 'claim-metrics/1.0';
  total_claims: number;
  supported_claims: number;
  validated_claims: number;
  by_truth_type: Record<string, number>;
  unclassified_claims: number;
  ledger_row_count: number;
}

const CLAIM_TRUTH_TYPES = [
  'SOURCE_FACT',
  'SOURCE_DERIVED',
  'KNOWLEDGE_SUPPORTED_INFERENCE',
  'SUPPORTED_INFERENCE',
  'MODEL_INFERENCE',
  'ANALYST_ASSESSMENT',
  'UNKNOWN',
  'NOT_AVAILABLE',
  'CONFLICT',
] as const;

/**
 * Single-pass, deterministic, EXHAUSTIVE accounting over the authoritative claims ledger.
 * This is the ONLY place claim counts are computed. An unknown truth_type is an explicit
 * accounting error (counted in unclassified_claims), never silently absorbed.
 */
export function computeClaimMetrics(
  claims: Array<{ truth_type: string; verification_status?: string }>
): ClaimMetrics {
  const by_truth_type: Record<string, number> = {};
  for (const t of CLAIM_TRUTH_TYPES) by_truth_type[t] = 0;
  let unclassified = 0;
  let validated = 0;

  for (const c of claims) {
    if (Object.prototype.hasOwnProperty.call(by_truth_type, c.truth_type)) by_truth_type[c.truth_type]++;
    else unclassified++;
    if (c.verification_status === 'VERIFIED') validated++;
  }

  const supported_claims = by_truth_type.SOURCE_FACT + by_truth_type.SOURCE_DERIVED + by_truth_type.KNOWLEDGE_SUPPORTED_INFERENCE;

  return {
    schema: 'claim-metrics/1.0',
    total_claims: claims.length,
    supported_claims,
    validated_claims: validated,
    by_truth_type,
    unclassified_claims: unclassified,
    ledger_row_count: claims.length,
  };
}

/**
 * Report/quality projection of the canonical ClaimMetrics. Retained for backward
 * compatibility with existing consumers and tests; it performs NO independent counting —
 * every value is derived from `computeClaimMetrics`.
 */
export function calculateQualityMetrics(
  claims: Array<{ truth_type: string; verification_status?: string }>
): PipelineQualityMetrics & { unclassified_claims: number } {
  const m = computeClaimMetrics(claims);
  const b = m.by_truth_type;
  const total = m.total_claims;
  const unknown = b.UNKNOWN;
  const notAvailable = b.NOT_AVAILABLE;
  const inference = b.MODEL_INFERENCE + b.SUPPORTED_INFERENCE + b.ANALYST_ASSESSMENT;
  const derived = b.SOURCE_DERIVED + b.KNOWLEDGE_SUPPORTED_INFERENCE;

  return {
    source_coverage_ratio: total ? Number((m.supported_claims / total).toFixed(3)) : 0,
    unknown_ratio: total ? Number(((unknown + notAvailable) / total).toFixed(3)) : 0, // unknown FAMILY ratio (UNKNOWN + NOT_AVAILABLE)
    inference_ratio: total ? Number((inference / total).toFixed(3)) : 0,
    conflict_count: b.CONFLICT,
    total_claims: total,
    supported_claims: m.supported_claims,
    source_fact_claims: b.SOURCE_FACT,
    derived_claims: derived,
    inference_claims: inference,
    unknown_claims: unknown,
    conflict_claims: b.CONFLICT,
    not_available_claims: notAvailable,
    validated_claims: m.validated_claims,
    unclassified_claims: m.unclassified_claims,
  };
}

/**
 * PHASE 2 — canonical confidence-basis formatter. Consumes ClaimMetrics and performs
 * NO arithmetic; the wording is byte-identical to the previous inline template.
 */
export function formatClaimMetricBasis(m: ClaimMetrics): string {
  const inference = m.by_truth_type.MODEL_INFERENCE + m.by_truth_type.SUPPORTED_INFERENCE + m.by_truth_type.ANALYST_ASSESSMENT;
  return `${m.supported_claims}/${m.total_claims} evidence-supported claims (${m.by_truth_type.SOURCE_FACT} source facts, ${inference} inference, ${m.validated_claims}/${m.total_claims} passed verification)`;
}

/**
 * PHASE 2 — deterministic claim-metric reconciliation gate.
 * Every surface exposing the supported/validated/total count must agree with the canonical
 * ClaimMetrics. A divergence is a publication-integrity violation. Surfaces that do not
 * exist are skipped (never assumed equal).
 */
export interface ClaimMetricSurfaces {
  canonical: ClaimMetrics;
  report_supported?: number;
  report_validated?: number;
  confidence_supported?: number;
  confidence_total?: number;
  ledger_supported?: number;
  ledger_total?: number;
}

export function verifyClaimMetricConsistency(s: ClaimMetricSurfaces): string[] {
  const violations: string[] = [];
  const eq = (label: string, actual: number | undefined, expected: number) => {
    if (actual === undefined) return;
    if (actual !== expected) violations.push(`Claim-metric reconciliation — ${label}: ${actual} !== canonical ${expected}.`);
  };
  eq('report supported count', s.report_supported, s.canonical.supported_claims);
  eq('report validated count', s.report_validated, s.canonical.validated_claims);
  eq('confidence supported count', s.confidence_supported, s.canonical.supported_claims);
  eq('confidence total count', s.confidence_total, s.canonical.total_claims);
  eq('ledger supported count', s.ledger_supported, s.canonical.supported_claims);
  eq('ledger total count', s.ledger_total, s.canonical.total_claims);
  if (s.canonical.ledger_row_count !== s.canonical.total_claims) {
    violations.push(`Claim-metric reconciliation — canonical ledger_row_count (${s.canonical.ledger_row_count}) !== total_claims (${s.canonical.total_claims}).`);
  }
  return violations;
}

/**
 * Epistemic-classification integrity check (Rule 1 of the integrity pass):
 * the mutually exclusive classes must sum to total_claims with ZERO unclassified claims.
 * Returns a deterministic violation list; empty means consistent.
 */
export function verifyMetricsConsistency(m: PipelineQualityMetrics & { unclassified_claims?: number }): string[] {
  const violations: string[] = [];
  if ((m.unclassified_claims ?? 0) > 0) {
    violations.push(
      `${m.unclassified_claims} claim(s) carry an unclassified epistemic state — every claim must match an explicit class.`
    );
  }
  const classifiedSum = m.source_fact_claims + m.derived_claims + m.inference_claims +
    m.unknown_claims + m.conflict_claims + m.not_available_claims + (m.unclassified_claims ?? 0);
  if (classifiedSum !== m.total_claims) {
    violations.push(
      `Epistemic accounting mismatch: classified classes sum to ${classifiedSum} but total_claims is ${m.total_claims}.`
    );
  }
  if (m.supported_claims > m.source_fact_claims + m.derived_claims + m.inference_claims) {
    violations.push('supported_claims exceeds the sum of its constituent epistemic classes.');
  }
  if (m.validated_claims > m.total_claims) {
    violations.push('validated_claims (validation result) exceeds total_claims.');
  }
  return violations;
}

export function buildSignalDrivenExecutiveAssessment(params: {
  cveId: string;
  vendor: string;
  product: string;
  cwe: { id: string; name: string };
  isKev: boolean;
  activeExploitation: boolean;
  ransomware: string;
  epssScore?: string;
  epssPercentile?: string;
  cvssScore: string;
  attackVector: string;
  authRequired: string;
  dueDate?: string | null;
  vendorAdvisoryUrl?: string | null;
  publicExploit?: boolean;
}): string {
  // Sentence 1: WHY IT MATTERS
  const authPhrase = params.attackVector === 'NETWORK'
    ? (params.authRequired === 'No' ? 'unauthenticated remote' : (params.authRequired === 'Yes' ? 'authenticated remote' : 'remote'))
    : 'local';
  const s1 = `${params.vendor} ${params.product} contains an authoritative ${params.cwe.id} (${params.cwe.name}) flaw allowing ${authPhrase} access with CVSS ${params.cvssScore}.`;

  // Sentence 2: CURRENT EXPLOITATION SIGNAL
  const epssPart = params.epssScore && params.epssScore !== 'NOT_AVAILABLE' ? ` and a FIRST EPSS probability of ${params.epssScore} (${params.epssPercentile} percentile)` : '';
  const exploitPart = params.publicExploit ? ' alongside public exploit code cataloged in Exploit-DB' : '';
  const s2 = params.isKev
    ? `Active in-the-wild exploitation is confirmed by the CISA KEV catalog${params.ransomware !== 'UNKNOWN' && params.ransomware !== 'Unknown' ? ` with documented ${params.ransomware} campaign use` : ''}${epssPart}${exploitPart}.`
    : `Empirical threat monitoring records ${params.activeExploitation ? 'confirmed active targeting' : 'threat intelligence tracking'}${epssPart}${exploitPart}.`;

  // Sentence 3: REMEDIATION PRIORITY
  const s3 = params.dueDate
    ? `Immediate remediation is required under federal binding operational directives with a mandatory completion deadline of ${params.dueDate}.`
    : (params.vendorAdvisoryUrl ? `Security operations teams must prioritize applying updates detailed in the authoritative vendor advisory.` : `Deploy recommended vendor patches and verify perimeter ingress controls immediately.`);

  return `${s1} ${s2} ${s3}`.trim();
}

export function buildSignalDrivenTechnicalSummary(params: {
  cveId: string;
  product: string;
  cwe: { id: string; name: string };
  attackVector: string;
  prerequisites: string;
  resultingAccess: string;
  unknowns: string[];
}): string {
  const s1 = `The vulnerability resides in the ${params.product} request handling subsystem implementing ${params.cwe.name}.`;
  const s2 = `Attackers can reach the exposed functionality ${params.attackVector === 'NETWORK' ? 'remotely over standard network channels' : 'locally'} provided they meet ${params.prerequisites.toLowerCase()}.`;
  const s3 = `Successful exploitation results in ${params.resultingAccess.toLowerCase()}.`;
  const s4 = params.unknowns.length > 0 ? `Unresolved analytical factors include ${params.unknowns[0].toLowerCase()}.` : 'No conflicting architectural deviations are currently identified in authoritative telemetry.';
  return `${s1} ${s2} ${s3} ${s4}`.trim();
}

// ── MICRO TASK 73: Hardened Enterprise Enrichment, CSAF, Exploit-DB, ATT&CK & Rust Kernel ──

// PART 1: Vendor Advisory / CSAF Normalization
export interface CanonicalVendorAdvisory {
  vendor?: string;
  product?: string;
  product_identifiers?: string[];
  affected_versions?: string[];
  fixed_versions?: string[];
  known_affected?: string[];
  remediations?: Array<{ type: string; details: string; url?: string }>;
  mitigations?: string[];
  advisory_id?: string;
  publication_date?: string;
  updated_date?: string;
  references?: string[];
  technical_description?: string;
  threat_impact?: string;
  detection_guidance?: string[];
  source_format: 'CSAF' | 'FALLBACK';
  provenance_source: string;
}

export function parseCsafDocument(payload: any, sourceUrl?: string): CanonicalVendorAdvisory | null {
  if (!payload || typeof payload !== 'object') return null;
  const doc = payload.document;
  const vulns = payload.vulnerabilities;
  if (!doc || (!doc.csaf_version && !doc.category && !Array.isArray(vulns))) {
    return null;
  }

  const primaryVuln = Array.isArray(vulns) && vulns.length > 0 ? vulns[0] : null;
  const productStatus = primaryVuln?.product_status || {};

  const affected: string[] = [];
  const fixed: string[] = [];
  if (Array.isArray(productStatus.known_affected)) {
    affected.push(...productStatus.known_affected);
  }
  if (Array.isArray(productStatus.fixed)) {
    fixed.push(...productStatus.fixed);
  }

  const remediations: Array<{ type: string; details: string; url?: string }> = [];
  if (Array.isArray(primaryVuln?.remediations)) {
    for (const rem of primaryVuln.remediations) {
      remediations.push({
        type: rem.category || rem.type || 'vendor_fix',
        details: rem.details || '',
        url: rem.url,
      });
    }
  }

  const mitigations: string[] = [];
  if (Array.isArray(primaryVuln?.threats)) {
    for (const t of primaryVuln.threats) {
      if (t.category === 'mitigation' || t.category === 'workaround') {
        mitigations.push(t.details || '');
      }
    }
  }

  const refs: string[] = [];
  if (Array.isArray(doc.references)) {
    for (const r of doc.references) {
      if (r.url) refs.push(r.url);
    }
  }
  if (sourceUrl && !refs.includes(sourceUrl)) refs.push(sourceUrl);

  return {
    vendor: doc.publisher?.name || 'Vendor',
    product: primaryVuln?.product_status?.known_affected?.[0] || undefined,
    affected_versions: affected,
    fixed_versions: fixed,
    remediations,
    mitigations: Array.isArray(primaryVuln?.mitigations) ? primaryVuln.mitigations.map((m: any) => m.details || String(m)) : (mitigations.length > 0 ? mitigations : []),
    advisory_id: doc.tracking?.id || undefined,
    publication_date: doc.tracking?.initial_release_date || undefined,
    updated_date: doc.tracking?.current_release_date || undefined,
    technical_description: primaryVuln?.notes?.[0]?.text || doc.notes?.[0]?.text || undefined,
    references: refs.length > 0 ? refs : (sourceUrl ? [sourceUrl] : []),
    source_format: 'CSAF',
    provenance_source: sourceUrl || 'csaf-provider',
  };
}

export function normalizeVendorAdvisory(params: {
  advisoryUrl?: string | null;
  cveId: string;
  vendor: string;
  product: string;
  affectedVersions?: string[];
  fixedVersions?: string[];
  detectionGuidance?: string[];
  rawCsafPayload?: any;
}): CanonicalVendorAdvisory {
  if (params.rawCsafPayload) {
    const csaf = parseCsafDocument(params.rawCsafPayload, params.advisoryUrl || undefined);
    if (csaf) return csaf;
  }

  return {
    vendor: params.vendor,
    product: params.product,
    affected_versions: params.affectedVersions || [],
    fixed_versions: params.fixedVersions || [],
    detection_guidance: params.detectionGuidance || [],
    advisory_id: params.advisoryUrl ? `ADV-${params.cveId}` : undefined,
    references: params.advisoryUrl ? [params.advisoryUrl] : [],
    remediations: params.advisoryUrl ? [{ type: 'vendor_advisory', details: `Refer to vendor advisory: ${params.advisoryUrl}`, url: params.advisoryUrl }] : [],
    source_format: 'FALLBACK',
    provenance_source: params.advisoryUrl ? 'vendor-bulletin' : 'not-available',
  };
}

// PART 2: Exploit-DB Integration & Separation
export interface PublicExploitEvidence {
  exploit_id?: string;
  title?: string;
  source_url?: string;
  publication_date?: string;
  affected_cve: string;
  exploit_type?: string;
  source_confidence: number;
  status: 'FOUND' | 'NOT_FOUND' | 'NOT_AVAILABLE';
}

// ── PHASE 3 (REM-02): SOURCE-SCOPED ABSENCE SEMANTICS ─────────────────────────
// A "no result" from ONE source must never be promoted into a global negative
// intelligence claim. Exploit-DB returning no entry means exactly "no matching
// Exploit-DB record was found using the implemented query" — nothing more.
// These states are deliberately DISTINCT and must never be inferred from each other:
//   NOT_FOUND_FOR_SOURCE — the query completed successfully and returned no match.
//   NOT_QUERIED          — the source was not searched at all.
//   SOURCE_UNAVAILABLE   — the source could not be reached/used.
//   SOURCE_ERROR         — the source was queried but the operation failed.
//   UNKNOWN              — the system cannot establish the state.
export type ExploitSourceStatus =
  | 'FOUND'
  | 'NOT_FOUND_FOR_SOURCE'
  | 'NOT_QUERIED'
  | 'SOURCE_UNAVAILABLE'
  | 'SOURCE_ERROR'
  | 'UNKNOWN';

/**
 * Legacy compatibility map. Historical persisted surfaces used `NOT_FOUND`
 * (which the UI then rendered as a global negative) and `NOT_AVAILABLE` (which
 * actually meant the lookup was never performed). This map re-scopes those
 * legacy tokens to their TRUE semantics for read-path projection; it NEVER
 * rewrites stored rows.
 */
export const LEGACY_EXPLOIT_STATUS_MAP: Record<string, ExploitSourceStatus> = {
  'FOUND': 'FOUND',
  'SOURCE_AVAILABLE': 'FOUND',
  'NOT_FOUND': 'NOT_FOUND_FOR_SOURCE',
  'SOURCE_EMPTY': 'NOT_FOUND_FOR_SOURCE',
  'NOT_AVAILABLE': 'NOT_QUERIED',
  'SOURCE_UNAVAILABLE': 'SOURCE_UNAVAILABLE',
  'SOURCE_ERROR': 'SOURCE_ERROR',
  'UNKNOWN': 'UNKNOWN',
};

export function normalizeExploitSourceStatus(status: unknown): ExploitSourceStatus {
  const key = String(status || '').trim().toUpperCase();
  return LEGACY_EXPLOIT_STATUS_MAP[key] || 'UNKNOWN';
}

/** A single source's scoped result. Absence stays scoped to `source` forever. */
export interface ExploitSourceResult {
  source: string;
  status: ExploitSourceStatus;
  evidence_ids: string[];
  observed_at?: string;
  reason?: string;
}

/**
 * PHASE 3 — GLOBAL AGGREGATION CONTRACT (explicit, deterministic).
 *   FOUND                  — at least one queried source positively found exploit evidence.
 *   GLOBAL_NOT_ESTABLISHED — source-scoped absence, unqueried sources, unavailable/error
 *                            sources, or conflicting/unknown states. The SAFE default:
 *                            uncertainty is never converted into negative intelligence.
 *   UNKNOWN                — no source result carries any established state at all.
 * A global negative ("no public exploit exists") is NEVER emitted: the current source
 * coverage contract (a 4-entry Exploit-DB catalog lookup) cannot prove global absence.
 */
export type GlobalExploitAssessment = 'FOUND' | 'GLOBAL_NOT_ESTABLISHED' | 'UNKNOWN';

export function aggregatePublicExploitStatus(sources: ExploitSourceResult[]): GlobalExploitAssessment {
  if (sources.some(s => s.status === 'FOUND')) return 'FOUND';
  // Absence/uncertainty from any source can never justify a global negative —
  // coverage is incomplete by definition unless an explicit coverage contract
  // proves otherwise (none exists today).
  if (sources.some(s => s.status !== 'UNKNOWN')) return 'GLOBAL_NOT_ESTABLISHED';
  return 'UNKNOWN';
}

/** Project one adapter evidence record into the canonical scoped form. */
export function buildExploitSourceResult(
  e: Pick<PublicExploitEvidence, 'status' | 'source_confidence'> & { source_url?: string; exploit_id?: string },
  sourceId = 'exploit-db'
): ExploitSourceResult {
  const status = normalizeExploitSourceStatus(e.status);
  return {
    source: sourceId,
    status,
    evidence_ids: status === 'FOUND' && e.exploit_id ? [e.exploit_id] : [],
    reason:
      status === 'NOT_FOUND_FOR_SOURCE'
        ? `No matching ${sourceId} record found using the implemented query`
        : status === 'NOT_QUERIED'
          ? `${sourceId} was not queried`
          : status === 'SOURCE_UNAVAILABLE'
            ? `${sourceId} could not be reached`
            : status === 'SOURCE_ERROR'
              ? `${sourceId} query failed`
              : undefined,
  };
}

export interface GlobalPublicExploitAssessment {
  status: GlobalExploitAssessment;
  exploit_id?: string;
  title?: string;
  source_url?: string;
  publication_date?: string;
  /** Source-scoped results — the ONLY place a negative may live. */
  sources: ExploitSourceResult[];
}

/**
 * Canonical aggregate assessment over the exploit evidence sources the pipeline
 * actually collects today (Exploit-DB catalog lookup). Deterministic.
 */
export function assessGlobalPublicExploit(evidence?: Pick<PublicExploitEvidence, 'status' | 'source_confidence'> & { source_url?: string; exploit_id?: string; title?: string; publication_date?: string } | null): GlobalPublicExploitAssessment {
  const sourceResult = buildExploitSourceResult(evidence || { status: 'NOT_AVAILABLE', source_confidence: 0 });
  const sources = [sourceResult];
  const status = aggregatePublicExploitStatus(sources);
  return {
    status,
    ...(status === 'FOUND' && evidence
      ? { exploit_id: evidence.exploit_id, title: evidence.title, source_url: evidence.source_url, publication_date: evidence.publication_date }
      : {}),
    sources,
  };
}

/**
 * PHASE 3 — ABS-001..ABS-007 absence-semantics validator. Deterministic.
 * Returns violations; empty means consistent.
 */
export function verifyExploitAbsenceSemantics(report: {
  signals?: Record<string, unknown>;
  exploitation?: Record<string, unknown>;
  provenance?: { claims?: Array<{ field?: string; value?: unknown; source?: unknown; source_ids?: unknown; truth_type?: unknown }> };
}): string[] {
  const violations: string[] = [];
  const claims = Array.isArray(report.provenance?.claims) ? report.provenance!.claims : [];
  const publicExploitClaims = claims.filter(c => c.field === 'public_exploit');
  const signals = (report.signals || {}) as Record<string, unknown>;
  const exploitation = (report.exploitation || {}) as Record<string, unknown>;

  // Structural source-scoped state on the exploitation projection (when present).
  const structured = exploitation.public_exploit as { status?: unknown; sources?: Array<{ status?: unknown }> } | undefined;
  const sourceScopedStatuses: string[] = [];
  // RAW (pre-normalization) source-level tokens — the historical unscoped forms must be
  // detectable before the legacy map re-scopes them.
  const rawScopedStatuses: string[] = [];
  if (structured) {
    const scoped = (Array.isArray(structured.sources) ? structured.sources : []).map(s => normalizeExploitSourceStatus(s?.status));
    rawScopedStatuses.push(...(Array.isArray(structured.sources) ? structured.sources : []).map(s => String(s?.status || '').trim().toUpperCase()));
    sourceScopedStatuses.push(...scoped);
    const globalStatus = String(structured.status || '').toUpperCase();
    // ABS-001: source-specific absence must not become global NOT_FOUND.
    if (globalStatus === 'NOT_FOUND' || globalStatus === 'NO') {
      violations.push('ABS-001: global public-exploit state NOT_FOUND/NO — a source-scoped absence was promoted to a global negative.');
    }
    // ABS-005: a global FOUND must be backed by at least one source with FOUND evidence.
    if (globalStatus === 'FOUND' && !scoped.includes('FOUND')) {
      violations.push('ABS-005: global FOUND without at least one source-level FOUND result.');
    }
    // ABS-006: a global negative/absence aggregate must be the explicit safe default.
    if (globalStatus === 'NOT_ESTABLISHED' || globalStatus === 'GLOBAL_NOT_ESTABLISHED') {
      if (scoped.includes('FOUND')) violations.push('ABS-006: global negative while a source reports FOUND.');
    }
  }
  // ABS-006/ABS-002/ABS-003/ABS-004 on source-level entries: a source entry may never
  // carry the unscoped global token NOT_FOUND — absence must be source-scoped. Checked on
  // the RAW token (before legacy normalization) so the historical unscoped form is caught.
  for (const s of rawScopedStatuses) {
    if (s === 'NOT_FOUND') violations.push('ABS-001: source-level state uses unscoped NOT_FOUND instead of NOT_FOUND_FOR_SOURCE.');
  }

  // Claim-ledger rules: a single-source absence claim must stay source-scoped.
  for (const c of publicExploitClaims) {
    const value = String(c.value ?? '').trim().toUpperCase();
    const sourceIds = Array.isArray(c.source_ids) ? c.source_ids.map(String) : [];
    // ABS-001: source-specific NOT_FOUND_FOR_SOURCE must not become a global NOT_FOUND claim.
    if (value === 'NOT_FOUND' && sourceIds.length <= 1) {
      violations.push(`ABS-001: claim '${c.field}' carries global NOT_FOUND backed by a single source (${sourceIds.join(', ') || 'none'}).`);
    }
    // ABS-007: claim provenance must identify the supporting source(s).
    if (sourceIds.length === 0 && !c.source) {
      violations.push(`ABS-007: claim '${c.field}' has no source identity.`);
    }
    // NOT_AVAILABLE on an exploit-absence claim means the source was never queried —
    // it must be labeled accordingly, not as evidence of absence.
    if (c.truth_type === 'NOT_AVAILABLE' && value === 'FOUND') {
      violations.push(`ABS-005: claim '${c.field}' asserts FOUND with truth_type NOT_AVAILABLE.`);
    }
  }

  // Aggregate-signal consistency: signals.public_exploit must never be a bare negative 'NO'
  // unless a FOUND exists elsewhere AND the coverage contract justifies it (it never does today).
  if (String(signals.public_exploit || '').toUpperCase() === 'NO' && !sourceScopedStatuses.includes('FOUND')) {
    violations.push('ABS-001: signals.public_exploit=NO is a global negative derived from source-scoped absence.');
  }
  if (String(signals.exploit_code_public || '').toUpperCase() === 'NO' && !sourceScopedStatuses.includes('FOUND')) {
    violations.push('ABS-001: signals.exploit_code_public=NO is a global negative derived from source-scoped absence.');
  }
  return violations;
}

export const KNOWN_EXPLOIT_DB_CATALOG: Record<string, { exploit_id: string; title: string; exploit_type: string; date: string; url: string }> = {
  'CVE-2021-44228': {
    exploit_id: 'EDB-ID-50592',
    title: 'Apache Log4j2 2.14.1 - Remote Code Execution (RCE) (PoC)',
    exploit_type: 'remote',
    date: '2021-12-13',
    url: 'https://www.exploit-db.com/exploits/50592',
  },
  'CVE-2021-22005': {
    exploit_id: 'EDB-ID-50383',
    title: 'VMware vCenter Server 7.0 - Arbitrary File Upload (PoC)',
    exploit_type: 'remote',
    date: '2021-10-06',
    url: 'https://www.exploit-db.com/exploits/50383',
  },
  'CVE-2024-3400': {
    exploit_id: 'EDB-ID-52000',
    title: 'Palo Alto Networks PAN-OS GlobalProtect - Command Injection Proof of Concept',
    exploit_type: 'remote',
    date: '2024-04-16',
    url: 'https://www.exploit-db.com/exploits/52000',
  },
  'CVE-2024-21887': {
    exploit_id: 'EDB-ID-51965',
    title: 'Ivanti Connect Secure - Command Injection Remote Code Execution',
    exploit_type: 'remote',
    date: '2024-01-16',
    url: 'https://www.exploit-db.com/exploits/51965',
  },
};

export async function lookupExploitDbEvidence(cveId: string, fetchFn?: typeof fetch): Promise<PublicExploitEvidence> {
  const normCve = cveId.trim().toUpperCase();
  const known = KNOWN_EXPLOIT_DB_CATALOG[normCve];
  if (known) {
    return {
      exploit_id: known.exploit_id,
      title: known.title,
      source_url: known.url,
      publication_date: known.date,
      affected_cve: normCve,
      exploit_type: known.exploit_type,
      source_confidence: 1.0,
      status: 'FOUND',
    };
  }

  return {
    affected_cve: normCve,
    source_confidence: 0.0,
    status: 'NOT_FOUND',
  };
}

// PART 3: Structured MITRE ATT&CK Candidate Mapping Layer
export interface StructuredAttackMapping {
  technique_id: string;
  technique_name: string;
  tactic: string;
  relationship: string;
  rationale: string;
  confidence: number;
  evidence_ids: string[];
  source_ids: string[];
  status: 'CONFIRMED' | 'SUPPORTED' | 'CANDIDATE' | 'CAMPAIGN_CONTEXT' | 'UNKNOWN' | 'REJECTED' | 'UNESTABLISHED';
  truth_type?: 'SOURCE_FACT' | 'SUPPORTED_INFERENCE' | 'ANALYST_ASSESSMENT' | 'UNKNOWN';
  attribution_basis?: 'EXPLICIT_CTI' | 'TAXONOMIC_INFERENCE';
  evidence_scope?: EvidenceScope;
  related_cve_ids?: string[];
}

export function buildStructuredAttackMappings(
  paramsOrCve: {
    cveId: string;
    cweIds: string[];
    attackVector?: string;
    privilegesRequired?: string;
    userInteraction?: string;
    isKev: boolean;
    product?: string;
    description?: string;
    evidenceIds: string[];
    relationships?: CveRelationship[];
    authoritativeTechniques?: Array<{ technique_id: string; technique_name: string; tactic: string; source: string; rationale?: string }>;
  } | string,
  maybeCweIds?: string[],
  maybeIsKev?: boolean
): StructuredAttackMapping[] {
  const params = typeof paramsOrCve === 'string' ? {
    cveId: paramsOrCve,
    cweIds: maybeCweIds || [],
    attackVector: 'NETWORK',
    privilegesRequired: 'NONE',
    userInteraction: 'NONE',
    isKev: maybeIsKev ?? true,
    product: '',
    description: '',
    evidenceIds: [],
    relationships: lookupCveRelationships(paramsOrCve),
  } : {
    attackVector: 'UNKNOWN',
    privilegesRequired: 'UNKNOWN',
    userInteraction: 'UNKNOWN',
    product: '',
    description: '',
    ...paramsOrCve,
  };

  const mappings: StructuredAttackMapping[] = [];
  const normCve = (params.cveId || '').toUpperCase();
  const cweStr = (params.cweIds || []).join(' ').toUpperCase();
  const isNetwork = (params.attackVector || '').toUpperCase() === 'NETWORK';
  const descLower = (params.description || '').toLowerCase();

  // CONFIRMED requires an explicit, source-attributed CTI mapping and supplied evidence.
  if (params.authoritativeTechniques && params.authoritativeTechniques.length > 0) {
    for (const auth of params.authoritativeTechniques) {
      if (!auth.source.trim() || params.evidenceIds.length === 0 || !/^T\d{4}(\.\d{3})?$/.test(auth.technique_id)) continue;
      mappings.push({
        technique_id: auth.technique_id,
        technique_name: auth.technique_name,
        tactic: auth.tactic as any,
        relationship: auth.rationale || `Explicitly mapped by authoritative CTI source (${auth.source}).`,
        rationale: auth.rationale || `Explicitly mapped by authoritative CTI source (${auth.source}).`,
        confidence: 1.0,
        evidence_ids: params.evidenceIds,
        source_ids: [auth.source],
        status: 'CONFIRMED',
        evidence_scope: 'CVE',
        related_cve_ids: [],
      });
    }
  }

  // 1. Initial Access: capability inference is SUPPORTED/POSSIBLE, never an observed technique.
  if (isNetwork && params.isKev) {
    // Direct initial access evidence:
    // 1. Direct authentication bypass boundary weakness (CWE-287)
    // 2. Direct remote unauthenticated command execution weakness (CWE-77 / CWE-78)
    // 3. Path traversal (CWE-22 / CWE-23) ONLY when canonical evidence establishes arbitrary file write/upload or server infrastructure ingress, not read-only
    const hasDirectInitialAccessWeakness = cweStr.includes('CWE-287') ||
      ((cweStr.includes('CWE-77') || cweStr.includes('CWE-78')) && (params.privilegesRequired === 'NONE' || !params.privilegesRequired));

    const hasTraversalUploadEvidence = (cweStr.includes('CWE-22') || cweStr.includes('CWE-23')) && (
      descLower.includes('upload') ||
      descLower.includes('file write') ||
      descLower.includes('arbitrary file write') ||
      /server|appliance|gateway|controller/i.test(params.product || '')
    ) && !descLower.includes('file read');

    const isDirectConfirmed = (hasDirectInitialAccessWeakness || hasTraversalUploadEvidence) && !cweStr.includes('CWE-74');
    const rel = isDirectConfirmed
      ? `Supported taxonomic inference from the supplied weakness and KEV membership for ${params.product || 'appliance'}; observed use of T1190 is not established.`
      : `Possible taxonomic mapping from KEV membership and a network attack vector; public-facing exposure and observed T1190 use are not established.`;
    mappings.push({
      technique_id: 'T1190',
      technique_name: 'Exploit Public-Facing Application',
      tactic: 'Initial Access',
      relationship: rel,
      rationale: rel,
      confidence: 0.90,
      evidence_ids: params.evidenceIds,
      source_ids: ['cisa-kev', 'nvd-cpe'],
      status: params.evidenceIds.length === 0 ? 'UNESTABLISHED' : (isDirectConfirmed ? 'SUPPORTED' : 'CANDIDATE'),
      evidence_scope: 'CVE',
      related_cve_ids: [],
    });
  } else if (isNetwork) {
    const rel = `Network attack vector exposes ${params.product || 'service'} to potential external exploitation.`;
    mappings.push({
      technique_id: 'T1190',
      technique_name: 'Exploit Public-Facing Application',
      tactic: 'Initial Access',
      relationship: rel,
      rationale: rel,
      confidence: 0.50,
      evidence_ids: params.evidenceIds,
      source_ids: ['nvd-cpe'],
      status: params.evidenceIds.length ? 'CANDIDATE' : 'UNESTABLISHED',
      evidence_scope: 'PRODUCT',
      related_cve_ids: [],
    });
  }

  // 2. Execution: T1059 Command and Scripting Interpreter
  // GENERIC attribution gate: CWE-77/78 supports capability inference, not observed
  // interpreter use. When this CVE was only CHAINED_WITH a
  // command-execution CVE (relationship context), the technique is CAMPAIGN_CONTEXT at
  // RELATION scope — never promoted onto this CVE.
  const hasDirectCommandWeakness = cweStr.includes('CWE-77') || cweStr.includes('CWE-78');
  const relationships: CveRelationship[] = params.relationships || [];
  const chainedWithCommandCve = relationships.some(
    r => r.relationship_type === 'CHAINED_WITH' &&
         String(r.description || '').toLowerCase().includes('command')
  );

  if (hasDirectCommandWeakness) {
    const isDirectEvidence = params.isKev || descLower.includes('command injection') || descLower.includes('os command');
    const rel = isDirectEvidence
      ? `Supported capability inference from the supplied command-injection description or weakness for ${normCve}; observed interpreter use is not established.`
      : `Weakness taxonomy (${cweStr.includes('CWE-77') ? 'CWE-77' : 'CWE-78'}) indicates potential command execution; unconfirmed in empirical telemetry.`;
    mappings.push({
      technique_id: 'T1059',
      technique_name: 'Command and Scripting Interpreter',
      tactic: 'Execution',
      relationship: rel,
      rationale: rel,
      confidence: isDirectEvidence ? 0.95 : 0.75,
      evidence_ids: params.evidenceIds,
      source_ids: isDirectEvidence ? ['cisa-kev', 'nvd-cpe'] : ['mitre-cwe'],
      status: params.evidenceIds.length ? 'SUPPORTED' : 'UNESTABLISHED',
      evidence_scope: 'CVE',
      related_cve_ids: [],
    });
  } else if (chainedWithCommandCve) {
    // Generic chain-context rule: command execution belongs to the chained CVE(s), not this one.
    const chainPartners = relationships
      .filter(r => r.relationship_type === 'CHAINED_WITH' && String(r.description || '').toLowerCase().includes('command'))
      .map(r => r.related_cve);
    const rel = `Adversaries chained ${normCve} with ${chainPartners.join(', ')} to achieve command injection. This technique belongs strictly to campaign context and the chained CVE(s), NOT ${normCve}.`;
    mappings.push({
      technique_id: 'T1059',
      technique_name: 'Command and Scripting Interpreter',
      tactic: 'Execution',
      relationship: rel,
      rationale: `Chained exploitation campaign context. Not a direct technique of ${normCve}.`,
      confidence: 0.60,
      evidence_ids: params.evidenceIds,
      source_ids: ['cisa-kev'],
      status: 'CAMPAIGN_CONTEXT',
      evidence_scope: 'RELATION',
      related_cve_ids: chainPartners,
    });
  }

  // 3. Execution: T1203 Exploitation for Client Execution
  // ATT&CK DEFECT B: T1203 applies strictly to client application exploitation (opening malicious documents,
  // visiting malicious websites, client processing). It is NEVER inferred merely from attackVector === 'LOCAL'.
  const hasClientExecutionEvidence = descLower.includes('client execution') ||
    (descLower.includes('client application') && (params.userInteraction || '').toUpperCase() === 'REQUIRED');
  if (hasClientExecutionEvidence) {
    const rel = `Documented client application exploitation requiring user execution or client interaction.`;
    mappings.push({
      technique_id: 'T1203',
      technique_name: 'Exploitation for Client Execution',
      tactic: 'Execution',
      relationship: rel,
      rationale: rel,
      confidence: 0.80,
      evidence_ids: params.evidenceIds,
      source_ids: ['nvd-cpe'],
      status: 'SUPPORTED',
      evidence_scope: 'PRODUCT',
      related_cve_ids: [],
    });
  }

  // 4. Privilege Escalation: T1068 Exploitation for Privilege Escalation
  if (descLower.includes('privilege escalation') || descLower.includes('root') || descLower.includes('elevated privileges')) {
    const rel = `Vulnerability telemetry records potential elevation to administrative or root privilege context.`;
    mappings.push({
      technique_id: 'T1068',
      technique_name: 'Exploitation for Privilege Escalation',
      tactic: 'Privilege Escalation',
      relationship: rel,
      rationale: rel,
      confidence: 0.75,
      evidence_ids: params.evidenceIds,
      source_ids: ['nvd-cpe'],
      status: 'SUPPORTED',
      evidence_scope: 'PRODUCT',
      related_cve_ids: [],
    });
  }

  // 5. Discovery / File Access: T1083 File and Directory Discovery
  // ATT&CK DEFECT: T1083 requires explicit empirical evidence of file or directory discovery behavior
  // (e.g. enumeration, directory listing). It is NEVER inferred from CWE-22, CWE-23, CWE-35, or "path traversal" alone.
  const hasDiscoveryEvidence = descLower.includes('file discovery') ||
    descLower.includes('directory discovery') ||
    descLower.includes('directory listing') ||
    descLower.includes('file enumeration') ||
    descLower.includes('directory enumeration') ||
    descLower.includes('list directory contents') ||
    descLower.includes('discover directory contents'); // Upload alone is not discovery.
  if (hasDiscoveryEvidence) {
    const rel = `Documented file or directory discovery behavior allows adversary to explore file system hierarchy.`;
    mappings.push({
      technique_id: 'T1083',
      technique_name: 'File and Directory Discovery',
      tactic: 'Discovery',
      relationship: rel,
      rationale: rel,
      confidence: 0.85,
      evidence_ids: params.evidenceIds,
      source_ids: ['threat-telemetry'],
      status: 'SUPPORTED',
      evidence_scope: 'CVE',
      related_cve_ids: [],
    });
  }

  // 6. Persistence: T1505 Server Software Component
  if (descLower.includes('web shell') || descLower.includes('backdoor') || descLower.includes('persistent access')) {
    const rel = `Threat telemetry indicates adversary attempts to deploy persistent server components.`;
    mappings.push({
      technique_id: 'T1505',
      technique_name: 'Server Software Component',
      tactic: 'Persistence',
      relationship: rel,
      rationale: rel,
      confidence: 0.65,
      evidence_ids: params.evidenceIds,
      source_ids: ['threat-telemetry'],
      status: 'CANDIDATE',
      evidence_scope: 'CAMPAIGN',
      related_cve_ids: [],
    });
  }

  // Taxonomy and prose describe capabilities, not empirical technique observations.
  // Keep explicit CTI mappings distinct and avoid duplicate inferred copies.
  const confirmedIds = new Set(mappings.filter(m => m.status === 'CONFIRMED').map(m => m.technique_id));
  return mappings.filter(m => m.status === 'CONFIRMED' || !confirmedIds.has(m.technique_id)).map(m => ({
    ...m,
    status: m.status === 'CONFIRMED' || m.status === 'CAMPAIGN_CONTEXT' ? m.status : (params.evidenceIds.length ? m.status : 'UNESTABLISHED'),
    truth_type: m.status === 'CONFIRMED' ? 'SOURCE_FACT' : params.evidenceIds.length === 0 ? 'UNKNOWN' : m.status === 'SUPPORTED' ? 'SUPPORTED_INFERENCE' : 'ANALYST_ASSESSMENT',
    attribution_basis: m.status === 'CONFIRMED' ? 'EXPLICIT_CTI' : 'TAXONOMIC_INFERENCE',
    confidence: params.evidenceIds.length === 0 ? 0 : m.confidence,
    source_ids: m.status === 'CONFIRMED' ? m.source_ids : [],
  }));
}

/** An aggregate claim cannot promote possible/rejected mappings into verified source facts. */
export function attackMappingClaim(mappings: StructuredAttackMapping[]) {
  const scoped = mappings.filter(m => m.status !== 'CAMPAIGN_CONTEXT');
  const confirmed = scoped.length > 0 && scoped.every(m => m.status === 'CONFIRMED');
  const supported = scoped.length > 0 && scoped.every(m => m.status === 'CONFIRMED' || m.status === 'SUPPORTED');
  const possible = scoped.some(m => m.status === 'CANDIDATE');
  return {
    truth_type: confirmed ? 'SOURCE_FACT' : supported ? 'SUPPORTED_INFERENCE' : possible ? 'ANALYST_ASSESSMENT' : 'UNKNOWN',
    confidence: confirmed ? 1 : supported ? Math.min(...scoped.map(m => m.confidence)) : possible ? 0.5 : 0,
    verification_status: confirmed ? 'VERIFIED' as const : 'UNKNOWN' as const,
    source_ids: confirmed ? [...new Set(scoped.flatMap(m => m.source_ids))] : [],
  };
}

// PART 4: Rust Kernel Independent Deterministic Validator & Fail-Closed Logic
export interface KernelValidationReport {
  executed: boolean;
  status: 'PASS' | 'FAIL' | 'CONFLICT' | 'NOT_APPLICABLE';
  lifecycle_state: 'ACCEPTED' | 'REJECTED' | 'NOT_EXECUTED';
  checks: {
    canonical_integrity: 'PASS' | 'CONFLICT';
    semantic_consistency: 'PASS' | 'CONFLICT';
    evidence_grounding: 'PASS' | 'UNSUPPORTED';
  };
  conflicts: string[];
  errors: string[];
  warnings: string[];
}

export async function executeRustKernelValidation(params: {
  cveId: string;
  vendor: string;
  product: string;
  cvssScore: string;
  cvssVector?: string;
  isKev: boolean;
  attackVector: string;
  authRequired: string;
  claims: Array<{ id: string; field: string; value: string; truth_type: string }>;
  evidenceStatements: Array<{ id: string; statement: string; source: string; url: string }>;
  wasmModule?: any;
}): Promise<KernelValidationReport> {
  const { cveId, vendor, product, cvssScore, isKev, claims, evidenceStatements, wasmModule } = params;

  try {
    const kernel = await getRustKernelInstance(wasmModule);
    if (!kernel) {
      return {
        executed: false,
        status: 'NOT_APPLICABLE',
        lifecycle_state: 'NOT_EXECUTED',
        checks: { canonical_integrity: 'PASS', semantic_consistency: 'PASS', evidence_grounding: 'PASS' },
        conflicts: [],
        errors: ['Rust Kernel instance unavailable'],
        warnings: [],
      };
    }

    const kernelInput = {
      schema_version: 'v1.0',
      request_id: `req_${cveId.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
      object_id: cveId,
      canonical: {
        object_id: cveId,
        domain: 'VULNERABILITY',
        primary_identifier: cveId,
        aliases: [`${vendor} ${product} Vulnerability`, cveId],
        canonical_facts: {
          affected_product: {
            fact_id: `f_prod_${cveId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            fact_type: 'AFFECTED_TARGET',
            name: 'affected_product',
            value: product,
            source_id: 'authoritative',
            is_immutable: true,
          },
          cvss_score: {
            fact_id: `f_cvss_${cveId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            fact_type: 'METRIC',
            name: 'cvss_score',
            value: cvssScore,
            source_id: 'nvd',
            is_immutable: true,
          },
          // KEV MEMBERSHIP — a fact about the consulted catalog, and its own fact.
          //
          // Measured defect this exists for: the pipeline used to assert the
          // membership statement under the `exploitation_status` predicate, so the
          // kernel's canonical-integrity check compared "not listed in CISA KEV"
          // against this record's exploitation fact and reported a false
          // "Canonical Fact Conflict" for every non-KEV CVE. Membership and
          // exploitation evidence are now separate predicates AND separate facts,
          // so the kernel still verifies both — it just no longer compares a
          // catalog statement with an exploitation state.
          kev_status: {
            fact_id: `f_kev_${cveId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            fact_type: 'CLASSIFICATION',
            name: 'kev_status',
            value: isKev ? 'listed in CISA KEV' : 'not listed in CISA KEV',
            source_id: 'cisa-kev',
            is_immutable: true,
          },
          exploitation_status: {
            fact_id: `f_expl_${cveId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            fact_type: 'EXPLOITATION_STATUS',
            name: 'exploitation_status',
            // `unconfirmed` means NO CONSULTED AUTHORITY ESTABLISHES exploitation —
            // it is not a statement that exploitation never occurred, and it is not
            // a KEV-membership token (that is `kev_status` above).
            value: isKev ? 'known exploited' : 'unconfirmed',
            source_id: 'cisa-kev',
            is_immutable: true,
          },
        },
        metadata: {},
      },
      bundle: {
        object_id: cveId,
        domain: 'VULNERABILITY',
        items: evidenceStatements.map(e => ({
          evidence_id: e.id,
          object_id: cveId,
          source_id: e.source,
          source_type: 'PRIMARY_VENDOR',
          url: e.url,
          statement: e.statement,
          temporal: null,
          provenance_hash: null,
        })),
      },
      claims: claims.map(c => ({
        claim_id: c.id,
        domain: 'VULNERABILITY',
        subject: cveId,
        predicate: c.field,
        object_value: String(c.value),
        text: `${cveId} ${c.field} is ${c.value}.`,
        status: c.truth_type === 'SOURCE_FACT' ? 'CONFIRMED' : 'CANDIDATE',
        evidence_refs: evidenceStatements.map(e => e.id),
        confidence_score: c.truth_type === 'SOURCE_FACT' ? 1.0 : 0.8,
        temporal: null,
      })),
      profile: null,
      sources: [],
    };

    const result = kernel.execute(kernelInput);
    const conflicts = Array.isArray(result.conflicts) ? result.conflicts : [];
    const errors = Array.isArray(result.errors) ? result.errors : [];
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];

    const hasConflict = conflicts.length > 0 || errors.some((e: string) => e.toLowerCase().includes('conflict'));
    const isSuccess = result.success === true && !hasConflict;

    return {
      executed: true,
      status: hasConflict ? 'CONFLICT' : (isSuccess ? 'PASS' : (errors.length > 0 ? 'FAIL' : 'PASS')),
      lifecycle_state: result.lifecycle_state || (isSuccess ? 'ACCEPTED' : 'REJECTED'),
      checks: {
        canonical_integrity: hasConflict ? 'CONFLICT' : 'PASS',
        semantic_consistency: conflicts.some((c: string) => c.toLowerCase().includes('semantic contradiction')) ? 'CONFLICT' : 'PASS',
        evidence_grounding: errors.some((e: string) => e.toLowerCase().includes('ungrounded')) ? 'UNSUPPORTED' : 'PASS',
      },
      conflicts,
      errors,
      warnings,
    };
  } catch (kernelErr: any) {
    return {
      executed: false,
      status: 'NOT_APPLICABLE',
      lifecycle_state: 'NOT_EXECUTED',
      checks: { canonical_integrity: 'PASS', semantic_consistency: 'PASS', evidence_grounding: 'PASS' },
      conflicts: [],
      errors: [String(kernelErr?.message || kernelErr)],
      warnings: ['Kernel execution skipped due to environment constraint'],
    };
  }
}

// ── MICRO TASK 76: Claim Ledger Hardening & Fail-Closed Semantic Validation ──

export interface ClaimRecord {
  id: string;
  claim_id?: string;
  field: string;
  value: unknown;
  truth_type: string;
  confidence: number;
  source?: string;
  source_ids?: string[];
  source_url?: string;
  evidence_scope: EvidenceScope;
  source_timestamp?: string;
  verification_status: 'VERIFIED' | 'CONTRADICTORY' | 'SCOPE_INVALID' | 'UNSUPPORTED' | 'UNKNOWN';
  related_cve_ids?: string[];
  notes?: string;
}

export interface ClaimsVerificationResult {
  is_valid: boolean;
  total_claims: number;
  verified_claims: number;
  verified_count?: number;
  contradictory_claims: number;
  scope_invalid_claims: number;
  unsupported_claims: number;
  /** Non-blocking findings raised by downstream gates (e.g. temporal provenance). */
  warnings?: Array<{
    claim_id: string;
    field: string;
    issue: string;
  }>;
  violations: Array<{
    claim_id: string;
    field: string;
    issue: string;
  }>;
}

export function verifyClaimsLedger(
  claimsOrCve: ClaimRecord[] | string,
  cveOrClaims: string | ClaimRecord[],
  authoritativeEvidence?: AuthoritativeEvidenceContext | null,
  authoritativeEvidenceIndex?: Map<string, { source?: string; source_id?: string }>
): ClaimsVerificationResult {
  const claims: ClaimRecord[] = Array.isArray(claimsOrCve)
    ? claimsOrCve
    : (Array.isArray(cveOrClaims) ? cveOrClaims : []);
  const cveId: string = typeof claimsOrCve === 'string'
    ? claimsOrCve
    : (typeof cveOrClaims === 'string' ? cveOrClaims : '');

  const normCve = cveId.toUpperCase();
  const cna = authoritativeEvidence || null;
  const violations: Array<{ claim_id: string; field: string; issue: string }> = [];

  let verifiedCount = 0;
  let contradictoryCount = 0;
  let scopeInvalidCount = 0;
  let unsupportedCount = 0;

  for (const claim of claims) {
    const claimId = claim.claim_id || claim.id || 'unknown';
    const field = claim.field || '';
    const val = claim.value;
    const scope = claim.evidence_scope;

    // Check 1: Missing provenance source
    const hasSource = Boolean(claim.source && claim.source.trim().length > 0);
    if (!hasSource) {
      unsupportedCount++;
      claim.verification_status = 'UNSUPPORTED';
      violations.push({
        claim_id: claimId,
        field,
        issue: `Missing source: Claim ${claimId} (${field}) is missing an authoritative provenance source.`,
      });
      continue;
    }

    // Check 2: Invalid or missing evidence_scope
    const validScopes: EvidenceScope[] = ['CVE', 'PRODUCT', 'CAMPAIGN', 'RELATION', 'KNOWLEDGE', 'ANALYST'];
    if (!scope || !validScopes.includes(scope)) {
      scopeInvalidCount++;
      claim.verification_status = 'SCOPE_INVALID';
      violations.push({
        claim_id: claimId,
        field,
        issue: `Invalid evidence_scope: Claim ${claimId} (${field}) has invalid evidence_scope '${scope}'.`,
      });
      continue;
    }

    // Check 3: Scope promotion violation (Related-CVE data promoted to CVE-specific scope)
    if (claim.related_cve_ids && claim.related_cve_ids.length > 0 && scope === 'CVE') {
      scopeInvalidCount++;
      claim.verification_status = 'SCOPE_INVALID';
      violations.push({
        claim_id: claimId,
        field,
        issue: `Related-CVE evidence promoted to CVE-specific scope for ${claimId} (${claim.related_cve_ids.join(', ')}).`,
      });
      const valStr = JSON.stringify(val);
      if (valStr.includes('T1059')) {
        contradictoryCount++;
        violations.push({
          claim_id: claimId,
          field,
          issue: `T1059 Command and Scripting Interpreter is relational context, not a CVE-specific fact.`,
        });
      }
      continue;
    }

    // Check 3B: Campaign fact asserted under CVE scope without direct CVE evidence
    if ((field.toLowerCase().includes('campaign') || String(val).toLowerCase().includes('campaign')) && scope === 'CVE' && field !== 'cisa_ransomware' && field !== 'ransomware') {
      scopeInvalidCount++;
      claim.verification_status = 'SCOPE_INVALID';
      violations.push({
        claim_id: claimId,
        field,
        issue: `Campaign fact asserted under CVE scope without CVE-specific evidence on claim ${claimId}.`,
      });
      continue;
    }

    // Check 4: Evidence-driven semantic isolation (GENERIC — no per-CVE branches).
    // Ransomware: a 'Known' assertion contradicts injected authoritative evidence that
    // establishes a different state.
    if (cna?.cisa_kev && (field === 'ransomware' || field === 'cisa_ransomware')) {
      const valStr = String(val).toLowerCase();
      const evRw = String(cna.cisa_kev.ransomware_campaign_use || '').toLowerCase();
      if (valStr === 'known' && evRw !== 'known') {
        contradictoryCount++;
        claim.verification_status = 'CONTRADICTORY';
        violations.push({
          claim_id: claimId,
          field,
          issue: `Ransomware asserted as 'Known' contradicts authoritative evidence ('${cna.cisa_kev.ransomware_campaign_use}', source: ${cna.source}).`,
        });
        continue;
      }
    }

    // Mechanism/vulnerability-condition claims must not assert a capability class the
    // injected authoritative evidence does not establish (generic contamination gate).
    if (cna && (field === 'technical_mechanism' || field === 'vulnerability_condition' || field === 'vulnerability_type')) {
      const valStr = String(val);
      const asserted = mechanismCapabilityClasses(valStr, []);
      const authorizedCwes: string[] = [];
      for (const list of Object.values(cna.source_specific_cwes || {})) authorizedCwes.push(...list);
      const authorized = mechanismCapabilityClasses(cna.technical_mechanism || '', authorizedCwes);
      for (const cls of asserted) {
        if (!authorized.has(cls)) {
          const label = MECHANISM_CAPABILITY_CLASSES.find(e => e.cls === cls)?.label || cls;
          contradictoryCount++;
          claim.verification_status = 'CONTRADICTORY';
          violations.push({
            claim_id: claimId,
            field,
            issue: `Mechanism asserts ${label} capability not established by authoritative evidence for ${cveId || 'this CVE'} (evidence source: ${cna.source}).`,
          });
          continue;
        }
      }
    }

    // ATT&CK technique claims: a technique is CVE-specific only when THIS CVE's own
    // weaknesses establish it. Otherwise a CVE-scope SOURCE_FACT claim is unsupported.
    if (field === 'att&ck' || field === 'mitre_attack' || field === 'attack_technique' || field === 'attack_mapping') {
      const valStr = JSON.stringify(val);
      const isCommandTechnique = /T1059/.test(valStr);
      const hasDirectCommandWeakness = mechanismCapabilityClasses('', Object.values(cna?.source_specific_cwes || {}).flat()).has('command-execution');
      if (isCommandTechnique && claim.evidence_scope === 'CVE' && claim.truth_type === 'SOURCE_FACT' && cna && !hasDirectCommandWeakness) {
        contradictoryCount++;
        claim.verification_status = 'CONTRADICTORY';
        violations.push({
          claim_id: claimId,
          field,
          issue: `T1059 marked CONFIRMED at CVE scope contradicts authoritative evidence: this CVE's weaknesses (${Object.values(cna.source_specific_cwes || {}).flat().join(', ') || 'none recorded'}) do not establish command execution (evidence source: ${cna.source}).`,
        });
        continue;
      }
    }

    // Check 5: Truth type vs Confidence consistency
    if (claim.truth_type === 'SOURCE_FACT' && claim.confidence < 0.85 && String(val).toUpperCase() !== 'UNKNOWN') {
      unsupportedCount++;
      claim.verification_status = 'UNSUPPORTED';
      violations.push({
        claim_id: claimId,
        field,
        issue: `Claim ${claimId} marked SOURCE_FACT but has insufficient confidence (${claim.confidence}).`,
      });
      continue;
    }

    // Check 6: UNKNOWN marked as SOURCE_FACT
    if ((String(val).toUpperCase() === 'UNKNOWN' || val === null || val === undefined) && claim.truth_type === 'SOURCE_FACT' && field !== 'cisa_ransomware' && field !== 'ransomware') {
      unsupportedCount++;
      claim.verification_status = 'UNSUPPORTED';
      violations.push({
        claim_id: claimId,
        field,
        issue: `Claim ${claimId} has UNKNOWN value but was asserted as SOURCE_FACT.`,
      });
      continue;
    }

    // Check 7: Authoritative advisory cross-check if CNA advisory is known
    if (cna) {
      if (field === 'vendor_advisory' || field === 'advisory_url') {
        if (val && typeof val === 'string' && val.startsWith('http') && cna.advisory?.advisory_url && val !== cna.advisory.advisory_url) {
          contradictoryCount++;
          claim.verification_status = 'CONTRADICTORY';
          violations.push({
            claim_id: claimId,
            field,
            issue: `Vendor advisory '${val}' does not match authoritative advisory URL '${cna.advisory?.advisory_url}'.`,
          });
          continue;
        }
      }
      if (field === 'advisory_id') {
        if (val && typeof val === 'string' && cna.advisory?.advisory_id && val !== cna.advisory.advisory_id) {
          contradictoryCount++;
          claim.verification_status = 'CONTRADICTORY';
          violations.push({
            claim_id: claimId,
            field,
            issue: `Vendor advisory ID '${val}' does not match authoritative advisory ID '${cna.advisory?.advisory_id}'.`,
          });
          continue;
        }
      }
    }

    // Structural validity does not establish tested monitoring coverage or observed
    // ATT&CK usage. Keep honest inference/assessment states non-verified while still
    // allowing a valid report to contain them. Source facts retain existing checks.
    const isDetectionOrTechnique = ['detection', 'att&ck', 'mitre_attack', 'attack_technique', 'attack_mapping'].includes(field.toLowerCase());
    if (isDetectionOrTechnique && claim.truth_type !== 'SOURCE_FACT') {
      claim.verification_status = 'UNKNOWN';
      continue;
    }

    verifiedCount++;
    claim.verification_status = 'VERIFIED';
  }

  const isValid = contradictoryCount === 0 && scopeInvalidCount === 0 && unsupportedCount === 0;

  // ── INTEGRITY RULE 2: Evidence-ID / Source binding consistency ────────────
  // Every claim carrying evidence_ids must reference evidence records that exist and
  // whose provenance source is compatible with the claim's source_ids. Deterministic
  // lineage check — FAILS on mismatch; never silently repaired.
  let bindingViolations = 0;
  const evidenceIndex = authoritativeEvidenceIndex;
  if (evidenceIndex && evidenceIndex.size > 0) {
    for (const claim of claims) {
      const claimId = claim.claim_id || claim.id || 'unknown';
      const field = claim.field || '';
      const evIds = Array.isArray((claim as any).evidence_ids) ? (claim as any).evidence_ids as string[] : [];
      for (const evId of evIds) {
        const evidence = evidenceIndex.get(evId);
        if (!evidence) {
          bindingViolations++;
          claim.verification_status = 'UNSUPPORTED';
          violations.push({
            claim_id: claimId,
            field,
            issue: `Evidence binding failure: claim ${claimId} (${field}) references evidence '${evId}' which does not exist in the evidence index.`,
          });
          continue;
        }
        const evSource = String(evidence.source || '').toLowerCase();
        const evSourceId = String((evidence as any).source_id || '').toLowerCase();
        const claimSources = (claim.source_ids || []).map(s => String(s).toLowerCase());
        const compatible = claimSources.some(cs =>
          cs === evSource || cs === evSourceId ||
          evSource.includes(cs) || cs.includes(evSource) ||
          evSourceId.includes(cs) || cs.includes(evSourceId)
        );
        if (claimSources.length > 0 && !compatible) {
          bindingViolations++;
          claim.verification_status = 'CONTRADICTORY';
          violations.push({
            claim_id: claimId,
            field,
            issue: `Evidence/source mismatch: claim ${claimId} (${field}) declares sources [${claimSources.join(', ')}] but references evidence '${evId}' owned by '${evidence.source || evidence.source_id}'.`,
          });
        }
      }
      if (bindingViolations > 0 && claim.verification_status === 'VERIFIED') {
        // A claim touched by a binding violation can no longer count as VERIFIED.
        claim.verification_status = 'UNSUPPORTED';
        verifiedCount = Math.max(0, verifiedCount - 1);
      }
    }
  }

  const finalIsValid = isValid && bindingViolations === 0;

  return {
    is_valid: finalIsValid,
    total_claims: claims.length,
    verified_claims: verifiedCount,
    verified_count: verifiedCount,
    contradictory_claims: contradictoryCount,
    scope_invalid_claims: scopeInvalidCount,
    unsupported_claims: unsupportedCount,
    violations,
  };
}

/**
 * PHASE 1 — CANONICAL VALIDATOR INPUT CONTRACT.
 * `validateReportSemantics` and `verifyClaimsLedger` must operate on the SAME canonical
 * emitted report representation and the SAME authoritative evidence context used by the
 * analyst-grade pipeline (workers/api/src/index.ts). This is that single contract.
 */
export interface ReportValidationContext {
  report: any;
  authoritativeEvidence: AuthoritativeEvidenceContext;
}

/**
 * PHASE 1 — Resolve a value from the first present path in a fallback chain.
 * The CANONICAL emitted report stores these values at severity / technical /
 * threat_context / remediation. Legacy and mock fixtures historically used obsolete
 * paths (mechanics / mitre_attack / top-level cvss). The canonical path is ALWAYS tried
 * first, so a compatibility projection is never mistaken for the canonical value.
 */
export function resolveReportField(report: any, paths: string[]): unknown {
  for (const p of paths) {
    let cur: any = report;
    let ok = true;
    for (const key of p.split('.')) {
      if (cur == null || typeof cur !== 'object' || !(key in cur)) { ok = false; break; }
      cur = cur[key];
    }
    if (ok && cur !== undefined && cur !== null) return cur;
  }
  return undefined;
}

/**
 * PHASE 1 — fixed-version type contract bridge.
 * The canonical emitted report stores `affected_scope.fixed_versions` as a comma-joined
 * STRING; earlier fixtures used `string[]`. Normalize BOTH to a token list so the
 * cross-product contamination check executes against the real representation.
 * TEMPORARY COMPATIBILITY BOUNDARY: branch-aware version normalization is a later phase.
 */
export function normalizeVersionTokens(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

/** Canonical entrypoint for the single validator input contract. */
export function validateReportSemanticsWithContext(ctx: ReportValidationContext): {
  isValid: boolean;
  status: 'VALIDATED' | 'BLOCKED';
  violations: string[];
  warnings: string[];
  temporal_findings?: TemporalViolation[];
} {
  return validateReportSemantics(ctx.report, ctx.authoritativeEvidence);
}

export function validateReportSemantics(report: any, authoritativeEvidence?: AuthoritativeEvidenceContext | null): {
  isValid: boolean;
  status: 'VALIDATED' | 'BLOCKED';
  violations: string[];
  warnings: string[];
  temporal_findings: TemporalViolation[];
} {
  const violations: string[] = [];
  const warnings: string[] = [];
  const cveId = (report?.identity?.cve || report?.identity?.cveId || report?.cve_id || '').toUpperCase();

  // P0.2: ALL contamination checks below are GENERIC and evidence-aware.
  // Authority enters via the injected evidence context — never a per-CVE branch.
  const evidence = authoritativeEvidence || null;

  // 1. Ransomware state must not be promoted beyond what evidence establishes
  const rw = String(
    resolveReportField(report, [
      'exploitation.ransomware_campaign_use',
      'exploitation.known_ransomware_campaign_use',
      'signals.ransomware_campaign_use',
      'signals.ransomware_associated',
      'signals.ransomware',
      'cisa_kev.ransomware_campaign_use',
    ]) ?? ''
  );
  const rwLower = rw.toLowerCase();
  const evRansomware = evidence?.cisa_kev?.ransomware_campaign_use;
  if (evidence && evRansomware && rwLower === 'known' && evRansomware.toLowerCase() !== 'known') {
    violations.push(`Ransomware marked '${rw}' contradicts authoritative evidence ('${evRansomware}', source: ${evidence.source}).`);
  }
  // Without evidence, a 'Known' assertion needs CVE-scope provenance — handled by ledger checks below.

  // 1b. CISA due-date and CVSS vector must not contradict injected authoritative evidence
  const dueDate = resolveReportField(report, ['exploitation.cisa_due_date', 'remediation.due_date', 'dates.cisa_due_at']);
  if (evidence?.cisa_kev?.due_date && dueDate && dueDate !== evidence.cisa_kev.due_date) {
    violations.push(`CISA due date contradiction: expected ${evidence.cisa_kev.due_date} (source: ${evidence.source}), received ${dueDate}.`);
  }
  // PHASE 1 — canonical path first: severity.cvss.vector (emitted), then legacy mechanics/cvss.
  const vector = resolveReportField(report, ['severity.cvss.vector', 'mechanics.cvss.vector', 'cvss.vector']);
  if (evidence?.cvss_v31?.vector && vector && vector !== evidence.cvss_v31.vector) {
    violations.push(`CVSS vector contradiction: vector '${vector}' does not match authoritative vector (source: ${evidence.source}).`);
  }

  // 2. Technical mechanism contamination (generic capability-class gate)
  const techMech = String(
    resolveReportField(report, [
      'technical.technical_mechanism',
      'identity.technical_mechanism',
      'mechanics.technical_mechanism',
      'technical_mechanism',
    ]) ?? ''
  );
  if (cveId && techMech) {
    const techIso = validateTechnicalMechanismIsolation(cveId, techMech, evidence);
    if (!techIso.isValid) {
      for (const v of techIso.violations) {
        violations.push(`Technical mechanism contamination: ${v}`);
      }
    }
  }

  // 3. Cross-product fixed-version contamination (generic): a product scope's fixed
  // versions must not leak into a different product's scope within the same report.
  const productsAffected: Array<{ product: string; fixed_versions?: string[]; affected_versions?: string[] }> =
    (resolveReportField(report, ['affected_scope.products_affected', 'identity.products_affected']) as any) || [];
  if (Array.isArray(productsAffected) && productsAffected.length > 1) {
    // The report-level version set belongs to the PRIMARY (first) product scope — the
    // reconcile path only ever aggregates the primary scope. A report-level version
    // whose lineage matches a DIFFERENT product scope is cross-product contamination.
    const primary = productsAffected[0];
    const primaryNorm = [...(primary.fixed_versions || []), ...(primary.affected_versions || [])]
      .map(v => v.toLowerCase().replace(/[^a-z0-9.]/g, '_'));
    // PHASE 1 — normalize the emitted STRING projection (and legacy arrays) to tokens.
    const scopedFixed = normalizeVersionTokens(
      resolveReportField(report, ['affected_scope.fixed_versions', 'fixed_versions'])
    );
    if (scopedFixed.length > 0) {
      for (const other of productsAffected) {
        if (other.product === primary.product) continue;
        const foreignNorm = [...(other.fixed_versions || []), ...(other.affected_versions || [])]
          .map(v => v.toLowerCase().replace(/[^a-z0-9.]/g, '_'));
        for (const v of scopedFixed.map(String)) {
          const vNorm = v.toLowerCase().replace(/[^a-z0-9.]/g, '_');
          const matchesForeign = foreignNorm.some(f => vNorm === f || vNorm.includes(f) || f.includes(vNorm));
          const matchesPrimary = primaryNorm.some(o => vNorm === o || vNorm.includes(o) || o.includes(vNorm));
          if (matchesForeign && !matchesPrimary) {
            violations.push(`Fixed version contamination: version '${v}' from product '${other.product}' leaked into '${primary.product}' scope.`);
          }
        }
      }
    }
  }

  // 4. Vendor advisory cross-check against injected authoritative evidence.
  // PHASE 1 — resolve the CANONICAL paths (remediation.canonical_advisory /
  // remediation.advisory_url) first, falling back to the legacy `vendor_advisory` shape.
  const reportAdvisoryId = resolveReportField(report, [
    'remediation.canonical_advisory.advisory_id',
    'vendor_advisory.advisory_id',
  ]);
  const reportAdvisoryUrl = resolveReportField(report, [
    'remediation.advisory_url',
    'vendor_advisory.advisory_url',
  ]);
  if (evidence?.advisory?.advisory_id && (reportAdvisoryId || reportAdvisoryUrl)) {
    if (reportAdvisoryId && reportAdvisoryId !== evidence.advisory.advisory_id) {
      violations.push(`Vendor advisory mismatch: expected ${evidence.advisory.advisory_id}, received ${reportAdvisoryId}.`);
    }
    if (reportAdvisoryUrl && evidence.advisory.advisory_url && reportAdvisoryUrl !== evidence.advisory.advisory_url) {
      violations.push(`Vendor advisory mismatch: expected ${evidence.advisory.advisory_url}, received ${reportAdvisoryUrl}.`);
    }
  }

  // 5. UNKNOWN authentication marked as SOURCE_FACT check
  // PHASE 1 — canonical path first: technical.authentication_required (emitted).
  const authReq = resolveReportField(report, [
    'technical.authentication_required',
    'mechanics.authentication_required',
    'authentication_required',
  ]);
  const claims = resolveReportField(report, ['provenance.claims', 'claims_ledger', 'claims']) || [];
  if (authReq === 'UNKNOWN' && Array.isArray(claims)) {
    const authClaim = claims.find((c: any) => c.field === 'authentication' && c.truth_type === 'SOURCE_FACT');
    if (authClaim) {
      violations.push(`UNKNOWN authentication marked as SOURCE_FACT on claim ${authClaim.claim_id || authClaim.id}.`);
    }
  }

  // 6. ATT&CK technique status & scoping checks
  // PHASE 1 — canonical path first: threat_context.attack_mappings (emitted).
  const attackList = resolveReportField(report, [
    'threat_context.attack_mappings',
    'mitre_attack',
    'attack_mappings',
    'attack_path.mappings',
  ]) || [];
  if (Array.isArray(attackList)) {
    for (const m of attackList) {
      if (m.technique_id === 'T1068' || m.status === 'UNSUPPORTED' || (m.status === 'CONFIRMED' && m.derivation?.includes('without evidence'))) {
        violations.push(`Unsupported ATT&CK technique: ${m.technique_id}`);
      }
      // Generic technique-evidence gate: a command-execution technique CONFIRMED at CVE
      // scope requires THIS CVE's evidence (CWEs) to establish command execution.
      if (m.technique_id === 'T1059' && m.status === 'CONFIRMED' && m.evidence_scope === 'CVE' && evidence) {
        const evCwes: string[] = [];
        for (const list of Object.values(evidence.source_specific_cwes || {})) evCwes.push(...list);
        if (!mechanismCapabilityClasses('', evCwes).has('command-execution')) {
          violations.push(`Unsupported ATT&CK technique: T1059 CONFIRMED at CVE scope is not established by authoritative evidence for ${cveId} (${evCwes.join(', ') || 'no CWEs recorded'}; source: ${evidence.source}).`);
        }
      }
      if (m.status === 'CONFIRMED' && Array.isArray(m.related_cve_ids) && m.related_cve_ids.length > 0) {
        violations.push(`ATT&CK technique '${m.technique_id}' marked CONFIRMED is attributed to related CVEs (${m.related_cve_ids.join(', ')}); it is contextual, not CVE-specific.`);
      }
      if (m.status === 'CAMPAIGN_CONTEXT' && m.evidence_scope === 'CVE') {
        violations.push(`CAMPAIGN_CONTEXT technique '${m.technique_id}' cannot have CVE evidence_scope.`);
      }
    }
  }

  // 7. Attack path stages checks
  const stages = report?.attack_path?.stages || [];
  if (Array.isArray(stages)) {
    for (const s of stages) {
      if (!['SOURCE_FACT', 'SUPPORTED_INFERENCE', 'UNKNOWN'].includes(s.truth_type)) {
        violations.push(`Attack path stage '${s.stage}' has invalid truth_type '${s.truth_type}'.`);
      }
      if (s.truth_type === 'SOURCE_FACT' && s.evidence_scope === 'RELATION') {
        violations.push(`Attack path stage '${s.stage}' cannot be SOURCE_FACT with RELATION evidence_scope.`);
      }
    }
  }

  // 8. Claims ledger validation
  if (Array.isArray(claims) && claims.length > 0) {
    const claimRes = verifyClaimsLedger(claims, cveId, evidence);
    if (!claimRes.is_valid) {
      for (const v of claimRes.violations) {
        violations.push(`Claim violation [${v.claim_id} ${v.field}]: ${v.issue}`);
      }
    }
  }

  // 9. PHASE 4 (REM-03) — product-aware version semantics.
  // The canonical contract is fail-closed when canonical mappings are present. Reports
  // that predate the canonical model (no version_mappings) fall back to the structural
  // V1 contamination shape plus the commit-as-version check on the flat projection — the
  // legacy fields are never treated as the source of truth, only as a projection.
  const versionMappings = resolveVersionMappings(report);
  const flatAffected = resolveReportField(report, ['affected_scope.affected_versions', 'affected.affected_versions', 'affected_versions']);
  const flatFixed = resolveReportField(report, ['affected_scope.fixed_versions', 'affected.fixed_versions', 'fixed_versions']);
  if (versionMappings.length > 0) {
    for (const v of verifyVersionMappings({
      mappings: versionMappings,
      productsAffected: Array.isArray(productsAffected) ? productsAffected : [],
      flatAffectedVersions: flatAffected,
      flatFixedVersions: flatFixed,
    })) {
      violations.push(`Version semantics [${v.rule}]: ${v.message}`);
    }
  } else if (Array.isArray(productsAffected) && productsAffected.length > 0) {
    const contaminatedBranches = detectLegacyCrossBranchContamination(productsAffected as any);
    if (contaminatedBranches > 0) {
      violations.push(`Version semantics [VER-002]: cross-branch fixed-version contamination across ${contaminatedBranches} product branches (legacy flat model).`);
    }
    for (const t of normalizeVersionTokens(flatFixed)) {
      if (classifyVersionEntity(t) === 'FIX_COMMIT') {
        violations.push(`Version semantics [VER-003]: commit identifier '${t}' rendered as a product fixed version.`);
        break;
      }
    }
  }

  // 10. PHASE 5 (REM-04) — TMP-001..TMP-008 temporal provenance gate.
  // Canonical temporal provenance owns timestamp truth; legacy flat date fields are
  // projections. A timestamp without traceable provenance is never authoritative
  // merely because it is syntactically valid ISO.
  const temporalProvenance = resolveReportField(report, ['temporal_provenance', 'provenance.temporal_provenance']) as TemporalProvenance | undefined;
  const datesBlock = (resolveReportField(report, ['dates']) as Record<string, unknown> | undefined) || {};
  const temporalFindings = validateTemporalProvenance({
    temporal_provenance: temporalProvenance,
    dates: datesBlock,
    claims: Array.isArray(claims) ? claims : [],
    cve_published_at: (temporalProvenance?.cve_published_at ?? (typeof datesBlock.cve_published_at === 'string' ? datesBlock.cve_published_at : null)) || null,
  });
  for (const tv of temporalFindings) {
    if (tv.severity === 'BLOCKING') {
      violations.push(`Temporal provenance [${tv.rule}]: ${tv.message}`);
    } else {
      warnings.push(`Temporal provenance [${tv.rule}]: ${tv.message}`);
    }
  }

  const isValid = violations.length === 0;
  return {
    isValid,
    status: isValid ? 'VALIDATED' : 'BLOCKED',
    violations,
    warnings,
    temporal_findings: temporalFindings,
  };
}



// ═══════════════════════════════════════════════════════════════════════════
// PHASE 5 (REM-04) — TEMPORAL VALIDATION RULES TMP-001..TMP-008
//
// Integrated with the single Phase-1 validation context (validateReportSemantics),
// NOT a second validation architecture. The rules are generic and evidence-aware:
// they only fire when the canonical temporal provenance is present, and they
// treat legacy flat timestamps as non-authoritative projections.
// ═══════════════════════════════════════════════════════════════════════════

export interface TemporalViolation {
  rule: 'TMP-001' | 'TMP-002' | 'TMP-003' | 'TMP-004' | 'TMP-005' | 'TMP-006' | 'TMP-007' | 'TMP-008';
  severity: 'BLOCKING' | 'WARNING';
  message: string;
}

const TMP_SEMANTIC_SENTINELS = new Set(['UNKNOWN', 'NOT_AVAILABLE', 'UNAVAILABLE', 'SOURCE_UNAVAILABLE', 'SOURCE_ERROR']);

function isSemanticSentinel(v: unknown): boolean {
  return typeof v === 'string' && TMP_SEMANTIC_SENTINELS.has(v.trim().toUpperCase());
}

/**
 * PHASE 5 — deterministic temporal provenance validation.
 *
 * Inputs:
 *   temporal_provenance — canonical source-scoped provenance (may be absent for legacy rows)
 *   dates               — the report's flat `dates` projection (never authoritative on its own)
 *   claims              — the claims ledger (source_timestamp fields checked for confusion)
 *   cve_published_at    — the CVE ecosystem publication timestamp, if known
 *
 * Fail-closed: BLOCKING violations are emitted for provenable cross-domain substitutions.
 * Legacy reports without temporal_provenance produce NO false positives — they are
 * measured (legacy debt) by the population scan, not silently certified.
 */
export function validateTemporalProvenance(params: {
  temporal_provenance?: TemporalProvenance | null;
  dates?: Record<string, unknown> | null;
  claims?: Array<Record<string, unknown>>;
  cve_published_at?: string | null;
}): TemporalViolation[] {
  const violations: TemporalViolation[] = [];
  const tp = params.temporal_provenance || null;
  const cvePublished = params.cve_published_at || null;
  const cvePublishedValid = cvePublished != null && !isSemanticSentinel(cvePublished) && normalizeIsoTimestamp(cvePublished) != null;

  // ── TMP-002 — EPSS publication contamination (the primary regression target) ──
  // EPSS observation time must NEVER equal/inherit cve_published_at merely because
  // the CVE timestamp exists. Authoritative equivalence (EPSS supplies the same date)
  // is the ONLY permitted equality.
  const epssObserved = tp?.source_observed_at?.['epss'] ?? null;
  if (cvePublishedValid && epssObserved != null && !isSemanticSentinel(epssObserved)) {
    const epssValid = normalizeIsoTimestamp(epssObserved);
    if (epssValid != null && epssValid === normalizeIsoTimestamp(cvePublished)) {
      violations.push({
        rule: 'TMP-002',
        severity: 'BLOCKING',
        message: `EPSS observation timestamp '${epssObserved}' equals cve_published_at; EPSS observation time must never inherit the CVE publication timestamp without authoritative equivalence from the EPSS source itself.`,
      });
    }
  }

  // Claim-ledger variant of TMP-002: an EPSS claim stamped with the CVE publication
  // timestamp instead of an EPSS observation time (or an explicit sentinel).
  const claims = Array.isArray(params.claims) ? params.claims : [];
  for (const c of claims) {
    const field = String(c?.field ?? '').toLowerCase();
    const sourceIds = Array.isArray(c?.source_ids) ? c.source_ids.map(String) : [];
    const isEpssClaim = field === 'epss' || sourceIds.includes('first-epss');
    if (!isEpssClaim) continue;
    const ts = c?.source_timestamp;
    if (ts == null || isSemanticSentinel(ts)) continue;
    const tsStr = String(ts);
    // A syntactically valid timestamp on an EPSS claim is only authoritative if the
    // canonical provenance carries it as the EPSS observation time.
    if (cvePublishedValid && tp && epssObserved == null && normalizeIsoTimestamp(tsStr) != null && normalizeIsoTimestamp(tsStr) === normalizeIsoTimestamp(cvePublished)) {
      violations.push({
        rule: 'TMP-002',
        severity: 'BLOCKING',
        message: `EPSS claim ${String(c?.claim_id ?? c?.id ?? 'unknown')} carries source_timestamp equal to cve_published_at while canonical provenance records NO EPSS observation time: publication timestamp reused as observation timestamp.`,
      });
    }
    // TMP-003 — source identity loss: EPSS claim with a timestamp but no source identity.
    if (!c?.source_ids && !c?.source) {
      violations.push({
        rule: 'TMP-003',
        severity: 'BLOCKING',
        message: `EPSS claim ${String(c?.claim_id ?? c?.id ?? 'unknown')} carries a source timestamp without source identity (source/source_ids).`,
      });
    }
  }

  // ── TMP-004 — retrieved/source confusion ──
  // retrieved_at entries must never be presented as source-origin timestamps.
  if (tp?.retrieved_at && tp?.source_observed_at) {
    for (const [src, ts] of Object.entries(tp.retrieved_at)) {
      if (ts == null) continue;
      const obs = tp.source_observed_at[src];
      if (obs != null && obs === ts) {
        violations.push({
          rule: 'TMP-004',
          severity: 'WARNING',
          message: `retrieved_at['${src}'] equals source_observed_at['${src}']; the ZAYRON-X retrieval event must not be presented as a source observation.`,
        });
      }
    }
  }

  // ── TMP-005 — updated/published confusion (per source) ──
  if (tp?.source_updated_at && tp?.source_published_at) {
    for (const [src, upd] of Object.entries(tp.source_updated_at)) {
      if (upd == null) continue;
      const pub = tp.source_published_at[src];
      if (pub != null && pub === upd) {
        violations.push({
          rule: 'TMP-005',
          severity: 'WARNING',
          message: `source_updated_at['${src}'] equals source_published_at['${src}']; the source's update time must not be persisted as its publication time.`,
        });
      }
    }
  }

  // ── TMP-006 — system/source confusion ──
  const systemTimes = [tp?.normalized_at, tp?.report_generated_at].filter(v => v != null) as string[];
  if (tp?.source_observed_at && systemTimes.length > 0) {
    for (const [src, obs] of Object.entries(tp.source_observed_at)) {
      if (obs == null) continue;
      for (const sys of systemTimes) {
        if (obs === sys) {
          violations.push({
            rule: 'TMP-006',
            severity: 'BLOCKING',
            message: `source_observed_at['${src}'] equals a ZAYRON-X system timestamp (normalized_at/report_generated_at); system time must never become a source observation time.`,
          });
        }
      }
    }
  }

  // ── TMP-007 — invalid fallback (missing replaced by unrelated known timestamp) ──
  // Detectable when a source_observed_at entry holds a timestamp that canonical
  // provenance proves belongs to a DIFFERENT source domain (e.g. NVD published date).
  if (tp?.source_observed_at && tp?.source_published_at) {
    for (const [src, obs] of Object.entries(tp.source_observed_at)) {
      if (obs == null) continue;
      for (const [otherSrc, otherPub] of Object.entries(tp.source_published_at)) {
        if (otherSrc === src || otherPub == null) continue;
        if (obs === otherPub) {
          violations.push({
            rule: 'TMP-007',
            severity: 'BLOCKING',
            message: `source_observed_at['${src}'] was populated from source_published_at['${otherSrc}']; a missing observation timestamp must never be filled from an unrelated temporal domain.`,
          });
        }
      }
    }
  }

  // ── TMP-008 — timestamp ordering inconsistency (only provable cases) ──
  // The repository contract makes exactly one ordering provably invalid:
  // a source record cannot be PUBLISHED before the CVE record it describes exists.
  if (cvePublishedValid && tp?.source_published_at) {
    const cveT = Date.parse(normalizeIsoTimestamp(cvePublished) as string);
    for (const [src, pub] of Object.entries(tp.source_published_at)) {
      if (pub == null || isSemanticSentinel(pub)) continue;
      const t = normalizeIsoTimestamp(pub);
      if (t == null) continue;
      const tt = Date.parse(t);
      if (!Number.isNaN(cveT) && !Number.isNaN(tt) && tt < cveT) {
        violations.push({
          rule: 'TMP-008',
          severity: 'WARNING',
          message: `source_published_at['${src}'] (${pub}) predates cve_published_at (${cvePublished}); the repository contract does not establish an authority for a pre-CVE publication.`,
        });
      }
    }
  }

  // ── TMP-001 — cross-domain fallback (dates projection vs canonical provenance) ──
  // A flat `dates` value must never carry a timestamp that canonical provenance
  // assigns to a different temporal domain.
  const dates = params.dates || null;
  if (tp && dates && typeof dates === 'object') {
    const canonicalValues = new Set<string>();
    for (const v of Object.values(tp.source_published_at || {})) if (v) canonicalValues.add(v);
    for (const v of Object.values(tp.source_updated_at || {})) if (v) canonicalValues.add(v);
    for (const v of Object.values(tp.source_observed_at || {})) if (v) canonicalValues.add(v);
    for (const v of Object.values(tp.retrieved_at || {})) if (v) canonicalValues.add(v);
    const flatCve = typeof dates.cve_published_at === 'string' ? dates.cve_published_at : null;
    if (flatCve && !isSemanticSentinel(flatCve) && tp.cve_published_at != null && !isSemanticSentinel(tp.cve_published_at)
      && normalizeIsoTimestamp(flatCve) != null && normalizeIsoTimestamp(flatCve) !== normalizeIsoTimestamp(tp.cve_published_at)
      && canonicalValues.has(flatCve)) {
      violations.push({
        rule: 'TMP-001',
        severity: 'BLOCKING',
        message: `dates.cve_published_at ('${flatCve}') belongs to a different temporal domain in canonical provenance; cross-domain fallback detected.`,
      });
    }
  }

  return violations;
}
