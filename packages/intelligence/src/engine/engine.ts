import type { CanonicalEntity, Claim, Conflict, Evidence, FieldState, IntelligenceDossier, SourceObservation } from './types';

const sha = (value: string) => { let h = 2166136261; for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(16).padStart(8, '0'); };
const id = (...parts: string[]) => `${parts.join(':').toLowerCase().replace(/[^a-z0-9:_-]/g, '-')}:${sha(parts.join('|'))}`;
const now = () => new Date().toISOString();

export function observe(input: Omit<SourceObservation, 'observationId'>): SourceObservation { return { ...input, observationId: id('obs', input.sourceId, input.artifactId, input.externalId) }; }

export function resolveVulnerability(observations: SourceObservation[]): CanonicalEntity {
  const identifiers = observations.flatMap((o) => Object.entries(o.fields).filter(([key, value]) => /cve|ghsa|osv|advisory|kev/i.test(key) && value != null).map(([namespace, value]) => ({ namespace, value: String(value), sourceId: o.sourceId })));
  const unique = [...new Map(identifiers.map((x) => [`${x.namespace}:${x.value}`.toLowerCase(), x])).values()];
  const cve = unique.find((x) => x.namespace.toLowerCase().includes('cve'))?.value;
  const entityId = id('vulnerability', cve || unique[0]?.value || observations[0]?.externalId || 'unresolved');
  return { entityId, entityType: 'VULNERABILITY', identifiers: unique, resolution: cve || unique.length ? 'HIGH_CONFIDENCE_MATCH' : 'UNRESOLVED' };
}

export function evidenceFor(entity: CanonicalEntity, observations: SourceObservation[]): Evidence[] {
  return observations.flatMap((o) => Object.entries(o.fields).filter(([, value]) => value !== null && value !== undefined).map(([type, value]) => ({ evidenceId: id('evidence', o.observationId, type), sourceId: o.sourceId, artifactId: o.artifactId, entityId: entity.entityId, evidenceType: type.toUpperCase(), contentReference: `${o.rawReference}#${type}`, observedAt: o.observedAt, collectedAt: now(), confidence: typeof value === 'boolean' ? 1 : 0.7, sourceFamily: o.sourceFamily })));
}

export function claimsFor(entity: CanonicalEntity, evidence: Evidence[], observations: SourceObservation[]): Claim[] {
  const grouped = new Map<string, Array<{ value: string; evidence: Evidence; sourceId: string }>>();
  for (const o of observations) for (const [type, value] of Object.entries(o.fields)) if (value !== null && value !== undefined) { const e = evidence.find((x) => x.sourceId === o.sourceId && x.evidenceType === type.toUpperCase()); if (e) grouped.set(type, [...(grouped.get(type) || []), { value: String(value), evidence: e, sourceId: o.sourceId }]); }
  return [...grouped.entries()].map(([type, items]) => { const values = [...new Set(items.map((x) => x.value))]; const conflicted = values.length > 1; const independent = new Set(items.map((x) => x.evidence.sourceFamily || x.sourceId)).size; const confidence = Math.min(0.99, (conflicted ? 0.45 : 0.65) + Math.min(0.2, (independent - 1) * 0.1)); return { claimId: id('claim', entity.entityId, type, values.join('|')), entityId: entity.entityId, claimType: type, value: values.join(' | '), claimClass: independent > 1 ? 'SOURCE_DERIVED' : 'SOURCE_DERIVED', status: conflicted ? 'CONFLICTED' : independent > 1 ? 'CORROBORATED' : 'SOURCE_REPORTED', confidence, supportingEvidence: items.map((x) => x.evidence.evidenceId), conflictingEvidence: conflicted ? items.map((x) => x.evidence.evidenceId) : [], sourceScope: items.map((x) => x.sourceId), createdAt: now() }; });
}

export function detectConflicts(entityId: string, claims: Claim[]): Conflict[] { return claims.filter((c) => c.status === 'CONFLICTED').map((c) => ({ conflictId: id('conflict', c.claimId), entityId, claimType: c.claimType, claims: [c.claimId], evidence: [...c.supportingEvidence], resolutionStatus: 'OPEN' })); }

const field = (state: FieldState, value: string, claimIds: string[] = []) => ({ state, value, claimIds });
export function buildDossier(entity: CanonicalEntity, claims: Claim[], conflicts: Conflict[]): IntelligenceDossier {
  const get = (type: string) => claims.find((c) => c.claimType.toLowerCase() === type.toLowerCase());
  const severity = get('severity'); const product = get('affected_product'); const remediation = get('remediation');
  const threat = get('exploitation') || get('kev_status'); const unknowns = ['observed exploitation', 'actor attribution'].filter((x) => !claims.some((c) => c.claimType.toLowerCase().includes(x.split(' ')[1] || x)));
  const readiness = conflicts.length ? 'HOLD' : claims.length >= 2 ? 'READY_FOR_EDITORIAL_REVIEW' : 'ENRICH';
  const assessment = threat ? 'Evidence indicates a threat-relevant signal; exploitation status remains bounded by the cited evidence.' : 'No direct exploitation evidence established from the available observations.';
  return { entity, identity: field(entity.resolution === 'UNRESOLVED' ? 'UNKNOWN' : 'VERIFIED', entity.identifiers.map((x) => `${x.namespace}:${x.value}`).join(', ') || 'UNKNOWN'), executiveAssessment: field('ANALYTICAL_ASSESSMENT', assessment), overview: field('VERIFIED', claims.length ? 'Source observations recorded.' : 'UNKNOWN'), technicalAnalysis: field('NOT_ESTABLISHED', 'UNKNOWN'), affectedProducts: product ? field('VERIFIED', product.value, [product.claimId]) : field('UNKNOWN', 'UNKNOWN'), severity: severity ? field('VERIFIED', severity.value, [severity.claimId]) : field('UNKNOWN', 'UNKNOWN'), exploitability: field('UNKNOWN', 'UNKNOWN'), threatStatus: threat ? field('VERIFIED', threat.value, [threat.claimId]) : field('UNKNOWN', 'UNKNOWN'), operationalImpact: field('NOT_ESTABLISHED', 'UNKNOWN'), detectionValidation: field('NOT_ESTABLISHED', 'UNKNOWN'), remediation: remediation ? field('VERIFIED', remediation.value, [remediation.claimId]) : field('UNKNOWN', 'UNKNOWN'), zayronAssessment: field('ANALYTICAL_ASSESSMENT', assessment), knowledgeContext: field('NOT_APPLICABLE', 'NOT_APPLICABLE'), provenance: [...new Set(claims.flatMap((c) => c.sourceScope))], confidence: claims.length ? Math.min(...claims.map((c) => c.confidence)) : 0, unknowns, conflicts, publicationReadiness: readiness, revision: 1 };
}

export function revisionKey(dossier: IntelligenceDossier): string { return id('revision', dossier.entity.entityId, JSON.stringify({ claims: dossier.provenance, conflicts: dossier.conflicts, readiness: dossier.publicationReadiness })); }
export function process(observations: SourceObservation[]): { dossier: IntelligenceDossier; evidence: Evidence[]; claims: Claim[] } { const entity = resolveVulnerability(observations); const evidence = evidenceFor(entity, observations); const claims = claimsFor(entity, evidence, observations); return { dossier: buildDossier(entity, claims, detectConflicts(entity.entityId, claims)), evidence, claims }; }
