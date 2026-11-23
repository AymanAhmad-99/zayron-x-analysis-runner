/**
 * ZAYRON-X Report Quality Gate & Hallucination Guard
 * Automated fail-closed validation of intelligence reports against 15 canonical rules.
 */

import type {
  CanonicalIntelligenceReport,
  QualityGateIssue,
  QualityGateResult,
} from './types';
import { ReportTemplateRegistry } from './registry';
import { validateEvidenceMembership } from './evidenceMembership';

export class ReportQualityGate {
  /**
   * Evaluates a report against all 15 quality rules and domain-specific invariants.
   */
  public static evaluate(report: CanonicalIntelligenceReport): QualityGateResult {
    const issues: QualityGateIssue[] = [];

    // Helper to log issues
    const addIssue = (ruleId: string, path: string, message: string, severity: 'FATAL' | 'WARNING' = 'FATAL') => {
      issues.push({ ruleId, severity, path, message });
    };

    // Rule 1: Evidence Grounding (All factual statements must link to existing evidence)
    for (const stmt of report.whatWeKnow) {
      if (stmt.status === 'OBSERVED' || stmt.status === 'REPORTED') {
        if (!stmt.evidenceRefs || stmt.evidenceRefs.length === 0) {
          addIssue('RULE_1_EVIDENCE_GROUNDING', `whatWeKnow.${stmt.statementId}`, 'Factual statement lacks supporting evidence reference.');
        } else {
          for (const ref of stmt.evidenceRefs) {
            if (!report.evidenceStore[ref]) {
              addIssue('RULE_1_EVIDENCE_GROUNDING', `whatWeKnow.${stmt.statementId}`, `Referenced evidence ID '${ref}' does not exist in evidence store.`);
            }
          }
        }
      }
    }

    // Rule 2: Assessment Supporting Evidence (Assessments must identify supporting evidence)
    if (
      report.intelligenceAssessment.supportingEvidenceRefs.length === 0 &&
      report.intelligenceAssessment.assessmentSummary !== 'UNKNOWN'
    ) {
      addIssue('RULE_2_ASSESSMENT_EVIDENCE', 'intelligenceAssessment.supportingEvidenceRefs', 'Intelligence assessment must identify supporting evidence.');
    }

    // Rule 3: Attribution Grounding (Threat Actor or Campaign attribution requires corroborated evidence)
    for (const rel of report.relationships) {
      if (rel.relationshipType === 'ATTRIBUTED_TO' || rel.relationshipType === 'OPERATES') {
        if (!rel.evidenceRefs || rel.evidenceRefs.length === 0) {
          addIssue('RULE_3_ATTRIBUTION_GROUNDING', `relationships.${rel.relationshipId}`, 'Adversary attribution edge lacks evidence references.');
        }
      }
    }

    // Rule 4: No Unknown-as-False Fallacy
    for (const stmt of report.whatWeKnow) {
      const lower = stmt.text.toLowerCase();
      if (lower.includes('does not exist') || lower.includes('no threat actor exists') || lower.includes('impossible to exploit')) {
        if (stmt.status !== 'ASSESSED' && (!stmt.evidenceRefs || stmt.evidenceRefs.length === 0)) {
          addIssue('RULE_4_NO_UNKNOWN_AS_FALSE', `whatWeKnow.${stmt.statementId}`, 'Absence of evidence cannot be asserted as negative proof without evidence.');
        }
      }
    }

    // Rule 5: Exploit Maturity Invariants
    const maturity = report.domainDetails?.exploitMaturity;
    if (maturity === 'POC') {
      const whatHappened = report.executiveSummary.whatHappened.toLowerCase();
      if (whatHappened.includes('actively exploited') || whatHappened.includes('in the wild exploitation')) {
        addIssue('RULE_5_EXPLOIT_MATURITY', 'executiveSummary.whatHappened', 'PoC exploit maturity cannot be described as active exploitation in the wild.');
      }
    }

    // Rule 6: Malware Family Attribution Isolation
    for (const rel of report.relationships) {
      if (rel.sourceEntityType === 'malware' && rel.targetEntityType === 'threat_actor' && rel.relationshipType === 'ATTRIBUTED_TO') {
        if (rel.confidence === 'HIGH' && rel.evidenceRefs.length < 2) {
          addIssue('RULE_6_MALWARE_FAMILY_ATTRIBUTION_ISOLATION', `relationships.${rel.relationshipId}`, 'High confidence attribution from malware to actor requires at least 2 independent corroborating evidence refs.');
        }
      }
    }

    // Rule 7: Campaign Boundary (No campaign synthesized from weak single overlap)
    if (report.domain === 'CAMPAIGN' && report.timeline.length < 1 && report.relationships.length < 1) {
      addIssue('RULE_7_CAMPAIGN_BOUNDARY', 'relationships', 'Campaign cannot be synthesized from a single uncorroborated artifact.');
    }

    // Rule 8: Timeline Grounding (Timeline dates must match source evidence)
    for (const entry of report.timeline) {
      if (!entry.timestamp || isNaN(Date.parse(entry.timestamp))) {
        addIssue('RULE_8_TIMELINE_GROUNDING', 'timeline', `Timeline entry has invalid timestamp: ${entry.timestamp}`);
      }
      if (!entry.evidenceRef || !report.evidenceStore[entry.evidenceRef]) {
        addIssue('RULE_8_TIMELINE_GROUNDING', 'timeline', `Timeline entry '${entry.eventType}' lacks valid evidence reference.`);
      }
    }

    // Rule 9: Confidence Mandatory
    if (!report.intelligenceAssessment.confidence || !report.intelligenceAssessment.confidence.level) {
      addIssue('RULE_9_CONFIDENCE_MANDATORY', 'intelligenceAssessment.confidence', 'Confidence level and basis are mandatory for intelligence assessment.');
    }

    // Rule 10: Intelligence Gaps Exposed
    if (report.whatWeDoNotKnow.length === 0 && report.state === 'READY') {
      addIssue('RULE_10_INTELLIGENCE_GAPS_EXPOSED', 'whatWeDoNotKnow', 'Defensible reports must explicitly record known uncertainties or collection gaps.');
    }

    // Rule 11: Contradictions Preserved
    for (const contradiction of report.contradictions) {
      if (!contradiction.claimA.evidenceRef || !contradiction.claimB.evidenceRef) {
        addIssue('RULE_11_CONTRADICTIONS_PRESERVED', `contradictions.${contradiction.conflictId}`, 'Contradiction must cite evidence references for both competing claims.');
      }
    }

    // Rule 12: Section Completeness
    if (!report.reportId || !report.identity.entityId || !report.domain) {
      addIssue('RULE_12_SECTION_COMPLETENESS', 'identity', 'Report identity and domain are mandatory.');
    }
    if (!report.executiveSummary.whatHappened || report.executiveSummary.whatHappened === 'UNKNOWN') {
      addIssue('RULE_12_SECTION_COMPLETENESS', 'executiveSummary.whatHappened', 'Executive summary must contain evidence-backed whatHappened summary.');
    }

    // Rule 13: Empty State Discipline (No repetitive placeholder boilerplate)
    const boilerplatePhrases = [
      'information is unavailable at this time',
      'no data available at this time',
      'details will be updated later',
      'n/a',
    ];
    const textToCheck = [
      report.executiveSummary.whatHappened,
      report.executiveSummary.whyItMatters,
      report.intelligenceAssessment.assessmentSummary,
    ];
    for (const text of textToCheck) {
      for (const phrase of boilerplatePhrases) {
        if (text.toLowerCase().includes(phrase)) {
          addIssue('RULE_13_EMPTY_STATE_DISCIPLINE', 'text', `Detected generic boilerplate text: "${phrase}". Use structured Intelligence Gaps instead.`);
        }
      }
    }

    // Rule 14: Traceable Provenance Chains
    for (const [key, citation] of Object.entries(report.evidenceStore)) {
      if (!citation.evidenceId || !citation.sourceId || !citation.retrievedAt) {
        addIssue('RULE_14_TRACEABLE_PROVENANCE', `evidenceStore.${key}`, 'Citation missing mandatory provenance metadata (evidenceId, sourceId, retrievedAt).');
      }
    }

    // Rule 15: Action Grounding
    for (const action of report.actions) {
      if (!action.evidenceRefs || action.evidenceRefs.length === 0) {
        addIssue('RULE_15_ACTION_GROUNDING', `actions.${action.actionId}`, 'Defensive action must link to supporting evidence.');
      }
      const genericPhrases = ['stay vigilant', 'be careful', 'watch out', 'follow best practices'];
      for (const phrase of genericPhrases) {
        if (action.description.toLowerCase().includes(phrase)) {
          addIssue('RULE_15_ACTION_GROUNDING', `actions.${action.actionId}`, `Action contains generic non-operational advice: "${phrase}".`);
        }
      }
    }

    // Rule 16 (Rule A & G): Temporal Exploitation Boundary
    // Historical evidence alone cannot produce current active exploitation status.
    const temporalStatus = report.domainDetails?.exploitationTemporalStatus;
    const whatHappenedLower = report.executiveSummary.whatHappened.toLowerCase();
    const assessmentLower = report.intelligenceAssessment.assessmentSummary.toLowerCase();

    if (temporalStatus === 'CURRENT_EXPLOITATION_OBSERVED') {
      // Must have explicit live telemetry evidence; CISA KEV or vendor advisory from historical period alone cannot produce CURRENT_EXPLOITATION_OBSERVED
      const hasDirectLiveTelemetry = Object.values(report.evidenceStore).some((ev) => {
        const statementLower = ev.statement.toLowerCase();
        const isLiveConfirmed = statementLower.includes('telemetry confirmed currently active') ||
          statementLower.includes('live honeypot observation');
        const d = new Date(ev.retrievedAt).getTime();
        const now = Date.now();
        const diffDays = Math.abs((now - d) / (1000 * 60 * 60 * 24));
        return isLiveConfirmed && diffDays <= 30;
      });
      if (!hasDirectLiveTelemetry) {
        addIssue(
          'RULE_16_TEMPORAL_EXPLOITATION_BOUNDARY',
          'domainDetails.exploitationTemporalStatus',
          'CURRENT_EXPLOITATION_OBSERVED requires recent evidence; historical evidence alone cannot produce current active status.'
        );
      }
    }

    // Rule 17 (Rule B): Source Reporting vs Direct Observation
    // If ZAYRON-X did not directly observe exploitation through internal telemetry, source-reported facts must not be labeled DIRECTLY_OBSERVED.
    for (const stmt of report.whatWeKnow) {
      if (stmt.status === 'DIRECTLY_OBSERVED' || (stmt.status === 'OBSERVED' && stmt.text.toLowerCase().includes('zayron-x observed'))) {
        const hasDirectTelemetry = stmt.evidenceRefs.some((ref) => {
          const ev = report.evidenceStore[ref];
          return ev && (ev.sourceId === 'zayron_sensor' || ev.sourceId === 'internal_telemetry');
        });
        if (!hasDirectTelemetry) {
          addIssue(
            'RULE_17_SOURCE_VS_DIRECT_OBSERVATION',
            `whatWeKnow.${stmt.statementId}`,
            'Source-reported evidence cannot be labeled direct ZAYRON-X observation.'
          );
        }
      }
    }

    // Rule 18 (Rule C): Retrieval Date vs Publication Date Integrity
    // Retrieved date cannot equal publication date without explicit verification.
    for (const [key, citation] of Object.entries(report.evidenceStore)) {
      if (citation.publishedAt && citation.retrievedAt) {
        if (citation.publishedAt === citation.retrievedAt) {
          addIssue(
            'RULE_18_RETRIEVAL_DATE_INTEGRITY',
            `evidenceStore.${key}`,
            `Citation '${key}' has identical publication and retrieval dates (${citation.publishedAt}). Retrieval date must reflect actual ingestion timestamp.`
          );
        }
      }
    }

    // Rule 19 (Rule D): Exploit Maturity Weaponization Isolation
    // Observed exploitation cannot automatically produce WEAPONIZED status without admissible evidence.
    if (report.domainDetails?.exploitMaturity === 'WEAPONIZED' || report.domainDetails?.weaponizationStatus === 'CONFIRMED_WEAPONIZED') {
      const hasWeaponizedEvidence = Object.values(report.evidenceStore).some((ev) =>
        ev.statement.toLowerCase().includes('weaponized') || ev.statement.toLowerCase().includes('automated exploit framework')
      );
      if (!hasWeaponizedEvidence) {
        addIssue(
          'RULE_19_WEAPONIZATION_GROUNDING',
          'domainDetails.weaponizationStatus',
          'Observed exploitation cannot automatically produce weaponized status without explicit weaponization evidence.'
        );
      }
    }

    // Rule 20 (Rule E): Dimension-Specific Confidence Uncertainty
    // A global confidence of HIGH cannot override explicit dimension uncertainty (e.g. current status or actor attribution UNKNOWN).
    if (report.intelligenceAssessment.confidence.level === 'HIGH') {
      const dimensions = report.intelligenceAssessment.confidence.dimensions;
      if (dimensions) {
        if (dimensions.currentExploitationStatus === 'UNKNOWN' || dimensions.threatActorAttribution === 'UNKNOWN') {
          // Verify reasoning explicitly accounts for dimension-specific uncertainty
          const reasoning = report.intelligenceAssessment.confidence.reasoning.toLowerCase();
          if (!reasoning.includes('historical') && !reasoning.includes('attribution') && !reasoning.includes('gap')) {
            addIssue(
              'RULE_20_CONFIDENCE_DIMENSION_CONSISTENCY',
              'intelligenceAssessment.confidence.reasoning',
              'High confidence rating must explicitly articulate dimension-specific uncertainties.'
            );
          }
        }
      }
    }

    // Rule 21 (Rule F): ATT&CK Technique Mapping Provenance
    for (const tech of report.attackTechniques) {
      if (!tech.mappingProvenance) {
        addIssue(
          'RULE_21_ATTACK_MAPPING_PROVENANCE',
          `attackTechniques.${tech.techniqueId}`,
          `ATT&CK technique '${tech.techniqueId}' must specify mappingProvenance ('SOURCE_REPORTED', 'ANALYST_MAPPED', or 'INFERRED').`
        );
      }
    }

    // Rule 22 (Rule H): TLP Justification
    if (report.tlp) {
      const validTlps = ['TLP:CLEAR', 'TLP:GREEN', 'TLP:AMBER', 'TLP:AMBER+STRICT', 'TLP:RED'];
      if (!validTlps.includes(report.tlp)) {
        addIssue(
          'RULE_22_TLP_JUSTIFICATION',
          'tlp',
          `Unsupported TLP label: '${report.tlp}'. Must be one of: ${validTlps.join(', ')}.`
        );
      }
    }

    // Rule 23 (Rule I): Stale Historical Evidence Boundary
    // A report must not claim current active status in prose when the latest evidence is historical.
    const isHistorical = report.domainDetails?.exploitationTemporalStatus === 'HISTORICAL_EXPLOITATION_OBSERVED' ||
      report.domainDetails?.exploitationTemporalStatus === 'CURRENT_STATUS_UNKNOWN';
    if (isHistorical) {
      if (whatHappenedLower.includes('is actively exploited in the wild') || assessmentLower.includes('is actively exploited in the wild')) {
        addIssue(
          'RULE_23_STALE_HISTORICAL_EVIDENCE_BOUNDARY',
          'executiveSummary.whatHappened',
          'Report claims current active exploitation in the wild while exploitation temporal status is historical or unknown.'
        );
      }
    }

    // Rule 24: Generic Cross-Source Evidence Membership Integrity
    // Validates that all entity relationships (Exploit -> Vuln, Malware -> Vuln, Malware -> Campaign, Actor -> Campaign)
    // are authoritatively grounded in source evidence and not poisoned or mismatched.
    for (const rel of report.relationships) {
      if (rel.evidenceRefs && rel.evidenceRefs.length > 0) {
        const candidateEvidence = rel.evidenceRefs.map((ref) => report.evidenceStore[ref]).filter(Boolean);
        if (candidateEvidence.length > 0) {
          const membershipRes = validateEvidenceMembership({
            source: rel.sourceEntityType,
            sourceArtifactId: rel.sourceEntityId,
            claimedEntityType: rel.targetEntityType,
            claimedEntityId: rel.targetEntityId,
            evidence: candidateEvidence,
          });

          if (membershipRes.status === 'EVIDENCE_MEMBERSHIP_MISMATCH') {
            addIssue(
              'EVIDENCE_MEMBERSHIP_MISMATCH',
              `relationships.${rel.relationshipId}`,
              membershipRes.reason
            );
          }
        }
      }
    }

    // Rule 25: Invalid Provenance & Retrieval Timestamp Boundary
    // Never synthesize placeholder timestamps that resemble real provenance (e.g. 1970-01-01, 0000-00-00, Unix epoch 0).
    for (const [key, citation] of Object.entries(report.evidenceStore)) {
      const datesToCheck = [
        { field: 'retrievedAt', value: citation.retrievedAt },
        { field: 'publishedAt', value: citation.publishedAt },
      ];
      for (const { field, value } of datesToCheck) {
        if (value) {
          const valTrim = value.trim();
          const isEpochZero = valTrim.startsWith('1970-01-01') || valTrim.startsWith('1970-01-02') || valTrim === '0' || valTrim.startsWith('0000-00-00');
          const parsed = Date.parse(valTrim);
          if (isEpochZero || (parsed && parsed >= 0 && parsed <= 86400000)) {
            addIssue(
              'RULE_25_INVALID_RETRIEVAL_TIMESTAMP',
              `evidenceStore.${key}.${field}`,
              `Invalid or fabricated timestamp '${valTrim}'. Default epoch placeholders (1970-01-01) are forbidden.`
            );
          }
        }
      }
    }

    // Rule 26: Mitigation Status Integrity
    // A superseded mitigation must never be presented as the current recommended remediation.
    for (const action of report.actions) {
      if (action.mitigationStatus === 'SUPERSEDED' && action.urgency === 'REQUIRED') {
        addIssue(
          'RULE_26_SUPERSEDED_MITIGATION_INTEGRITY',
          `actions.${action.actionId}`,
          `Superseded mitigation '${action.title}' cannot be marked with REQUIRED urgency. Use CURRENT hotfixes as REQUIRED.`
        );
      }
    }

    // ==========================================
    // MALWARE DOMAIN RULES (M1 - M10)
    // ==========================================
    if (report.domain === 'MALWARE') {
      const malwareActivity = report.domainDetails?.activityStatus?.currentStatus;
      const sampleArt = report.domainDetails?.sampleArtifact;

      // Rule M1: Sample presence cannot automatically imply current activity
      if (malwareActivity === 'CURRENTLY_OBSERVED') {
        const hasLiveTelemetry = Object.values(report.evidenceStore).some((ev) => {
          const stmt = ev.statement.toLowerCase();
          const d = new Date(ev.retrievedAt).getTime();
          const diffDays = Math.abs((Date.now() - d) / (1000 * 60 * 60 * 24));
          return (stmt.includes('live telemetry confirmed') || stmt.includes('active network transmission')) && diffDays <= 30;
        });
        if (!hasLiveTelemetry) {
          addIssue(
            'RULE_M1_SAMPLE_CURRENT_ACTIVITY_ISOLATION',
            'domainDetails.activityStatus.currentStatus',
            'Malware sample presence in repository or historical listing cannot imply current activity without live telemetry.'
          );
        }
      }

      // Rule M2: Family label cannot automatically imply actor attribution
      const actorRel = report.relationships.find(
        (r) => r.relationshipType === 'ATTRIBUTED_TO' && r.targetEntityType === 'threat_actor'
      );
      if (actorRel) {
        const hasDirectActorEvidence = actorRel.evidenceRefs.some((ref) => {
          const ev = report.evidenceStore[ref];
          return ev && (ev.statement.toLowerCase().includes('threat actor') || ev.statement.toLowerCase().includes('attribution assessment'));
        });
        if (!hasDirectActorEvidence) {
          addIssue(
            'RULE_M2_FAMILY_ACTOR_NON_ATTRIBUTION',
            `relationships.${actorRel.relationshipId}`,
            'Malware family classification cannot automatically produce threat actor attribution without independent attribution evidence.'
          );
        }
      }

      // Rule M3: Family label cannot automatically imply campaign membership
      const campaignRel = report.relationships.find(
        (r) => r.relationshipType === 'PART_OF_CAMPAIGN' || r.targetEntityType === 'campaign'
      );
      if (campaignRel) {
        const hasCampaignEvidence = campaignRel.evidenceRefs.some((ref) => {
          const ev = report.evidenceStore[ref];
          return ev && ev.statement.toLowerCase().includes('campaign');
        });
        if (!hasCampaignEvidence) {
          addIssue(
            'RULE_M3_FAMILY_CAMPAIGN_NON_ATTRIBUTION',
            `relationships.${campaignRel.relationshipId}`,
            'Malware family cannot automatically produce campaign membership without explicit campaign evidence.'
          );
        }
      }

      // Rule M4: Hash cannot be rendered as an observation
      for (const stmt of report.whatWeKnow) {
        const text = stmt.text.toLowerCase();
        if ((stmt.status === 'OBSERVED' || stmt.status === 'DIRECTLY_OBSERVED') &&
            (text.startsWith('sha256:') || text.startsWith('md5:') || text.startsWith('sha1:'))) {
          addIssue(
            'RULE_M4_HASH_OBSERVATION_DISAGGREGATION',
            `whatWeKnow.${stmt.statementId}`,
            'A cryptographic hash is an artifact identifier and indicator, not an observation statement.'
          );
        }
      }

      // Rule M5: Capability claims require evidence
      const capabilities = report.domainDetails?.malwareCapabilities || [];
      for (const cap of capabilities) {
        if (!cap.evidenceRefs || cap.evidenceRefs.length === 0) {
          addIssue(
            'RULE_M5_CAPABILITY_GROUNDING',
            `domainDetails.malwareCapabilities.${cap.capabilityId}`,
            `Malware capability '${cap.name}' requires supporting evidence references.`
          );
        }
      }

      // Rule M6: ATT&CK mappings require provenance
      for (const tech of report.attackTechniques) {
        if (!tech.mappingProvenance) {
          addIssue(
            'RULE_M6_ATTACK_MAPPING_PROVENANCE',
            `attackTechniques.${tech.techniqueId}`,
            `ATT&CK mapping '${tech.techniqueId}' must specify mappingProvenance.`
          );
        }
      }

      // Rule M7: Current malware activity requires current evidence
      if (whatHappenedLower.includes('is actively circulating') || whatHappenedLower.includes('is currently active')) {
        if (malwareActivity !== 'CURRENTLY_OBSERVED') {
          addIssue(
            'RULE_M7_CURRENT_ACTIVITY_EVIDENCE_MANDATE',
            'executiveSummary.whatHappened',
            'Prose asserts current activity, but malware activityStatus is not CURRENTLY_OBSERVED.'
          );
        }
      }

      // Rule M8: Source classification must remain distinguishable from analytical assessment
      const classification = report.domainDetails?.familyClassification;
      if (classification) {
        if (classification.classificationProvenance === 'SOURCE_REPORTED') {
          const stmt = report.whatWeKnow.find((s) => s.text.includes(classification.sourceReportedFamily));
          if (stmt && stmt.status === 'DIRECTLY_OBSERVED') {
            addIssue(
              'RULE_M8_SOURCE_CLASSIFICATION_DISTINCTION',
              `whatWeKnow.${stmt.statementId}`,
              'Source-reported malware family signature cannot be labeled DIRECTLY_OBSERVED.'
            );
          }
        }
      }

      // Rule M9: Conflicting family classifications cannot silently overwrite each other
      if (classification?.isContested) {
        const hasContradiction = (report.contradictions || []).some(
          (c) => c.topic.toLowerCase().includes('family') || c.topic.toLowerCase().includes('classification')
        );
        if (!hasContradiction) {
          addIssue(
            'RULE_M9_CONTESTED_CLASSIFICATION_PRESERVATION',
            'contradictions',
            'Contested malware family classifications must be recorded in contradictions store.'
          );
        }
      }

      // Rule M10: Unsupported malware relationships fail closed
      for (const rel of report.relationships) {
        if (!rel.evidenceRefs || rel.evidenceRefs.length === 0) {
          addIssue(
            'RULE_M10_UNSUPPORTED_RELATIONSHIP_FAIL_CLOSED',
            `relationships.${rel.relationshipId}`,
            `Relationship '${rel.relationshipId}' has no evidence references and must fail closed.`
          );
        }
      }

      // Rule M11: Family-level behavior cannot be rendered as sample-level observation
      for (const cap of capabilities) {
        if (cap.scope === 'SAMPLE_SPECIFIC' || cap.claimLevel === 'SAMPLE_OBSERVED') {
          // Verify that evidence store contains sample execution/behavioral evidence
          const hasSampleExecutionEvidence = (cap.evidenceRefs || []).some((ref) => {
            const ev = report.evidenceStore[ref];
            if (!ev) return false;
            const stmt = ev.statement.toLowerCase();
            return stmt.includes('sample execution') || stmt.includes('dynamic analysis') || stmt.includes('sandbox detonation') || stmt.includes('observed behavior');
          });
          if (!hasSampleExecutionEvidence) {
            addIssue(
              'RULE_M11_FAMILY_BEHAVIOR_SCOPE_ISOLATION',
              `domainDetails.malwareCapabilities.${cap.capabilityId}`,
              `Capability '${cap.name}' is declared as sample-level observation but lacks sample-specific execution or behavioral evidence.`
            );
          }
        }
      }

      // Rule M12: CORROBORATED requires independent source evidence
      for (const stmt of report.whatWeKnow) {
        if (stmt.status === 'CORROBORATED') {
          const sources = new Set(stmt.evidenceRefs.map((ref) => report.evidenceStore[ref]?.sourceId).filter(Boolean));
          if (sources.size < 2) {
            addIssue(
              'RULE_M12_INDEPENDENT_CORROBORATION_REQUIRED',
              `whatWeKnow.${stmt.statementId}`,
              `Statement '${stmt.statementId}' claims CORROBORATED status with only ${sources.size} distinct source(s). Independent corroboration requires >= 2 distinct sources.`
            );
          }
        }
      }

      // Check familyClassification provenance
      if (classification?.classificationProvenance === 'CORROBORATED') {
        const familySources = new Set(
          Object.values(report.evidenceStore)
            .filter((ev) => ev.statement.toLowerCase().includes(classification.sourceReportedFamily.toLowerCase()))
            .map((ev) => ev.sourceId)
        );
        if (familySources.size < 2) {
          addIssue(
            'RULE_M12_INDEPENDENT_CORROBORATION_REQUIRED',
            'domainDetails.familyClassification.classificationProvenance',
            `Family classification claims CORROBORATED with only ${familySources.size} source(s). Must be SOURCE_REPORTED when supported only by a single source.`
          );
        }
      }

      // Rule M13: No-telemetry cannot become no-activity (Absence of telemetry != Evidence of absence)
      const proseToCheck = [
        whatHappenedLower,
        assessmentLower,
        report.executiveSummary.keyConclusion.toLowerCase(),
        report.executiveSummary.whyItMatters.toLowerCase(),
        ...report.whatWeKnow.map((s) => s.text.toLowerCase()),
        ...report.whatWeDoNotKnow.map((g) => g.reason.toLowerCase()),
      ];
      for (const prose of proseToCheck) {
        if (prose.includes('zero active') || prose.includes('zero activity') || prose.includes('observed zero') || prose.includes('sensors have observed zero') || prose.includes('no live beaconing')) {
          addIssue(
            'RULE_M13_NO_TELEMETRY_IS_NOT_NO_ACTIVITY',
            'prose',
            'Report claims zero activity or absence of beaconing based on lack of telemetry. Lack of telemetry must be stated as NO CURRENT TELEMETRY AVAILABLE, not evidence of absence.'
          );
        }
      }

      // Rule M14: MalwareBazaar authority tier must match canonical source policy (TIER_2)
      for (const [id, ev] of Object.entries(report.evidenceStore)) {
        if (ev.sourceId.toLowerCase().includes('malwarebazaar') && ev.authorityTier !== 'TIER_2') {
          addIssue(
            'RULE_M14_MALWAREBAZAAR_AUTHORITY_TIER_CONSISTENCY',
            `evidenceStore.${id}.authorityTier`,
            `MalwareBazaar authority tier must be TIER_2 according to canonical source policy (found '${ev.authorityTier}').`
          );
        }
      }

      // Rule M15: ATT&CK mapping must declare scope
      for (const tech of report.attackTechniques) {
        if (!tech.scope) {
          addIssue(
            'RULE_M15_ATTACK_MAPPING_SCOPE',
            `attackTechniques.${tech.techniqueId}.scope`,
            `ATT&CK mapping '${tech.techniqueId}' must explicitly declare scope ('FAMILY_LEVEL', 'SAMPLE_SPECIFIC', 'ANALYST_MAPPED', or 'SOURCE_REPORTED').`
          );
        }
      }

      // Rule M16: Family-level defensive recommendations must be labeled
      for (const action of report.actions) {
        if (!action.scope) {
          addIssue(
            'RULE_M16_DEFENSIVE_ACTION_SCOPE',
            `actions.${action.actionId}.scope`,
            `Defensive action '${action.actionId}' must declare its scope ('SAMPLE-SPECIFIC', 'FAMILY-LEVEL', 'ENVIRONMENTAL', or 'GENERAL-HARDENING').`
          );
        }
      }

      // Rule M17: Sample-specific behavior requires sample-level evidence
      const sampleBehavior = report.domainDetails?.sampleSpecificBehavior;
      if (sampleBehavior && (sampleBehavior.status === 'AVAILABLE' || sampleBehavior.status === 'LIMITED')) {
        if (!sampleBehavior.evidenceRefs || sampleBehavior.evidenceRefs.length === 0) {
          addIssue(
            'RULE_M17_SAMPLE_BEHAVIOR_EVIDENCE_MANDATE',
            'domainDetails.sampleSpecificBehavior',
            'Sample-specific behavioral evidence is claimed as available/limited but lacks supporting evidence references.'
          );
        }
      }

      // Rule M18: Current activity requires current temporal evidence
      if (malwareActivity === 'CURRENTLY_OBSERVED' || malwareActivity === 'HISTORICAL_ACTIVITY_OBSERVED') {
        const hasTemporalEvidence = Object.values(report.evidenceStore).some((ev) => ev.publishedAt || ev.retrievedAt);
        if (!hasTemporalEvidence) {
          addIssue(
            'RULE_M18_CURRENT_ACTIVITY_TEMPORAL_EVIDENCE',
            'domainDetails.activityStatus.currentStatus',
            'Current or historical activity status requires verifiable temporal evidence in evidenceStore.'
          );
        }
      }
    }

    // Check Template-Specific Invariants from Registry
    try {
      const template = ReportTemplateRegistry.get(report.domain);
      const domainIssues = template.validateDomainInvariants(report);
      issues.push(...domainIssues);
    } catch (e: any) {
      addIssue('TEMPLATE_LOOKUP', 'domain', e.message);
    }

    const fatalIssues = issues.filter((i) => i.severity === 'FATAL');
    const passed = fatalIssues.length === 0;

    let nextState = report.state;
    if (!passed) {
      nextState = 'REVIEW_REQUIRED';
    } else if (report.state === 'DRAFT') {
      nextState = 'READY';
    }

    return {
      passed,
      status: nextState,
      issues,
    };
  }
}
