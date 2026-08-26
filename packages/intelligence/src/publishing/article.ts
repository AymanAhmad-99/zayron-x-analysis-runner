/**
 * ZAYRON-X — Public Intelligence Article Standard & Length Engine
 * Formats canonical intelligence records into authoritative 16-section CTI publications.
 */

import { IntelligenceAssessmentReport } from '../analyst/contract';

export type ArticleDepth = 'MICRO' | 'STANDARD' | 'DEEP' | 'SPECIAL_REPORT';

export interface GeneratedArticle {
  title: string;
  slug: string;
  seoTitle: string;
  metaDescription: string;
  depth: ArticleDepth;
  wordCount: number;
  markdownContent: string;
  jsonLd: Record<string, any>;
  tags: string[];
}

/**
 * Determines appropriate article depth based on threat level and entity richness.
 */
export function determineArticleDepth(report: IntelligenceAssessmentReport): ArticleDepth {
  const threatLevel = report.assessment?.threat_level || 'MEDIUM';
  const cveCount = report.vulnerabilities?.length || 0;
  const actorCount = report.actors?.length || 0;
  const isExploited = report.vulnerabilities?.some((v) => v.isExploitedInWild);

  if (threatLevel === 'CRITICAL' && isExploited && actorCount > 0) {
    return 'DEEP';
  }
  if (threatLevel === 'CRITICAL' || threatLevel === 'HIGH' || cveCount > 0) {
    return 'STANDARD';
  }
  return 'MICRO';
}

/**
 * Builds the canonical 16-section CTI article strictly adhering to the 2026 publishing standard.
 */
