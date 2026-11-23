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
} from './contracts';
import { computeSha256Hex } from './cisaKevAdapter';

/**
 * Minimal STIX 2.1 Object contract for ATT&CK parsing
 */
export interface StixObject {
  id: string;
  type: string;
  name?: string;
  description?: string;
  created?: string;
  modified?: string;
  revoked?: boolean;
  x_mitre_deprecated?: boolean;
  x_mitre_version?: string;
  x_mitre_is_subtechnique?: boolean;
  x_mitre_platforms?: string[];
  x_mitre_aliases?: string[];
  aliases?: string[];
  external_references?: Array<{
    source_name?: string;
    external_id?: string;
    url?: string;
    description?: string;
  }>;
  kill_chain_phases?: Array<{
    kill_chain_name: string;
    phase_name: string;
  }>;
  // Relationship specific
  relationship_type?: string;
  source_ref?: string;
  target_ref?: string;
}

export interface StixBundle {
  type: 'bundle';
  id: string;
  objects: StixObject[];
}

export interface MitreAttackMetadata {
  datasetVersion: string;
  releaseDate?: string;
  objectCount: number;
}

/**
 * Universal ATT&CK ID Normalizer:
 * Validates Txxxx, Txxxx.xxx, Gxxxx, Sxxxx, Cxxxx, Mxxxx, DSxxxx
 */
export function normalizeMitreAttackId(rawId: string): string {
  const trimmed = rawId.trim().toUpperCase();
  const validPattern = /^(T[0-9]{4}(\.[0-9]{3})?|G[0-9]{4}|S[0-9]{4}|C[0-9]{4}|M[0-9]{4}|DS[0-9]{4})$/;
  if (!validPattern.test(trimmed)) {
    throw new Error(`Invalid MITRE ATT&CK identifier format: '${rawId}'`);
  }
  return trimmed;
}

/**
 * MITRE ATT&CK Enterprise Ingestion Adapter
 * Strictly adheres to the finalized ZAYRON-X SourceAdapter Contract.
 */
export class MitreAttackAdapter {
  public readonly sourceId = 'src_mitre_attack';
  public readonly authorityTier: AuthorityTier = 'TIER_0';
  public readonly defaultReliability: AdmiraltyReliability = 'A';
  public readonly parserVersion = '1.0.0-mitre-attack';

  /**
   * License evaluation: MITRE ATT&CK is licensed under Apache-2.0
   */
  public evaluateLicense(): LicenseComplianceStatus {
    return 'INGEST_ALLOWED';
  }

  /**
   * Parses raw STIX 2.1 bundle bytes with fail-closed validation
   */
  public parse(rawBytes: Uint8Array): StixBundle {
    const text = new TextDecoder('utf-8').decode(rawBytes);
    let json: any;
    try {
      json = JSON.parse(text);
    } catch (e: any) {
      throw new Error(`PARSE_FAILED: Malformed MITRE ATT&CK STIX JSON: ${e.message}`);
    }

    if (!json || typeof json !== 'object' || json.type !== 'bundle' || !Array.isArray(json.objects)) {
      throw new Error('SCHEMA_UNKNOWN: Missing or invalid STIX 2.1 bundle envelope');
    }

    return json as StixBundle;
  }

  /**
   * Dynamically extracts ATT&CK dataset version metadata without hardcoding
   */
  public extractMetadata(bundle: StixBundle): MitreAttackMetadata {
    let datasetVersion = 'UNKNOWN';
    let releaseDate: string | undefined;

    // 1. Inspect x-mitre-collection if present
    const collection = bundle.objects.find(
      (o) => o.type === 'x-mitre-collection' || (o.type as string) === 'collection'
    );
    if (collection) {
      if (collection.x_mitre_version) {
        datasetVersion = collection.x_mitre_version;
      }
      if (collection.modified) {
        releaseDate = collection.modified;
      }
    }

    // 2. Fallback to latest modified timestamp if collection version not found
    if (datasetVersion === 'UNKNOWN') {
      let latestModified = '';
      for (const obj of bundle.objects) {
        if (obj.modified && obj.modified > latestModified) {
          latestModified = obj.modified;
        }
      }
      if (latestModified) {
        datasetVersion = `rel-${latestModified.substring(0, 10)}`;
        releaseDate = latestModified;
      }
    }

    return {
      datasetVersion,
      releaseDate,
      objectCount: bundle.objects.length,
    };
  }

