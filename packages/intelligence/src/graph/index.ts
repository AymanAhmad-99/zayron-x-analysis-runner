/**
 * ZAYRON-X Intelligence Graph Correlation Engine
 * Extracts and validates typed relationships between entities based on verifiable evidence.
 */

import { resolveActor, resolveMalware, resolveVulnerability, resolveIOC } from '../resolution';
import { lookupTTP } from '../ttps';

export interface ExtractedRelation {
  id: string;
  source_entity_type: 'event' | 'actor' | 'malware' | 'vulnerability' | 'ioc' | 'campaign';
  source_entity_id: string;
  target_entity_type: 'actor' | 'malware' | 'vulnerability' | 'ioc' | 'ttp' | 'campaign' | 'evidence';
  target_entity_id: string;
  relation_type:
    | 'EVENT_MENTIONS_ACTOR'
    | 'EVENT_MENTIONS_MALWARE'
    | 'EVENT_MENTIONS_VULNERABILITY'
    | 'EVENT_CONTAINS_IOC'
    | 'EVENT_USES_TTP'
    | 'ACTOR_USES_MALWARE'
    | 'IOC_ASSOCIATED_WITH_ACTOR'
    | 'IOC_ASSOCIATED_WITH_MALWARE'
    | 'VULNERABILITY_ASSOCIATED_WITH_MALWARE'
    | 'EVENT_SUPPORTED_BY_EVIDENCE'
    | 'ACTOR_CONDUCTS_CAMPAIGN'
    | 'CAMPAIGN_EXPLOITS_VULNERABILITY'
    | 'CAMPAIGN_USES_TTP';
  confidence: number;
  provenance?: string;
}

export interface GraphCorrelationInput {
  eventId: string;
  evidenceId: string;
  actors: string[];
  malware: string[];
  cves: string[];
  ipv4s: string[];
  sha256s: string[];
  ttps: string[];
  confidence: number;
}

/**
 * Derives verified graph relationships from an intelligence event and its extracted entities.
 */
export function extractGraphRelations(input: GraphCorrelationInput): ExtractedRelation[] {
  const relations: ExtractedRelation[] = [];
  const { eventId, evidenceId, confidence } = input;

  // 1. Link Event to Evidence
  relations.push({
    id: `rel_${crypto.randomUUID().slice(0, 12)}`,
    source_entity_type: 'event',
    source_entity_id: eventId,
    target_entity_type: 'evidence',
    target_entity_id: evidenceId,
    relation_type: 'EVENT_SUPPORTED_BY_EVIDENCE',
    confidence: 1.0,
  });

  const resolvedActorObjects = input.actors
    .map(resolveActor)
    .filter((a): a is NonNullable<typeof a> => a !== null);

  const resolvedMalwareObjects = input.malware
    .map(resolveMalware)
    .filter((m): m is NonNullable<typeof m> => m !== null);

  const resolvedCVEs = input.cves
    .map(resolveVulnerability)
    .filter((c): c is string => c !== null);

  // 2. Link Event to Resolved Entities
  for (const actor of resolvedActorObjects) {
    relations.push({
      id: `rel_${crypto.randomUUID().slice(0, 12)}`,
      source_entity_type: 'event',
      source_entity_id: eventId,
      target_entity_type: 'actor',
      target_entity_id: actor.id,
      relation_type: 'EVENT_MENTIONS_ACTOR',
      confidence,
    });
  }

  for (const mw of resolvedMalwareObjects) {
    relations.push({
      id: `rel_${crypto.randomUUID().slice(0, 12)}`,
      source_entity_type: 'event',
      source_entity_id: eventId,
      target_entity_type: 'malware',
      target_entity_id: mw.id,
      relation_type: 'EVENT_MENTIONS_MALWARE',
      confidence,
    });
  }

  for (const cve of resolvedCVEs) {
    const cveDbId = `vuln_${cve.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    relations.push({
      id: `rel_${crypto.randomUUID().slice(0, 12)}`,
      source_entity_type: 'event',
      source_entity_id: eventId,
      target_entity_type: 'vulnerability',
      target_entity_id: cveDbId,
      relation_type: 'EVENT_MENTIONS_VULNERABILITY',
      confidence,
    });
  }

  for (const ttp of input.ttps) {
    relations.push({
      id: `rel_${crypto.randomUUID().slice(0, 12)}`,
      source_entity_type: 'event',
      source_entity_id: eventId,
      target_entity_type: 'ttp',
      target_entity_id: ttp.toUpperCase(),
      relation_type: 'EVENT_USES_TTP',
      confidence,
    });
  }

  // 3. Inter-Entity Correlations within the same verified event
  // ACTOR_USES_MALWARE
  for (const actor of resolvedActorObjects) {
    for (const mw of resolvedMalwareObjects) {
      relations.push({
        id: `rel_${crypto.randomUUID().slice(0, 12)}`,
        source_entity_type: 'actor',
        source_entity_id: actor.id,
        target_entity_type: 'malware',
        target_entity_id: mw.id,
        relation_type: 'ACTOR_USES_MALWARE',
        confidence: Math.min(confidence, 0.95),
      });
    }
  }

  // VULNERABILITY_ASSOCIATED_WITH_MALWARE
  for (const cve of resolvedCVEs) {
    const cveDbId = `vuln_${cve.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    for (const mw of resolvedMalwareObjects) {
      relations.push({
        id: `rel_${crypto.randomUUID().slice(0, 12)}`,
        source_entity_type: 'vulnerability',
        source_entity_id: cveDbId,
        target_entity_type: 'malware',
        target_entity_id: mw.id,
        relation_type: 'VULNERABILITY_ASSOCIATED_WITH_MALWARE',
        confidence: Math.min(confidence, 0.9),
      });
    }
  }

  return relations;
}
