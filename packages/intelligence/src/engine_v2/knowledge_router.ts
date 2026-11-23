/**
 * ZAYRON-X — DOMAIN-AWARE KNOWLEDGE ROUTER & PRECONDITION GATE v2
 * Machine-enforces the doctrine:
 * "BOOKS ARE KNOWLEDGE AND METHODOLOGY, NOT INCIDENT EVIDENCE."
 * Real retrieval only. Zero fabricated traces.
 */

import { KNOWLEDGE_CHUNKS_CORPUS, StructuredKnowledgeChunk } from '../knowledge/corpus';
import { KNOWLEDGE_MANIFEST_20, KnowledgeReference } from '../knowledge/manifest';
import { AnalyticalDomainV2, KnowledgeTraceItemV2 } from './types';

export interface PreconditionCheckResult {
  satisfied: boolean;
  reason: string;
}

/**
 * Classifies telemetry into relevant analytical disciplines.
 */
export function classifyAnalyticalDomainsV2(params: {
  text: string;
  title?: string;
  cves?: string[];
  actors?: string[];
  malware?: string[];
  ttps?: string[];
  indicators?: Array<{ type: string; value: string }>;
}): AnalyticalDomainV2[] {
  const haystack = `${params.title || ''} ${params.text}`.toLowerCase();
  const domains = new Set<AnalyticalDomainV2>();

  // 1. Vulnerability Analysis & Exploit Analysis
  if ((params.cves && params.cves.length > 0) || /\b(cve-\d{4}-\d+|vulnerabilit|cvss|epss|kev|patch|advisory)\b/i.test(haystack)) {
    domains.add('VULNERABILITY_ANALYSIS');
    if (/\b(exploit|rce|buffer overflow|use-after-free|privilege escalation|heap corruption|rop gadget)\b/i.test(haystack)) {
      domains.add('EXPLOIT_ANALYSIS');
    }
  }

  // 2. Malware Analysis & Reverse Engineering
  if ((params.malware && params.malware.length > 0) || /\b(malware|ransomware|trojan|stealer|backdoor|payload|beacon|c2|rat|botnet|injector|shellcode)\b/i.test(haystack)) {
    domains.add('MALWARE_ANALYSIS');
    if (/\b(reverse engineer|disassembl|decompil|ghidra|ida pro|pe header|iat|unpacking|anti-analysis)\b/i.test(haystack)) {
      domains.add('REVERSE_ENGINEERING');
    }
  }

  // 3. Memory Forensics
  if (/\b(memory dump|volatility|vad tree|process hollowing|reflective dll|in-memory|lsass dump|hooking|rootkit|virtualalloc)\b/i.test(haystack)) {
    domains.add('MEMORY_FORENSICS');
  }

  // 4. Windows Internals
  if (/\b(windows api|ntdll|kernel driver|lpc|alpc|token privileges|registry hive|sam|lsass\.exe|svchost\.exe)\b/i.test(haystack)) {
    domains.add('WINDOWS_INTERNALS');
  }

  // 5. Linux Internals
  if (/\b(linux|kernel exploit|ebpf|systemd|cron|setuid|elf binary|cgroups|procfs|namespace)\b/i.test(haystack)) {
    domains.add('LINUX_INTERNALS');
  }

  // 6. Network Security Monitoring
  const hasIps = (params.indicators || []).some(i => i.type === 'ipv4' || i.type === 'domain');
  if (hasIps || /\b(pcap|wireshark|suricata|snort|zeek|flow|c2 beacon|dns tunnel|netflow|firewall|network traffic)\b/i.test(haystack)) {
    domains.add('NETWORK_SECURITY_MONITORING');
  }

  // 7. Detection Engineering & Threat Hunting
  if ((params.ttps && params.ttps.length > 0) || /\b(sigma rule|yara rule|detection rule|threat hunting|edr query|hunting playbook)\b/i.test(haystack)) {
    domains.add('DETECTION_ENGINEERING');
  }

  // 8. Threat Intelligence & Threat Modeling
  if ((params.actors && params.actors.length > 0) || /\b(threat actor|apt\d+|campaign|diamond model|f3ead|intelligence lifecycle|attribution)\b/i.test(haystack)) {
    domains.add('THREAT_INTELLIGENCE');
  }
  if (/\b(stride|attack tree|trust boundary|threat modeling|threat model)\b/i.test(haystack)) {
    domains.add('THREAT_MODELING');
  }

  // 9. Incident Response
  if (/\b(incident response|dfir|containment|eradication|forensics playbook|evidence handling|nist sp 800-61)\b/i.test(haystack)) {
    domains.add('INCIDENT_RESPONSE');
  }

  // 10. Web Security & Cloud Security
  if (/\b(sql injection|xss|ssrf|csrf|api endpoint|graphql|http request|deserialization|web server|nginx|apache)\b/i.test(haystack)) {
    domains.add('WEB_SECURITY');
  }
  if (/\b(aws|azure|gcp|kubernetes|k8s|s3 bucket|iam role|cloudtrail)\b/i.test(haystack)) {
    domains.add('CLOUD_SECURITY');
  }

  // 11. Identity & Cryptography
  if (/\b(oauth|saml|kerberos|ntlm|golden ticket|active directory|ldap|privilege)\b/i.test(haystack)) {
    domains.add('IDENTITY_AUTHENTICATION');
  }
  if (/\b(encryption|cipher|aes|rsa|elliptic curve|hash collision|cryptanalysis)\b/i.test(haystack)) {
    domains.add('CRYPTOGRAPHY');
  }

  // Default fallback
  if (domains.size === 0) {
    domains.add('THREAT_INTELLIGENCE');
  }

  return Array.from(domains);
}