  /**
   * Normalizes parsed STIX bundle into canonical entities, directed relationships, claims, and evidence.
   */
  public async normalize(
    bundle: StixBundle,
    snapshot: SourceSnapshot
  ): Promise<AdapterNormalizationResult> {
    const metadata = this.extractMetadata(bundle);
    snapshot.version = metadata.datasetVersion;

    const entities: CandidateEntity[] = [];
    const evidence: CandidateEvidence[] = [];
    const relationships: CandidateRelationship[] = [];
    const claims: CandidateClaim[] = [];

    // Lookup index for resolving relationship endpoints: stix_id -> canonical_id
    const stixIdToCanonicalId = new Map<string, string>();
    const stixIdToType = new Map<string, string>();

    let objectsSupported = 0;
    let objectsUnsupported = 0;
    let objectsRejected = 0;
    let orphanRelationships = 0;

    // Supported Domain Objects
    const supportedTypes = new Set([
      'attack-pattern',
      'intrusion-set',
      'malware',
      'tool',
      'campaign',
      'course-of-action',
      'data-source',
    ]);

    // PASS 1: Process SDOs (Entities)
    for (const obj of bundle.objects) {
      if (obj.type === 'relationship') {
        continue; // Processed in Pass 2
      }

      if (!supportedTypes.has(obj.type)) {
        objectsUnsupported++;
        continue;
      }

      // Check required fields
      if (!obj.id || !obj.name) {
        objectsRejected++;
        continue;
      }

      // Extract ATT&CK external ID (e.g. T1059, G0016, S0002)
      const mitreRef = obj.external_references?.find(
        (ref) => ref.source_name === 'mitre-attack' || ref.source_name === 'mitre-enterprise-attack'
      );
      const attackId = mitreRef?.external_id ? normalizeMitreAttackId(mitreRef.external_id) : undefined;

      if (!attackId) {
        // Must have an official ATT&CK external ID for canonical resolution
        objectsRejected++;
        continue;
      }

      const canonicalId = this.formatCanonicalId(obj.type, attackId);
      stixIdToCanonicalId.set(obj.id, canonicalId);
      stixIdToType.set(obj.id, obj.type);

      // 1. Evidence Extraction (Layer 1)
      const evidenceUrl = mitreRef?.url || `https://attack.mitre.org/${obj.type}/${attackId}/`;
      const statement = `MITRE ATT&CK ${metadata.datasetVersion}: ${attackId} (${obj.name}). ${obj.description || ''}`.trim();
      const evidenceId = await computeSha256Hex(`${snapshot.snapshot_id}:${attackId}:${obj.modified || ''}`);

      const evidenceItem: CandidateEvidence = {
        evidence_id: evidenceId,
        source_snapshot_id: snapshot.snapshot_id,
        evidence_type: 'DATASET_RECORD',
        statement,
        url: evidenceUrl,
        published_at: obj.modified || obj.created,
        retrieved_at: snapshot.retrieved_at,
        reliability: 'A',
        credibility: '1',
        entity_scope: [canonicalId],
      };
      evidence.push(evidenceItem);

      // 2. Entity Mapping (Layer 2)
      const aliases = [
        ...(obj.aliases || []),
        ...(obj.x_mitre_aliases || []),
      ].filter((a) => a !== obj.name);

      const entityStatus = obj.revoked
        ? 'DEPRECATED'
        : obj.x_mitre_deprecated
        ? 'DEPRECATED'
        : 'ACTIVE';

      const entity: CandidateEntity = {
        canonical_id: canonicalId,
        entity_type: this.mapEntityType(obj.type),
        primary_name: obj.name,
        aliases: [...new Set(aliases)],
        external_ids: {
          mitre_attack: attackId,
          stix_id: obj.id,
        },
        first_seen: obj.created,
        last_seen: obj.modified,
        properties: {
          attack_id: attackId,
          stix_type: obj.type,
          is_subtechnique: Boolean(obj.x_mitre_is_subtechnique),
          platforms: obj.x_mitre_platforms || [],
          revoked: Boolean(obj.revoked),
          deprecated: Boolean(obj.x_mitre_deprecated),
          version: obj.x_mitre_version,
          status: entityStatus,
        },
      };
      entities.push(entity);
      objectsSupported++;
    }

    // PASS 2: Process SROs (Relationships)
    for (const obj of bundle.objects) {
      if (obj.type !== 'relationship') {
        continue;
      }

      if (!obj.source_ref || !obj.target_ref || !obj.relationship_type) {
        objectsRejected++;
        continue;
      }

      const sourceCanonicalId = stixIdToCanonicalId.get(obj.source_ref);
      const targetCanonicalId = stixIdToCanonicalId.get(obj.target_ref);

      // Graph Integrity Check: Endpoint presence
      if (!sourceCanonicalId || !targetCanonicalId) {
        orphanRelationships++;
        continue;
      }

      // Prevent semantically invalid self-referential loops
      if (sourceCanonicalId === targetCanonicalId) {
        objectsRejected++;
        continue;
      }

      const sourceType = stixIdToType.get(obj.source_ref)!;
      const targetType = stixIdToType.get(obj.target_ref)!;
      const canonicalVerb = this.mapRelationshipVerb(obj.relationship_type, sourceType, targetType);

      if (!canonicalVerb) {
        objectsUnsupported++;
        continue;
      }

      const relationshipId = await computeSha256Hex(
        `${sourceCanonicalId}:${canonicalVerb}:${targetCanonicalId}`
      );

      // Evidence for relationship if described
      let relEvidenceId = '';
      if (obj.description) {
        relEvidenceId = await computeSha256Hex(
          `${snapshot.snapshot_id}:${relationshipId}:${obj.modified || ''}`
        );
        evidence.push({
          evidence_id: relEvidenceId,
          source_snapshot_id: snapshot.snapshot_id,
          evidence_type: 'CURATED_KNOWLEDGE',
          statement: `ATT&CK Relationship: ${sourceCanonicalId} ${canonicalVerb} ${targetCanonicalId}. ${obj.description}`,
          url: `https://attack.mitre.org/`,
          published_at: obj.modified || obj.created,
          retrieved_at: snapshot.retrieved_at,
          reliability: 'A',
          credibility: '1',
          entity_scope: [sourceCanonicalId, targetCanonicalId],
        });
      }

      const relationship: CandidateRelationship = {
        relationship_id: relationshipId,
        source_entity_id: sourceCanonicalId,
        relationship_type: canonicalVerb,
        target_entity_id: targetCanonicalId,
        evidence_refs: relEvidenceId ? [relEvidenceId] : [],
        confidence: 'HIGH',
        valid_from: obj.created,
      };
      relationships.push(relationship);

      // Formulate explicit factual claim for key operational edges
      if (canonicalVerb === 'USES' || canonicalVerb === 'IMPLEMENTS' || canonicalVerb === 'MITIGATES') {
        const claimId = await computeSha256Hex(
          `${sourceCanonicalId}:${canonicalVerb}:${targetCanonicalId}`
        );
        claims.push({
          claim_id: claimId,
          domain: 'technique',
          subject_id: sourceCanonicalId,
          predicate: canonicalVerb,
          object_value: targetCanonicalId,
          statement: `MITRE ATT&CK asserts that ${sourceCanonicalId} ${canonicalVerb.toLowerCase()} ${targetCanonicalId}.`,
          status: 'CONFIRMED',
          evidence_refs: relEvidenceId ? [relEvidenceId] : [],
          confidence: 'HIGH',
        });
      }

      objectsSupported++;
    }

    return {
      entities,
      evidence,
      relationships,
      claims,
      raw_record_count: bundle.objects.length,
      objects_supported: objectsSupported,
      objects_unsupported: objectsUnsupported,
      objects_rejected: objectsRejected,
      orphan_relationships: orphanRelationships,
    };
  }

