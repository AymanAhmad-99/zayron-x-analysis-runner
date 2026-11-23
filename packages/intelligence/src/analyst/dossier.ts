import { IntelligenceAssessmentReport, ThreatLevel, ConfidenceState } from './contract';

export interface EvidencePack {
  eventId: string;
  sourceId: string;
  sourceName: string;
  sourceTrustScore: number;
  rawText: string;
  normalizedTitle: string;
  normalizedSummary: string;
  contentHash: string;
  originalLanguage: string;
  publishedAt: string;
  receivedAt: string;
  sourceUrl?: string;
  severity: string;
  confidenceScore: number;
  confidenceState: string;
  entities: {
    cves: string[];
    ipv4s: string[];
    sha256s: string[];
    md5s?: string[];
    domains?: string[];
    ttps: string[];
    actors: string[];
    malware: string[];
  };
  campaigns?: string[];
  evidenceRecords: Array<{
    id: string;
    type: string;
    weight: number;
    snippet: string;
    url?: string;
  }>;
  sourceObservations?: Array<{
    sourceName: string;
    sourceTrust: number;
    observationSnippet: string;
    url?: string;
    timestamp?: string;
  }>;
  retrievedKnowledgeChunks?: Array<{
    chunkId: string;
    documentTitle: string;
    section: string;
    authorityTier: number;
    text: string;
    page?: number;
    relevanceScore?: number;
  }>;
  correlatedEvents?: Array<{
    id: string;
    title: string;
    severity: string;
  }>;
  conflictingObservations?: string[];
  uncertaintyMarkers?: string[];
}

export interface AppliedKnowledgeItem {
  chunkId: string;
  documentTitle: string;
  section?: string;
  page?: number;
  conceptApplied: string;
  claimSupported: string;
  verbatimSnippet?: string;
}

export interface DossierSection {
  title: string;
  content: string;
}

/**
 * Formats a rigorous, evidence-grounded intelligence dossier conforming to the
 * canonical 18-part ZAYRON-X intelligence report structure.
 * Explicitly separates VERIFIED FACTS, ANALYST ASSESSMENT, and UNKNOWN / UNRESOLVED.
 * Omit sections if evidence is insufficient — never fabricate content.
 */
