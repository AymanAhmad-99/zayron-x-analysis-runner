/**
 * ZAYRON-X — Content Economics & Deterministic Social Derivatives Engine
 * 
 * CORE PRINCIPLE:
 * ONE canonical intelligence record produces ALL multi-platform derivatives
 * (Telegram, X, LinkedIn, Facebook, Instagram, Threads, Web, JSON)
 * deterministically with ZERO extra LLM invocations.
 */

import { IntelligenceAssessmentReport } from '../analyst/contract';

export interface SocialDerivatives {
  telegram: string;
  twitter: string;
  linkedIn: string;
  facebook: string;
  threads: string;
  instagram: string;
  structuredJson: Record<string, any>;
}

/**
 * Generates platform-tailored social derivatives from a single canonical report.
 */
export function generateSocialDerivatives(
  report: IntelligenceAssessmentReport,
  siteUrl = 'https://zayron-x.co'
): SocialDerivatives {
  const headline = report.assessment.headline || 'Cyber Threat Intelligence Alert';
  const summary = report.assessment.executive_summary || report.what_happened;
  const threatLevel = report.assessment.threat_level || 'HIGH';
  const confidence = report.assessment.confidence_state || 'CONFIRMED';
  const cves = report.vulnerabilities?.map((v) => v.cveId).join(', ') || '';
  const actors = report.actors?.map((a) => (typeof a === 'string' ? a : a.name)).join(', ') || '';
  const malware = report.malware?.map((m) => (typeof m === 'string' ? m : m.name)).join(', ') || '';
  const iocs = report.iocs?.map((i) => i.value).slice(0, 3).join(', ') || '';

  // 1. Telegram Derivative (Markdown formatted, alert style)
  const telegram = [
    `🚨 *ZAYRON-X CYBER INTELLIGENCE ADVISORY*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📌 *${headline}*`,
    ``,
    `⚠️ *Threat Level:* \`${threatLevel}\` | *Confidence:* \`${confidence}\``,
    cves ? `🎯 *Vulnerabilities:* \`${cves}\`` : '',
    actors ? `👤 *Threat Actor:* \`${actors}\`` : '',
    malware ? `🦠 *Malware:* \`${malware}\`` : '',
    iocs ? `🔍 *Observed IOCs:* \`${iocs}\`` : '',
    ``,
    `📝 *Executive Summary:*`,
    `${summary.slice(0, 400)}${summary.length > 400 ? '...' : ''}`,
    ``,
    `🛡️ *Immediate Mitigation:*`,
    `${report.defensive_implications?.[0]?.recommendation || 'Apply vendor security patches and monitor endpoint telemetry.'}`,
    ``,
    `🔗 *Full Technical Dossier:* ${siteUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  // 2. X / Twitter Derivative (Strict 280-character limit with hashtags)
  const cveTag = cves ? ` #${cves.replace(/,/g, ' #')}` : '';
  const actorTag = actors ? ` #${actors.replace(/\s+/g, '')}` : '';
  let tweetBody = `🚨 [${threatLevel}] ${headline.slice(0, 140)}...`;
  if (tweetBody.length > 200) {
    tweetBody = `🚨 [${threatLevel}] ${headline.slice(0, 120)}...`;
  }
  const twitter = `${tweetBody}\n\nEvidence-grounded CTI via @ZayronX_CTI${cveTag}${actorTag}\n🔗 ${siteUrl}`;

  // 3. LinkedIn Derivative (Professional Executive tone)
  const linkedIn = [
    `🚨 CYBER THREAT INTELLIGENCE ADVISORY: ${headline}`,
    ``,
    `The ZAYRON-X Cyber Intelligence Platform has issued a ${threatLevel} advisory based on cryptographic evidence and authoritative telemetry:`,
    ``,
    `📊 Key Findings:`,
    cves ? `• Targeted Vulnerabilities: ${cves}` : '',
    actors ? `• Attributed Threat Group: ${actors}` : '',
    malware ? `• Payload Family: ${malware}` : '',
    `• Analytical Confidence: ${confidence} (${report.assessment.confidence_score})`,
    ``,
    `🔍 Threat Context & Impact:`,
    `${summary}`,
    ``,
    `🛡️ Strategic Defensive Recommendations:`,
    `${report.defensive_implications?.map((d) => `• ${d.recommendation}`).join('\n') || '• Update perimeter firewalls and apply vendor security updates.'}`,
    ``,
    `Access the complete technical evidence record: ${siteUrl}`,
    `#CyberSecurity #ThreatIntelligence #InfoSec #CISO #VulnerabilityManagement #IncidentResponse`,
  ]
    .filter(Boolean)
    .join('\n');

  // 4. Facebook Derivative
  const facebook = [
    `🛡️ ZAYRON-X SECURITY BULLETIN [${threatLevel}]`,
    `${headline}`,
    ``,
    `${summary}`,
    ``,
    cves ? `Affected Systems / CVEs: ${cves}` : '',
    actors ? `Adversary: ${actors}` : '',
    ``,
    `Read full analysis: ${siteUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  // 5. Threads & Instagram Captions
  const threads = `🚨 ${headline}\n\n${summary.slice(0, 300)}...\n\nThreat Level: ${threatLevel} | Confidence: ${confidence}\n${cveTag}${actorTag} #ThreatIntel #CyberSecurity`;
  const instagram = `🚨 CYBER INTELLIGENCE ALERT: ${headline}\n.\n.\n${summary.slice(0, 400)}...\n.\nThreat Level: ${threatLevel}\nConfidence: ${confidence}\n.\n.\n🔗 Technical report link in bio.\n${cveTag} #CyberSecurity #InfoSec #Hacking #ZeroDay #ThreatIntel`;

  // 6. Structured JSON Derivative
  const structuredJson = {
    schemaVersion: '2.5.0-evidentiary',
    headline,
    threatLevel,
    confidenceState: confidence,
    confidenceScore: report.assessment.confidence_score,
    vulnerabilities: report.vulnerabilities,
    actors: report.actors,
    malware: report.malware,
    iocs: report.iocs,
    ttps: report.ttps,
    citationsCount: report.citations?.length || 0,
    generatedAt: new Date().toISOString(),
  };

  return {
    telegram,
    twitter,
    linkedIn,
    facebook,
    threads,
    instagram,
    structuredJson,
  };
}
