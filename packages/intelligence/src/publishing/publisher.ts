/**
 * ZAYRON-X — Autonomous Production Publishing Pipeline
 * Bridges canonical intelligence assessments to the public website and multi-platform distribution.
 */

import { IntelligenceAssessmentReport } from '../analyst/contract';
import { formatCanonicalArticle, GeneratedArticle } from './article';
import {
  calculateDistributionDecision,
  generatePlatformDerivatives,
  DistributionDecision,
  PlatformDerivatives,
} from './social';
import {
  auditZeroDefectPublicationStandard,
  ZeroDefectMetricRecord,
} from '../engine_v2/quality_gate';
import { CanonicalReportObjectV2 } from '../engine_v2/types';
import { submitUrlsToIndexNow } from './indexnow';

export interface QualityGateResult {
  passed: boolean;
  violations: string[];
}

export interface PublishResult {
  status: 'PUBLISHED' | 'HELD' | 'REJECTED';
  article: GeneratedArticle | null;
  distribution: DistributionDecision;
  derivatives: PlatformDerivatives | null;
  qualityGate: QualityGateResult;
  publicationKeys: string[];
  zeroDefectMetric?: ZeroDefectMetricRecord;
  canonical_public_url?: string;
}

async function persistEvidenceLedger(
  report: IntelligenceAssessmentReport,
  eventId: string,
  db: any,
): Promise<{ ok: boolean; reason?: string }> {
  const evidence = (report.evidence || []).filter(
    (item) => Boolean(item.evidenceId && item.snippet && item.sourceId),
  );
  if (evidence.length === 0) return { ok: false, reason: 'No source-linked evidence to persist' };

  try {
    for (const item of evidence) {
      await db.prepare(`
        INSERT INTO evidence_ledger (
          claim_id, event_id, claim, classification, source_id, source_tier,
          published_at, retrieved_at, evidence_type, supports_or_contradicts,
          citation, content_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(claim_id) DO UPDATE SET
          claim = excluded.claim,
          classification = excluded.classification,
          source_id = excluded.source_id,
          retrieved_at = excluded.retrieved_at,
          citation = excluded.citation,
          content_hash = excluded.content_hash
      `).bind(
        item.evidenceId,
        eventId,
        item.snippet,
        'OBSERVED_FACT',
        item.sourceId,
        null,
        null,
        new Date().toISOString(),
        item.sourceType || 'source_evidence',
        'SUPPORTS',
        item.snippet,
        null,
      ).run();
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: `Evidence ledger persistence failed: ${String(error)}` };
  }
}

/**
 * Validates the strict Phase 3 Content Quality Gate (Section 31)
 */