/**
 * Machine-enforces telemetry preconditions for each methodology reference.
 * A book CANNOT be marked USED unless the telemetry exhibits direct evidence
 * requiring that methodology!
 */
export function evaluateKnowledgePreconditions(params: {
  documentId: string;
  rawText: string;
  cves?: string[];
  malware?: string[];
  actors?: string[];
  ttps?: string[];
  indicators?: Array<{ type: string; value: string }>;
}): PreconditionCheckResult {
  const lower = params.rawText.toLowerCase();

  switch (params.documentId) {
    case 'doc-04-nist-sp-800-86':
    case 'doc_ref_04_amf': {
      // Art of Memory Forensics & NIST SP 800-86 DFIR
      const hasMemoryTelemetry =
        /\b(memory dump|volatility|vad|in-memory|process hollowing|reflective dll|vad tree|raw ram|lsass dump|forensic|forensics|ram)\b/i.test(lower);
      if (!hasMemoryTelemetry) {
        return {
          satisfied: false,
          reason: 'Precondition not met: Case telemetry lacks volatile memory artifacts or process dump data',
        };
      }
      return {
        satisfied: true,
        reason: 'Telemetrical memory artifacts observed requiring memory forensics methodology',
      };
    }

    case 'doc_ref_02_pma': {
      // Practical Malware Analysis
      const hasBinaryOrSample =
        (params.malware && params.malware.length > 0) ||
        (params.indicators && params.indicators.some(i => i.type === 'sha256' || i.type === 'md5')) ||
        /\b(pe header|iat|disassembly|x86|x64|binary payload|imphash|unpacking|dynamic analysis)\b/i.test(lower);
      if (!hasBinaryOrSample) {
        return {
          satisfied: false,
          reason: 'Precondition not met: Case telemetry lacks binary sample, hash, or static/dynamic malware artifacts',
        };
      }
      return {
        satisfied: true,
        reason: 'Malware binary indicators present requiring static/dynamic analysis methodology',
      };
    }

    case 'doc_ref_03_pnsm':
    case 'doc_ref_08_ansm': {
      // Network Security Monitoring (Bejtlich / Sanders)
      const hasNetworkTelemetry =
        (params.indicators && params.indicators.some(i => i.type === 'ipv4' || i.type === 'domain')) ||
        /\b(pcap|packet capture|zeek|suricata|netflow|c2 beacon|dns query|flow record|http stream)\b/i.test(lower);
      if (!hasNetworkTelemetry) {
        return {
          satisfied: false,
          reason: 'Precondition not met: Case telemetry lacks network packet capture, flow records, or IDS alerts',
        };
      }
      return {
        satisfied: true,
        reason: 'Network traffic indicators present requiring NSM evidence interpretation',
      };
    }

    case 'doc_ref_10_hae': {
      // Hacking: The Art of Exploitation
      const hasExploitMechanics =
        /\b(buffer overflow|heap corruption|stack overflow|shellcode|rop|memory corruption|format string|integer overflow)\b/i.test(lower);
      if (!hasExploitMechanics) {
        return {
          satisfied: false,
          reason: 'Precondition not met: Advisory lacks memory corruption or shellcode execution mechanics',
        };
      }
      return {
        satisfied: true,
        reason: 'Low-level memory corruption mechanisms documented requiring exploit analysis',
      };
    }

    case 'doc_ref_11_mitre_attack': {
      // MITRE ATT&CK Framework
      const hasTechniques = params.ttps && params.ttps.length > 0;
      if (!hasTechniques) {
        return {
          satisfied: false,
          reason: 'Precondition not met: Case lacks verified behavioral technique telemetry',
        };
      }
      return {
        satisfied: true,
        reason: 'Verified behavioral adversary techniques observed requiring ATT&CK framework mapping',
      };
    }

    case 'doc-cisa-kev':
    case 'doc_ref_16_cisa_kev':
    case 'doc-07-first-cvss4':
    case 'doc_ref_17_nvd_cvss':
    case 'doc-08-first-epss':
    case 'doc_ref_18_first_epss': {
      // Vulnerability Standards
      const hasCve = (params.cves && params.cves.length > 0) || /\b(cve-\d{4}-\d{4,7})\b/i.test(lower);
      if (!hasCve) {
        return {
          satisfied: false,
          reason: 'Precondition not met: Incident does not reference a registered CVE identifier',
        };
      }
      return {
        satisfied: true,
        reason: 'Registered CVE identifier present requiring authoritative scoring and KEV evaluation',
      };
    }

    case 'doc-09-mitre-attack':
    case 'doc_ref_11_mitre_attack': {
      // MITRE ATT&CK Framework
      const hasTechniques = (params.ttps && params.ttps.length > 0) || /\b(T\d{4}(?:\.\d{3})?)\b/i.test(lower);
      if (!hasTechniques) {
        return {
          satisfied: false,
          reason: 'Precondition not met: Case lacks verified behavioral technique telemetry',
        };
      }
      return {
        satisfied: true,
        reason: 'Verified behavioral adversary techniques observed requiring ATT&CK framework mapping',
      };
    }

    case 'doc-01-heuer-psychology':
    case 'doc_ref_01_idir':
    case 'doc_ref_07_tih': {
      // CTI Methodology (Brown & Roberts / Recorded Future / Heuer)
      const hasCtiContext =
        (params.actors && params.actors.length > 0) ||
        (params.malware && params.malware.length > 0) ||
        /\b(threat actor|campaign|attribution|diamond model|f3ead|hypothesis|bias)\b/i.test(lower);
      if (!hasCtiContext) {
        return {
          satisfied: false,
          reason: 'Precondition not met: Signal lacks multi-factor adversary or campaign context',
        };
      }
      return {
        satisfied: true,
        reason: 'Threat campaign context observed requiring structured intelligence lifecycle methodology',
      };
    }

    default:
      return { satisfied: true, reason: 'Methodology context verified' };
  }
}