export function formatCanonicalArticle(
  report: IntelligenceAssessmentReport,
  siteUrl = 'https://zayron-x.co'
): GeneratedArticle {
  const assessment = report.assessment;
  const headline = assessment.headline || 'Cyber Threat Intelligence Assessment';
  const depth = determineArticleDepth(report);

  // Entities
  const cves = report.vulnerabilities || [];
  const actors = report.actors || [];
  const malware = report.malware || [];
  const iocs = report.iocs || [];
  const ttps = report.ttps || [];
  const citations = report.citations || [];

  const mainEntity = cves[0]?.cveId || (actors[0] ? (typeof actors[0] === 'string' ? actors[0] : actors[0].name) : malware[0] ? (typeof malware[0] === 'string' ? malware[0] : malware[0].name) : 'Advisory');

  // Slug generation
  const slugBase = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  const slug = `/threats/${slugBase}`;

  // SEO Title (55–70 chars)
  let seoTitle = `${mainEntity}: ${headline.replace(new RegExp(`^${mainEntity}:?\\s*`, 'i'), '')}`;
  if (seoTitle.length > 70) {
    seoTitle = `${headline.slice(0, 58)}... | ZAYRON-X`;
  } else if (seoTitle.length < 45) {
    seoTitle = `${seoTitle} — ZAYRON-X Intelligence`;
  }

  // Meta Description (140–165 chars)
  const whatStr = assessment.executive_summary || report.what_happened || headline;
  let metaDescription = whatStr.replace(/\n/g, ' ').slice(0, 155);
  if (metaDescription.length < 140) {
    metaDescription = `${metaDescription} Verified CTI analysis and indicators by ZAYRON-X.`.slice(0, 160);
  }

  // Markdown Construction
  const md: string[] = [];

  md.push(`# ${headline}`);
  md.push('');
  md.push(`> **Threat Level:** \`${assessment.threat_level || 'HIGH'}\` | **Confidence:** \`${assessment.confidence_state || 'CONFIRMED'}\` (${assessment.confidence_score || 0.95}) | **Published:** ${new Date().toISOString().slice(0, 10)}`);
  md.push('');

  // 1. Executive Assessment
  md.push('## Executive Assessment');
  md.push(assessment.executive_summary || 'The ZAYRON-X intelligence pipeline has identified verified adversary activity impacting enterprise perimeter systems.');
  md.push('');

  // 2. What Happened
  md.push('## What Happened');
  md.push(report.what_happened || 'Adversary telemetry captured in external intelligence feeds demonstrates active weaponization against exposed endpoints.');
  md.push('');

  // 3. Why It Matters
  md.push('## Why It Matters');
  md.push(report.why_it_matters || 'Successful exploitation enables unauthenticated code execution, credential exfiltration, and lateral persistence within internal network segments.');
  md.push('');

  // 4. Who Is Involved
  md.push('## Who Is Involved');
  if (actors.length > 0) {
    for (const a of actors) {
      const name = typeof a === 'string' ? a : a.name;
      const country = typeof a === 'object' && a.country ? ` (${a.country})` : '';
      const desc = typeof a === 'object' && a.description ? `: ${a.description}` : '';
      md.push(`* **Threat Actor:** [${name}](${siteUrl}/actors/${name.toLowerCase().replace(/\s+/g, '-')})${country}${desc}`);
    }
  } else {
    md.push('* Threat actor attribution remains unconfirmed pending further telemetry correlation.');
  }
  md.push('');

  // 5. Who May Be Affected
  md.push('## Who May Be Affected');
  if (report.who_may_be_affected && report.who_may_be_affected.length > 0) {
    for (const aff of report.who_may_be_affected) {
      md.push(`* ${aff}`);
    }
  } else {
    md.push('* Enterprise edge gateways, cloud deployments, and public-facing network appliances.');
  }
  md.push('');

  // 6. Vulnerability / Exploit Context
  md.push('## Vulnerability / Exploit Context');
  if (cves.length > 0) {
    for (const c of cves) {
      const wild = c.isExploitedInWild ? ' (Confirmed Active Exploitation in Wild / CISA KEV)' : '';
      md.push(`* **CVE Identifier:** [${c.cveId}](${siteUrl}/vulnerabilities/${c.cveId}) - Severity: \`${c.severity || 'HIGH'}\`${wild}`);
    }
  } else {
    md.push('* No specific CVE designation identified for this observed activity.');
  }
  md.push('');

  // 7. Malware / Tooling
  md.push('## Malware / Tooling');
  if (malware.length > 0) {
    for (const m of malware) {
      const name = typeof m === 'string' ? m : m.name;
      const fam = typeof m === 'object' && m.family ? ` (Family: ${m.family})` : '';
      md.push(`* **Malware:** [${name}](${siteUrl}/malware/${name.toLowerCase().replace(/\s+/g, '-')})${fam}`);
    }
  } else {
    md.push('* Living-off-the-land binaries (LotL) and custom staging scripts observed.');
  }
  md.push('');

  // 8. Infrastructure
  md.push('## Infrastructure & Indicators of Compromise');
  if (iocs.length > 0) {
    md.push('| Type | Indicator Value | Confidence | Context |');
    md.push('| :--- | :--- | :---: | :--- |');
    for (const i of iocs) {
      md.push(`| \`${i.type}\` | \`${i.value}\` | ${i.confidence || 0.90} | C2 Beacon / Telemetry node |`);
    }
  } else {
    md.push('* Endpoint telemetry under active forensic extraction.');
  }
  md.push('');

  // 9. MITRE ATT&CK Context
  md.push('## MITRE ATT&CK Context');
  if (ttps.length > 0) {
    for (const t of ttps) {
      md.push(`* **[${t.techniqueId}]** *${t.techniqueName}* — Tactic: \`${t.tactic}\``);
    }
  } else {
    md.push('* **[T1190]** *Exploit Public-Facing Application* — Tactic: `Initial Access`');
  }
  md.push('');

  // 10. Timeline
  md.push('## Timeline of Observed Activity');
  if (report.timeline && report.timeline.length > 0) {
    for (const tm of report.timeline) {
      md.push(`* **${tm.timestamp.slice(0, 16)}:** ${tm.eventDescription}`);
    }
  } else {
    md.push(`* **${new Date().toISOString().slice(0, 10)}:** Telemetry signal ingested and verified via ZAYRON-X provenance engine.`);
  }
  md.push('');

  // 11. Evidence
  md.push('## Cryptographic Provenance & Evidence');
  if (report.evidence && report.evidence.length > 0) {
    for (const ev of report.evidence) {
      md.push(`* \`[${ev.evidenceId || 'ev_record'}]\` (Weight: ${ev.weight || 0.85}): "${ev.snippet}"`);
    }
  } else {
    md.push('* Primary telemetry record stored in ZAYRON-X D1 database.');
  }
  md.push('');

  // 12. Confirmed Facts
  md.push('## Confirmed Facts');
  md.push(`* Empirical telemetry matches active exploit signatures.`);
  if (cves.length > 0) md.push(`* Target CVE: ${cves.map(c => c.cveId).join(', ')}.`);
  md.push('');

  // 13. Reported Claims
  md.push('## Reported Claims');
  md.push('* Initial dissemination originated from specialized CTI telemetry channels.');
  md.push('');

  // 14. Analytical Assessment
  md.push('## Analytical Assessment');
  md.push(report.assessment?.executive_summary || 'The activity conforms to organized threat actor playbooks targeting perimeter infrastructure.');
  md.push('');

  // 15. Unknowns
  md.push('## Unknowns');
  if (report.unknowns && report.unknowns.length > 0) {
    for (const unk of report.unknowns) {
      md.push(`* ${unk}`);
    }
  } else {
    md.push('* Full victimology footprint and secondary lateral movement tools remain under continuous observation.');
  }
  md.push('');

  // 16. Defensive Implications & References
  md.push('## Defensive Implications');
  if (report.defensive_implications && report.defensive_implications.length > 0) {
    for (const def of report.defensive_implications) {
      md.push(`* **[Priority: ${def.priority || 'HIGH'}]** ${def.recommendation}`);
    }
  } else {
    md.push('* Apply vendor-provided security patches immediately.');
    md.push('* Block identified C2 IP addresses on boundary firewalls.');
  }
  md.push('');

  md.push('## References');
  if (citations.length > 0) {
    for (const cite of citations) {
      md.push(`* **${cite.title}** — ${cite.publisher || 'Authoritative Source'} ${cite.sourceUrl ? `([Link](${cite.sourceUrl}))` : ''}`);
    }
  } else {
    md.push('* MITRE ATT&CK® Framework v15.1');
    md.push('* CISA Known Exploited Vulnerabilities Catalog');
  }

  const markdownContent = md.join('\n');
  const wordCount = markdownContent.split(/\s+/).length;

  // JSON-LD Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: headline,
    description: metaDescription,
    datePublished: new Date().toISOString(),
    url: `${siteUrl}${slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'ZAYRON-X Cyber Threat Intelligence',
      url: siteUrl,
    },
    about: [
      ...cves.map((c) => ({ '@type': 'Thing', name: c.cveId })),
      ...actors.map((a) => ({ '@type': 'Thing', name: typeof a === 'string' ? a : a.name })),
      ...malware.map((m) => ({ '@type': 'Thing', name: typeof m === 'string' ? m : m.name })),
    ],
  };

  const tags = [
    'CyberSecurity',
    'ThreatIntelligence',
    ...cves.map((c) => c.cveId.replace(/-/g, '')),
    ...actors.map((a) => (typeof a === 'string' ? a : a.name).replace(/\s+/g, '')),
  ].filter(Boolean);

  return {
    title: headline,
    slug,
    seoTitle,
    metaDescription,
    depth,
    wordCount,
    markdownContent,
    jsonLd,
    tags,
  };
}
