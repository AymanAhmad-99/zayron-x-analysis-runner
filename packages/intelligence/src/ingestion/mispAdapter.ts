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
import { normalizeThreatFoxIoc, NormalizedIoc, defangObservable } from './threatFoxAdapter';

export interface MispTag {
  name: string;
  colour?: string;
  exportable?: boolean;
}

export interface MispSighting {
  id?: string;
  uuid?: string;
  attribute_uuid?: string;
  date_sighting?: string | number;
  source?: string;
  type?: string;
}

export interface MispAttribute {
  id?: string | number;
  uuid: string;
  event_id?: string | number;
  category: string;
  type: string;
  value: string;
  to_ids: boolean;
  timestamp?: string | number;
  comment?: string;
  distribution?: string | number;
  Tag?: MispTag[];
  Sighting?: MispSighting[];
  object_relation?: string;
}

export interface MispObjectReference {
  id?: string;
  uuid?: string;
  timestamp?: string | number;
  relationship_type: string;
  referenced_uuid: string;
  comment?: string;
}

export interface MispObject {
  id?: string | number;
  uuid: string;
  name: string;
  meta_category?: string;
  description?: string;
  template_uuid?: string;
  template_version?: string;
  timestamp?: string | number;
  distribution?: string | number;
  sharing_group_id?: string | number;
  comment?: string;
  Attribute?: MispAttribute[];
  ObjectReference?: MispObjectReference[];
}

export interface MispGalaxyCluster {
  id?: string;
  uuid: string;
  type?: string;
  value: string;
  tag_name?: string;
  description?: string;
  source?: string;
  authors?: string[];
  version?: string;
  synonyms?: string[];
}

export interface MispGalaxy {
  uuid?: string;
  name: string;
  type?: string;
  description?: string;
  version?: string;
  GalaxyCluster?: MispGalaxyCluster[];
}

export interface MispEvent {
  id?: string | number;
  uuid: string;
  info: string;
  date?: string;
  timestamp?: string | number;
  published?: boolean;
  analysis?: string | number;
  threat_level_id?: string | number;
  distribution?: string | number;
  org_id?: string | number;
  orgc_id?: string | number;
  Attribute?: MispAttribute[];
  Object?: MispObject[];
  Tag?: MispTag[];
  Galaxy?: MispGalaxy[];
}

export interface MispRootPayload {
  response?: Array<{ Event: MispEvent }>;
  Event?: MispEvent;
}

/**
 * Standard warninglist infrastructure
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
 * Maps MISP relationship strings to canonical ZAYRON-X semantic verbs
 */
export function normalizeMispRelationshipVerb(rawVerb: string): string {
  const clean = rawVerb.trim().toLowerCase();
  switch (clean) {
    case 'drops':
    case 'dropped-by':
      return 'DROPPED';
    case 'communicates-with':
    case 'connects-to':
    case 'connected-to':
      return 'COMMUNICATES_WITH';
    case 'executes':
    case 'executed-by':
      return 'EXECUTES';
    case 'contains':
    case 'includes':
      return 'CONTAINS';
    case 'associated-with':
    case 'relates-to':
      return 'ASSOCIATED_WITH';
    case 'targets':
      return 'TARGETS';
    case 'implements':
    case 'uses':
      return 'IMPLEMENTS';
    default:
      return 'RELATED_TO';
  }
}

/**
 * MISP Multi-Object CTI Ingestion Adapter
 */
export class MispAdapter implements IngestionAdapter<MispRootPayload> {
  public readonly sourceId = 'src_misp';
  public readonly authorityTier: AuthorityTier = 'TIER_2';
  public readonly defaultReliability: AdmiraltyReliability = 'B';
  public readonly parserVersion = '1.0.0-misp';

  constructor(private readonly warninglist: Set<string> = DEFAULT_WARNINGLIST_INFRASTRUCTURE) {}

  public evaluateLicense(): LicenseComplianceStatus {
    // MISP format/schema is open-source (CC0/BSD-compatible data sharing)
    return 'INGEST_ALLOWED';
  }

