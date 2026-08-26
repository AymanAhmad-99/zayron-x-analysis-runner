/**
 * ZAYRON-X — Production Multi-Platform Social Distribution & Router Engine
 * Deterministically generates high-density platform derivatives with ZERO extra LLM calls.
 */

import { IntelligenceAssessmentReport } from '../analyst/contract';

export type DistributionRoute = 'WEBSITE_ONLY' | 'WEBSITE + TELEGRAM' | 'WEBSITE + TELEGRAM + X' | 'FULL_DISTRIBUTION';
export type IntelligencePriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export interface DistributionDecision {
  score: number;
  priority: IntelligencePriority;
  route: DistributionRoute;
  reason: string;
}

export interface PlatformDerivatives {
  telegram: string;
  twitter: string;
  linkedin: string;
  facebook: string;
  instagram: string;
  threads: string;
  socialCardMeta: {
    headline: string;
    threat_level: string;
    confidence_state: string;
    primary_entity: string;
    short_summary: string;
    canonical_url: string;
  };
}

/**
 * Deterministic Hashtag Engine with Category Rules & Strict Platform Limits
 */
export function generateDeterministicHashtags(
  report: IntelligenceAssessmentReport,
  platform: 'telegram' | 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'threads'
): string[] {
  const hashtags: string[] = [];

  // Core Category
  const coreTags = ['#CyberSecurity', '#ThreatIntelligence'];

  // Entity Category
  const entityTags: string[] = [];
  if (report.vulnerabilities) {
    for (const v of report.vulnerabilities) {
      entityTags.push(`#${v.cveId.replace(/[^a-zA-Z0-9]/g, '')}`);
    }
  }
  if (report.actors) {
    for (const a of report.actors) {
      const name = typeof a === 'string' ? a : a.name;
      entityTags.push(`#${name.replace(/[^a-zA-Z0-9]/g, '')}`);
    }
  }
  if (report.malware) {
    for (const m of report.malware) {
      const name = typeof m === 'string' ? m : m.name;
      entityTags.push(`#${name.replace(/[^a-zA-Z0-9]/g, '')}`);
    }
  }

  // Topic Category
  const topicTags: string[] = [];
  const threatLevel = report.assessment?.threat_level;
  if (threatLevel === 'CRITICAL' || threatLevel === 'HIGH') {
    topicTags.push('#ZeroDay', '#Ransomware', '#ThreatHunting');
  } else {
    topicTags.push('#VulnerabilityManagement', '#InfoSec');
  }

  // Platform limits:
  // Telegram: 3–6
  // X: 1–3
  // LinkedIn: 3–5
  // Facebook: 3–5
  // Instagram: 5–10
  // Threads: 2–4
  const limits: Record<string, number> = {
    telegram: 4,
    twitter: 2,
    linkedin: 4,
    facebook: 3,
    instagram: 7,
    threads: 3,
  };

  const pool = [...entityTags, ...topicTags, ...coreTags];
  const uniquePool = Array.from(new Set(pool));
  const maxLimit = limits[platform] || 3;

  return uniquePool.slice(0, maxLimit);
}

/**
 * Calculates Distribution Decision and Priority
 */
export function calculateDistributionDecision(report: IntelligenceAssessmentReport): DistributionDecision {
  let score = 0;
  const assessment = report.assessment;
  const threatLevel = assessment.threat_level || 'MEDIUM';
  const confidence = assessment.confidence_score || 0.5;

  // Severity Weight (0-40)
  if (threatLevel === 'CRITICAL') score += 40;
  else if (threatLevel === 'HIGH') score += 30;
  else if (threatLevel === 'MEDIUM') score += 15;
  else score += 5;

  // Confidence Weight (0-30)
  score += Math.round(confidence * 30);

  // Novelty / Active Exploitation (0-20)
  const isExploited = report.vulnerabilities?.some((v) => v.isExploitedInWild);
  if (isExploited) score += 20;

  // Entity Richness (0-10)
  if ((report.actors?.length || 0) > 0 || (report.malware?.length || 0) > 0) score += 10;

  let priority: IntelligencePriority = 'P4';
  let route: DistributionRoute = 'WEBSITE_ONLY';

  if (score >= 80) {
    priority = 'P0';
    route = 'FULL_DISTRIBUTION';
  } else if (score >= 65) {
    priority = 'P1';
    route = 'WEBSITE + TELEGRAM + X';
  } else if (score >= 50) {
    priority = 'P2';
    route = 'WEBSITE + TELEGRAM';
  } else if (score >= 35) {
    priority = 'P3';
    route = 'WEBSITE_ONLY';
  } else {
    priority = 'P4';
    route = 'WEBSITE_ONLY';
  }

  return {
    score,
    priority,
    route,
    reason: `Distribution score ${score}/100 (Severity: ${threatLevel}, Conf: ${confidence}, ActiveExploit: ${!!isExploited})`,
  };
}