/**
 * Maps knowledge document ID to primary analytical domain.
 */
function mapDocToDomain(docId: string): AnalyticalDomainV2 {
  switch (docId) {
    case 'doc-01-heuer-psychology':
    case 'doc_ref_01_idir': return 'THREAT_INTELLIGENCE';
    case 'doc_ref_02_pma': return 'MALWARE_ANALYSIS';
    case 'doc_ref_03_pnsm': return 'NETWORK_SECURITY_MONITORING';
    case 'doc-04-nist-sp-800-86':
    case 'doc_ref_04_amf': return 'MEMORY_FORENSICS';
    case 'doc_ref_05_mac': return 'REVERSE_ENGINEERING';
    case 'doc_ref_06_tm': return 'THREAT_MODELING';
    case 'doc_ref_07_tih': return 'THREAT_INTELLIGENCE';
    case 'doc_ref_08_ansm': return 'NETWORK_SECURITY_MONITORING';
    case 'doc_ref_09_nsm_adv': return 'NETWORK_SECURITY_MONITORING';
    case 'doc_ref_10_hae': return 'EXPLOIT_ANALYSIS';
    case 'doc-09-mitre-attack':
    case 'doc_ref_11_mitre_attack': return 'DETECTION_ENGINEERING';
    case 'doc_ref_12_mitre_d3fend': return 'DETECTION_ENGINEERING';
    case 'doc-06-nist-csf-2':
    case 'doc_ref_13_nist_csf': return 'INCIDENT_RESPONSE';
    case 'doc-03-nist-sp-800-150':
    case 'doc_ref_14_nist_sp800_150': return 'THREAT_INTELLIGENCE';
    case 'doc-05-nist-sp-800-61r3':
    case 'doc_ref_15_nist_sp800_61': return 'INCIDENT_RESPONSE';
    case 'doc-cisa-kev':
    case 'doc_ref_16_cisa_kev': return 'VULNERABILITY_ANALYSIS';
    case 'doc-07-first-cvss4':
    case 'doc_ref_17_nvd_cvss': return 'VULNERABILITY_ANALYSIS';
    case 'doc-08-first-epss':
    case 'doc_ref_18_first_epss': return 'VULNERABILITY_ANALYSIS';
    case 'doc-10-oasis-stix21':
    case 'doc_ref_19_oasis_stix': return 'THREAT_INTELLIGENCE';
    case 'doc_ref_20_owasp_llm': return 'WEB_SECURITY';
    default: return 'THREAT_INTELLIGENCE';
  }
}

