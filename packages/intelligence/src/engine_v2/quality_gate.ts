/**
 * ZAYRON-X — MULTI-STAGE PUBLICATION QUALITY GATE v2
 * 7-Stage Deterministic Safety Gate:
 * Stage 1: Source Validation
 * Stage 2: Claim Validation
 * Stage 3: Knowledge Validation
 * Stage 4: ATT&CK Validation
 * Stage 5: Provenance Validation
 * Stage 6: Confidence Validation
 * Stage 7: Report Consistency
 */

import { CanonicalReportObjectV2 } from './types';

export interface StageResult {
  passed: boolean;
  violations: string[];
}

export interface DeepQualityGateResultV2 {
  passed: boolean;
  publication_status: 'PUBLISHED' | 'REVIEW_REQUIRED';
  stage_results: {
    source_validation: StageResult;
    claim_validation: StageResult;
    knowledge_validation: StageResult;
    attack_validation: StageResult;
    provenance_validation: StageResult;
    confidence_validation: StageResult;
    report_consistency: StageResult;
    zero_defect_operational?: StageResult;
  };
  violations: string[];
}

export function evaluateDeepQualityGateV2(
  report: CanonicalReportObjectV2,
  rawTelemetryText: string
): DeepQualityGateResultV2 {
  const allViolations: string[] = [];

  // ── Stage 1: Source Validation & Anti-Recursion Firewall ──
  const sourceViolations: string[] = [];
  const bannedChannels = ['zayronxai', 'zayron_x', 'tg_zayronxai', 'tg_zayron_x', '-1003937861689'];

  for (const prov of report.provenance || []) {
    const chanLower = (prov.collection_channel || '').toLowerCase().replace(/^@/, '');
    const srcLower = (prov.source_id || '').toLowerCase();
    if (bannedChannels.includes(chanLower) || (srcLower && bannedChannels.includes(srcLower))) {
      sourceViolations.push(`CRITICAL FIREWALL VIOLATION: Collection from outbound channel ${prov.collection_channel} prohibited.`);
    }
  }
  if (!report.provenance || report.provenance.length === 0) {
    sourceViolations.push('Missing provenance attribution.');
  }

  // ── Stage 2: Claim Validation ──
  const claimViolations: string[] = [];
  for (const c of report.claims || []) {
    if (c.claim_type === 'VERIFIED_FACT' && (!c.evidence_ids || c.evidence_ids.length === 0)) {
      claimViolations.push(`Claim ${c.claim_id} typed VERIFIED_FACT lacks supporting evidence_ids.`);
    }
    if (c.claim_type === 'OBSERVED_BEHAVIOR' && (!c.evidence_ids || c.evidence_ids.length === 0)) {
      claimViolations.push(`Claim ${c.claim_id} typed OBSERVED_BEHAVIOR lacks direct telemetry evidence.`);
    }
    if (!c.statement || c.statement.trim().length < 8) {
      claimViolations.push(`Claim ${c.claim_id} statement is empty or too brief (< 8 chars).`);
    }
  }

  // ── Stage 3: Knowledge Validation & Exact Citation Substring Gate ──
  const knowledgeViolations: string[] = [];

  // Map chunk texts for fast exact substring lookup
  const chunkTextMap = new Map<string, string>();
  for (const k of report.knowledge_trace || []) {
    if (k.chunk_id && (k as any).chunk_text) {
      chunkTextMap.set(k.chunk_id, (k as any).chunk_text);
    }
  }

  // 3a. Verify every GroundedCitation carries an exact verbatim substring and substantive content
  const BOILERPLATE_PATTERNS = [
    /\bMember Portal\b/i,
    /\bAbout FIRST\b/i,
    /\bBoard of Directors\b/i,
    /\bOperations Team\b/i,
    /\bAnnual General Meeting\b/i,
    /\bBylaws\b/i,
    /\bCode of Conduct\b/i,
    /\bPrivacy Policy\b/i,
    /\bCopyright ©\b/i,
    /\bwindow\.fwSettings\b/i,
    /\bSpecial Interest Groups\b/i
  ];

  for (const c of report.claims || []) {
    const isSubstantive = c.claim_type === 'INFERENCE' || c.claim_type === 'SUPPORTED_INFERENCE' || c.claim_type === 'ANALYST_ASSESSMENT';
    const citations = (c as any).book_citations || [];

    for (const cit of citations) {
      const resolvedText = chunkTextMap.get(cit.chunk_id);
      if (!resolvedText) {
        knowledgeViolations.push(`FABRICATED CITATION DEFECT: Claim ${c.claim_id} cites chunk ${cit.chunk_id} which does NOT exist in the supplied Knowledge Context.`);
      } else {
        if (!cit.quoted_fragment || cit.quoted_fragment.trim().length === 0) {
          knowledgeViolations.push(`CITATION DEFECT: Claim ${c.claim_id} citation to chunk ${cit.chunk_id} has empty quoted_fragment.`);
        } else if (!resolvedText.includes(cit.quoted_fragment)) {
          knowledgeViolations.push(`CITATION VERIFICATION FAILED: Claim ${c.claim_id} quoted_fragment "${cit.quoted_fragment.slice(0, 40)}..." is NOT a verbatim substring of chunk ${cit.chunk_id}.`);
        } else {
          // Substantive content filter: Must not be website navigation, administrative front-matter, or legal boilerplate
          const isBoilerplate = BOILERPLATE_PATTERNS.some(pat => pat.test(cit.quoted_fragment));
          if (isBoilerplate) {
            knowledgeViolations.push(`CITATION SUBSTANCE DEFECT: Claim ${c.claim_id} quoted_fragment contains non-substantive front-matter/navigation boilerplate: "${cit.quoted_fragment.slice(0, 50)}..."`);
          }
        }
      }
    }
  }

  for (const k of report.knowledge_trace || []) {
    const isUsed = k.status === 'USED' || (k as any).usage_status === 'USED';
    if (isUsed) {
      // Incomplete chunk resolution check
      if ((k as any).resolution_status === 'INCOMPLETE') {
        knowledgeViolations.push(`INCOMPLETE KNOWLEDGE RETRIEVAL: Chunk ${k.chunk_id} cannot be marked USED because chunk text failed resolution.`);
      }

      // Check section/claim influence
      const hasInfluence = (k.section_influenced && k.section_influenced.length > 0) ||
                           (k.claim_influenced && k.claim_influenced.length > 0);
      if (!hasInfluence) {
        knowledgeViolations.push(`UNGROUNDED KNOWLEDGE USAGE: Chunk ${k.chunk_id} marked USED but influences zero sections or claims.`);
      }

      // Check Memory Forensics precondition
      if (k.document_id === 'doc_ref_04_amf' || k.document_id?.includes('amf')) {
        const hasMemEvidence = /\b(memory dump|volatility|vad|in-memory|process hollowing|reflective dll|raw ram|lsass dump)\b/i.test(rawTelemetryText);
        if (!hasMemEvidence) {
          knowledgeViolations.push('FABRICATED KNOWLEDGE TRACE: The Art of Memory Forensics marked USED without memory telemetry.');
        }
      }

      // Check Malware Analysis precondition
      if (k.document_id === 'doc_ref_02_pma' || k.document_id?.includes('pma')) {
        const hasMalwareEvidence = /\b(pe header|iat|disassembly|x86|x64|binary payload|imphash|unpacking|dynamic analysis|malware|trojan|ransomware|stealer)\b/i.test(rawTelemetryText);
        if (!hasMalwareEvidence) {
          knowledgeViolations.push('FABRICATED KNOWLEDGE TRACE: Practical Malware Analysis marked USED without binary sample or malware telemetry.');
        }
      }

      // Check Network Security Monitoring precondition
      if (k.document_id === 'doc_ref_03_pnsm' || k.document_id === 'doc_ref_03_nsm' || k.document_id?.includes('nsm') || k.document_id?.includes('pnsm')) {
        const hasNetworkEvidence = /\b(pcap|wireshark|zeek|suricata|netflow|tcpdump|tls handshake|packet capture|bro|c2 ip|c2 beacon|network connection|dns query)\b/i.test(rawTelemetryText) ||
          /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/.test(rawTelemetryText);
        if (!hasNetworkEvidence) {
          knowledgeViolations.push('FABRICATED KNOWLEDGE TRACE: The Practice of Network Security Monitoring marked USED without network/packet telemetry.');
        }
      }
    }
  }

  // ── Stage 4: ATT&CK Validation ──
  const attackViolations: string[] = [];
  for (const attk of report.attack_mappings) {
    if (!attk.evidence_id || attk.evidence_id.trim().length === 0) {
      attackViolations.push(`Technique ${attk.technique_id} mapped without evidence_id.`);
    }
    if (!attk.behavior_observed || attk.behavior_observed.trim().length < 5) {
      attackViolations.push(`Technique ${attk.technique_id} lacks observed behavioral justification.`);
    }
    // Strict T1190 Gate: Must have web/server ingress evidence
    if (attk.technique_id === 'T1190') {
      const hasWebEvidence = /\b(web\s*server|http\s*daemon|nginx|apache|iis|public-facing|ingress\s*port)\b/i.test(rawTelemetryText);
      if (!hasWebEvidence) {
        attackViolations.push('UNGROUNDED ATT&CK TECHNIQUE: T1190 asserted without behavioral server-exploit evidence.');
      }
    }
  }

  // ── Stage 5: Provenance Validation ──
  const provViolations: string[] = [];
  for (const p of report.provenance) {
    if (!p.issuing_authority || p.issuing_authority.trim().length === 0) {
      provViolations.push('Provenance item lacks issuing_authority.');
    }
    if (!p.collection_channel || p.collection_channel.trim().length === 0) {
      provViolations.push('Provenance item lacks collection_channel.');
    }
    if (p.issuing_authority.toLowerCase() === p.collection_channel.toLowerCase() && p.issuing_authority.toLowerCase().includes('telegram')) {
      provViolations.push('PROVENANCE CONFLATION: Telegram collection channel declared as issuing authority.');
    }
  }

  // ── Stage 6: Confidence Validation ──
  const confViolations: string[] = [];
  if (report.confidence.overall_confidence < 0.35) {
    confViolations.push(`Overall confidence (${report.confidence.overall_confidence}) below minimum threshold of 0.35.`);
  }

  // ── Stage 7: Report Consistency & Banned Boilerplate ──
  const consistencyViolations: string[] = [];

  // Verify 10 canonical sections
  if (!report.sections || report.sections.length < 10) {
    consistencyViolations.push(`Report lacks 10 canonical sections (found ${report.sections?.length || 0}).`);
  }

  // Check banned boilerplate
  const bannedBoilerplate = [
    'Technical risk analysis indicates immediate exploitation feasibility.',
    'Defenders must audit external interfaces and apply verified patches.',
    'Adversary activity tracking across enterprise attack surfaces.',
  ];
  const fullContent = (report.sections || []).map(s => s.content).join(' ');
  for (const phrase of bannedBoilerplate) {
    if (fullContent.includes(phrase)) {
      consistencyViolations.push(`BANNED BOILERPLATE DETECTED: "${phrase}"`);
    }
  }

  // Check prohibited marketing buzzwords
  const buzzwords = [/\bworld-class\b/i, /\bgame-changing\b/i, /\bunmatched\b/i, /\bsovereign\b/i];
  for (const bw of buzzwords) {
    if (bw.test(fullContent)) {
      consistencyViolations.push(`PROHIBITED BUZZWORD DETECTED matching ${bw}`);
    }
  }

  // Check CVSS severity consistency: CVSS < 7.0 cannot be CRITICAL
  if (report.enrichment.cvss_score !== null && report.enrichment.cvss_score < 7.0 && report.severity === 'CRITICAL') {
    consistencyViolations.push(`SEVERITY INVERSION: CVSS base score ${report.enrichment.cvss_score} cannot be classified as CRITICAL.`);
  }

  // Epistemic Safeguard 1: In-the-wild exploitation must never be asserted based on CVSS alone
  const telemetryString = rawTelemetryText || '';
  if (report.enrichment.exploit_status === 'EXPLOITATION_IN_THE_WILD') {
    const hasWildTelemetry = /\b(active exploitation|exploited in the wild|in-the-wild|c2 beaconing|compromised host|pwned|ransomware attack)\b/i.test(telemetryString) ||
                             report.enrichment.cisa_kev.is_in_kev;
    if (!hasWildTelemetry) {
      consistencyViolations.push('EPISTEMIC SAFETY VIOLATION: Active in-the-wild exploitation asserted without empirical incident telemetry or CISA KEV listing.');
    }
  }

  // Epistemic Safeguard 2: Attribution must never be asserted without affirmative adversary telemetry
  // Disregard purely negative or unresolved mentions (e.g. "no evidence links to LockBit", "attribution is unknown")
  const affirmativeActorTelemetry = telemetryString.split('\n').some(line => {
    const isNegated = /\b(no evidence|not attributed|unknown|unresolved|does not attribute|neither|unconfirmed)\b/i.test(line);
    const mentionsActor = /\b(apt\d+|unc\d+|threat actor|adversary group|lazarus|sandworm|volt typhoon|lockbit|blackcat)\b/i.test(line);
    return mentionsActor && !isNegated;
  });

  const assertedActorClaims = (report.claims || []).filter(c => {
    const isFactual = c.claim_type === 'CONFIRMED_FACT' || c.claim_type === 'VERIFIED_FACT';
    const isAffirmativeAttribution = /\b(attributed to|responsible for|perpetrated by|executed by)\s+(?:the\s+)?(apt\d+|unc\d+|threat actor|adversary group|lazarus|sandworm|volt typhoon|lockbit|blackcat)\b/i.test(c.statement);
    const isNegation = /\b(unestablished|unknown|unresolved|no evidence|not attributed)\b/i.test(c.statement);
    return isFactual && isAffirmativeAttribution && !isNegation;
  });

  if (!affirmativeActorTelemetry && assertedActorClaims.length > 0) {
    consistencyViolations.push('EPISTEMIC SAFETY VIOLATION: Threat actor attribution asserted as factual without supporting affirmative adversary telemetry.');
  }

  // ── Stage 8: Zero-Defect Operational Gate (Part 4 Mandate) ──
  const zeroDefectViolations: string[] = [];

  // 4.1.1: Zero reports citing a chunk irrelevant to the entity
  const extractedCves = (telemetryString.match(/\b(CVE-\d{4}-\d{4,7})\b/gi) || []).map(c => c.toUpperCase());
  const pkgMatch = telemetryString.match(/(?:A flaw was found in|flaw in|vulnerability in|package)\s+([a-zA-Z0-9_\-\.\/]+)/i);
  const affectedProduct = pkgMatch ? pkgMatch[1].replace(/[\.,]$/, '').toLowerCase() : null;

  for (const k of report.knowledge_trace || []) {
    if (k.status === 'USED' || (k as any).usage_status === 'USED') {
      const isCatalog = k.document_id?.includes('cisa-kev') || k.chunk_id?.includes('cisa-kev');
      if (isCatalog && extractedCves.length > 0) {
        const chunkText = ((k as any).text || (k as any).chunk_text || '').toLowerCase();
        const sharesCve = extractedCves.some(c => chunkText.includes(c.toLowerCase()));
        const sharesProduct = affectedProduct && affectedProduct.length > 2 && chunkText.includes(affectedProduct);
        if (!sharesCve && !sharesProduct) {
          zeroDefectViolations.push(`ZERO-DEFECT VIOLATION (IRRELEVANT CITATION): Chunk ${k.chunk_id} marked USED but shares no CVE or product identifier.`);
        }
      }
    }
  }

  // 4.1.2: Zero reports with generic boilerplate or near-duplicate phrases
  const GENERIC_BOILERPLATE_REGEX = /\b(apply patches immediately|audit your network perimeter|remain vigilant|ensure all systems are updated|take appropriate precautions|practice good cyber hygiene)\b/i;
  for (const sec of report.sections || []) {
    if (GENERIC_BOILERPLATE_REGEX.test(sec.content)) {
      zeroDefectViolations.push(`ZERO-DEFECT VIOLATION (GENERIC BOILERPLATE): Section ${sec.section_number} contains banned generic advice.`);
    }
  }

  // Aggregate violations
  allViolations.push(
    ...sourceViolations,
    ...claimViolations,
    ...knowledgeViolations,
    ...attackViolations,
    ...provViolations,
    ...confViolations,
    ...consistencyViolations,
    ...zeroDefectViolations
  );

  const passed = allViolations.length === 0;

  return {
    passed,
    publication_status: passed ? 'PUBLISHED' : 'REVIEW_REQUIRED',
    stage_results: {
      source_validation: { passed: sourceViolations.length === 0, violations: sourceViolations },
      claim_validation: { passed: claimViolations.length === 0, violations: claimViolations },
      knowledge_validation: { passed: knowledgeViolations.length === 0, violations: knowledgeViolations },
      attack_validation: { passed: attackViolations.length === 0, violations: attackViolations },
      provenance_validation: { passed: provViolations.length === 0, violations: provViolations },
      confidence_validation: { passed: confViolations.length === 0, violations: confViolations },
      report_consistency: { passed: consistencyViolations.length === 0, violations: consistencyViolations },
      zero_defect_operational: { passed: zeroDefectViolations.length === 0, violations: zeroDefectViolations },
    },
    violations: allViolations,
  };
}

