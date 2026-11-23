import {
  AuthorityTier,
  AdmiraltyReliability,
  SourceSnapshot,
  AdapterNormalizationResult,
  CandidateEvidence,
  CandidateEntity,
  CandidateClaim,
  CandidateRelationship,
  LicenseComplianceStatus,
  IngestionAdapter,
} from './contracts';
import { computeSha256Hex } from './cisaKevAdapter';
import {
  makeIngestionStageScope,
  buildEvidenceRef,
  provenanceFromRefs,
} from '../malware/canonical/ingestionStage';
import type {
  CanonicalAdapterPayload,
  IngestionStageScope,
} from '../malware/canonical/ingestionStage';
import type { FamilyCandidate, FamilySignal } from '../malware/canonical/family';
import type { Observation } from '../malware/canonical/observation';
import type { InfrastructureRelationship } from '../malware/canonical/family';
import type { FormatAttributes } from '../malware/canonical/artifact';

export interface ThreatFoxRecord {
  id: string;
  ioc: string;
  threat_type: string;
  threat_type_desc?: string;
  ioc_type: string;
  malware?: string;
  malware_printable?: string;
  malware_alias?: string;
  malware_malpedia?: string;
  confidence_level?: number;
  first_seen?: string;
  last_seen?: string;
  reporter?: string;
  reference?: string;
  tags?: string[];
}

export interface ThreatFoxPayload {
  query_status: string;
  data: ThreatFoxRecord[];
}

/**
 * Known benign public infrastructure set for warninglist matching
 */
const DEFAULT_WARNINGLIST_INFRASTRUCTURE = new Set([
  '1.1.1.1',
  '1.0.0.1',
  '8.8.8.8',
  '8.8.4.4',
  '9.9.9.9',
  '149.112.112.112',
  'cloudflare.com',
  'google.com',
  'dns.google',
  'one.one.one.one',
]);

/**
 * Universal de-fanging utility
 */