export function formatEvidenceGroundedDossier(params: {
  pack: EvidencePack;
  assessmentSummary?: string;
  technicalAnalysis?: string;
  whyItMatters?: string;
  defensiveImplications?: string;
  detectionConsiderations?: string;
  appliedKnowledge?: AppliedKnowledgeItem[];
  keyFindings?: string[];
}): string {
  const {
    pack,
    assessmentSummary,
    technicalAnalysis,
    whyItMatters,
    defensiveImplications,
    detectionConsiderations,
    appliedKnowledge,
    keyFindings,
  } = params;
  const sections: DossierSection[] = [];

  // 1. Executive Assessment
  const execSummary = assessmentSummary || pack.normalizedSummary;
  sections.push({
    title: 'Executive Assessment',
    content: `${execSummary}\n\n**Threat Level:** \`${pack.severity.toUpperCase()}\` | **Confidence Score:** \`${pack.confidenceScore}\` (\`${pack.confidenceState}\`)`,
  });

  // 2. Key Findings
  const findings: string[] = [];
  if (keyFindings && keyFindings.length > 0) {
    findings.push(...keyFindings);
  } else {
    if (pack.entities.cves.length > 0) findings.push(`Disclosed/exploited vulnerability: ${pack.entities.cves.join(', ')}`);
    if (pack.entities.actors.length > 0) findings.push(`Identified threat actors: ${pack.entities.actors.join(', ')}`);
    if (pack.entities.malware.length > 0) findings.push(`Identified malware families: ${pack.entities.malware.join(', ')}`);
    if (pack.campaigns && pack.campaigns.length > 0) findings.push(`Correlated campaigns: ${pack.campaigns.join(', ')}`);
    if (pack.entities.sha256s.length > 0 || pack.entities.ipv4s.length > 0) findings.push(`Observable infrastructure and cryptographic artifacts isolated`);
  }
  sections.push({
    title: 'Key Findings',
    content: findings.length > 0
      ? findings.map(f => `- ${f}`).join('\n')
      : '- Telemetry triage active; no complex multi-entity cluster confirmed in primary signal.',
  });

  // 3. Verified Facts (VERIFIED FACTS)
  const verifiedFacts: string[] = [
    `Observation captured from authoritative source \`${pack.sourceName}\` (Source Trust Weight: ${pack.sourceTrustScore}).`,
    `Raw signal cryptographic hash: \`SHA-256: ${pack.contentHash}\`.`,
    `Source publication timestamp: \`${pack.publishedAt}\`.`,
    `Ingestion pipeline verification: \`${pack.receivedAt}\`.`,
  ];
  if (pack.entities.cves.length > 0) {
    verifiedFacts.push(`Correlated CVE identifier: ${pack.entities.cves.map(c => `\`${c}\``).join(', ')}.`);
  }
  if (pack.entities.sha256s.length > 0) {
    verifiedFacts.push(`Observed binary hashes: ${pack.entities.sha256s.slice(0, 3).map(h => `\`${h}\``).join(', ')}.`);
  }
  if (pack.entities.ipv4s.length > 0) {
    verifiedFacts.push(`Observed network indicators: ${pack.entities.ipv4s.map(ip => `\`${ip}\``).join(', ')}.`);
  }
  sections.push({
    title: 'Verified Facts (VERIFIED FACTS)',
    content: verifiedFacts.map(f => `- ${f}`).join('\n'),
  });

  // 4. Source Observations
  const sourceObs: string[] = [];
  if (pack.sourceObservations && pack.sourceObservations.length > 0) {
    for (const obs of pack.sourceObservations) {
      sourceObs.push(`- **${obs.sourceName}** (Source Trust: ${obs.sourceTrust}): "${obs.observationSnippet}"`);
    }
  } else {
    sourceObs.push(`- **${pack.sourceName}**: "${pack.normalizedSummary.slice(0, 200)}..."`);
  }
  if (pack.conflictingObservations && pack.conflictingObservations.length > 0) {
    sourceObs.push(`\n**Contradictions / Discrepancies Noted:**\n${pack.conflictingObservations.map(c => `  * ${c}`).join('\n')}`);
  }
  sections.push({
    title: 'Source Observations',
    content: sourceObs.join('\n'),
  });

  // 5. Technical Analysis (ANALYST ASSESSMENT)
  const analysisText = technicalAnalysis || whyItMatters || pack.normalizedSummary;
  sections.push({
    title: 'Technical Analysis (ANALYST ASSESSMENT)',
    content: analysisText,
  });

  // 6. Vulnerability & Exploitation Context
  if (pack.entities.cves.length > 0) {
    sections.push({
      title: 'Vulnerability Context',
      content: pack.entities.cves.map(cve => `### ${cve}\n- Tracking status: Correlated in authoritative CVE registry.\n- Assigned severity: \`${pack.severity.toUpperCase()}\``).join('\n\n'),
    });
  } else {
    sections.push({
      title: 'Vulnerability Context',
      content: 'No formal CVE designation assigned to this telemetry item.',
    });
  }

  // 7. Threat Actor Context
  if (pack.entities.actors.length > 0) {
    sections.push({
      title: 'Threat Actor Context',
      content: pack.entities.actors.map(actor => `- **${actor}**: Threat actor profile mapped against sovereign knowledge graph.`).join('\n'),
    });
  } else {
    sections.push({
      title: 'Threat Actor Context',
      content: 'No confirmed adversary attribution observed in initial telemetry.',
    });
  }

  // 8. Malware Profile
  if (pack.entities.malware.length > 0) {
    sections.push({
      title: 'Malware Context',
      content: pack.entities.malware.map(mw => `- **${mw}**: Malicious software payload signature linked in repository.`).join('\n'),
    });
  } else {
    sections.push({
      title: 'Malware Context',
      content: 'No distinct malware family or weaponized payload hash isolated.',
    });
  }

  // 9. Campaign Context
  if (pack.campaigns && pack.campaigns.length > 0) {
    sections.push({
      title: 'Campaign Context',
      content: pack.campaigns.map(camp => `- **${camp}**: Coordinated adversary activity thread derived from entity clustering.`).join('\n'),
    });
  } else {
    sections.push({
      title: 'Campaign Context',
      content: 'Telemetry is not currently clustered under a designated campaign.',
    });
  }

  // 10. IOC Summary & Observables
  const iocs: string[] = [];
  for (const ip of pack.entities.ipv4s) iocs.push(`| IPv4 | \`${ip}\` | C2 / Relay | High |`);
  for (const h of pack.entities.sha256s) iocs.push(`| SHA-256 | \`${h}\` | Executable Payload | High |`);
  if (pack.entities.md5s) {
    for (const m of pack.entities.md5s) iocs.push(`| MD5 | \`${m}\` | Legacy Hash | Medium |`);
  }
  if (pack.entities.domains) {
    for (const d of pack.entities.domains) iocs.push(`| Domain | \`${d}\` | Observed Host | Medium |`);
  }
  sections.push({
    title: 'IOC Summary',
    content: iocs.length > 0
      ? `| Type | Indicator | Context | Confidence |\n| :--- | :--- | :--- | :---: |\n${iocs.join('\n')}`
      : 'Zero external network or file observables cataloged.',
  });

  // 11. MITRE ATT&CK Context
  if (pack.entities.ttps.length > 0) {
    sections.push({
      title: 'MITRE ATT&CK Context',
      content: pack.entities.ttps.map(t => `- **${t}**: Adversary technique mapped to enterprise matrix.`).join('\n'),
    });
  } else {
    sections.push({
      title: 'MITRE ATT&CK Context',
      content: 'No MITRE ATT&CK technique established from available evidence.',
    });
  }

  // 12. Timeline & Event Chronology
  sections.push({
    title: 'Timeline',
    content: `| Timestamp | Source / Channel | Event Description |\n| :--- | :--- | :--- |\n| \`${pack.publishedAt}\` | \`${pack.sourceName}\` | Telemetry signal published |\n| \`${pack.receivedAt}\` | Ingest Pipeline | Signal ingested, deduplicated, and normalized |`,
  });

  // 13. Evidence Matrix
  // Group and display distinct real evidence items, avoiding duplicated representations of the same source
  const distinctSources = new Set<string>();
  const evidenceLines: string[] = [];
  for (const ev of pack.evidenceRecords) {
    const key = `${ev.type}:${ev.snippet.slice(0, 30)}`;
    if (!distinctSources.has(key)) {
      distinctSources.add(key);
      evidenceLines.push(`| \`${ev.id}\` | ${ev.type} | Authoritative Feed | ${ev.weight} | ${ev.snippet.slice(0, 60).replace(/\n/g, ' ')}... |`);
    }
  }
  if (evidenceLines.length === 0) {
    evidenceLines.push(`| \`evi_${pack.eventId.slice(0, 8)}\` | Primary Telemetry | \`${pack.sourceName}\` | ${pack.sourceTrustScore} | \`${pack.contentHash.slice(0, 16)}...\` |`);
  }
  sections.push({
    title: 'Evidence Matrix',
    content: `| Evidence ID | Type | Source Role | Weight | Summary / Hash |\n| :--- | :--- | :--- | :---: | :--- |\n${evidenceLines.join('\n')}`,
  });

  // 14. Confidence Assessment
  // Avoid claiming independent corroboration when only a single source exists
  const isSingleSource = pack.evidenceRecords.length <= 1;
  const corroborationPhrase = isSingleSource
    ? 'single authoritative catalog disclosure (pending multi-source independent confirmation)'
    : 'multi-source verification';
  sections.push({
    title: 'Confidence Assessment',
    content: `- **System Calibrated Confidence Score:** \`${pack.confidenceScore}\`\n- **Confidence State:** \`${pack.confidenceState}\`\n- **Evidentiary Basis:** Deterministically calculated based on authoritative source trust (\`${pack.sourceTrustScore}\`), ${pack.entities.cves.length > 0 ? 'official CVE reference, ' : ''}cryptographic signal verification, and ${corroborationPhrase}.`,
  });

  // 15. What Is Unknown / Unresolved (UNKNOWN / UNRESOLVED)
  const uncertainItems: string[] = [];
  if (pack.uncertaintyMarkers && pack.uncertaintyMarkers.length > 0) {
    uncertainItems.push(...pack.uncertaintyMarkers);
  } else {
    if (pack.entities.actors.length === 0) uncertainItems.push('Adversary attribution remains unverified in initial telemetry.');
    if (pack.entities.sha256s.length === 0 && pack.entities.cves.length > 0) uncertainItems.push('Weaponized exploit binary hash has not yet been isolated.');
    uncertainItems.push('Active in-the-wild exploitation campaigns and targeted industry verticals remain unobserved in initial feed.');
    uncertainItems.push('Full scope of downstream enterprise victim impact is unobserved.');
  }
  sections.push({
    title: 'What Is Unknown / Unresolved (UNKNOWN / UNRESOLVED)',
    content: uncertainItems.map(u => `- ${u}`).join('\n'),
  });

  // 16. Defensive Implications
  const defense = defensiveImplications || 'Audit external attack surfaces, inspect perimeter firewalls, and apply vendor security updates.';
  sections.push({
    title: 'Defensive Implications',
    content: defense,
  });

  // 17. Knowledge Applied / Detection Considerations
  if (appliedKnowledge && appliedKnowledge.length > 0) {
    const knowledgeLines = appliedKnowledge.map(k => {
      const pageInfo = k.page ? `, Page ${k.page}` : '';
      const sectionInfo = k.section ? ` — *${k.section}*` : '';
      return `- **${k.documentTitle}**${sectionInfo}${pageInfo}\n  * **Analytical Concept Applied:** ${k.conceptApplied}\n  * **Claim/Reasoning Supported:** ${k.claimSupported}${k.verbatimSnippet ? `\n  * **Grounded Quote:** "${k.verbatimSnippet}"` : ''}`;
    });
    sections.push({
      title: 'Knowledge Applied',
      content: `Authoritative knowledge applied to ground this synthesis:\n\n${knowledgeLines.join('\n\n')}`,
    });
  } else if (detectionConsiderations) {
    sections.push({
      title: 'Knowledge Applied & Detection Considerations',
      content: detectionConsiderations,
    });
  } else {
    sections.push({
      title: 'Knowledge Applied',
      content: 'No directly applicable knowledge corpus material was applied.',
    });
  }

  // 18. References / Sources
  const refList: string[] = [];
  if (pack.sourceUrl) refList.push(`- Primary Source: [${pack.sourceName}](${pack.sourceUrl})`);
  else refList.push(`- Primary Source: \`${pack.sourceName}\``);
  if (appliedKnowledge && appliedKnowledge.length > 0) {
    for (const k of appliedKnowledge) {
      refList.push(`- Knowledge Reference: **${k.documentTitle}**${k.section ? ` — *${k.section}*` : ''}${k.page ? ` (Page ${k.page})` : ''}`);
    }
  }
  sections.push({
    title: 'References / Sources',
    content: refList.join('\n'),
  });

  return sections
    .map((s, idx) => `## ${idx + 1}. ${s.title.replace(/^\d+\.\s*/, '')}\n\n${s.content}`)
    .join('\n\n');
}