export function validateQualityGate(report: IntelligenceAssessmentReport): QualityGateResult {
  const violations: string[] = [];
  const assessment = report.assessment;

  // 1. English-Only Public Gate (Reject Cyrillic, Arabic, Persian, CJK scripts in headline/summary)
  const nonEnglishRegex = /[\u0400-\u04FF\u0600-\u06FF\u0750-\u077F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/;
  if (nonEnglishRegex.test(assessment.headline || '')) {
    violations.push('Headline contains non-English characters');
  }
  if (nonEnglishRegex.test(assessment.executive_summary || '')) {
    violations.push('Executive summary contains non-English characters');
  }

  // 2. Minimum Confidence Threshold for Public Indexing
  if ((assessment.confidence_score || 0) < 0.20 && assessment.confidence_state === 'INSUFFICIENT_EVIDENCE') {
    // Insufficient evidence queries are held or stored internally
    violations.push('Insufficient evidentiary support for public SEO index');
  }

  // 3. Reject Placeholder or Hallucinated Text
  const placeholderRegex = /\b(lorem ipsum|placeholder|todo|fake stats|as an ai language model|unknown vulnerability)\b/i;
  if (placeholderRegex.test(assessment.headline || '') || placeholderRegex.test(assessment.executive_summary || '')) {
    violations.push('Text contains placeholder or generic LLM refusal artifacts');
  }

  // Strong epistemic labels require claim-level evidence, not model output alone.
  const strongClaim = /CONFIRMED|VERIFIED|ACTIVE EXPLOITATION|ATTRIBUTED/i.test(
    `${assessment.confidence_state} ${assessment.headline} ${assessment.executive_summary}`,
  );
  const groundedEvidence = (report.evidence || []).filter(
    (item) => Boolean(item.evidenceId && item.snippet && item.sourceId),
  );
  if (strongClaim && groundedEvidence.length === 0) {
    violations.push('Strong intelligence claim has no grounded evidence ledger record');
  }

  if ((assessment.threat_level === 'CRITICAL' || assessment.threat_level === 'HIGH') && groundedEvidence.length === 0) {
    violations.push('High-impact report requires at least one source-linked evidence record');
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Executes the complete publishing workflow for a verified intelligence event.
 */
export async function executePublishingWorkflow(
  report: IntelligenceAssessmentReport,
  options: {
    eventId?: string;
    siteUrl?: string;
    db?: any;
    publishQueue?: any;
    v2Report?: CanonicalReportObjectV2;
    rawTelemetryText?: string;
  } = {}
): Promise<PublishResult> {
  const eventId = options.eventId || `evt_${crypto.randomUUID().slice(0, 12)}`;
  const siteUrl = options.siteUrl || 'https://zayron-x.co';

  // Zero-Defect Operational Standard Audit (if v2 canonical report attached)
  let zeroDefectMetric: ZeroDefectMetricRecord | undefined;
  if (options.v2Report) {
    const rawTelemetry = options.rawTelemetryText || report.assessment.executive_summary || '';
    zeroDefectMetric = auditZeroDefectPublicationStandard(options.v2Report, rawTelemetry);
    if (options.db) {
      await persistZeroDefectAuditLog(options.v2Report.report_id, zeroDefectMetric, options.db);
    }
    if (!zeroDefectMetric.passed) {
      console.warn(`[PUBLICATION HALTED] Report ${options.v2Report.report_id} failed Zero-Defect Operational Standard:`, zeroDefectMetric.rejection_reasons);
      return {
        status: 'REJECTED',
        article: null,
        distribution: calculateDistributionDecision(report),
        derivatives: null,
        qualityGate: {
          passed: false,
          violations: zeroDefectMetric.rejection_reasons,
        },
        publicationKeys: [],
        zeroDefectMetric,
      };
    }
  }

  // Step 1: Content Quality Gate
  const qualityGate = validateQualityGate(report);
  if (!qualityGate.passed) {
    return {
      status: 'HELD',
      article: null,
      distribution: calculateDistributionDecision(report),
      derivatives: null,
      qualityGate,
      publicationKeys: [],
      zeroDefectMetric,
    };
  }

  const strongClaim = /CONFIRMED|VERIFIED|ACTIVE EXPLOITATION|ATTRIBUTED/i.test(
    `${report.assessment.confidence_state} ${report.assessment.headline} ${report.assessment.executive_summary}`,
  );
  if (strongClaim && !options.db) {
    qualityGate.passed = false;
    qualityGate.violations.push('Persistent evidence ledger is required for strong public claims');
    return {
      status: 'HELD', article: null, distribution: calculateDistributionDecision(report),
      derivatives: null, qualityGate, publicationKeys: [],
      zeroDefectMetric,
    };
  }

  if (options.db) {
    const ledger = await persistEvidenceLedger(report, eventId, options.db);
    if (!ledger.ok && strongClaim) {
      qualityGate.passed = false;
      qualityGate.violations.push(ledger.reason || 'Persistent evidence ledger unavailable');
      return {
        status: 'HELD', article: null, distribution: calculateDistributionDecision(report),
        derivatives: null, qualityGate, publicationKeys: [],
        zeroDefectMetric,
      };
    }
  }

  // Step 2: Canonical Article & SEO Generation
  const article = formatCanonicalArticle(report, siteUrl);
  const canonicalUrl = `${siteUrl}${article.slug}`;

  // Step 3: Social Distribution Routing
  const distribution = calculateDistributionDecision(report);

  // Step 4: Multi-Platform Platform Derivatives
  const derivatives = generatePlatformDerivatives(report, canonicalUrl);

  // Step 5: Idempotent Key Generation
  const contentVersion = 'v3.0';
  const platforms = ['telegram', 'twitter', 'linkedin', 'facebook', 'instagram', 'threads'];
  const publicationKeys = platforms.map((p) => `${eventId}:${p}:${contentVersion}`);

  // Step 6: Persist in D1 if database binding is present
  if (options.db) {
    try {
      const articleId = `art_${crypto.randomUUID().slice(0, 12)}`;
      const isCritical = report.assessment.threat_level === 'CRITICAL';
      const readTime = Math.max(1, Math.ceil(article.wordCount / 200));

      await options.db.prepare(`
        INSERT INTO articles (
          id, title, slug, dek, content, excerpt, author, category, tags,
          severity, confidence, ai_summary, read_time, is_published, is_featured, is_breaking,
          canonical_intel_event_id, published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        ON CONFLICT(slug) DO UPDATE SET
          title = excluded.title,
          content = excluded.content,
          severity = excluded.severity,
          confidence = excluded.confidence,
          ai_summary = excluded.ai_summary,
          updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
      `).bind(
        articleId,
        article.title,
        article.slug,
        article.metaDescription,
        article.markdownContent,
        article.metaDescription,
        'ZAYRON-X Cyber Intelligence Unit',
        'THREAT_INTELLIGENCE',
        JSON.stringify(article.tags),
        report.assessment.threat_level || 'MEDIUM',
        report.assessment.confidence_score || 0.8,
        report.assessment.executive_summary || '',
        readTime,
        distribution.priority === 'P0' ? 1 : 0,
        isCritical ? 1 : 0,
        eventId
      ).run();
    } catch (dbErr) {
      console.warn('[PUBLISHER] Failed to persist article to D1:', dbErr);
    }
  }

  return {
    status: 'PUBLISHED',
    article,
    distribution,
    derivatives,
    qualityGate,
    publicationKeys,
    zeroDefectMetric,
  };
}

export interface CanonicalV2PublishResult extends PublishResult {
  v2Report: CanonicalReportObjectV2;
  zeroDefectMetric: ZeroDefectMetricRecord;
}

async function persistZeroDefectAuditLog(
  reportId: string,
  metric: ZeroDefectMetricRecord,
  db: any
): Promise<void> {
  if (!db) return;
  try {
    await db.prepare(`
      INSERT INTO zero_defect_audit_log (
        report_id, timestamp, citation_gate_passed, unsupported_claims_check_passed,
        relevance_sanity_passed, non_generic_check_passed, overall_status, rejection_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      reportId,
      metric.timestamp,
      metric.checks.zero_citation_violations ? 1 : 0,
      metric.checks.zero_unsupported_claims ? 1 : 0,
      metric.checks.zero_irrelevant_citations ? 1 : 0,
      metric.checks.zero_generic_duplicates ? 1 : 0,
      metric.passed ? 'APPROVED' : 'REJECTED',
      metric.rejection_reasons.length > 0 ? metric.rejection_reasons.join('; ') : null
    ).run();
  } catch (err) {
    console.warn('[ZERO-DEFECT LOG] Failed to persist audit record to D1:', err);
  }
}

/**
 * Publishes a Canonical Engine v2 Report under the strict Zero-Defect Operational Standard.
 */
export async function publishCanonicalReportV2(
  v2Report: CanonicalReportObjectV2,
  options: {
    rawTelemetryText?: string;
    eventId?: string;
    siteUrl?: string;
    db?: any;
    publishQueue?: any;
  } = {}
): Promise<CanonicalV2PublishResult> {
  const eventId = options.eventId || v2Report.report_id || `evt_${crypto.randomUUID().slice(0, 12)}`;
  const siteUrl = options.siteUrl || 'https://zayron-x.co';
  const rawText = options.rawTelemetryText || v2Report.sections.find(s => s.section_number === '01')?.content || '';

  // Mandatory Zero-Defect Operational Standard evaluation
  const zeroDefectMetric = auditZeroDefectPublicationStandard(v2Report, rawText);

  // Durable Persistence: Persist all evaluation records (APPROVED and REJECTED)
  if (options.db) {
    await persistZeroDefectAuditLog(v2Report.report_id, zeroDefectMetric, options.db);
  }

  if (!zeroDefectMetric.passed) {
    console.warn(`[PUBLISHER BLOCKED] Report ${v2Report.report_id} failed Zero-Defect Operational Standard:`, zeroDefectMetric.rejection_reasons);
    return {
      status: 'REJECTED',
      article: null,
      distribution: {
        score: 0,
        priority: 'P2',
        route: 'WEBSITE_ONLY',
        reason: 'Rejected by Zero-Defect Operational Standard',
      },
      derivatives: null,
      qualityGate: {
        passed: false,
        violations: zeroDefectMetric.rejection_reasons,
      },
      publicationKeys: [],
      v2Report,
      zeroDefectMetric,
    };
  }

  const headline = v2Report.headline;
  const isCritical = v2Report.severity === 'CRITICAL';
  const fullContent = v2Report.sections.map(s => `## Section ${s.section_number}: ${s.title}\n\n${s.content}`).join('\n\n');
  const cleanSlug = (v2Report.enrichment.cve_id ? v2Report.enrichment.cve_id.toLowerCase() : eventId).replace(/^\/?(threats|articles)\//, '');
  const slug = cleanSlug;
  const canonicalPublicUrl = `${siteUrl}/threats/${cleanSlug}`;
  const articleId = `art_${crypto.randomUUID().slice(0, 12)}`;

  const categoryMap: Record<string, string> = {
    VULNERABILITY: 'vulnerabilities',
    MALWARE: 'malware',
    RANSOMWARE: 'ransomware',
    THREAT_ACTOR: 'actors',
    CAMPAIGN: 'campaigns',
    INCIDENT_TELEMETRY: 'incident',
    GENERAL_CTI: 'threat_intel',
  };
  const articleCategory = categoryMap[v2Report.report_type] || 'threat_intel';

  const extractedCves = v2Report.enrichment.cve_id ? [v2Report.enrichment.cve_id] : [];
  const extractedActors = v2Report.claims
    .filter(c => c.claim_id.startsWith('clm_actor_') && c.claim_type === 'CONFIRMED_FACT')
    .map(c => {
      const m = c.statement.match(/threat actor ([^()]+)/i);
      return m ? m[1].trim() : null;
    })
    .filter((a): a is string => Boolean(a));
  const extractedMalware = v2Report.claims
    .filter(c => c.claim_id.startsWith('clm_malware_') && c.claim_type === 'CONFIRMED_FACT')
    .map(c => {
      const m = c.statement.match(/payload identified as ([^()]+)/i);
      return m ? m[1].trim() : null;
    })
    .filter((m): m is string => Boolean(m));
  const extractedTechniques = v2Report.attack_mappings.map(m => m.technique_id);

  const tagsPayload = JSON.stringify({
    cves: extractedCves,
    actors: extractedActors,
    malware: extractedMalware,
    techniques: extractedTechniques,
    archetype: v2Report.report_type,
  });

  if (options.db) {
    try {
      await options.db.prepare(`
        INSERT INTO articles (
          id, title, slug, dek, content, excerpt, author, category, tags,
          severity, confidence, ai_summary, read_time, is_published, is_featured, is_breaking,
          canonical_intel_event_id, published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        ON CONFLICT(slug) DO UPDATE SET
          title = excluded.title,
          content = excluded.content,
          severity = excluded.severity,
          confidence = excluded.confidence,
          ai_summary = excluded.ai_summary,
          updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
      `).bind(
        articleId,
        headline,
        slug,
        v2Report.executive_summary,
        fullContent,
        v2Report.executive_summary,
        'ZAYRON-X Cyber Intelligence Unit',
        articleCategory,
        tagsPayload,
        v2Report.severity,
        v2Report.confidence.overall_confidence,
        v2Report.executive_summary,
        Math.max(1, Math.ceil(fullContent.split(/\s+/).length / 200)),
        v2Report.priority === 'P1' ? 1 : 0,
        isCritical ? 1 : 0,
        eventId
      ).run();
    } catch (dbErr) {
      console.warn('[PUBLISHER] Failed to persist v2 article to D1:', dbErr);
    }
  }

  const platforms = ['telegram', 'twitter', 'linkedin'];
  const publicationKeys = platforms.map(p => `${eventId}:${p}:v3.0`);

  const publishResult: CanonicalV2PublishResult = {
    status: 'PUBLISHED',
    canonical_public_url: canonicalPublicUrl,
    article: {
      title: headline,
      slug,
      seoTitle: `${headline} | ZAYRON-X Cyber Intelligence`,
      metaDescription: v2Report.executive_summary,
      depth: 'DEEP',
      wordCount: fullContent.split(/\s+/).length,
      markdownContent: fullContent,
      jsonLd: {},
      tags: v2Report.enrichment.cve_id ? [v2Report.enrichment.cve_id] : [],
    },
    distribution: {
      score: 100,
      priority: v2Report.priority,
      route: 'FULL_DISTRIBUTION',
      reason: 'Approved via Zero-Defect Operational Standard',
    },
    derivatives: {
      telegram: `🚨 *Z.X.INTELLIGENCE: ${headline}*\n\nSeverity: *${v2Report.severity}* (Priority: ${v2Report.priority})\n${v2Report.executive_summary}\n\n🔗 Full Analysis: ${canonicalPublicUrl}`,
      twitter: `[ZAYRON-X] ${headline}\nSeverity: ${v2Report.severity}\n${canonicalPublicUrl}`,
      linkedin: `${headline}\n\n${v2Report.executive_summary}\n\nRead more at ${canonicalPublicUrl}`,
    } as any,
    qualityGate: {
      passed: true,
      violations: [],
    },
    publicationKeys,
    v2Report,
    zeroDefectMetric,
  };

  if (options.publishQueue && publishResult.derivatives) {
    try {
      await options.publishQueue.send({
        type: 'PUBLISH_INTELLIGENCE',
        eventId,
        articleId: slug,
        telegramMessage: publishResult.derivatives.telegram,
        idempotencyKey: `${eventId}:telegram:v3.0`,
      });
    } catch (qErr) {
      console.warn('[PUBLISHER] Failed to queue publish job:', qErr);
    }
  }

  // Mandatory Real-Time Search Engine Push (IndexNow Protocol)
  submitUrlsToIndexNow([canonicalPublicUrl]).catch((idxErr) => {
    console.warn('[PUBLISHER] IndexNow notification warning:', idxErr);
  });

  return publishResult;
}
