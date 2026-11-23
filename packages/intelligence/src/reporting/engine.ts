/**
 * ZAYRON-X Canonical Reporting Engine
 * Compiles canonical intelligence graph objects into defensible, versioned reports.
 */

import type {
  CanonicalIntelligenceReport,
  IntelligenceDomain,
  ReportLifecycleState,
  FreshnessState,
  ReportConfidence,
  EpistemicStatement,
  IntelligenceGap,
  TimelineEntry,
  EntityRelationshipNode,
  TechnicalArtifactIOC,
  AttackTechniqueMapping,
  DefensiveAction,
  ContradictionRecord,
  ReportCitation,
  AudienceType,
  AudienceProjection,
  QualityGateResult,
} from './types';
import { ReportTemplateRegistry } from './registry';
import { ReportQualityGate } from './qualityGate';
import { AudienceProjectionEngine } from './audience';

export interface ReportCompositionInput {
  reportId: string;
  revision?: number;
  domain: IntelligenceDomain;
  templateId?: string;
  identity: {
    entityId: string;
    primaryName: string;
    aliases?: string[];
    externalIds?: Record<string, string>;
  };
  executiveSummary: {
    whatHappened: string;
    whyItMatters: string;
    affectedScope: string;
    keyConclusion: string;
    immediateAction: string;
  };
  intelligenceAssessment: {
    assessmentSummary: string;
    confidence: ReportConfidence;
    supportingEvidenceRefs: string[];
    competingHypotheses?: string[];
    assumptions?: string[];
    limitations?: string[];
    reasoning: string;
  };
  whatWeKnow: EpistemicStatement[];
  whatWeDoNotKnow: IntelligenceGap[];
  timeline: TimelineEntry[];
  relationships?: EntityRelationshipNode[];
  iocs?: TechnicalArtifactIOC[];
  attackTechniques?: AttackTechniqueMapping[];
  actions: DefensiveAction[];
  contradictions?: ContradictionRecord[];
  evidenceStore: Record<string, ReportCitation>;
  domainDetails?: CanonicalIntelligenceReport['domainDetails'];
  tlp?: CanonicalIntelligenceReport['tlp'];
  supersedes?: string;
  supersededBy?: string;
}

export class ReportingEngine {
  /**
   * Composes a canonical report from raw input, verifies it against the quality gate,
   * and prepares it for multi-audience distribution.
   */
  public static composeReport(input: ReportCompositionInput): {
    report: CanonicalIntelligenceReport;
    qualityGate: QualityGateResult;
  } {
    const template = ReportTemplateRegistry.get(input.domain);
    const revision = input.revision ?? 1;
    const now = new Date().toISOString();

    const report: CanonicalIntelligenceReport = {
      reportId: input.reportId,
      revision,
      reportVersion: `1.${revision}.0`,
      intelligenceVersion: 'canon_v1',
      templateVersion: template.version,
      state: 'DRAFT',
      freshness: 'CURRENT',
      domain: input.domain,
      templateId: template.id,
      tlp: input.tlp ?? 'TLP:CLEAR',
      createdAt: now,
      updatedAt: now,
      supersedes: input.supersedes,
      supersededBy: input.supersededBy,
      identity: {
        entityId: input.identity.entityId,
        primaryName: input.identity.primaryName,
        aliases: input.identity.aliases ?? [],
        externalIds: input.identity.externalIds ?? {},
      },
      executiveSummary: input.executiveSummary,
      intelligenceAssessment: {
        assessmentSummary: input.intelligenceAssessment.assessmentSummary,
        confidence: input.intelligenceAssessment.confidence,
        supportingEvidenceRefs: input.intelligenceAssessment.supportingEvidenceRefs,
        competingHypotheses: input.intelligenceAssessment.competingHypotheses ?? [],
        assumptions: input.intelligenceAssessment.assumptions ?? [],
        limitations: input.intelligenceAssessment.limitations ?? [],
        reasoning: input.intelligenceAssessment.reasoning,
      },
      whatWeKnow: input.whatWeKnow,
      whatWeDoNotKnow: input.whatWeDoNotKnow,
      timeline: input.timeline,
      relationships: input.relationships ?? [],
      iocs: input.iocs ?? [],
      attackTechniques: input.attackTechniques ?? [],
      actions: input.actions,
      contradictions: input.contradictions ?? [],
      evidenceStore: input.evidenceStore,
      domainDetails: input.domainDetails,
    };

    // Run Quality Gate Validation
    const gateResult = ReportQualityGate.evaluate(report);
    report.state = gateResult.status;

    return {
      report,
      qualityGate: gateResult,
    };
  }

  /**
   * Publishes a report if it passes the Quality Gate. Fails closed if not ready.
   */
  public static publishReport(report: CanonicalIntelligenceReport): CanonicalIntelligenceReport {
    const gateResult = ReportQualityGate.evaluate(report);
    if (!gateResult.passed) {
      throw new Error(
        `[ReportingEngine] Cannot publish report '${report.reportId}'. Failed Quality Gate: ${gateResult.issues.map((i) => `[${i.ruleId}] ${i.message}`).join(', ')}`
      );
    }
    return {
      ...report,
      state: 'PUBLISHED',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates an updated revision of a report, preserving previous state and setting supersedes chain.
   */
  public static createRevision(
    previousReport: CanonicalIntelligenceReport,
    updates: Partial<ReportCompositionInput>
  ): {
    newReport: CanonicalIntelligenceReport;
    updatedPreviousReport: CanonicalIntelligenceReport;
    qualityGate: QualityGateResult;
  } {
    const nextRevision = previousReport.revision + 1;
    const newReportInput: ReportCompositionInput = {
      ...previousReport,
      ...updates,
      reportId: previousReport.reportId,
      revision: nextRevision,
      supersedes: `rev_${previousReport.revision}`,
      identity: updates.identity ?? previousReport.identity,
      executiveSummary: updates.executiveSummary ?? previousReport.executiveSummary,
      intelligenceAssessment: updates.intelligenceAssessment ?? previousReport.intelligenceAssessment,
      whatWeKnow: updates.whatWeKnow ?? previousReport.whatWeKnow,
      whatWeDoNotKnow: updates.whatWeDoNotKnow ?? previousReport.whatWeDoNotKnow,
      timeline: updates.timeline ?? previousReport.timeline,
      actions: updates.actions ?? previousReport.actions,
      evidenceStore: { ...previousReport.evidenceStore, ...(updates.evidenceStore ?? {}) },
    };

    const result = this.composeReport(newReportInput);

    const updatedPreviousReport: CanonicalIntelligenceReport = {
      ...previousReport,
      freshness: 'SUPERSEDED',
      supersededBy: `rev_${nextRevision}`,
      updatedAt: new Date().toISOString(),
    };

    return {
      newReport: result.report,
      updatedPreviousReport,
      qualityGate: result.qualityGate,
    };
  }

  /**
   * Render report for a specific audience.
   */
  public static renderAudience(
    report: CanonicalIntelligenceReport,
    audience: AudienceType
  ): AudienceProjection {
    return AudienceProjectionEngine.project(report, audience);
  }
}
