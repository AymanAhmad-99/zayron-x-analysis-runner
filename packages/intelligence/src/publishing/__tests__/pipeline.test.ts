import { describe, expect, it } from 'bun:test';
import { 
  sanitizePublicText, 
  detectPublicLeakage, 
  governSources, 
  governTimeline, 
  governIocs, 
  deriveExploitationStatus, 
  buildVulnerabilityEditorialDto, 
  evaluateEditorialPublicationGate,
  validateEvidenceBoundClaims,
  type EditorialEvidenceItem
} from '../../index';

describe('ZAYRON-X Global Publishing Pipeline Audit & Governance', () => {
  it('sanitizes internal IDs, vector references, and literal SVG leaks', () => {
    const raw = 'Observed indicator evi_9f3a1e2b4c5d from chunk-88192a using Vectorize. <svg><path d="M0 0h24v24H0z"/></svg> In Setup';
    const sanitized = sanitizePublicText(raw);

    expect(sanitized).not.toContain('evi_9f3a1e2b4c5d');
    expect(sanitized).not.toContain('chunk-88192a');
    expect(sanitized).not.toContain('Vectorize');
    expect(sanitized).not.toContain('<svg>');
    expect(sanitized).not.toContain('In Setup');

    const check = detectPublicLeakage(sanitized);
    expect(check.passed).toBe(true);
  });

  it('governs sources by enforcing label-to-URL matching and removing duplicates', () => {
    const rawSources = [
      { label: 'CISA', url: 'https://nvd.nist.gov/vuln/detail/CVE-2026-85706' },
      { label: 'CISA', url: 'https://nvd.nist.gov/vuln/detail/CVE-2026-85706/' },
      { label: 'CISA KEV', url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog' },
    ];

    const governed = governSources(rawSources);
    expect(governed.length).toBe(2); // Deduplicated normalized URL
    expect(governed[0].label).toContain('NVD'); // Reconciled from NVD destination
    expect(governed[1].label).toContain('CISA');
  });

  it('purges internal pipeline events from public timelines', () => {
    const rawEvents = [
      { date: '2026-09-10', event: 'Vendor Advisory Published', context: 'GitLab publishes patch' },
      { date: '2026-09-11', event: 'Ingestion Pipeline', context: 'Signal ingested, deduplicated, and normalized' },
      { date: '2026-09-11', event: 'Vector Storage Update', context: 'Chunk embeddings created' },
      { date: '2026-09-11', event: 'CISA KEV Addition', context: 'Added to catalog' },
    ];

    const governed = governTimeline(rawEvents);
    expect(governed.length).toBe(2);
    expect(governed[0].eventType).toBe('PATCH');
    expect(governed[1].eventType).toBe('KEV');
    for (const ev of governed) {
      expect(ev.title.toLowerCase()).not.toContain('ingest');
      expect(ev.title.toLowerCase()).not.toContain('vector');
    }
  });

  it('rejects generic vendor domains as malicious IOCs', () => {
    const rawIocs = [
      { type: 'Domain', value: 'gitlab.com', context: 'Vendor Site' },
      { type: 'Domain', value: 'evil-c2-node.org', context: 'Command & Control' },
      { type: 'IPv4', value: '198.51.100.42', context: 'Relay' },
    ];

    const governed = governIocs(rawIocs);
    expect(governed.length).toBe(2);
    expect(governed.find(i => i.value === 'gitlab.com')).toBeUndefined();
    expect(governed.find(i => i.value === 'evil-c2-node.org')).toBeDefined();
  });

  it('enforces rigorous exploitation status semantics', () => {
    const status1 = deriveExploitationStatus(true, false, false);
    expect(status1).toBe('KNOWN_EXPLOITED_EXTERNAL');

    const status2 = deriveExploitationStatus(false, true, false);
    expect(status2).toBe('REPORTED');

    const status3 = deriveExploitationStatus(false, false, true);
    expect(status3).toBe('INDEPENDENTLY_OBSERVED');
  });

  it('passes publication gate on valid DTO specimen', () => {
    const dto = buildVulnerabilityEditorialDto({
      id: 'art_test_specimen',
      slug: 'cve-2026-85706-gitlab-path-traversal',
      title: 'GitLab Community & Enterprise Edition Path Traversal',
      dek: 'Unauthenticated remote path traversal vulnerability allows arbitrary file read.',
      content: `## 1. Executive Assessment\nGitLab Community Edition contains a path traversal vulnerability (CVE-2026-85706, CWE-35, CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N, CVSS 10.0).\n\n## 2. Key Findings\n- Exposure: Unauthenticated remote API\n- Impact: Arbitrary file disclosure\n- Remediation: Upgrade to patched releases\n\n## 5. Technical Analysis\n### Vulnerability Mechanism\nMissing path canonicalization allows arbitrary file read via the repository commits API.\n### Attack Precondition & Exposure\nAttacker requires network line of sight to the repository commits API without authentication.\n### Affected Security Boundary\nTraverses boundary from web application layer to underlying host filesystem.\n\n## 18. References / Sources\n[GitLab Advisory](https://about.gitlab.com/releases/categories/releases/)\n[CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)`,
      severity: 'critical',
      confidence: 0.88,
    });

    const gate = evaluateEditorialPublicationGate(dto);
    expect(gate.passed).toBe(true);
    expect(gate.errors.length).toBe(0);

    // Intelligence preservation assertions
    expect(dto.vulnerabilityProfile.cveId).toBe('CVE-2026-85706');
    expect(dto.vulnerabilityProfile.cweId).toBe('CWE-35');
    expect(dto.vulnerabilityProfile.cvssScore).toBe('10.0');
    expect(dto.vulnerabilityProfile.authentication).toContain('Unauthenticated');
    expect(dto.vulnerabilityProfile.attackSurface.toLowerCase()).toContain('repository commits api');
    expect(dto.vulnerabilityProfile.exploitStatus).toBe('KNOWN_EXPLOITED_EXTERNAL');
    expect(dto.technicalAssessment.mechanism).toContain('Missing path canonicalization');
    expect(dto.technicalAssessment.boundary).toContain('application layer to underlying host filesystem');

    // Sanitization assertions
    expect(dto.vulnerabilityProfile.cveId).not.toBe('CVE-RECORD');
    expect(dto.vulnerabilityProfile.authentication).not.toContain('Refer to technical assessment');
    expect(dto.vulnerabilityProfile.attackSurface).not.toBe('Remote Network Interface');
  });

  it('proves that sanitization does NOT destroy validated intelligence', () => {
    const rawIntel = `Vendor advisory for CVE-2026-85706 describes CWE-35 with CVSS 10.0 impacting repository commits API. Patched in 19.1.8, 19.2.6, 19.3.2. CISA KEV added on 2026-09-11.`;
    const sanitized = sanitizePublicText(rawIntel);

    expect(sanitized).toContain('CVE-2026-85706');
    expect(sanitized).toContain('CWE-35');
    expect(sanitized).toContain('CVSS 10.0');
    expect(sanitized).toContain('repository commits API');
    expect(sanitized).toContain('19.1.8');
    expect(sanitized).toContain('CISA KEV');
  });

  it('fails publication gate when cross-field intelligence contradicts', () => {
    const conflictedDto = buildVulnerabilityEditorialDto({
      id: 'art_conflicted',
      slug: 'cve-2026-85706-gitlab-path-traversal',
      title: 'GitLab Community & Enterprise Edition Path Traversal',
      dek: 'Unauthenticated remote path traversal vulnerability allows arbitrary file read.',
      content: `## 1. Executive Assessment\nRequires authenticated user session to exploit.\n\n## 5. Technical Analysis\n### Vulnerability Mechanism\nMissing input validation allows directory traversal.`,
      severity: 'critical',
      confidence: 0.88,
    });

    // Artificially inject contradictory profile state
    conflictedDto.vulnerabilityProfile.authentication = 'None — Unauthenticated Remote';

    const gate = evaluateEditorialPublicationGate(conflictedDto);
    expect(gate.passed).toBe(false);
    expect(gate.errors.some(e => e.includes('Authentication conflict'))).toBe(true);
  });

  it('enforces strict source deduplication and preserves authoritative vendor sources', () => {
    const rawSources = [
      { label: 'GitLab Advisory', url: 'https://about.gitlab.com/releases/2026/09/10/patch-release-gitlab-19-3-2-released/' },
      { label: 'GitLab Advisory Duplicate', url: 'https://about.gitlab.com/releases/2026/09/10/patch-release-gitlab-19-3-2-released' },
      { label: 'NVD Record', url: 'https://nvd.nist.gov/vuln/detail/CVE-2026-85706' },
      { label: 'NVD Duplicate', url: 'https://nvd.nist.gov/vuln/detail/CVE-2026-85706/' },
      { label: 'CISA KEV', url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog' },
    ];

    const governed = governSources(rawSources);
    expect(governed.length).toBe(3);
    expect(governed.find(s => s.url.includes('gitlab.com'))).toBeDefined();
    expect(governed.find(s => s.url.includes('nvd.nist.gov'))).toBeDefined();
    expect(governed.find(s => s.url.includes('cisa.gov'))).toBeDefined();

    // Verify concise, factual labels and notes
    const gitlabSrc = governed.find(s => s.url.includes('gitlab.com'))!;
    expect(gitlabSrc.label).toBe('GitLab Security Advisory');
    expect(gitlabSrc.note).toBe('Vendor disclosure, affected versions, impact, and fixed releases.');
  });

  it('guarantees public timeline contains structured intelligence events and rejects empty timelines', () => {
    const dto = buildVulnerabilityEditorialDto({
      id: 'art_timeline_test',
      slug: 'cve-2026-85706-gitlab-path-traversal',
      title: 'GitLab Community & Enterprise Edition Path Traversal',
      content: 'CISA KEV documented in-the-wild exploitation.',
      publishedAt: '2026-09-10',
    });

    expect(dto.timeline.length).toBeGreaterThanOrEqual(1);
    expect(dto.timeline.some(e => e.eventType === 'PATCH' || e.eventType === 'DISCLOSURE')).toBe(true);
    expect(dto.timeline.some(e => e.eventType === 'KEV')).toBe(true);

    for (const ev of dto.timeline) {
      expect(ev.title.toLowerCase()).not.toContain('ingest');
      expect(ev.title.toLowerCase()).not.toContain('pipeline');
      expect(ev.description.toLowerCase()).not.toContain('deduplicat');
    }
  });

  it('enforces strict REMOVE and PRESERVE rules on public editorial delivery', () => {
    const dto = buildVulnerabilityEditorialDto({
      id: 'art_cve_2026_85706',
      slug: 'cve-2026-85706-gitlab-path-traversal',
      title: 'GitLab Community & Enterprise Edition Path Traversal',
      dek: 'Unauthenticated remote path traversal vulnerability allows arbitrary file read via the repository commits API.',
      content: `## 1. Executive Assessment
GitLab Community Edition contains a path traversal vulnerability (CVE-2026-85706, CWE-35, CVSS 10.0).

## 5. Technical Analysis
### Vulnerability Mechanism
Improper input validation and missing path canonicalization in the repository commits API allows relative directory traversal sequences (../).
### Attack Precondition & Exposure
Unauthenticated network reachability over HTTP/HTTPS.
### Affected Security Boundary
Trust boundary between the web application service and the host local filesystem.
### Exploitation Path
Adversaries submit specially crafted HTTP requests containing traversal sequences to the repository commits API.
### Security Consequence
Arbitrary local file disclosure.`,
      severity: 'critical',
      confidence: 0.88,
      publishedAt: '2026-09-11',
    });

    const gate = evaluateEditorialPublicationGate(dto);
    expect(gate.passed).toBe(true);

    // PRESERVE assertions
    expect(dto.vulnerabilityProfile.cveId).toBe('CVE-2026-85706');
    expect(dto.vulnerabilityProfile.cweId).toBe('CWE-35');
    expect(dto.vulnerabilityProfile.cvssScore).toBe('10.0');
    expect(dto.vulnerabilityProfile.authentication).toBe('None — Unauthenticated Remote');
    expect(dto.vulnerabilityProfile.attackSurface).toBe('Repository commits API');
    expect(dto.vulnerabilityProfile.exploitStatusLabel).toBe('Known Exploited — CISA KEV');
    expect(dto.vulnerabilityProfile.fixedVersions).toContain('19.1.8');
    expect(dto.vulnerabilityProfile.fixedVersions).toContain('19.2.6');
    expect(dto.vulnerabilityProfile.fixedVersions).toContain('19.3.2');
    expect(dto.meta.confidenceTier).toBe('HIGH');

    // REMOVE assertions
    expect(dto.vulnerabilityProfile.cveId).not.toBe('CVE-RECORD');
    expect(dto.vulnerabilityProfile.authentication).not.toContain('Authenticated User / Operator');
    expect(dto.vulnerabilityProfile.authentication).not.toContain('Refer to technical assessment');
    expect(dto.vulnerabilityProfile.attackSurface).not.toBe('Remote Network Interface');
    expect(dto.vulnerabilityProfile.exploitStatusLabel).not.toContain('No In-the-Wild Exploitation Evidence');
    
    // Check serialization text does not leak telemetry or raw svg
    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain('Telemetry Pipeline');
    expect(serialized).not.toContain('Cloudflare Edge Telemetry');
    expect(serialized).not.toContain('Intelligence Network Status');
    expect(serialized).not.toContain('In Setup');
    expect(serialized).not.toContain('<svg');
    expect(serialized).not.toContain('[svg]');
  });

  // ════════════════════════════════════════════════════════════════════════
  // 10 MANDATORY EVIDENCE-BINDING & CLAIM INTEGRITY TESTS
  // ════════════════════════════════════════════════════════════════════════

  const CANONICAL_TEST_EVIDENCE = [
    {
      evidence_id: 'ev_gitlab_vendor_001',
      source: 'GitLab Security Advisory',
      source_type: 'vendor_advisory' as const,
      url: 'https://about.gitlab.com/releases/2026/09/10/patch-release-gitlab-19-3-2-released',
      fact: 'GitLab released fixed versions 19.1.8, 19.2.6, and 19.3.2 for path traversal in commits API.',
      date: '2026-09-10'
    },
    {
      evidence_id: 'ev_gitlab_cisa_001',
      source: 'CISA KEV',
      source_type: 'government' as const,
      url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
      fact: 'CISA lists CVE-2026-85706 in the Known Exploited Vulnerabilities catalog.',
      date: '2026-09-11'
    }
  ];

  it('Test 1 — Valid Confirmed Claim: claim with valid evidence reference passes validation', () => {
    const { validateEvidenceBoundClaims } = require('../evidenceClaims');
    const claims = [
      {
        claim_id: 'claim_001',
        text: 'GitLab released patches 19.1.8, 19.2.6, and 19.3.2 resolving the issue.',
        type: 'remediation',
        status: 'CONFIRMED',
        evidence_refs: ['ev_gitlab_vendor_001']
      }
    ];

    const result = validateEvidenceBoundClaims(claims, CANONICAL_TEST_EVIDENCE);
    expect(result.valid).toBe(true);
    expect(result.validatedClaims.length).toBe(1);
    expect(result.rejectedClaims.length).toBe(0);
  });

  it('Test 2 — Missing Evidence Reference: CONFIRMED claim without evidence must be rejected', () => {
    const { validateEvidenceBoundClaims } = require('../evidenceClaims');
    const claims = [
      {
        claim_id: 'claim_002',
        text: 'Arbitrary local file disclosure is possible.',
        type: 'impact',
        status: 'CONFIRMED',
        evidence_refs: [] // empty
      }
    ];

    const result = validateEvidenceBoundClaims(claims, CANONICAL_TEST_EVIDENCE);
    expect(result.valid).toBe(false);
    expect(result.rejectedClaims.length).toBe(1);
    expect(result.rejectedClaims[0].reason).toBe('NO_EVIDENCE_REFS');
  });

  it('Test 3 — Invalid Evidence Reference: claim referencing nonexistent evidence ID must be rejected', () => {
    const { validateEvidenceBoundClaims } = require('../evidenceClaims');
    const claims = [
      {
        claim_id: 'claim_003',
        text: 'Vulnerability discovered in repository commits API.',
        type: 'technical',
        status: 'CONFIRMED',
        evidence_refs: ['ev_nonexistent_999']
      }
    ];

    const result = validateEvidenceBoundClaims(claims, CANONICAL_TEST_EVIDENCE);
    expect(result.valid).toBe(false);
    expect(result.rejectedClaims.length).toBe(1);
    expect(result.rejectedClaims[0].reason).toContain('NONEXISTENT_EVIDENCE_REF');
  });

  it('Test 4 — Unsupported Technical Detail: unbound technical claim must not reach final article', () => {
    const { validateEvidenceBoundClaims } = require('../evidenceClaims');
    const claims = [
      {
        claim_id: 'claim_004',
        text: 'The backend normalizes the request path using custom C library routines.',
        type: 'technical',
        status: 'DISALLOWED',
        evidence_refs: ['ev_gitlab_vendor_001']
      }
    ];

    const result = validateEvidenceBoundClaims(claims, CANONICAL_TEST_EVIDENCE);
    expect(result.validatedClaims.length).toBe(0);
    expect(result.rejectedClaims.length).toBe(1);
    expect(result.rejectedClaims[0].reason).toBe('STATUS_DISALLOWED');
  });

  it('Test 5 — Known Exploitation: CISA KEV must not automatically produce "active campaign" or "weaponized exploit"', () => {
    const { validateEvidenceBoundClaims } = require('../evidenceClaims');
    const claims = [
      {
        claim_id: 'claim_005',
        text: 'Threat actors are conducting an active campaign with a weaponized exploit.',
        type: 'exploitation',
        status: 'CONFIRMED',
        evidence_refs: ['ev_gitlab_cisa_001']
      }
    ];

    const result = validateEvidenceBoundClaims(claims, CANONICAL_TEST_EVIDENCE);
    expect(result.valid).toBe(false);
    expect(result.rejectedClaims[0].reason).toBe('OVERSTATED_EXPLOITATION');
  });

  it('Test 6 — Conditional Impact: potential impact must retain conditional wording', () => {
    const { validateEvidenceBoundClaims } = require('../evidenceClaims');
    const claims = [
      {
        claim_id: 'claim_006',
        text: 'Attacker steals database credentials and reads all system secrets.',
        type: 'impact',
        status: 'ASSESSED',
        evidence_refs: ['ev_gitlab_vendor_001']
      }
    ];

    const result = validateEvidenceBoundClaims(claims, CANONICAL_TEST_EVIDENCE);
    expect(result.valid).toBe(false);
    expect(result.rejectedClaims[0].reason).toBe('UNESTABLISHED_GUARANTEED_IMPACT');
  });

  it('Test 7 — IOC Separation: recommended detection patterns must not become IOC entries', () => {
    const dto = buildVulnerabilityEditorialDto({
      id: 'art_test_ioc',
      slug: 'cve-2026-85706-gitlab-path-traversal',
      title: 'GitLab Advisory',
      content: 'Content',
      iocs: [
        { type: 'PATTERN', value: 'Inspect web application logs for anomalous requests', context: 'Defensive guidance' }
      ]
    });

    const gate = evaluateEditorialPublicationGate(dto);
    expect(gate.passed).toBe(false);
    expect(gate.errors.some(e => e.includes('Detection guidance leaked into IOC items'))).toBe(true);
  });

  it('Test 8 — Source Deduplication: the same source must appear only once', () => {
    const dto = buildVulnerabilityEditorialDto({
      id: 'art_test_src',
      slug: 'cve-2026-85706-gitlab-path-traversal',
      title: 'GitLab Advisory',
      content: 'Content',
      sources: [
        { label: 'GitLab Release', url: 'https://about.gitlab.com/releases/2026/09/10/patch' },
        { label: 'GitLab Release 2', url: 'https://about.gitlab.com/releases/2026/09/10/patch/' }
      ]
    });

    // Normalized governance deduplicates matching URLs
    expect(dto.sources.length).toBe(1);
  });

  it('Test 9 — Internal Metadata: evidence IDs, claim IDs, and pipeline data must never reach public rendering', () => {
    const dto = buildVulnerabilityEditorialDto({
      id: 'art_test_leak',
      slug: 'cve-2026-85706-gitlab-path-traversal',
      title: 'GitLab Advisory',
      content: 'Content',
    });
    // Inject internal metadata leak directly into executive assessment
    dto.executiveAssessment = 'Executive statement referencing claim_001 and ev_gitlab_vendor_001 directly.';

    const gate = evaluateEditorialPublicationGate(dto);
    expect(gate.passed).toBe(false);
    expect(gate.errors.some(e => e.includes('Internal metadata or pipeline identifier leaked'))).toBe(true);
  });

  it('Test 10 — Contradiction: conflicting authentication, versions, or exploitation states fail publishing gate', () => {
    const dto = buildVulnerabilityEditorialDto({
      id: 'art_test_contradiction',
      slug: 'cve-2026-85706-gitlab-path-traversal',
      title: 'GitLab Advisory',
      content: `## 1. Executive Assessment
Vulnerability CVE-2026-85706. No In-the-Wild Exploitation Evidence exists anywhere.
## 5. Technical Assessment
Unauthenticated remote access.`
    });

    // dto has exploitStatus = KNOWN_EXPLOITED_EXTERNAL for CVE-2026-85706
    const gate = evaluateEditorialPublicationGate(dto);
    expect(gate.passed).toBe(false);
    expect(gate.errors.some(e => e.includes('Exploitation conflict'))).toBe(true);
  });

  it('Test 11 — Cross-CVE Contamination: Palo Alto CVE-2024-3400 rejects GitLab claims and contains zero GitLab contamination', () => {
    // Canonical evidence strictly for CVE-2024-3400 (Palo Alto Networks PAN-OS GlobalProtect)
    const paloAltoEvidence: EditorialEvidenceItem[] = [
      {
        evidence_id: 'ev_pan_001',
        source: 'Palo Alto Networks Security Advisory',
        source_type: 'vendor_advisory',
        url: 'https://security.paloaltonetworks.com/CVE-2024-3400',
        fact: 'A command injection vulnerability in the GlobalProtect feature of Palo Alto Networks PAN-OS software enables an unauthenticated attacker to execute arbitrary code with root privileges.',
      },
      {
        evidence_id: 'ev_cisa_001',
        source: 'CISA Known Exploited Vulnerabilities Catalog',
        source_type: 'government',
        url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
        fact: 'CISA added CVE-2024-3400 affecting Palo Alto Networks PAN-OS to KEV based on evidence of active in-the-wild exploitation.',
      },
    ];

    // Contaminated claims attempting to inject GitLab path traversal concepts into CVE-2024-3400
    const contaminatedClaims = [
      {
        claim_id: 'claim_pan_001',
        type: 'technical' as const,
        text: 'A command injection flaw in GlobalProtect allows unauthenticated remote code execution with root privileges.',
        status: 'CONFIRMED' as const,
        evidence_refs: ['ev_pan_001'],
      },
      {
        claim_id: 'claim_gitlab_contam_001',
        type: 'technical' as const,
        text: 'Missing path canonicalization allows arbitrary file read via the repository commits API.',
        status: 'CONFIRMED' as const,
        evidence_refs: ['ev_pan_001'],
      },
      {
        claim_id: 'claim_gitlab_contam_002',
        type: 'remediation' as const,
        text: 'Inspect reverse proxy logs for relative directory traversal sequences (../) targeting GitLab endpoints.',
        status: 'CONFIRMED' as const,
        evidence_refs: ['ev_pan_001'],
      },
    ];

    // 1. Validate claims: Entity consistency validator must reject both contaminated claims
    const claimValidation = validateEvidenceBoundClaims(contaminatedClaims, paloAltoEvidence);
    expect(claimValidation.valid).toBe(false);
    expect(claimValidation.rejectedClaims.length).toBe(2);
    expect(claimValidation.rejectedClaims.some(r => r.claim.claim_id === 'claim_gitlab_contam_001')).toBe(true);
    expect(claimValidation.rejectedClaims.some(r => r.claim.claim_id === 'claim_gitlab_contam_002')).toBe(true);
    expect(claimValidation.validatedClaims.length).toBe(1);
    expect(claimValidation.validatedClaims[0].claim_id).toBe('claim_pan_001');

    // 2. Build DTO from clean Palo Alto intelligence and assert zero cross-contamination
    const dto = buildVulnerabilityEditorialDto({
      id: 'art_cve_2024_3400',
      slug: 'cve-2024-3400',
      title: 'Palo Alto Networks PAN-OS GlobalProtect Command Injection',
      dek: 'A command injection vulnerability in the GlobalProtect feature of PAN-OS allows unauthenticated remote execution with root privileges.',
      content: `## 1. Executive Assessment
Palo Alto Networks PAN-OS software contains a critical command injection vulnerability (CVE-2024-3400, CWE-77, CVSS 10.0) affecting the GlobalProtect gateway interface.

## 2. Key Findings
- 01 — Exposure: Unauthenticated remote access to the GlobalProtect interface
- 02 — Impact: Arbitrary command execution with root privileges
- 03 — Exploitation: CISA KEV documents active in-the-wild exploitation
- 04 — Remediation: Apply official vendor hotfixes and PAN-OS security updates

## 5. Technical Assessment
### Vulnerability Mechanism
Improper neutralization of special elements within the GlobalProtect feature allows arbitrary OS command injection.
### Attack Precondition & Exposure
Unauthenticated network reachability to the GlobalProtect portal or gateway interface over HTTPS.
### Affected Security Boundary
Security perimeter boundary separating network ingress from the underlying root operating system environment.
### Exploitation Path
Adversaries transmit crafted requests to GlobalProtect endpoints, triggering arbitrary command execution with root privileges.
### Security Consequence
Arbitrary code execution with elevated root privileges, enabling full compromise of the target system.

## 18. References / Sources
[Palo Alto Networks Advisory](https://security.paloaltonetworks.com/CVE-2024-3400)
[CISA KEV Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)`,
      severity: 'critical',
      confidence: 0.95,
      publishedAt: '2024-04-12',
    });

    const gate = evaluateEditorialPublicationGate(dto);
    expect(gate.passed).toBe(true);

    // Entity and mechanism assertions for Palo Alto
    expect(dto.vulnerabilityProfile.cveId).toBe('CVE-2024-3400');
    expect(dto.vulnerabilityProfile.cweId).toContain('CWE-77');
    expect(dto.vulnerabilityProfile.cvssScore).toBe('10.0');
    expect(dto.vulnerabilityProfile.affectedProduct).toContain('PAN-OS');
    expect(dto.vulnerabilityProfile.attackSurface).toBe('GlobalProtect Gateway Interface');
    expect(dto.vulnerabilityProfile.impact).toContain('Root Privileges');

    // Strict negative assertions: ZERO GitLab cross-contamination
    const serialized = JSON.stringify(dto).toLowerCase();
    expect(serialized).not.toContain('gitlab');
    expect(serialized).not.toContain('repository commits api');
    expect(serialized).not.toContain('path traversal');
    expect(serialized).not.toContain('../');
    expect(serialized).not.toContain('arbitrary local file disclosure');
    expect(serialized).not.toContain('host local filesystem');
  });
});


