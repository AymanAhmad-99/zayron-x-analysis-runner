import type { ValidatedIntelligenceObject, RelationshipType } from './types';

/**
 * Universal Dossier Structure supporting STIX 2.1 interoperability.
 * Contains up to 15 modular analytical dimensions that render adaptively
 * based on the domain profile and evidence availability.
 */
export interface DimensionEntry {
  title: string;
  status: 'ESTABLISHED' | 'UNKNOWN' | 'NOT_ESTABLISHED' | 'NOT_VERIFIED' | 'NOT_APPLICABLE';
  content?: string;
  evidenceRefs: string[];
}

export interface IntelligenceDossier {
  objectId: string;
  domain: string;
  title: string;
  confidenceScore: number;
  // 15 Analytical Dimensions
  dimensions: {
    executiveJudgment: DimensionEntry;
    threatClassification: DimensionEntry;
    identityAttribution: DimensionEntry;
    initialAccessExposure: DimensionEntry;
    ttpsAttack: DimensionEntry;
    malwarePayload: DimensionEntry;
    verifiedObservables: DimensionEntry;
    targetingVictimology: DimensionEntry;
    attackProgression: DimensionEntry;
    impact: DimensionEntry;
    sourceConsensusConflicts: DimensionEntry;
    exploitationActivityStatus: DimensionEntry;
    defensiveActions: DimensionEntry;
    detectionHunting: DimensionEntry;
    intelligenceGaps: DimensionEntry;
  };
  stixBundle?: Record<string, unknown>;
}

export function compileIntelligenceDossier(
  validated: ValidatedIntelligenceObject
): IntelligenceDossier {
  const claims = validated.validatedClaims;
  const canonical = validated.canonicalRecord;

  const getClaim = (pred: string) => claims.find(c => c.predicate.toLowerCase().includes(pred.toLowerCase()));

  const execClaim = getClaim('executive') || getClaim('summary');
  const classClaim = getClaim('classification') || getClaim('type') || getClaim('severity');
  const identClaim = getClaim('identity') || getClaim('family') || getClaim('identifier');
  const accessClaim = getClaim('exposure') || getClaim('preconditions') || getClaim('attackSurface');
  const ttpsClaim = getClaim('ttp') || getClaim('technique') || getClaim('capabilities');
  const malClaim = getClaim('malware') || getClaim('payload');
  const obsClaim = getClaim('indicator') || getClaim('ioc');
  const targetClaim = getClaim('targeting') || getClaim('victimology') || getClaim('affectedTarget');
  const progClaim = getClaim('progression') || getClaim('exploitationPath');
  const impactClaim = getClaim('impact') || getClaim('consequence');
  const exploitClaim = getClaim('exploitationStatus') || getClaim('activity');
  const defClaim = getClaim('remediation') || getClaim('defensiveActions');
  const detectClaim = getClaim('detection') || getClaim('hunting');

  const makeDimension = (claim: ReturnType<typeof getClaim>, title: string): DimensionEntry => {
    if (claim) {
      return {
        title,
        status: 'ESTABLISHED',
        content: claim.text,
        evidenceRefs: claim.evidenceRefs,
      };
    }
    return {
      title,
      status: 'NOT_ESTABLISHED',
      evidenceRefs: [],
    };
  };

  const dossier: IntelligenceDossier = {
    objectId: validated.objectId,
    domain: validated.domain,
    title: canonical.primaryIdentifier,
    confidenceScore: validated.confidenceScore,
    dimensions: {
      executiveJudgment: {
        title: 'Executive Judgment',
        status: 'ESTABLISHED',
        content: validated.executiveSummary,
        evidenceRefs: validated.evidenceBundle.items.map(i => i.evidenceId),
      },
      threatClassification: makeDimension(classClaim, 'Threat Classification'),
      identityAttribution: makeDimension(identClaim, 'Identity / Attribution'),
      initialAccessExposure: makeDimension(accessClaim, 'Initial Access / Exposure'),
      ttpsAttack: makeDimension(ttpsClaim, 'TTPs / ATT&CK'),
      malwarePayload: makeDimension(malClaim, 'Malware / Payload'),
      verifiedObservables: makeDimension(obsClaim, 'Verified Observables / IOCs'),
      targetingVictimology: makeDimension(targetClaim, 'Targeting / Victimology'),
      attackProgression: makeDimension(progClaim, 'Attack Progression'),
      impact: makeDimension(impactClaim, 'Impact'),
      sourceConsensusConflicts: {
        title: 'Source Consensus & Conflicts',
        status: validated.limitations.length ? 'ESTABLISHED' : 'NOT_APPLICABLE',
        content: validated.limitations.join('; '),
        evidenceRefs: [],
      },
      exploitationActivityStatus: makeDimension(exploitClaim, 'Exploitation / Activity Status'),
      defensiveActions: makeDimension(defClaim, 'Defensive Actions'),
      detectionHunting: makeDimension(detectClaim, 'Detection / Hunting'),
      intelligenceGaps: {
        title: 'Intelligence Gaps',
        status: validated.unknowns.length ? 'ESTABLISHED' : 'NOT_ESTABLISHED',
        content: validated.unknowns.join('; '),
        evidenceRefs: [],
      },
    },
    stixBundle: {
      type: 'bundle',
      id: `bundle--${validated.objectId}`,
      objects: [
        {
          type: validated.domain === 'vulnerability' ? 'vulnerability' : (validated.domain === 'threat_actor' ? 'threat-actor' : 'indicator'),
          spec_version: '2.1',
          id: `${validated.domain}--${validated.objectId}`,
          name: canonical.primaryIdentifier,
          description: validated.executiveSummary,
        },
      ],
    },
  };

  return dossier;
}