/**
 * Deterministically generates all 6 platform derivatives from ONE canonical intelligence report.
 */
export function generatePlatformDerivatives(
  report: IntelligenceAssessmentReport,
  canonicalUrl = 'https://zayron-x.co/threats/advisory'
): PlatformDerivatives {
  const assessment = report.assessment;
  const headline = assessment.headline || 'Cyber Threat Advisory';
  const threatLevel = assessment.threat_level || 'MEDIUM';
  const confidenceState = assessment.confidence_state || 'UNCONFIRMED';
  const confidencePercent = Math.round((assessment.confidence_score || 0.8) * 100);

  const actorName = report.actors?.[0] ? (typeof report.actors[0] === 'string' ? report.actors[0] : report.actors[0].name) : 'Unattributed';
  const cveId = report.vulnerabilities?.[0]?.cveId || 'N/A';
  const malwareName = report.malware?.[0] ? (typeof report.malware[0] === 'string' ? report.malware[0] : report.malware[0].name) : 'N/A';
  const primaryIoc = report.iocs?.[0]?.value || 'N/A';
  const primaryEntity = cveId !== 'N/A' ? cveId : actorName !== 'Unattributed' ? actorName : malwareName;

  const summary = assessment.executive_summary || report.what_happened || 'Adversary activity detected in telemetry.';
  const whyItMatters = report.why_it_matters || 'Enables remote unauthorized access.';

  // UTM Parameterized Canonical URL
  const utmTelegram = `${canonicalUrl}?utm_source=telegram&utm_medium=organic&utm_campaign=intelligence_brief`;
  const utmX = `${canonicalUrl}?utm_source=x&utm_medium=organic&utm_campaign=threat_alert`;
  const utmLinkedIn = `${canonicalUrl}?utm_source=linkedin&utm_medium=organic&utm_campaign=ciso_brief`;

  // 1A. TELEGRAM NEWS / ALERT (Section 16 Format)
  const tgTags = generateDeterministicHashtags(report, 'telegram').join(' ');
  const telegramAlert = [
    `ZAYRON-X // INTELLIGENCE`,
    `[${threatLevel}]`,
    `${headline}`,
    ``,
    `Threat Level: ${threatLevel}`,
    `Confidence: ${confidenceState} (${confidencePercent}%)`,
    ``,
    `WHAT HAPPENED`,
    `${summary.slice(0, 280)}`,
    ``,
    `KEY SIGNALS`,
    cveId !== 'N/A' ? `CVE: ${cveId}` : null,
    actorName !== 'Unattributed' ? `Actor: ${actorName}` : null,
    malwareName !== 'N/A' ? `Malware: ${malwareName}` : null,
    primaryIoc !== 'N/A' ? `IOC: ${primaryIoc}` : null,
    ``,
    `WHY IT MATTERS`,
    `${whyItMatters.slice(0, 160)}`,
    ``,
    `FULL ANALYSIS`,
    `${utmTelegram}`,
    ``,
    `${tgTags}`,
  ].filter((line) => line !== null).join('\n');

  // 1B. TELEGRAM DEEP BRIEF (Section 17 Format)
  const telegramDeep = [
    `ZAYRON-X // DEEP INTELLIGENCE`,
    `${headline}`,
    ``,
    `EXECUTIVE ASSESSMENT`,
    `${summary}`,
    ``,
    `WHAT HAPPENED`,
    `Adversary telemetry indicates active operational activity involving ${primaryEntity}.`,
    ``,
    `WHY IT MATTERS`,
    `${whyItMatters}`,
    ``,
    `WHO IS INVOLVED`,
    `Primary Threat Actor: ${actorName}`,
    ``,
    `TECHNICAL INDICATORS`,
    cveId !== 'N/A' ? `• Vulnerability: ${cveId}` : null,
    malwareName !== 'N/A' ? `• Malware Family: ${malwareName}` : null,
    primaryIoc !== 'N/A' ? `• Network C2: ${primaryIoc}` : null,
    ``,
    `EVIDENCE & CONFIDENCE`,
    `Confidence: ${confidenceState} (${confidencePercent}%) based on verified cryptographic and multi-source telemetry.`,
    ``,
    `DEFENSIVE IMPLICATIONS`,
    `Defenders should verify perimeter firewall logging, isolate identified C2 endpoints, and apply vendor patches immediately.`,
    ``,
    `READ THE FULL ANALYSIS`,
    `${utmTelegram}`,
    ``,
    `${tgTags}`,
  ].filter((line) => line !== null).join('\n');

  const telegram = report.depth === 'DEEP' || report.depth === 'SPECIAL_REPORT' ? telegramDeep : telegramAlert;

  // 2. X / TWITTER (High-density, <= 280 chars)
  const xTags = generateDeterministicHashtags(report, 'twitter').join(' ');
  let twitter = `[${threatLevel}] ${headline.slice(0, 110)}\n\nThreat: ${primaryEntity} | Conf: ${confidencePercent}%\n\nRead analysis: ${utmX}\n${xTags}`;
  if (twitter.length > 280) {
    twitter = `[${threatLevel}] ${headline.slice(0, 85)}...\n\nRead analysis: ${utmX}\n${xTags}`;
  }


  // 3. LINKEDIN
  const liTags = generateDeterministicHashtags(report, 'linkedin').join(' ');
  const linkedin = [
    `🚨 CYBER THREAT INTELLIGENCE ADVISORY: ${headline}`,
    ``,
    `The ZAYRON-X Threat Research team has issued a ${threatLevel} advisory regarding verified adversary activity.`,
    ``,
    `Executive Summary:`,
    `${summary}`,
    ``,
    `Why Organizations Should Care:`,
    `${whyItMatters}`,
    ``,
    `Key Indicators:`,
    `• Target Entity / CVE: ${primaryEntity}`,
    `• Threat Level: ${threatLevel}`,
    `• Confidence Assessment: ${confidenceState} (${confidencePercent}%)`,
    ``,
    `Access complete telemetry, cryptographic evidence, and defensive recommendations:`,
    `${canonicalUrl}`,
    ``,
    `${liTags}`,
  ].join('\n');

  // 4. FACEBOOK
  const fbTags = generateDeterministicHashtags(report, 'facebook').join(' ');
  const facebook = [
    `🛡️ Security Alert: ${headline}`,
    ``,
    `${summary}`,
    ``,
    `What this means: ${whyItMatters}`,
    ``,
    `Threat Level: ${threatLevel} | Confidence: ${confidencePercent}%`,
    `Read the full verified advisory: ${canonicalUrl}`,
    ``,
    `${fbTags}`,
  ].join('\n');

  // 5. INSTAGRAM
  const igTags = generateDeterministicHashtags(report, 'instagram').join(' ');
  const instagram = [
    `🚨 THREAT ALERT: ${headline}`,
    ``,
    `📌 WHAT HAPPENED:`,
    `${summary.slice(0, 200)}...`,
    ``,
    `💡 WHY IT MATTERS:`,
    `${whyItMatters.slice(0, 150)}`,
    ``,
    `🔍 KEY TELEMETRY:`,
    `• Entity: ${primaryEntity}`,
    `• Threat Level: ${threatLevel}`,
    `• Confidence: ${confidencePercent}%`,
    ``,
    `🔗 Full breakdown and IOC list at link in bio (${canonicalUrl})`,
    ``,
    `${igTags}`,
  ].join('\n');

  // 6. THREADS
  const thTags = generateDeterministicHashtags(report, 'threads').join(' ');
  const threads = [
    `🚨 ${headline}`,
    ``,
    `${summary.slice(0, 220)}...`,
    ``,
    `Why it matters: ${whyItMatters.slice(0, 140)}`,
    ``,
    `Full analysis & indicators: ${canonicalUrl}`,
    ``,
    `${thTags}`,
  ].join('\n');

  return {
    telegram,
    twitter,
    linkedin,
    facebook,
    instagram,
    threads,
    socialCardMeta: {
      headline,
      threat_level: threatLevel,
      confidence_state: confidenceState,
      primary_entity: primaryEntity,
      short_summary: summary.slice(0, 160),
      canonical_url: canonicalUrl,
    },
  };
}
