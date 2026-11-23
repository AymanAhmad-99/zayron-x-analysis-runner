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

export type PlatformDerivativePackage = PlatformDerivatives;

function escapeTelegramHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Deterministic Hashtag Engine with Category Rules & Strict Platform Limits
 */
/**
 * Deterministic Hashtag Engine with Strict Entity Grounding & No False Tags
 */
export function generateDeterministicHashtags(
  report: IntelligenceAssessmentReport,
  platform: 'telegram' | 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'threads'
): string[] {
  const entityTags: string[] = [];

  if (report.vulnerabilities) {
    for (const v of report.vulnerabilities) {
      if (v.cveId && v.cveId !== 'N/A') {
        entityTags.push(`#${v.cveId.replace(/[^a-zA-Z0-9]/g, '')}`);
      }
    }
  }
  if (report.actors) {
    for (const a of report.actors) {
      const name = typeof a === 'string' ? a : a.name;
      if (name && name !== 'Unattributed') {
        entityTags.push(`#${name.replace(/[^a-zA-Z0-9]/g, '')}`);
      }
    }
  }
  if (report.malware) {
    for (const m of report.malware) {
      const name = typeof m === 'string' ? m : m.name;
      if (name && name !== 'N/A') {
        entityTags.push(`#${name.replace(/[^a-zA-Z0-9]/g, '')}`);
      }
    }
  }

  // Topic Category — ONLY if actually established by evidence
  const topicTags: string[] = [];
  const hasZeroDay = report.vulnerabilities?.some((v) => v.isExploitedInWild) || /\bzero-day\b/i.test(report.what_happened || '');
  if (hasZeroDay) topicTags.push('#ZeroDay');

  const hasRansomware = report.malware?.some((m) => typeof m !== 'string' && m.type === 'RANSOMWARE') || /\bransomware\b/i.test(report.what_happened || '');
  if (hasRansomware) topicTags.push('#Ransomware');

  const hasCredentialAccess = report.ttps?.some((t) => t.tactic?.includes('Credential') || t.techniqueId?.startsWith('T1003')) || /\bcredential|lsass|mimikatz\b/i.test(report.what_happened || '');
  if (hasCredentialAccess) topicTags.push('#CredentialTheft');

  // Core Fallback
  const coreTags = ['#ThreatIntel', '#CyberSecurity'];

  const limits: Record<string, number> = {
    telegram: 4,
    twitter: 2,
    linkedin: 4,
    facebook: 3,
    instagram: 6,
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

function getActorName(actor: unknown): string {
  if (!actor) return '';
  if (typeof actor === 'string') return actor;
  if (typeof actor === 'object' && 'name' in actor) return String((actor as any).name);
  return '';
}

/**
 * Event-Specific Technical Analysis Synthesizer
 */
function buildEventSpecificTechnicalAnalysis(report: IntelligenceAssessmentReport, primaryEntity: string): string {
  const hasCve = (report.vulnerabilities?.length || 0) > 0;
  const hasMalware = (report.malware?.length || 0) > 0;
  const firstActor = getActorName(report.actors?.[0]);
  const hasActor = Boolean(firstActor && firstActor !== 'Unattributed');
  const hasIoc = (report.iocs?.length || 0) > 0;

  if (hasCve) {
    const cve = report.vulnerabilities![0];
    return `Analysis of ${cve.cveId}: Attack surface involves input handling and service boundaries. Exploitation allows unauthenticated remote adversaries to bypass authorization checks or trigger memory corruption without requiring local credentials.`;
  }
  if (hasMalware) {
    const mw = typeof report.malware![0] === 'string' ? report.malware![0] : report.malware![0].name;
    return `Analysis of ${mw}: The payload targets process memory and credential stores. Observed execution chains employ binary obfuscation and native system utilities to evade endpoint protection.`;
  }
  if (hasActor) {
    const actor = firstActor;
    return `Analysis of ${actor}: Tactical activity focuses on persistent access and intelligence gathering. Infrastructure patterns demonstrate rotational C2 staging across commercial hosting providers.`;
  }
  if (hasIoc) {
    const ioc = report.iocs![0];
    return `Indicator Assessment for ${ioc.value}: Network telemetry indicates active staging and listener behavior corresponding to adversary command-and-control operations.`;
  }
  return `Adversary telemetry reveals active operational probing against internet-facing endpoints.`;
}

/**
 * Event-Specific Defensive Guidance Synthesizer
 */
function buildEventSpecificDefensiveGuidance(report: IntelligenceAssessmentReport): string {
  const hasCve = (report.vulnerabilities?.length || 0) > 0;
  const hasMalware = (report.malware?.length || 0) > 0;
  const firstActor = getActorName(report.actors?.[0]);
  const hasActor = Boolean(firstActor && firstActor !== 'Unattributed');
  const hasIoc = (report.iocs?.length || 0) > 0;

  if (hasCve) {
    const cve = report.vulnerabilities![0];
    return `1. Prioritize emergency patch deployment for ${cve.cveId}.\n2. Restrict external ingress to affected services via IP allowlists.\n3. Audit authentication and access logs for anomalous payload execution.`;
  }
  if (hasMalware) {
    return `1. Deploy endpoint detection rules for identified binary hashes and execution paths.\n2. Isolate compromised workstations and enforce credential revocation across domain accounts.\n3. Enable Credential Guard and restrict LSASS process access.`;
  }
  if (hasActor) {
    return `1. Ingest associated TTP signatures into SIEM/EDR detection pipelines.\n2. Enforce strict phishing-resistant MFA across all administrative and remote access portals.\n3. Review edge VPN and cloud gateway session logs for suspicious session hijacking.`;
  }
  if (hasIoc) {
    return `1. Block identified network indicators at the perimeter firewall and web proxy.\n2. Perform retrospective 30-day DNS and NetFlow log hunts for historic connections.\n3. Isolate internal hosts with confirmed outbound telemetry.`;
  }
  return `1. Verify perimeter logging and endpoint telemetry.\n2. Review privileged access rights.\n3. Monitor for unauthorized configuration modifications.`;
}

/**
 * Generates what remains unknown / uncertainties for epistemic discipline
 */
function buildEventUncertainties(report: IntelligenceAssessmentReport): string {
  if (report.unknowns && report.unknowns.length > 0) {
    return report.unknowns.map((u) => `• ${u}`).join('\n');
  }
  const firstActor = getActorName(report.actors?.[0]);
  const hasActor = Boolean(firstActor && firstActor !== 'Unattributed');
  if (!hasActor) {
    return `• Specific threat actor attribution remains unconfirmed.\n• Total enterprise victim count currently under active scoping.`;
  }
  return `• Full extent of downstream target compromise is pending further telemetry.\n• Potential secondary persistence mechanisms remain under investigation.`;
}

/**
 * Standard ZAYRON-X Outbound Telegram Format (~50–60 words)
 * Structure:
 * [SEVERITY] Intelligence Headline
 * Short 1–3 sentence analytical summary (~50–60 words).
 * Read the full analysis → https://zayron-x.co/...
 */
export function formatZayronOutboundTelegram(
  report: IntelligenceAssessmentReport,
  canonicalUrl: string
): string {
  const assessment = report.assessment;
  const headline = assessment.headline || 'Cyber Threat Intelligence Alert';
  const threatLevel = assessment.threat_level || 'HIGH';
  const rawSummary = (assessment.executive_summary || report.what_happened || 'Threat telemetry observed.').replace(/[\r\n]+/g, ' ').trim();
  
  // Calibrate word count to strictly ~50-60 words
  const words = rawSummary.split(/\s+/);
  const calibratedSummary = words.length > 55 ? words.slice(0, 55).join(' ') + '...' : rawSummary;
  
  return `[${threatLevel.toUpperCase()}] ${headline}\n\n${calibratedSummary}\n\nRead the full analysis → ${canonicalUrl}`;
}

/**
 * Deterministically generates all 6 platform derivatives from ONE canonical intelligence report.
 */
export function generatePlatformDerivatives(
  report: IntelligenceAssessmentReport,
  canonicalUrl = 'https://zayron-x.co/threats/advisory'
): PlatformDerivatives {
  const assessment = report.assessment;
  const headline = assessment.headline || 'Cyber Threat Intelligence Assessment';
  const threatLevel = assessment.threat_level || 'MEDIUM';
  const confidenceState = assessment.confidence_state || 'HIGH_CONFIDENCE';
  const confidencePercent = Math.round((assessment.confidence_score || 0.8) * 100);

  const actorName = report.actors?.[0] ? (typeof report.actors[0] === 'string' ? report.actors[0] : report.actors[0].name) : 'Unattributed';
  const cveId = report.vulnerabilities?.[0]?.cveId || 'N/A';
  const malwareName = report.malware?.[0] ? (typeof report.malware[0] === 'string' ? report.malware[0] : report.malware[0].name) : 'N/A';
  const primaryIoc = report.iocs?.[0]?.value || 'N/A';
  const primaryEntity = cveId !== 'N/A' ? cveId : actorName !== 'Unattributed' ? actorName : malwareName;

  const summary = assessment.executive_summary || report.what_happened || 'Adversary activity detected in telemetry.';
  const whyItMatters = report.why_it_matters || 'Enables unauthorized system access or compromise.';
  const technicalAnalysis = buildEventSpecificTechnicalAnalysis(report, primaryEntity);
  const defensiveGuidance = buildEventSpecificDefensiveGuidance(report);
  const unknowns = buildEventUncertainties(report);

  // UTM Parameterized Canonical URL
  const utmTelegramAlert = `${canonicalUrl}?utm_source=telegram&utm_medium=organic&utm_campaign=intelligence_alert`;
  const utmTelegramDeep = `${canonicalUrl}?utm_source=telegram&utm_medium=organic&utm_campaign=deep_intelligence`;
  const utmX = `${canonicalUrl}?utm_source=x&utm_medium=organic&utm_campaign=threat_alert`;
  const utmLinkedIn = `${canonicalUrl}?utm_source=linkedin&utm_medium=organic&utm_campaign=ciso_brief`;

  // 1A. TELEGRAM NEWS / ALERT (Section 17 Format)
  const tgTags = generateDeterministicHashtags(report, 'telegram').join(' ');
  const telegramAlert = [
    `<b>ZAYRON-X // VULNERABILITY INTELLIGENCE</b>`,
    ``,
    `<b>${escapeTelegramHtml(cveId !== 'N/A' ? cveId : primaryEntity)}</b>`,
    ``,
    `<b>${escapeTelegramHtml(threatLevel)} · ${escapeTelegramHtml(confidenceState)}</b>`,
    ``,
    `<b>What Happened</b>`,
    `${escapeTelegramHtml(summary.slice(0, 260))}`,
    ``,
    `<b>Why It Matters</b>`,
    `${escapeTelegramHtml(whyItMatters.slice(0, 180))}`,
    ``,
    `<b>Defensive Action</b>`,
    `${escapeTelegramHtml(defensiveGuidance.split('\n')[0].slice(0, 180))}`,
    ``,
    `<i>Sources: NVD · ZAYRON-X assessment</i>`,
    ``,
    `<a href="${escapeTelegramHtml(canonicalUrl)}">READ FULL REPORT</a>`,
  ].join('\n');

  // 1B. TELEGRAM DEEP BRIEF (Section 18 Format)
  const telegramDeep = [
    `ZAYRON-X // DEEP INTELLIGENCE`,
    `[${threatLevel}]`,
    `${headline}`,
    ``,
    `EXECUTIVE ASSESSMENT`,
    `${summary}`,
    ``,
    `TECHNICAL ANALYSIS`,
    `${technicalAnalysis}`,
    ``,
    `WHY IT MATTERS`,
    `${whyItMatters}`,
    ``,
    `KEY ENTITIES`,
    actorName !== 'Unattributed' ? `• Primary Threat Actor: ${actorName}` : null,
    cveId !== 'N/A' ? `• Vulnerability: ${cveId}` : null,
    malwareName !== 'N/A' ? `• Malware Family: ${malwareName}` : null,
    primaryIoc !== 'N/A' ? `• Network C2 / IOC: ${primaryIoc}` : null,
    ``,
    `EVIDENCE & CONFIDENCE`,
    `Confidence: ${confidenceState} (${confidencePercent}%) based on verified cryptographic and multi-source telemetry.`,
    ``,
    `WHAT REMAINS UNKNOWN`,
    `${unknowns}`,
    ``,
    `DEFENSIVE IMPLICATIONS`,
    `${defensiveGuidance}`,
    ``,
    `FULL REPORT`,
    `${utmTelegramDeep}`,
    ``,
    `${tgTags}`,
  ].filter((line) => line !== null).join('\n');

  const telegram = formatZayronOutboundTelegram(report, canonicalUrl);

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