export interface ZeroDefectMetricRecord {
  timestamp: string;
  report_id: string;
  passed: boolean;
  checks: {
    zero_citation_violations: boolean;
    zero_unsupported_claims: boolean;
    zero_irrelevant_citations: boolean;
    zero_generic_duplicates: boolean;
  };
  rejection_reasons: string[];
}

/**
 * Evaluates the 4 concrete Zero-Defect Operational Conditions before publication.
 */
export function auditZeroDefectPublicationStandard(
  report: CanonicalReportObjectV2,
  rawTelemetryText: string
): ZeroDefectMetricRecord {
  const qg = evaluateDeepQualityGateV2(report, rawTelemetryText);
  const stage = (qg.stage_results as any);

  const zero_citation_violations = stage.claim_validation.passed && stage.knowledge_validation.passed;
  const zero_unsupported_claims = stage.report_consistency.passed;
  const zero_irrelevant_citations = !qg.violations.some(v => v.includes('IRRELEVANT CITATION'));
  const zero_generic_duplicates = !qg.violations.some(v => v.includes('GENERIC BOILERPLATE'));

  const passed = zero_citation_violations && zero_unsupported_claims && zero_irrelevant_citations && zero_generic_duplicates;

  const record: ZeroDefectMetricRecord = {
    timestamp: new Date().toISOString(),
    report_id: report.report_id,
    passed,
    checks: {
      zero_citation_violations,
      zero_unsupported_claims,
      zero_irrelevant_citations,
      zero_generic_duplicates,
    },
    rejection_reasons: qg.violations,
  };

  // Log metric line for dashboard/operational tracking
  console.log(`[ZERO-DEFECT METRIC] Report: ${record.report_id} | Status: ${passed ? 'APPROVED' : 'REJECTED'} | CitationGate: ${zero_citation_violations} | UnsupportedClaims: ${zero_unsupported_claims} | RelevanceSanity: ${zero_irrelevant_citations} | NonGeneric: ${zero_generic_duplicates}`);

  return record;
}