  private formatCanonicalId(stixType: string, attackId: string): string {
    const cleanId = attackId.toLowerCase().replace(/\./g, '_');
    switch (stixType) {
      case 'attack-pattern':
        return `tech_${cleanId}`;
      case 'intrusion-set':
        return `act_${cleanId}`;
      case 'malware':
        return `mal_${cleanId}`;
      case 'tool':
        return `tool_${cleanId}`;
      case 'campaign':
        return `cam_${cleanId}`;
      case 'course-of-action':
        return `mit_${cleanId}`;
      case 'data-source':
        return `ds_${cleanId}`;
      default:
        return `mitre_${cleanId}`;
    }
  }

  private mapEntityType(stixType: string): string {
    switch (stixType) {
      case 'attack-pattern':
        return 'Technique';
      case 'intrusion-set':
        return 'ThreatActor';
      case 'malware':
        return 'Malware';
      case 'tool':
        return 'Tool';
      case 'campaign':
        return 'Campaign';
      case 'course-of-action':
        return 'Mitigation';
      case 'data-source':
        return 'DataSource';
      default:
        return 'Entity';
    }
  }

  private mapRelationshipVerb(
    stixVerb: string,
    sourceType: string,
    targetType: string
  ): string | null {
    if (stixVerb === 'subtechnique-of') {
      return 'SUBTECHNIQUE_OF';
    }
    if (stixVerb === 'mitigates') {
      return 'MITIGATES';
    }
    if (stixVerb === 'attributed-to') {
      return 'ATTRIBUTED_TO';
    }
    if (stixVerb === 'uses') {
      if (sourceType === 'intrusion-set' || sourceType === 'campaign') {
        return 'USES';
      }
      if (sourceType === 'malware' || sourceType === 'tool') {
        return 'IMPLEMENTS';
      }
      return 'USES';
    }
    return null;
  }
}
