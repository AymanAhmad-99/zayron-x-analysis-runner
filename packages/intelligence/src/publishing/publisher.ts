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
  } = {}
): Promise<PublishResult> {
  const eventId = options.eventId || `evt_${crypto.randomUUID().slice(0, 12)}`;
  const siteUrl = options.siteUrl || 'https://zayron-x.co';

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
    };
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
  };
}
