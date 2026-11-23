/**
 * ZAYRON-X Audience Projection Transformers
 * Generates Executive, Analyst, SOC/Detection, and Incident Response views
 * from a single canonical intelligence report.
 */

import type {
  CanonicalIntelligenceReport,
  AudienceProjection,
  AudienceType,
} from './types';

export class AudienceProjectionEngine {
  /**
   * Projects a canonical report into a tailored audience view.
   */
  public static project(
    report: CanonicalIntelligenceReport,
    audience: AudienceType
  ): AudienceProjection {
    switch (audience) {
      case 'EXECUTIVE':
        return this.projectExecutive(report);
      case 'ANALYST':
        return this.projectAnalyst(report);
      case 'SOC_DETECTION':
        return this.projectSocDetection(report);
      case 'INCIDENT_RESPONSE':
        return this.projectIncidentResponse(report);
      default:
        throw new Error(`[AudienceProjection] Unsupported audience: ${audience}`);
    }
  }

  private static projectExecutive(report: CanonicalIntelligenceReport): AudienceProjection {
    return {
      audience: 'EXECUTIVE',
      reportId: report.reportId,
      revision: report.revision,
      title: `${report.identity.primaryName} - Executive Intelligence Briefing`,
      domain: report.domain,
      executiveTakeaway: report.executiveSummary.keyConclusion,
      confidence: report.intelligenceAssessment.confidence.level,
      primaryAction: report.executiveSummary.immediateAction,
      sections: [
        {
          sectionId: 'executive_overview',
          title: 'Strategic Threat Overview',
          content: {
            whatHappened: report.executiveSummary.whatHappened,
            whyItMatters: report.executiveSummary.whyItMatters,
            affectedScope: report.executiveSummary.affectedScope,
          },
        },
        {
          sectionId: 'confidence_rating',
          title: 'Confidence Assessment',
          content: {
            level: report.intelligenceAssessment.confidence.level,
            reasoning: report.intelligenceAssessment.confidence.reasoning,
          },
        },
        {
          sectionId: 'strategic_actions',
          title: 'Mandatory Executive Actions',
          content: report.actions
            .filter((a) => a.urgency === 'REQUIRED')
            .map((a) => ({ title: a.title, description: a.description, urgency: a.urgency })),
        },
      ],
    };
  }

  private static projectAnalyst(report: CanonicalIntelligenceReport): AudienceProjection {
    return {
      audience: 'ANALYST',
      reportId: report.reportId,
      revision: report.revision,
      title: `${report.identity.primaryName} - Deep Technical Intelligence Report`,
      domain: report.domain,
      executiveTakeaway: report.intelligenceAssessment.assessmentSummary,
      confidence: report.intelligenceAssessment.confidence.level,
      primaryAction: report.executiveSummary.immediateAction,
      sections: [
        {
          sectionId: 'intelligence_assessment',
          title: 'Analytical Assessment & Hypotheses',
          content: {
            assessment: report.intelligenceAssessment.assessmentSummary,
            confidence: report.intelligenceAssessment.confidence,
            assumptions: report.intelligenceAssessment.assumptions,
            limitations: report.intelligenceAssessment.limitations,
            competingHypotheses: report.intelligenceAssessment.competingHypotheses,
          },
        },
        {
          sectionId: 'what_we_know',
          title: 'Evidentiary Truth (What We Know)',
          content: report.whatWeKnow.map((k) => ({
            status: k.status,
            statement: k.text,
            evidenceCitations: k.evidenceRefs.map((ref) => report.evidenceStore[ref]),
          })),
        },
        {
          sectionId: 'intelligence_gaps',
          title: 'Known Uncertainties & Missing Telemetry',
          content: report.whatWeDoNotKnow,
        },
        {
          sectionId: 'timeline',
          title: 'Event Chronology',
          content: report.timeline,
        },
        {
          sectionId: 'canonical_relationships',
          title: 'Entity Relationship Graph',
          content: report.relationships,
        },
        {
          sectionId: 'contradictions',
          title: 'Recorded Intelligence Contradictions',
          content: report.contradictions,
        },
      ],
    };
  }

  private static projectSocDetection(report: CanonicalIntelligenceReport): AudienceProjection {
    return {
      audience: 'SOC_DETECTION',
      reportId: report.reportId,
      revision: report.revision,
      title: `${report.identity.primaryName} - Detection & Threat Hunting Telemetry`,
      domain: report.domain,
      executiveTakeaway: `Detection Engineering context for ${report.identity.primaryName}`,
      confidence: report.intelligenceAssessment.confidence.level,
      primaryAction: report.actions.find((a) => a.urgency === 'REQUIRED')?.description || 'Block validated IOCs',
      sections: [
        {
          sectionId: 'technical_iocs',
          title: 'Actionable Indicators of Compromise (IOCs)',
          content: report.iocs.map((ioc) => ({
            type: ioc.iocType,
            value: ioc.value,
            caution: ioc.warninglistMatch ? `Warninglist flag: ${ioc.warninglistName}` : 'None',
            confidence: ioc.confidence,
          })),
        },
        {
          sectionId: 'attack_techniques',
          title: 'MITRE ATT&CK Techniques & Detection Hooks',
          content: report.attackTechniques.map((t) => ({
            technique: `${t.techniqueId} (${t.techniqueName})`,
            tactic: t.tactic,
            detectionOpportunity: t.detectionOpportunity || 'Audit process execution & telemetry logs',
          })),
        },
        {
          sectionId: 'hunting_actions',
          title: 'Immediate Defensive & Hunting Directives',
          content: report.actions.map((a) => ({
            urgency: a.urgency,
            title: a.title,
            instruction: a.description,
          })),
        },
      ],
    };
  }

  private static projectIncidentResponse(report: CanonicalIntelligenceReport): AudienceProjection {
    return {
      audience: 'INCIDENT_RESPONSE',
      reportId: report.reportId,
      revision: report.revision,
      title: `${report.identity.primaryName} - Incident Response & Containment Brief`,
      domain: report.domain,
      executiveTakeaway: `Incident Triage and Blast Radius for ${report.identity.primaryName}`,
      confidence: report.intelligenceAssessment.confidence.level,
      primaryAction: report.executiveSummary.immediateAction,
      sections: [
        {
          sectionId: 'ir_timeline',
          title: 'Adversary Execution Flow & Incident Timeline',
          content: report.timeline,
        },
        {
          sectionId: 'affected_scope',
          title: 'Affected Assets & Exploitation Preconditions',
          content: {
            scope: report.executiveSummary.affectedScope,
            preconditions: report.domainDetails?.preconditions || ['Standard network exposure'],
          },
        },
        {
          sectionId: 'quarantine_iocs',
          title: 'Immediate Isolation & Containment IOCs',
          content: report.iocs.map((i) => ({ type: i.iocType, value: i.value })),
        },
        {
          sectionId: 'containment_actions',
          title: 'Containment, Eradication & Recovery Directives',
          content: report.actions
            .filter((a) => a.urgency === 'REQUIRED' || a.urgency === 'RECOMMENDED')
            .map((a) => ({ urgency: a.urgency, action: a.title, details: a.description })),
        },
      ],
    };
  }
}