export function defangObservable(raw: string): string {
  return raw
    .replace(/\[.\]/g, '.')
    .replace(/\(\.\)/g, '.')
    .replace(/hxxp:\/\//gi, 'http://')
    .replace(/hxxps:\/\//gi, 'https://')
    .replace(/\[:\]/g, ':')
    .trim();
}

/**
 * Deterministic IOC Normalization Result
 */
export interface NormalizedIoc {
  originalValue: string;
  normalizedValue: string;
  canonicalType: string;
  canonicalId: string;
  port?: number;
}

/**
 * Deterministic IOC normalizer
 */
export function normalizeThreatFoxIoc(rawIoc: string, rawType: string): NormalizedIoc {
  const originalValue = rawIoc.trim();
  const defanged = defangObservable(originalValue);

  switch (rawType) {
    case 'ip:port':
    case 'ip':
    case 'ipv4':
    case 'ip-src':
    case 'ip-dst': {
      let ip = defanged;
      let port: number | undefined;

      if (defanged.includes(':') && !defanged.includes('::')) {
        const parts = defanged.split(':');
        if (parts.length !== 2) {
          throw new Error(`Invalid ip:port format: '${rawIoc}'`);
        }
        ip = parts[0].trim();
        port = parseInt(parts[1].trim(), 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          throw new Error(`Invalid port number in '${rawIoc}'`);
        }
      }

      // IPv4 validation
      const octets = ip.split('.');
      if (octets.length !== 4 || !octets.every((o) => {
        const n = parseInt(o, 10);
        return n >= 0 && n <= 255 && o === String(n);
      })) {
        throw new Error(`Invalid IPv4 address in '${rawIoc}'`);
      }
      return {
        originalValue,
        normalizedValue: ip,
        canonicalType: 'IPV4',
        canonicalId: `ind_ip_${ip.replace(/\./g, '_')}`,
        port,
      };
    }
    case 'domain':
    case 'hostname': {
      let domain = defanged.toLowerCase();
      if (domain.endsWith('.')) {
        domain = domain.slice(0, -1);
      }
      if (!domain || domain.includes(' ') || !domain.includes('.')) {
        throw new Error(`Invalid domain format: '${rawIoc}'`);
      }
      return {
        originalValue,
        normalizedValue: domain,
        canonicalType: 'DOMAIN',
        canonicalId: `ind_dom_${domain.replace(/[^a-z0-9]/g, '_')}`,
      };
    }
    case 'url': {
      try {
        const parsedUrl = new URL(defanged);
        const normalized = parsedUrl.toString();
        const hash = normalized.toLowerCase();
        return {
          originalValue,
          normalizedValue: normalized,
          canonicalType: 'URL',
          canonicalId: `ind_url_${hash.replace(/[^a-z0-9]/g, '').substring(0, 32)}`,
        };
      } catch {
        throw new Error(`Invalid URL format: '${rawIoc}'`);
      }
    }
    case 'sha256':
    case 'sha256_hash': {
      const lower = defanged.toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(lower)) {
        throw new Error(`Invalid SHA-256 hash format: '${rawIoc}'`);
      }
      return {
        originalValue,
        normalizedValue: lower,
        canonicalType: 'FILE_HASH_SHA256',
        canonicalId: `ind_hsh_${lower.substring(0, 32)}`,
      };
    }
    case 'md5':
    case 'md5_hash': {
      const lower = defanged.toLowerCase();
      if (!/^[a-f0-9]{32}$/.test(lower)) {
        throw new Error(`Invalid MD5 hash format: '${rawIoc}'`);
      }
      return {
        originalValue,
        normalizedValue: lower,
        canonicalType: 'FILE_HASH_MD5',
        canonicalId: `ind_hsh_${lower}`,
      };
    }
    case 'sha1':
    case 'sha1_hash': {
      const lower = defanged.toLowerCase();
      if (!/^[a-f0-9]{40}$/.test(lower)) {
        throw new Error(`Invalid SHA-1 hash format: '${rawIoc}'`);
      }
      return {
        originalValue,
        normalizedValue: lower,
        canonicalType: 'FILE_HASH_SHA1',
        canonicalId: `ind_hsh_${lower}`,
      };
    }
    default:
      throw new Error(`UNSUPPORTED_IOC_TYPE: '${rawType}'`);
  }
}

/**
 * ThreatFox Ingestion Adapter (M2 — canonical domain model)
 *
 * ThreatFox is an infrastructure telemetry source. Its canonical role:
 *  - emit infrastructure Observations (SENSOR_TELEMETRY, DYNAMIC-kind evidence)
 *  - emit EvidenceRef-backed provenance
 *  - emit source-scoped UNRESOLVED FamilyCandidates for the malware labels it reports
 *
 * It NEVER:
 *  - creates Malware family entities
 *  - merges IOC identity with family identity (IOC ↔ candidate signal only)
 *  - resolves actor or campaign attribution (actor strings in tags stay inert text)
 *  - produces hardcoded HIGH/MEDIUM/LOW confidence
 */
export class ThreatFoxAdapter implements IngestionAdapter<ThreatFoxPayload> {
  public readonly sourceId = 'src_threatfox';
  public readonly authorityTier: AuthorityTier = 'TIER_2';
  public readonly defaultReliability: AdmiraltyReliability = 'B';
  public readonly parserVersion = '2.0.0-threatfox-canonical';

  /** Canonical emission channel (M2). Populated by `normalizeCanonical`. */
  public lastCanonicalPayload: CanonicalAdapterPayload | null = null;

  constructor(private readonly warninglist: Set<string> = DEFAULT_WARNINGLIST_INFRASTRUCTURE) {}

  public evaluateLicense(): LicenseComplianceStatus {
    // ThreatFox by Abuse.ch is freely available under CC0 (Public Domain)
    return 'INGEST_ALLOWED';
  }

  public parse(rawBytes: Uint8Array): ThreatFoxPayload {
    const text = new TextDecoder('utf-8').decode(rawBytes);
    let json: any;
    try {
      json = JSON.parse(text);
    } catch (e: any) {
      throw new Error(`PARSE_FAILED: Malformed ThreatFox JSON: ${e.message}`);
    }

    if (!json || typeof json !== 'object' || !Array.isArray(json.data)) {
      throw new Error('SCHEMA_UNKNOWN: Missing mandatory data array in ThreatFox feed');
    }

    return json as ThreatFoxPayload;
  }

  /**
   * Legacy-contract normalize: projects the canonical emission into the legacy
   * shape so the orchestrator contract remains functional during M2.
   * No Malware entities and no actor/campaign attribution are projected.
   */
  public async normalize(
    payload: ThreatFoxPayload,
    snapshot: SourceSnapshot
  ): Promise<AdapterNormalizationResult> {
    // Deterministic fail-closed accounting (rejected = invalid syntax/missing fields,
    // unsupported = unknown IOC type), computed directly from the raw records.
    let objectsUnsupported = 0;
    let objectsRejected = 0;
    for (const record of payload.data) {
      if (!record.ioc || !record.ioc_type || !record.id) {
        objectsRejected++;
        continue;
      }
      try {
        normalizeThreatFoxIoc(record.ioc, record.ioc_type);
      } catch (err: any) {
        if (err?.message?.startsWith('UNSUPPORTED_IOC_TYPE')) objectsUnsupported++;
        else objectsRejected++;
      }
    }

    const canonical = await this.normalizeCanonical(payload, snapshot);

    const entities: CandidateEntity[] = canonical.observations.map((o) => {
      const n = o.attributes as Record<string, any>;
      return {
        canonical_id: n.canonical_id as string,
        entity_type: 'Indicator',
        primary_name: n.normalized_value as string,
        aliases: n.original_value !== n.normalized_value ? [n.original_value as string] : [],
        external_ids: { threatfox_id: n.threatfox_id as string },
        first_seen: (n.first_seen as string) || undefined,
        last_seen: (n.last_seen as string) || undefined,
        properties: {
          indicator_type: n.indicator_type,
          original_value: n.original_value,
          normalized_value: n.normalized_value,
          port: n.port ?? undefined,
          threat_type: n.threat_type,
          warninglist_status: n.warninglist_status,
          valid_until: n.valid_until ?? undefined,
          tags: n.tags || [],
        },
      };
    });

    const evidence: CandidateEvidence[] = canonical.observations.flatMap((o) =>
      o.provenance.evidence_refs.map((ref) => ({
        evidence_id: ref.evidence_id,
        source_snapshot_id: ref.source_snapshot_id,
        evidence_type: 'TELEMETRY',
        statement: String(o.attributes.statement ?? o.observation_type),
        url: ref.url || '',
        published_at: ref.observed_at,
        retrieved_at: ref.retrieved_at,
        reliability: ref.reliability,
        credibility: ref.credibility,
        entity_scope: [o.artifact_id],
      }))
    );

    return {
      entities,
      evidence,
      relationships: [],
      claims: [],
      raw_record_count: payload.data.length,
      objects_supported: canonical.observations.length,
      objects_unsupported: objectsUnsupported,
      objects_rejected: objectsRejected,
      orphan_relationships: 0,
      warninglist_matches: canonical.observations.filter(
        (o) => o.attributes.warninglist_status === 'MATCH_CONTEXTUAL_CAUTION'
      ).length,
    };
  }

  /**
   * Canonical M2 emission. Deterministic, fail-closed on invalid IOCs.
   */
  public async normalizeCanonical(
    payload: ThreatFoxPayload,
    snapshot: SourceSnapshot
  ): Promise<CanonicalAdapterPayload> {
    const scope: IngestionStageScope = makeIngestionStageScope(
      snapshot.snapshot_id,
      this.sourceId,
      snapshot.retrieved_at
    );

    const observations: Observation[] = [];
    const familyCandidates = new Map<string, FamilyCandidate>();
    const infrastructureRelationships: InfrastructureRelationship[] = [];

    let warninglistMatches = 0;

    for (const record of payload.data) {
      if (!record.ioc || !record.ioc_type || !record.id) {
        continue;
      }

      let n: NormalizedIoc;
      try {
        n = normalizeThreatFoxIoc(record.ioc, record.ioc_type);
      } catch {
        continue; // accounted in normalize() legacy projection
      }

      const isWarninglistMatch = this.warninglist.has(n.normalizedValue);
      if (isWarninglistMatch) warninglistMatches++;

      const firstSeen = record.first_seen ? new Date(record.first_seen).toISOString() : undefined;
      const lastSeen = record.last_seen ? new Date(record.last_seen).toISOString() : undefined;

      // Half-life decay (valid_until) — source telemetry guidance, per IOC class
      let validUntil: string | undefined;
      if (lastSeen) {
        const lastSeenDate = new Date(lastSeen);
        if (n.canonicalType === 'IPV4' || n.canonicalType === 'DOMAIN') {
          validUntil = new Date(lastSeenDate.getTime() + 72 * 3600 * 1000).toISOString();
        } else if (n.canonicalType === 'URL') {
          validUntil = new Date(lastSeenDate.getTime() + 7 * 24 * 3600 * 1000).toISOString();
        }
      }

      // 1. EvidenceRef (DYNAMIC-kind: live infrastructure telemetry)
      const evRef = await buildEvidenceRef(
        scope,
        this.sourceId,
        this.authorityTier,
        this.defaultReliability,
        '2',
        'DYNAMIC',
        `${record.id}:${n.normalizedValue}`,
        record.reference || `https://threatfox.abuse.ch/ioc/${record.id}/`,
        firstSeen
      );
      const provenance = provenanceFromRefs([evRef], snapshot.retrieved_at);

      // 2. Infrastructure Observation — IOC identity stays DISAGGREGATED from family identity
      const observation: Observation = {
        observation_id: `obs_${evRef.evidence_id}`,
        analysis_run_id: scope.scope_id,
        artifact_id: n.canonicalId, // infrastructure indicator id; not a sample artifact
        source: 'SENSOR_TELEMETRY',
        observation_type: 'infrastructure_report',
        attributes: {
          statement: `ThreatFox report #${record.id}: ${n.normalizedValue} reported as ${record.threat_type || 'malicious'}${record.malware_printable ? ` associated with ${record.malware_printable}` : ''}. First seen: ${firstSeen || 'unknown'}. Last seen: ${lastSeen || 'unknown'}.`,
          canonical_id: n.canonicalId,
          indicator_type: n.canonicalType,
          original_value: n.originalValue,
          normalized_value: n.normalizedValue,
          port: n.port ?? null,
          threat_type: record.threat_type ?? null,
          threatfox_id: record.id,
          first_seen: firstSeen ?? null,
          last_seen: lastSeen ?? null,
          valid_until: validUntil ?? null,
          warninglist_status: isWarninglistMatch ? 'MATCH_CONTEXTUAL_CAUTION' : 'CLEAR',
          tags: (record.tags || []) as unknown as FormatAttributes[string],
        },
        observed_at: firstSeen,
        evidence_refs: [evRef],
        provenance,
      };
      observations.push(observation);

      // 3. Infrastructure relationship (source-asserted role; indicator ↔ malware label only)
      if (record.malware) {
        infrastructureRelationships.push({
          infrastructure_id: `inf_${evRef.evidence_id}`,
          analysis_run_id: scope.scope_id,
          artifact_id: n.canonicalId,
          role: record.threat_type === 'payload_delivery' ? 'PAYLOAD_DELIVERY' : 'C2',
          indicator_type:
            n.canonicalType === 'IPV4' ? 'IPV4' : n.canonicalType === 'DOMAIN' ? 'DOMAIN' : n.canonicalType === 'URL' ? 'URL' : 'OTHER',
          indicator_value: n.normalizedValue,
          status: 'SOURCE_REPORTED',
          evidence_refs: [evRef],
          evidence_kind: 'DYNAMIC',
          valid_from: firstSeen,
          provenance,
        });
      }

      // 4. Source-reported malware label → UNRESOLVED, source-scoped FamilyCandidate
      if (record.malware) {
        const label = record.malware_printable || record.malware;
        const candidateKey = record.malware.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const familyCandidateId = `fc_tf_${candidateKey}`;

        const signal: FamilySignal = {
          signal_id: `sig_${evRef.evidence_id}`,
          signal_type: 'threatfox_malware_label',
          signal_value: record.malware,
          supports_candidate: label,
          status: 'SOURCE_REPORTED',
          evidence_refs: [evRef],
          provenance,
        };

        const existing: FamilyCandidate | undefined = familyCandidates.get(familyCandidateId);
        if (existing) {
          existing.signals.push(signal);
        } else {
          familyCandidates.set(familyCandidateId, {
            family_candidate_id: familyCandidateId,
            analysis_run_id: scope.scope_id,
            artifact_id: n.canonicalId,
            candidate_family: label,
            signals: [signal],
            contradicting_signals: [],
            source_ids: [this.sourceId],
            confidence: {
              confidence_id: `conf_in_${familyCandidateId}`,
              analysis_run_id: scope.scope_id,
              signals: [
                {
                  signal_id: `sigcnt_${familyCandidateId}`,
                  signal_type: 'source_reported_signal_count',
                  score: 0.5, // neutral baseline for a single source-reported label
                  weight: 1,
                  basis: 'single source-reported malware label from ThreatFox telemetry; unverified',
                  provenance,
                },
              ],
              aggregate: 0.5,
              basis: ['single source-reported malware label attached to an IOC report'],
              uncertainty: {
                unassessed_dimensions: ['family_resolution', 'cross_source_corroboration'],
                contested_dimensions: [],
                limitations: ['label is source-reported; IOC association does not confirm family truth'],
              },
              provenance,
            },
            resolution_state: 'UNRESOLVED',
            provenance,
          });
        }
      }
    }

    const canonicalPayload: CanonicalAdapterPayload = {
      scope,
      artifacts: [], // ThreatFox reports infrastructure indicators, not sample artifacts
      observations,
      family_candidates: [...familyCandidates.values()],
      infrastructure_relationships: [...infrastructureRelationships.values()],
      conflicts: [],
    };

    this.lastCanonicalPayload = canonicalPayload;
    return canonicalPayload;
  }
}