  public parse(rawBytes: Uint8Array): MispRootPayload {
    const text = new TextDecoder('utf-8').decode(rawBytes);
    let json: any;
    try {
      json = JSON.parse(text);
    } catch (e: any) {
      throw new Error(`PARSE_FAILED: Malformed MISP JSON: ${e.message}`);
    }

    if (!json || typeof json !== 'object') {
      throw new Error('SCHEMA_UNKNOWN: Invalid MISP root container');
    }

    // Support both { Event: {...} } and { response: [ { Event: {...} } ] }
    if (!json.Event && (!Array.isArray(json.response) || json.response.length === 0 || !json.response[0].Event)) {
      throw new Error('SCHEMA_UNKNOWN: Missing mandatory Event container in MISP payload');
    }

    return json as MispRootPayload;
  }

  public async normalize(
    payload: MispRootPayload,
    snapshot: SourceSnapshot
  ): Promise<AdapterNormalizationResult> {
    const event: MispEvent = payload.Event || payload.response![0].Event;

    if (!event.uuid) {
      throw new Error('SCHEMA_UNKNOWN: MISP Event missing mandatory UUID');
    }

    const entities: CandidateEntity[] = [];
    const evidence: CandidateEvidence[] = [];
    const relationships: CandidateRelationship[] = [];
    const claims: CandidateClaim[] = [];

    // Lookup index for entities by UUID and by canonical_id
    const entitiesByUuid = new Map<string, CandidateEntity>();
    const entitiesById = new Map<string, CandidateEntity>();

    let objectsSupported = 0;
    let objectsUnsupported = 0;
    let objectsRejected = 0;
    let warninglistMatches = 0;
    let orphanRelationships = 0;

    // Format event timestamps
    const eventPublishedAt = event.date
      ? new Date(event.date).toISOString()
      : event.timestamp
      ? new Date(Number(event.timestamp) * 1000).toISOString()
      : undefined;

    // 1. Layer 1: Event-Level Evidence (Envelope)
    const eventEvidenceId = await computeSha256Hex(
      `${snapshot.snapshot_id}:event:${event.uuid}`
    );
    const eventEvidence: CandidateEvidence = {
      evidence_id: eventEvidenceId,
      source_snapshot_id: snapshot.snapshot_id,
      evidence_type: 'SECURITY_REPORT',
      statement: `MISP Event #${event.id || 'N/A'} (UUID: ${event.uuid}): "${event.info || 'No Title'}". Published: ${eventPublishedAt || 'N/A'}.`,
      url: `https://misp.local/events/view/${event.id || event.uuid}`,
      published_at: eventPublishedAt,
      retrieved_at: snapshot.retrieved_at,
      reliability: this.defaultReliability,
      credibility: '2',
      entity_scope: [`misp_event_${event.uuid}`],
    };
    evidence.push(eventEvidence);
    objectsSupported++;

    // Helper to register entity in lookups
    const registerEntity = (ent: CandidateEntity, uuid?: string) => {
      entitiesById.set(ent.canonical_id, ent);
      if (uuid) {
        entitiesByUuid.set(uuid, ent);
      }
    };

    // 2. Process Galaxies & Clusters (ThreatActor, Malware, Campaign context)
    if (Array.isArray(event.Galaxy)) {
      for (const galaxy of event.Galaxy) {
        if (!Array.isArray(galaxy.GalaxyCluster)) continue;

        for (const cluster of galaxy.GalaxyCluster) {
          if (!cluster.uuid || !cluster.value) continue;

          const gType = (galaxy.type || cluster.type || '').toLowerCase();
          let entityType = 'ContextCluster';
          let canonicalPrefix = 'clu_misp_';

          if (gType.includes('threat-actor') || gType.includes('actor') || gType.includes('mitre-attack-pattern')) {
            entityType = 'ThreatActor';
            canonicalPrefix = 'act_misp_';
          } else if (gType.includes('malware') || gType.includes('tool')) {
            entityType = 'Malware';
            canonicalPrefix = 'mal_misp_';
          } else if (gType.includes('campaign')) {
            entityType = 'Campaign';
            canonicalPrefix = 'cam_misp_';
          }

          const cleanName = cluster.value.trim();
          const clusterCanonicalId = `${canonicalPrefix}${cluster.uuid.replace(/-/g, '_')}`;

          const clusterEntity: CandidateEntity = {
            canonical_id: clusterCanonicalId,
            entity_type: entityType,
            primary_name: cleanName,
            aliases: Array.isArray(cluster.synonyms) ? cluster.synonyms : [],
            external_ids: {
              misp_cluster_uuid: cluster.uuid,
              ...(cluster.tag_name ? { misp_tag_name: cluster.tag_name } : {}),
            },
            properties: {
              source_galaxy: galaxy.name,
              source_galaxy_type: galaxy.type,
              description: cluster.description,
              authors: cluster.authors,
            },
          };

          registerEntity(clusterEntity, cluster.uuid);
          objectsSupported++;

          // Evidence for Galaxy Cluster
          const galaxyEvidenceId = await computeSha256Hex(
            `${snapshot.snapshot_id}:galaxy:${cluster.uuid}`
          );
          evidence.push({
            evidence_id: galaxyEvidenceId,
            source_snapshot_id: snapshot.snapshot_id,
            evidence_type: 'TAXONOMY_ASSERTION',
            statement: `MISP Galaxy Cluster (${galaxy.name}): ${cleanName} (UUID: ${cluster.uuid}). ${cluster.description || ''}`.trim(),
            url: cluster.source || eventEvidence.url,
            retrieved_at: snapshot.retrieved_at,
            reliability: 'B',
            credibility: '2',
            entity_scope: [clusterCanonicalId],
          });
        }
      }
    }

    // 3. Process Standalone MISP Attributes
    const processAttribute = async (
      attr: MispAttribute,
      parentObjectUuid?: string
    ): Promise<CandidateEntity | null> => {
      if (!attr.value || !attr.type || !attr.uuid) {
        objectsRejected++;
        return null;
      }

      // Check IOC normalization
      let normIoc: NormalizedIoc;
      try {
        normIoc = normalizeThreatFoxIoc(attr.value, attr.type);
      } catch (err: any) {
        if (err.message.startsWith('UNSUPPORTED_IOC_TYPE')) {
          // Unsupported observable: preserve in Layer 1 Evidence without canonical entity
          objectsUnsupported++;
          const unsuppEvId = await computeSha256Hex(`${snapshot.snapshot_id}:attr_unsupp:${attr.uuid}`);
          evidence.push({
            evidence_id: unsuppEvId,
            source_snapshot_id: snapshot.snapshot_id,
            evidence_type: 'UNKNOWN_OBSERVABLE',
            statement: `MISP Attribute [${attr.category} / ${attr.type}]: "${attr.value}". Comment: ${attr.comment || 'None'}`,
            url: eventEvidence.url,
            retrieved_at: snapshot.retrieved_at,
            reliability: 'C',
            credibility: '3',
            entity_scope: [`misp_attr_${attr.uuid}`],
          });
        } else {
          // Bad syntax -> fail closed rejection
          objectsRejected++;
        }
        return null;
      }

      // Warninglist check
      const isWarn = this.warninglist.has(normIoc.normalizedValue);
      if (isWarn) {
        warninglistMatches++;
      }

      const attrTimestamp = attr.timestamp
        ? new Date(Number(attr.timestamp) * 1000).toISOString()
        : eventPublishedAt;

      // Extract sightings count if present
      const sightingCount = Array.isArray(attr.Sighting) ? attr.Sighting.length : 0;

      // Evidence for attribute
      const attrEvidenceId = await computeSha256Hex(
        `${snapshot.snapshot_id}:attr:${attr.uuid}`
      );
      evidence.push({
        evidence_id: attrEvidenceId,
        source_snapshot_id: snapshot.snapshot_id,
        evidence_type: 'OBSERVATION',
        statement: `MISP Attribute #${attr.id || 'N/A'} (UUID: ${attr.uuid}): ${normIoc.normalizedValue} [${attr.category}/${attr.type}]. To_IDS: ${attr.to_ids}. Comment: ${attr.comment || 'None'}.`,
        url: eventEvidence.url,
        published_at: attrTimestamp,
        retrieved_at: snapshot.retrieved_at,
        reliability: 'B',
        credibility: '2',
        entity_scope: [normIoc.canonicalId],
      });

      // Indicator Entity
      let indicator = entitiesById.get(normIoc.canonicalId);
      if (!indicator) {
        indicator = {
          canonical_id: normIoc.canonicalId,
          entity_type: 'Indicator',
          primary_name: normIoc.normalizedValue,
          aliases: attr.value !== normIoc.normalizedValue ? [attr.value] : [],
          external_ids: {
            misp_attribute_uuid: attr.uuid,
            ...(parentObjectUuid ? { misp_parent_object_uuid: parentObjectUuid } : {}),
          },
          first_seen: attrTimestamp,
          last_seen: attrTimestamp,
          properties: {
            indicator_type: normIoc.canonicalType,
            original_value: normIoc.originalValue,
            normalized_value: normIoc.normalizedValue,
            category: attr.category,
            to_ids: attr.to_ids,
            warninglist_status: isWarn ? 'MATCH_CONTEXTUAL_CAUTION' : 'CLEAR',
            sighting_count: sightingCount,
            tags: Array.isArray(attr.Tag) ? attr.Tag.map((t) => t.name) : [],
          },
        };
        registerEntity(indicator, attr.uuid);
      } else {
        // Multi-observation / multi-attribute deduplication: update last_seen if newer
        if (attrTimestamp) {
          const curLast = indicator.last_seen ? new Date(indicator.last_seen).getTime() : 0;
          const incLast = new Date(attrTimestamp).getTime();
          if (incLast > curLast) {
            indicator.last_seen = attrTimestamp;
          }
        }
        if (sightingCount > 0) {
          const prevSightings = (indicator.properties.sighting_count as number) || 0;
          indicator.properties.sighting_count = prevSightings + sightingCount;
        }
        // Also map UUID to this indicator for relationship traversal
        entitiesByUuid.set(attr.uuid, indicator);
      }

      // Process Sightings for this attribute
      if (Array.isArray(attr.Sighting)) {
        for (const s of attr.Sighting) {
          const sUuid = s.uuid || s.id || `${attr.uuid}_sighting_${Math.random()}`;
          const sDate = s.date_sighting
            ? new Date(Number(s.date_sighting) * 1000).toISOString()
            : snapshot.retrieved_at;

          const sightingEvidenceId = await computeSha256Hex(
            `${snapshot.snapshot_id}:sighting:${sUuid}`
          );

          evidence.push({
            evidence_id: sightingEvidenceId,
            source_snapshot_id: snapshot.snapshot_id,
            evidence_type: 'SIGHTING',
            statement: `Sighting witnessed for ${normIoc.normalizedValue} by sensor/source: ${s.source || 'Anonymous'}. Witnessed at: ${sDate}.`,
            url: eventEvidence.url,
            published_at: sDate,
            retrieved_at: snapshot.retrieved_at,
            reliability: 'A',
            credibility: '1',
            entity_scope: [normIoc.canonicalId],
          });

          // Bump last_seen if sighting is newer
          const curLast = indicator.last_seen ? new Date(indicator.last_seen).getTime() : 0;
          const sTime = new Date(sDate).getTime();
          if (sTime > curLast) {
            indicator.last_seen = sDate;
          }
        }
      }

      objectsSupported++;
      return indicator;
    };

    if (Array.isArray(event.Attribute)) {
      for (const attr of event.Attribute) {
        await processAttribute(attr);
      }
    }

    // 4. Process MISP Objects (e.g. file, network-connection, malware)
    const pendingRelationships: Array<{
      sourceUuid: string;
      targetUuid: string;
      relVerb: string;
      evidenceStatement: string;
    }> = [];

    if (Array.isArray(event.Object)) {
      for (const obj of event.Object) {
        if (!obj.uuid || !obj.name) {
          objectsRejected++;
          continue;
        }

        // Dedicated malware object mapping
        if (obj.name.toLowerCase() === 'malware') {
          const nameAttr = obj.Attribute?.find((a) => a.object_relation === 'name' || a.type === 'text');
          const malName = nameAttr?.value || obj.comment || `Malware ${obj.uuid.substring(0, 8)}`;
          const malCanonicalId = `mal_misp_${obj.uuid.replace(/-/g, '_')}`;

          const malwareEntity: CandidateEntity = {
            canonical_id: malCanonicalId,
            entity_type: 'Malware',
            primary_name: malName,
            aliases: [],
            external_ids: {
              misp_object_uuid: obj.uuid,
            },
            properties: {
              template_name: obj.name,
              template_uuid: obj.template_uuid,
              comment: obj.comment,
            },
          };
          registerEntity(malwareEntity, obj.uuid);
          objectsSupported++;

          // Malware object evidence
          const malEvId = await computeSha256Hex(`${snapshot.snapshot_id}:obj_mal:${obj.uuid}`);
          evidence.push({
            evidence_id: malEvId,
            source_snapshot_id: snapshot.snapshot_id,
            evidence_type: 'THREAT_REPRESENTATION',
            statement: `MISP Malware Object (UUID: ${obj.uuid}): ${malName}`,
            url: eventEvidence.url,
            retrieved_at: snapshot.retrieved_at,
            reliability: 'B',
            credibility: '2',
            entity_scope: [malCanonicalId],
          });
        }

        // Process child attributes of the object
        let primaryChildIndicator: CandidateEntity | null = null;
        if (Array.isArray(obj.Attribute)) {
          for (const attr of obj.Attribute) {
            const childInd = await processAttribute(attr, obj.uuid);
            if (childInd && !primaryChildIndicator) {
              primaryChildIndicator = childInd;
            }
          }
        }

        // If the object is not a malware entity, map its UUID to its primary child indicator
        if (!entitiesByUuid.has(obj.uuid) && primaryChildIndicator) {
          entitiesByUuid.set(obj.uuid, primaryChildIndicator);
        }

        // Collect Object References (Relationships)
        if (Array.isArray(obj.ObjectReference)) {
          for (const ref of obj.ObjectReference) {
            if (!ref.referenced_uuid || !ref.relationship_type) continue;
            pendingRelationships.push({
              sourceUuid: obj.uuid,
              targetUuid: ref.referenced_uuid,
              relVerb: normalizeMispRelationshipVerb(ref.relationship_type),
              evidenceStatement: `MISP Object Reference (${ref.relationship_type}) from ${obj.uuid} to ${ref.referenced_uuid}. Comment: ${ref.comment || 'None'}`,
            });
          }
        }
      }
    }

    // 5. Graph Integrity & Relationship Resolution
    for (const pending of pendingRelationships) {
      const sourceEntity = entitiesByUuid.get(pending.sourceUuid);
      const targetEntity = entitiesByUuid.get(pending.targetUuid);

      // Strict Fail-Closed Check for Orphan Relationships
      if (!sourceEntity || !targetEntity) {
        orphanRelationships++;
        continue;
      }

      // Avoid self-referential cycles
      if (sourceEntity.canonical_id === targetEntity.canonical_id) {
        continue;
      }

      const relId = await computeSha256Hex(
        `${snapshot.snapshot_id}:${sourceEntity.canonical_id}:${pending.relVerb}:${targetEntity.canonical_id}`
      );

      // Evidence for relationship
      const relEvidenceId = await computeSha256Hex(`${snapshot.snapshot_id}:rel_ev:${relId}`);
      evidence.push({
        evidence_id: relEvidenceId,
        source_snapshot_id: snapshot.snapshot_id,
        evidence_type: 'RELATIONSHIP_ASSERTION',
        statement: pending.evidenceStatement,
        url: eventEvidence.url,
        retrieved_at: snapshot.retrieved_at,
        reliability: 'B',
        credibility: '2',
        entity_scope: [sourceEntity.canonical_id, targetEntity.canonical_id],
      });

      relationships.push({
        relationship_id: relId,
        source_entity_id: sourceEntity.canonical_id,
        relationship_type: pending.relVerb,
        target_entity_id: targetEntity.canonical_id,
        evidence_refs: [relEvidenceId],
        confidence: 'HIGH',
        valid_from: eventPublishedAt,
      });

      // Epistemic Claim
      const claimId = await computeSha256Hex(
        `claim:${sourceEntity.canonical_id}:${pending.relVerb}:${targetEntity.canonical_id}`
      );
      claims.push({
        claim_id: claimId,
        domain: 'cti',
        subject_id: sourceEntity.canonical_id,
        predicate: pending.relVerb,
        object_value: targetEntity.canonical_id,
        statement: `${sourceEntity.primary_name} ${pending.relVerb} ${targetEntity.primary_name} according to MISP Event #${event.id || event.uuid}.`,
        status: 'REPORTED',
        evidence_refs: [relEvidenceId],
        confidence: 'HIGH',
      });
    }

    // Collect deduplicated entities
    entities.push(...entitiesById.values());

    return {
      entities,
      evidence,
      relationships,
      claims,
      raw_record_count:
        1 +
        (event.Attribute?.length || 0) +
        (event.Object?.length || 0) +
        (event.Galaxy?.length || 0),
      objects_supported: objectsSupported,
      objects_unsupported: objectsUnsupported,
      objects_rejected: objectsRejected,
      orphan_relationships: orphanRelationships,
      warninglist_matches: warninglistMatches,
    };
  }
}