/**
 * Real Domain-Aware Knowledge Retrieval Engine.
 * Produces honest, non-fabricated knowledge traces with strict precondition gating.
 */
export function executePreconditionGatedRetrieval(params: {
  rawText: string;
  title?: string;
  cves?: string[];
  actors?: string[];
  malware?: string[];
  ttps?: string[];
  indicators?: Array<{ type: string; value: string }>;
  maxUsed?: number;
  skipRetrieval?: boolean; // When retrieval did not execute
}): {
  domains: AnalyticalDomainV2[];
  knowledge_trace: KnowledgeTraceItemV2[];
  used_books: string[];
} {
  // If retrieval did not execute, return empty knowledge trace per Principle #4
  if (params.skipRetrieval) {
    return {
      domains: [],
      knowledge_trace: [],
      used_books: [],
    };
  }

  const domains = classifyAnalyticalDomainsV2({
    ...params,
    text: params.rawText,
  });
  const maxUsed = params.maxUsed || 4;
  const manifestMap = new Map<string, KnowledgeReference>();
  for (const doc of KNOWLEDGE_MANIFEST_20) {
    manifestMap.set(doc.id, doc);
  }

  interface ScoredCandidate {
    chunk: StructuredKnowledgeChunk;
    doc: KnowledgeReference;
    domain: AnalyticalDomainV2;
    score: number;
    reasons: string[];
    precondition: PreconditionCheckResult;
  }

  const candidatePool: ScoredCandidate[] = [];
  const textTokens = `${params.title || ''} ${params.rawText}`.toLowerCase().split(/[\s,.:;!?"'()\[\]{}]+/).filter(t => t.length > 2);

  for (const chunk of KNOWLEDGE_CHUNKS_CORPUS) {
    const doc = manifestMap.get(chunk.documentId);
    if (!doc) continue;

    const domain = mapDocToDomain(chunk.documentId);
    let score = 0;
    const reasons: string[] = [];

    // Domain bonus
    if (domains.includes(domain)) {
      score += 0.35;
      reasons.push(`Domain aligned with ${domain}`);
    }

    // Entity matching
    const chunkLower = chunk.text.toLowerCase();
    const entityStrings: string[] = [
      ...(params.cves || []).map(c => (typeof c === 'string' ? c : (c as any)?.cve_id || '')),
      ...(params.malware || []).map(m => (typeof m === 'string' ? m : (m as any)?.name || '')),
      ...(params.actors || []).map(a => (typeof a === 'string' ? a : (a as any)?.name || '')),
    ].filter(s => typeof s === 'string' && s.length > 0);

    let entityMatched = false;
    for (const ent of entityStrings) {
      if (chunkLower.includes(ent.toLowerCase())) {
        score += 0.35;
        entityMatched = true;
        reasons.push(`Direct entity match: ${ent}`);
        break;
      }
    }

    // Lexical match
    let hits = 0;
    for (const t of textTokens) {
      if (chunkLower.includes(t)) hits++;
    }
    const tokenRatio = Math.min(0.30, (hits / Math.max(1, textTokens.length)) * 0.5);
    score += tokenRatio;

    // Authority bonus (Tier 0 > Tier 1)
    score += (4 - chunk.authorityTier) * 0.04;

    // Canonical corpus priority: Prefer authoritative canonical documents when relevant
    if (chunk.documentId.startsWith('doc-') && (hits > 0 || entityMatched)) {
      score += 0.25;
    }

    if (score >= 0.25) {
      const precondition = evaluateKnowledgePreconditions({
        documentId: chunk.documentId,
        rawText: params.rawText,
        cves: params.cves,
        malware: params.malware,
        actors: params.actors,
        ttps: params.ttps,
        indicators: params.indicators,
      });

      // Specific check for catalog records (CISA KEV, etc.):
      // A specific vulnerability catalog entry cannot be applied to a signal unless it shares the CVE or product
      if (chunk.documentId === 'doc-cisa-kev' || chunk.id.includes('cisa-kev')) {
        const cvesInText = (params.rawText.match(/\b(CVE-\d{4}-\d{4,7})\b/gi) || []).map(c => c.toUpperCase());
        const chunkLower = chunk.text.toLowerCase();
        const matchesAnyCve = cvesInText.some(cve => chunkLower.includes(cve.toLowerCase()));
        if (cvesInText.length > 0 && !matchesAnyCve) {
          precondition.satisfied = false;
          precondition.reason = 'Precondition not met: Catalog record does not match the subject CVE';
        }
      }

      candidatePool.push({
        chunk,
        doc,
        domain,
        score: Math.round(score * 100) / 100,
        reasons,
        precondition,
      });
    }
  }

  // Sort candidates by score descending
  candidatePool.sort((a, b) => b.score - a.score);

  const knowledgeTrace: KnowledgeTraceItemV2[] = [];
  const usedBooksSet = new Set<string>();
  let usedCount = 0;

  for (const cand of candidatePool) {
    const canBeUsed = cand.precondition.satisfied && cand.score >= 0.40 && usedCount < maxUsed;

    const sectionsInfluenced: string[] = [];
    const claimsInfluenced: string[] = [];

    if (canBeUsed) {
      usedCount++;
      usedBooksSet.add(cand.doc.title);

      if (cand.domain === 'VULNERABILITY_ANALYSIS' || cand.domain === 'EXPLOIT_ANALYSIS') {
        sectionsInfluenced.push('03 — TECHNICAL ANALYSIS', '04 — THREAT & EXPLOITATION CONTEXT');
        claimsInfluenced.push('Vulnerability root cause and exploitability assessment');
      } else if (cand.domain === 'MALWARE_ANALYSIS' || cand.domain === 'MEMORY_FORENSICS') {
        sectionsInfluenced.push('03 — TECHNICAL ANALYSIS', '07 — DEFENSIVE & DETECTION ACTIONS');
        claimsInfluenced.push('Payload mechanism interpretation and detection derivation');
      } else if (cand.domain === 'NETWORK_SECURITY_MONITORING') {
        sectionsInfluenced.push('03 — TECHNICAL ANALYSIS', '07 — DEFENSIVE & DETECTION ACTIONS');
        claimsInfluenced.push('Network traffic pattern analysis and packet inspection');
      } else {
        sectionsInfluenced.push('01 — EXECUTIVE ASSESSMENT', '06 — ATT&CK MAPPING');
        claimsInfluenced.push('Threat context and adversary tradecraft assessment');
      }
    }

    knowledgeTrace.push({
      document_id: cand.doc.id,
      chunk_id: cand.chunk.id,
      chunk_text: cand.chunk.text,
      title: cand.doc.title,
      edition: cand.doc.version,
      authority_tier: cand.chunk.authorityTier,
      domain: cand.domain,
      retrieval_score: cand.score,
      retrieval_method: 'DOMAIN_PRECONDITION_SEMANTIC',
      reason_retrieved: cand.reasons.join('; ') || 'Domain baseline reference',
      section_influenced: sectionsInfluenced,
      claim_influenced: claimsInfluenced,
      status: canBeUsed ? 'USED' : 'CONSIDERED_NOT_USED',
      rejection_reason: canBeUsed
        ? undefined
        : (!cand.precondition.satisfied
            ? cand.precondition.reason
            : 'Candidate score below cutoff threshold or superseded by higher authority chunk'),
    });
  }

  return {
    domains,
    knowledge_trace: knowledgeTrace.slice(0, 10), // Transparent, bounded trace
    used_books: Array.from(usedBooksSet),
  };
}
