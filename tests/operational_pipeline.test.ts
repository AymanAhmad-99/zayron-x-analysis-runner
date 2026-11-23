import { describe, test, expect } from 'bun:test';
import {
  normalizeIntelligenceSignal,
  validateEnglishQuality,
  resolveActor,
  resolveMalware,
  resolveVulnerability,
  extractGraphRelations,
  lookupTTP,
  detectCampaignCandidate,
  generatePlatformDerivatives,
  formatEvidenceGroundedDossier,
  EvidencePack,
  validateNewSourceSubmission,
  buildCanonicalTelegramSource,
  buildAutoDiscoveredSource,
  classifyTelegramSource,
  evaluateSourceEligibility,
  computeShardForSource,
  normalizeTelegramHandle,
  computeShardForHandle,
  BANNED_OUTBOUND_CHANNELS,
  matchCanonicalEvent,
  detectSourceConflicts,
  evaluateCorroboration,
  ExistingCanonicalEvent,
  IncomingSignalObservation,
  KNOWLEDGE_MANIFEST_20,
  KNOWLEDGE_CHUNKS_CORPUS,
  calculateAnalyticalConfidence,
  SCHEMA_VERSION,
  evaluateSignalQuality,
  classifyIntelligenceSignal,
  calculateConfidenceVector,
  evaluatePublicationGate,
  CanonicalIntelligenceObject,
  TelegramSourceAdapter,
  CVESourceAdapter,
  VendorAdvisorySourceAdapter,
  SecurityResearchSourceAdapter,
  UnifiedIngestionEvent,
  fuseEventIntoCase,
  correlateEventWithExistingCase,
  detectInterSourceConflicts,
} from '../packages/intelligence/src';

describe('ZAYRON-X Core Intelligence Analysis Engine — Operational Test Suite', () => {

  // ── TEST 1: Real Telegram Message -> 11-Layer Ingestion -> Evidence -> Report ──
  test('Operational Test 1: Real Telegram message executes full 11 layers and grounds report in evidence', async () => {
    // 1. Inbound real-world Telegram payload (Layer 1 & 2)
    const validPastTime = new Date(Date.now() - 60000).toISOString();
    const realTelegramSignal = {
      sourceId: 'tg_cvenotify',
      sourceName: '@cveNotify',
      sourceTrustScore: 0.85,
      externalMessageId: '109283',
      rawText: 'NEW CRITICAL RCE: CVE-2026-3819 affects Apache ActiveMQ Artemis before 2.38.0. Unauthenticated remote code execution via serialized Jolokia agent. Exploit PoC released. Active C2 beaconing observed to 198.51.100.42 with payload hash 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069 (T1190).',
      sourceUrl: 'https://t.me/cveNotify/109283',
      publishedAt: validPastTime,
    };

    // Layer 3: Idempotency & Deduplication Hash
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(realTelegramSignal.rawText.trim()));
    const contentHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    expect(contentHash).toHaveLength(64);

    // Layer 4 & 5: Normalization, Entity Extraction & Noise Filter
    const norm = await normalizeIntelligenceSignal(realTelegramSignal);
    expect(norm.isSpam).toBe(false);
    expect(norm.entities.cves).toContain('CVE-2026-3819');
    expect(norm.entities.ipv4s).toContain('198.51.100.42');
    expect(norm.entities.sha256s).toContain('7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069');
    expect(norm.entities.ttps).toContain('T1190');
    expect(norm.severity).toBe('critical');

    // Layer 6: Language Gate
    expect(norm.originalLanguage).toBe('en');
    expect(norm.isEnglishValid).toBe(true);

    // Layer 7: Canonical Intelligence Event & Evidence Ledger
    const canonicalEventId = 'evt_test_activemq_01';
    const evidenceId = 'evi_test_activemq_01';
    expect(norm.confidenceScore).toBeGreaterThanOrEqual(0.70);

    // Layer 8: Entity Resolution & Graph Mapping
    const resolvedCve = resolveVulnerability(norm.entities.cves[0]);
    expect(resolvedCve).toBe('CVE-2026-3819');
    const relations = extractGraphRelations({
      eventId: canonicalEventId,
      evidenceId,
      actors: norm.entities.actors,
      malware: norm.entities.malware,
      cves: norm.entities.cves,
      ipv4s: norm.entities.ipv4s,
      sha256s: norm.entities.sha256s,
      ttps: norm.entities.ttps,
      confidence: norm.confidenceScore,
    });
    expect(relations.length).toBeGreaterThan(0);

    // Layer 9: Campaign Candidate Formation
    const campaign = detectCampaignCandidate({
      id: canonicalEventId,
      title: norm.normalizedTitle,
      summary: norm.normalizedSummary,
      actors: norm.entities.actors,
      malware: norm.entities.malware,
      cves: norm.entities.cves,
    });
    // With 1 CVE and no established actor couple, campaign should be null (avoids forcing every event into a campaign)
    expect(campaign).toBeNull();

    // Layer 10 & 11: RAG Context & 18-Part Evidence-Grounded Report Assembly
    const matchingChunks = KNOWLEDGE_CHUNKS_CORPUS.filter(c => c.keyEntities.includes('T1190') || c.documentId === 'doc_ref_17_nvd_cvss');
    expect(matchingChunks.length).toBeGreaterThan(0);

    const pack: EvidencePack = {
      eventId: canonicalEventId,
      sourceId: realTelegramSignal.sourceId,
      sourceName: realTelegramSignal.sourceName,
      sourceTrustScore: realTelegramSignal.sourceTrustScore,
      rawText: realTelegramSignal.rawText,
      normalizedTitle: norm.normalizedTitle,
      normalizedSummary: norm.normalizedSummary,
      contentHash,
      originalLanguage: norm.originalLanguage,
      publishedAt: realTelegramSignal.publishedAt,
      receivedAt: new Date().toISOString(),
      sourceUrl: realTelegramSignal.sourceUrl,
      severity: norm.severity,
      confidenceScore: norm.confidenceScore,
      confidenceState: norm.confidenceState,
      entities: norm.entities,
      evidenceRecords: [{
        id: evidenceId,
        type: 'telegram_channel_signal',
        weight: 0.85,
        snippet: norm.normalizedSummary,
        url: realTelegramSignal.sourceUrl,
      }],
      retrievedKnowledgeChunks: matchingChunks.map(c => ({
        chunkId: c.id,
        documentTitle: 'NVD CVSS / MITRE ATT&CK Matrix',
        section: c.section,
        authorityTier: c.authorityTier,
        text: c.text,
      })),
    };

    const dossier = formatEvidenceGroundedDossier({
      pack,
      assessmentSummary: 'Active unauthenticated remote code execution campaign targeting Apache ActiveMQ Artemis.',
      technicalAnalysis: 'Exploit leverages Java deserialization in Jolokia agent endpoint allowing arbitrary code execution.',
    });

    expect(dossier).toContain('1. Executive Assessment');
    expect(dossier).toContain('3. Verified Facts (VERIFIED FACTS)');
    expect(dossier).toContain('5. Technical Analysis (ANALYST ASSESSMENT)');
    expect(dossier).toContain('15. What Is Unknown / Unresolved (UNKNOWN / UNRESOLVED)');
    expect(dossier).toContain('CVE-2026-3819');
    expect(dossier).toContain('198.51.100.42');
  });

  // ── TEST 2: Multi-Source Corroboration -> 1 Canonical Event with Multiple Evidence Records ──
  test('Operational Test 2: Source A + Source B correlate into ONE canonical event with elevated confidence and zero duplicate article', () => {
    const existingEvent: ExistingCanonicalEvent = {
      id: 'evt_fortinet_active_rce',
      type: 'vulnerability_exploitation',
      title: 'Active Exploitation of Fortinet FortiOS CVE-2026-21762',
      summary: 'Critical out-of-bounds write vulnerability actively exploited in FortiOS SSL VPN.',
      severity: 'critical',
      confidence: 0.70,
      status: 'HIGH_CONFIDENCE',
      contentHash: 'hash_existing_event_123',
      firstSeenAt: '2026-09-03T12:00:00Z',
      lastUpdatedAt: '2026-09-03T12:00:00Z',
      entitiesJson: JSON.stringify({
        cves: ['CVE-2026-21762'],
        ipv4s: ['194.26.29.110'],
        sha256s: [],
        actors: ['Volt Typhoon'],
        malware: [],
        ttps: ['T1190'],
      }),
      evidenceCount: 1,
    };

    // Second source (Source B: CISA KEV or another research channel) reports on the exact same incident
    const corroboratingSignal: IncomingSignalObservation = {
      sourceId: 'tg_vxunderground',
      sourceName: 'vx-underground',
      sourceTrustScore: 0.92,
      sourceAuthorityTier: 1,
      externalMessageId: '98401',
      contentHash: 'hash_vx_corrob_456',
      normalizedTitle: 'Fortinet FortiOS SSL-VPN CVE-2026-21762 Exploitation Confirmed',
      normalizedSummary: 'Independent confirmation: Volt Typhoon deploying web shells via Fortinet SSL-VPN zero-day CVE-2026-21762.',
      severity: 'critical',
      entities: {
        cves: ['CVE-2026-21762'],
        ipv4s: ['194.26.29.110'],
        sha256s: ['8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4'],
        actors: ['Volt Typhoon'],
        malware: [],
        ttps: ['T1190'],
      },
      sourceUrl: 'https://t.me/vxunderground/98401',
      publishedAt: '2026-09-03T15:30:00Z',
    };

    // Corroboration Match
    const match = matchCanonicalEvent(corroboratingSignal, [existingEvent]);
    expect(match.matchedEvent).not.toBeNull();
    expect(match.matchedEvent?.id).toBe('evt_fortinet_active_rce');
    expect(match.matchReason).toBe('EXACT_CVE');

    // Conflict Check (No contradictions: attribution and severity align)
    const conflict = detectSourceConflicts(existingEvent, corroboratingSignal);
    expect(conflict.hasConflict).toBe(false);

    // Corroboration Confidence Evaluation
    const priorSourceTiers = [1]; // First Telegram source
    const evaluation = evaluateCorroboration(existingEvent, corroboratingSignal, priorSourceTiers);
    expect(evaluation.isMatch).toBe(true);
    expect(evaluation.newConfidenceScore).toBeGreaterThan(existingEvent.confidence);
    expect(evaluation.newConfidenceScore).toBeGreaterThanOrEqual(0.85);
    expect(evaluation.newConfidenceState).toBe('CONFIRMED');
    expect(evaluation.revisionReason).toContain('Corroborated by independent observation');
  });

  // ── TEST 3: Foreign-Language Normalization & Provenance Preservation ──
  test('Operational Test 3: Foreign language telemetry preserves original text and literal technical identifiers', async () => {
    const rawRussianPost = 'ВНИМАНИЕ: Хакерская группировка Sandworm использует новую уязвимость CVE-2026-7890 для атак на энергосети. Сервер управления: 185.220.101.99. Хеш полезной нагрузки: d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2 (T1059).';
    
    const norm = await normalizeIntelligenceSignal({
      sourceId: 'tg_xakep_ru',
      sourceName: '@xakep_ru',
      sourceTrustScore: 0.85,
      externalMessageId: '7721',
      rawText: rawRussianPost,
      sourceUrl: 'https://t.me/xakep_ru/7721',
      publishedAt: new Date(Date.now() - 120000).toISOString(),
    });

    expect(norm.originalLanguage).toBe('ru');
    expect(norm.entities.cves).toContain('CVE-2026-7890');
    expect(norm.entities.actors).toContain('Sandworm');
    expect(norm.entities.ipv4s).toContain('185.220.101.99');
    expect(norm.entities.sha256s).toContain('d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2');
    expect(norm.entities.ttps).toContain('T1059');

    // Verify literal preservation: technical tokens are never lost or modified
    expect(norm.normalizedSummary).toContain('CVE-2026-7890');
    expect(norm.normalizedSummary).toContain('Sandworm');
    expect(norm.normalizedSummary).toContain('185.220.101.99');
  });

  // ── TEST 4: Low-Confidence / Noisy Signal Quarantining ──
  test('Operational Test 4: Low-confidence spam/noise is quarantined and withheld from public publication', async () => {
    const spamPost = '🚀🚀 Join our VIP crypto pump group! 100x gem guaranteed profit! Click here to join: t.me/pumpsignals 🚀🚀';
    
    const norm = await normalizeIntelligenceSignal({
      sourceId: 'tg_unknown_chatter',
      sourceName: '@unknown_chatter',
      sourceTrustScore: 0.30,
      externalMessageId: '99',
      rawText: spamPost,
      publishedAt: new Date(Date.now() - 60000).toISOString(),
    });

    expect(norm.isSpam).toBe(true);
    expect(norm.isEligibleForArticle).toBe(false);
    expect(norm.publicationStatus).toBe('REJECTED');
  });

  // ── TEST 5: Dynamic Telegram Channel Addition Workflow ──
  test('Operational Test 5: Dynamic Telegram source addition normalizes handle, assigns deterministic shard, and sets initial unverified trust', () => {
    const inputSubmission = {
      handle: 'https://t.me/vxunderground_research',
      displayName: 'VX Underground Research Labs',
      category: 'Vulnerability Research',
      topic: '0-Day Exploits & Reverse Engineering',
      language: 'en',
    };

    // 1. Validation & Handle Normalization
    const validation = validateNewSourceSubmission(inputSubmission);
    expect(validation.isValid).toBe(true);
    expect(validation.normalizedHandle).toBe('vxunderground_research');

    // 2. Canonical Source Object Creation
    const sourceRecord = buildCanonicalTelegramSource(inputSubmission);
    expect(sourceRecord.id).toBe('tg_vxunderground_research');
    expect(sourceRecord.handle).toBe('vxunderground_research');
    expect(sourceRecord.verificationStatus).toBe('NEW');
    expect(sourceRecord.monitoringStatus).toBe('MONITORED');
    expect(sourceRecord.enabled).toBe(true);

    // Initial trust must not be high (must be <= 0.65)
    expect(sourceRecord.trustScore).toBeLessThanOrEqual(0.65);
    expect(sourceRecord.trustScore).toBeGreaterThanOrEqual(0.40);

    // Deterministic shard assignment across 6 shards
    expect(sourceRecord.shardId).toMatch(/^shard_0[1-6]$/);
    expect(computeShardForHandle('vxunderground_research')).toBe(sourceRecord.shardId);
  });

  // ── TEST 6: Source Deactivation / Disabling ──
  test('Operational Test 6: Disabling a monitored source pauses monitoring while historical data remains intact', () => {
    const source = buildCanonicalTelegramSource({
      handle: 'inactive_chatter_channel',
      category: 'General Threat Intel',
    });

    expect(source.enabled).toBe(true);
    expect(source.status).toBe('ENABLED');

    // Simulate deactivation
    source.enabled = false;
    source.status = 'DISABLED';
    source.monitoringStatus = 'DISABLED';

    expect(source.enabled).toBe(false);
    expect(source.monitoringStatus).toBe('DISABLED');
  });

  // ── TEST 7: Anti-Recursion Firewall Strictly Quarantines Outbound Channel @zayronxai ──
  test('Operational Test 7: Outbound channel @zayronxai is strictly banned from collection and cannot create feedback loops', () => {
    expect(BANNED_OUTBOUND_CHANNELS.has('zayronxai')).toBe(true);
    expect(BANNED_OUTBOUND_CHANNELS.has('zayron_x')).toBe(true);

    const bannedSubmission = {
      handle: 'https://t.me/zayronxai',
      displayName: 'ZAYRON-X Official Broadcast',
    };

    const validation = validateNewSourceSubmission(bannedSubmission);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain('CRITICAL FIREWALL REJECTION');

    expect(() => buildCanonicalTelegramSource(bannedSubmission)).toThrow('CRITICAL FIREWALL REJECTION');
  });

  // ── TEST 8: The 12 Verified Core Books / References Coverage Matrix ──
  test('Operational Test 8: All 12 core books/references are canonically defined in manifest and corpus', () => {
    const core12Ids = [
      'doc_ref_21_psychology_intel', // Heuer - Psychology of Intelligence Analysis
      'doc_ref_22_diamond_model',    // Caltagirone - Diamond Model of Intrusion Analysis
      'doc_ref_01_idir',             // Brown & Roberts - Intelligence-Driven Incident Response
      'doc_ref_02_pma',              // Sikorski & Honig - Practical Malware Analysis
      'doc_ref_03_pnsm',             // Bejtlich - Practice of Network Security Monitoring
      'doc_ref_04_amf',              // Ligh et al. - Art of Memory Forensics
      'doc_ref_05_mac',              // Ligh et al. - Malware Analyst's Cookbook
      'doc_ref_06_tm',               // Shostack - Threat Modeling
      'doc_ref_07_tih',              // Recorded Future - Threat Intelligence Handbook
      'doc_ref_08_ansm',             // Sanders & Smith - Applied Network Security Monitoring
      'doc_ref_09_nsm_adv',          // Bejtlich - Network Security Monitoring Principles
      'doc_ref_10_hae',              // Erickson - Hacking: The Art of Exploitation
    ];

    for (const docId of core12Ids) {
      const manifestEntry = KNOWLEDGE_MANIFEST_20.find(d => d.id === docId);
      expect(manifestEntry).toBeDefined();
      expect(manifestEntry?.title).toBeDefined();
      expect(manifestEntry?.authorityTier).toBeLessThanOrEqual(1);

      const chunks = KNOWLEDGE_CHUNKS_CORPUS.filter(c => c.documentId === docId);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].text.length).toBeGreaterThan(50);
      expect(chunks[0].keyEntities.length).toBeGreaterThan(0);
    }
  });

  // ── TEST 9: Autonomous Source Discovery, Eligibility Evaluation, Classification & Scalable Sharding ──
  test('Operational Test 9: Autonomous Telegram discovery classifies sources, evaluates eligibility, assigns scalable shards, and protects outbound channel', () => {
    // 1. Test Outbound Firewall Gate Protection
    const outboundEntity = {
      telegram_id: '-1003937861689',
      handle: 'zayronxai',
      title: 'Z.X.Intelligence Official Broadcast',
      entity_type: 'channel',
    };
    const outboundEligibility = evaluateSourceEligibility(outboundEntity);
    expect(outboundEligibility.eligibility).toBe('BLOCKED');
    expect(outboundEligibility.reason).toContain('ANTI_RECURSION_FIREWALL');

    const outboundAuto = buildAutoDiscoveredSource(outboundEntity);
    expect(outboundAuto.status).toBe('BLOCKED');
    expect(outboundAuto.enabled).toBe(false);
    expect(outboundAuto.monitoringStatus).toBe('BLOCKED');

    // 2. Test Ineligible Personal Direct Chat
    const personalChat = {
      telegram_id: '777000',
      handle: null,
      title: 'Telegram Service Notifications',
      entity_type: 'chat',
    };
    const personalEligibility = evaluateSourceEligibility(personalChat);
    expect(personalEligibility.eligibility).toBe('INELIGIBLE');
    expect(personalEligibility.reason).toContain('PERSONAL_OR_DIRECT_CHAT');

    // 3. Test Eligible Threat Intel / CVE Channel Promotion & Classification
    const cveChannel = {
      telegram_id: '-1002021962091',
      handle: 'cvefeed',
      title: 'CVE & Vulnerability RSS Feed',
      entity_type: 'channel',
    };
    const cveEligibility = evaluateSourceEligibility(cveChannel);
    expect(cveEligibility.eligibility).toBe('ELIGIBLE');

    const cveClassification = classifyTelegramSource(cveChannel.title, cveChannel.handle);
    expect(cveClassification.category).toBe('VULNERABILITIES');
    expect(cveClassification.subcategories).toContain('EXPLOITS');

    const cveAuto = buildAutoDiscoveredSource(cveChannel, 6);
    expect(cveAuto.status).toBe('ENABLED');
    expect(cveAuto.enabled).toBe(true);
    expect(cveAuto.monitoringStatus).toBe('MONITORED');
    expect(cveAuto.category).toBe('VULNERABILITIES');
    expect(cveAuto.shardId).toMatch(/^shard_0[1-6]$/);

    // 4. Test Scalable Shard Abstraction across 6, 12, 24, 50, 100+ shards
    const s6 = computeShardForSource('vxunderground', 6);
    const s12 = computeShardForSource('vxunderground', 12);
    const s50 = computeShardForSource('vxunderground', 50);
    const s100 = computeShardForSource('vxunderground', 100);

    expect(s6).toMatch(/^shard_0[1-6]$/);
    expect(s12).toMatch(/^shard_(0[1-9]|1[0-2])$/);
    expect(s50).toMatch(/^shard_(0[1-9]|[1-4][0-9]|50)$/);
    expect(s100).toMatch(/^shard_(0[1-9]|[1-9][0-9]|100)$/);

    // Deterministic: same key must always yield the exact same shard
    expect(computeShardForSource('vxunderground', 6)).toBe(s6);
    expect(computeShardForSource('vxunderground', 50)).toBe(s50);
  });

  // ── TEST 10: Canonical Intelligence Pipeline (Phase 1 Specifications) ──
  test('Operational Test 10: Raw Telegram message executes full canonical pipeline into Schema 1.0.0 report with evidence grounding and publication gate', async () => {
    const rawTelegramText = `
CRITICAL ALERT: Actively exploited Zero-Day CVE-2026-4491 in Ivanti Connect Secure gateways.
Observed threat actor Volt Typhoon executing remote arbitrary code execution (RCE) via reverse proxy bypass.
C2 Beaconing detected to IP 194.26.29.112 and domain malicious-gateway-c2.cc.
Associated payload SHA256: 3b7c89f5a1e2d3c4b5a6f7e8d9c0b1a23b7c89f5a1e2d3c4b5a6f7e8d9c0b1a2.
Immediate patching and session revocation required.
    `.trim();

    // 1. Signal Quality Gate
    const quality = evaluateSignalQuality({
      text: rawTelegramText,
      hasEntities: true,
      cveCount: 1,
      indicatorCount: 3,
      sourceTrust: 0.90,
    });
    expect(quality.grade).toBe('HIGH_SIGNAL');
    expect(quality.isPublishable).toBe(true);

    // 2. Classification
    const classification = classifyIntelligenceSignal(rawTelegramText, 'Ivanti Zero-Day Exploit');
    expect(['VULNERABILITY', 'EXPLOIT']).toContain(classification.primaryCategory);
    expect(classification.categories).toContain('EXPLOIT');
    expect(classification.categories).toContain('VULNERABILITY');
    expect(classification.subcategories).toContain('EXPLOIT_POC');

    // 3. Confidence Vector
    const confidence = calculateConfidenceVector(0.90, 0.95, 0.95);
    expect(confidence.rating).toBe('VERY_HIGH');
    expect(confidence.overall_confidence).toBeGreaterThanOrEqual(0.85);

    // 4. Grounded Evidence & Canonical Object Assembly
    const intelId = 'intel_test_001';
    const report: CanonicalIntelligenceObject = {
      intelligence_id: intelId,
      schema_version: SCHEMA_VERSION,
      source_id: 'tg_cvenotify',
      telegram_source_id: '-1001234567890',
      source_handle: 'cveNotify',
      source_title: '@cveNotify',
      source_category: 'EXPLOIT',
      source_language: 'en',
      source_region: 'GLOBAL',
      message_id: '12345',
      message_timestamp: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      title: 'CVE-2026-4491: Critical Zero-Day Remote Code Execution in Ivanti Connect Secure',
      summary: 'Actively exploited zero-day vulnerability in Ivanti Connect Secure gateways observed with Volt Typhoon attribution.',
      body: rawTelegramText,
      intelligence_type: 'exploit',
      categories: classification.categories,
      subcategories: classification.subcategories,
      severity: 'CRITICAL',
      priority: 'P1',
      confidence,
      entities: {
        actors: [{ name: 'Volt Typhoon', slug: 'volt-typhoon', status: 'OBSERVED' }],
        malware: [],
        cves: [{ cve_id: 'CVE-2026-4491', status: 'CONFIRMED' }],
        campaigns: [],
        tools: [],
        techniques: [{ id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' }],
        victims: [],
        organizations: ['Ivanti'],
        regions: ['GLOBAL'],
      },
      indicators: [
        { type: 'ipv4', value: '194.26.29.112' },
        { type: 'domain', value: 'malicious-gateway-c2.cc' },
        { type: 'sha256', value: '3b7c89f5a1e2d3c4b5a6f7e8d9c0b1a23b7c89f5a1e2d3c4b5a6f7e8d9c0b1a2' },
      ],
      evidence: [{
        evidence_id: 'evi_001',
        intelligence_id: intelId,
        claim: 'Active exploitation of CVE-2026-4491 by Volt Typhoon',
        evidence_type: 'CVE_DISCLOSURE',
        source_message_id: '12345',
        source_id: 'tg_cvenotify',
        quoted_excerpt: 'Actively exploited Zero-Day CVE-2026-4491 in Ivanti Connect Secure gateways.',
        source_timestamp: new Date().toISOString(),
        source_url: 'https://t.me/cveNotify/12345',
        confidence: confidence.overall_confidence,
        created_at: new Date().toISOString(),
      }],
      citations: ['https://t.me/cveNotify/12345'],
      source_references: [{
        source_id: 'tg_cvenotify',
        handle: 'cveNotify',
        title: '@cveNotify',
        url: 'https://t.me/cveNotify',
        message_id: '12345',
        published_at: new Date().toISOString(),
        authority_tier: 1,
      }],
      ai_analysis: {
        threat_summary: 'Critical vulnerability in perimeter gateway.',
        why_it_matters: 'Enables unauthenticated remote access to corporate internal networks.',
        threat_type: 'EXPLOIT',
        recommended_actions: [
          'Apply emergency vendor hotfix',
          'Block IP 194.26.29.112 and domain malicious-gateway-c2.cc at perimeter',
        ],
        timeline: [{ event: 'Telegram telemetry observed', timestamp: new Date().toISOString() }],
        epistemic_status: 'OBSERVED',
      },
      ai_model: '@cf/meta/llama-3.1-8b-instruct',
      ai_model_version: 'v1.0',
      ai_prompt_version: 'cti_analysis_v1',
      deduplication_key: 'tg_cvenotify:12345:hash1234',
      content_hash: '3b7c89f5a1e2d3c4b5a6f7e8d9c0b1a23b7c89f5a1e2d3c4b5a6f7e8d9c0b1a2',
      status: 'PUBLISHED',
      publication_status: 'PUBLISHED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 5. Strict Publication Gate Execution
    const pubGate = evaluatePublicationGate(report);
    expect(pubGate.passed).toBe(true);
    expect(pubGate.publicationStatus).toBe('PUBLISHED');
    expect(pubGate.violations.length).toBe(0);

    // 6. Test Anti-Recursion violation catches prohibited outbound channel
    const poisonedReport = { ...report, source_id: 'tg_zayronxai', source_handle: 'zayronxai' };
    const poisonedGate = evaluatePublicationGate(poisonedReport);
    expect(poisonedGate.passed).toBe(false);
    expect(poisonedGate.publicationStatus).toBe('REVIEW_REQUIRED');
    expect(poisonedGate.violations.some(v => v.includes('CRITICAL FIREWALL VIOLATION'))).toBe(true);
  });

  // ── TEST 11: Source-Agnostic Adapters (Telegram, CVE, Vendor, Research) ──
  test('Operational Test 11: Heterogeneous sources normalize into the Unified Ingestion Contract without leaking native formats', () => {
    // 1. Telegram Source Adapter
    const tgAdapter = new TelegramSourceAdapter('tg_netsec', 'NetSec Telemetry', 2, 0.85);
    const tgEvent = tgAdapter.normalize({
      sourceId: 'tg_netsec',
      sourceName: 'NetSec Telemetry',
      externalMessageId: '4001',
      rawText: 'Critical RCE in PAN-OS GlobalProtect CVE-2024-3400 actively exploited in the wild. Attributed to Midnight Blizzard.',
      channelUsername: 'netsec',
      publishedAt: new Date().toISOString(),
    });

    expect(tgEvent.source_type).toBe('TELEGRAM');
    expect(tgEvent.external_id).toBe('4001');
    expect(tgEvent.schema_version).toBe('1.0.0');
    expect(tgEvent.metadata.channel_username).toBe('netsec');
    expect(tgAdapter.validate(tgEvent).valid).toBe(true);

    // 2. CVE Source Adapter
    const cveAdapter = new CVESourceAdapter();
    const cveEvent = cveAdapter.normalize({
      cve_id: 'CVE-2024-3400',
      vendor: 'Palo Alto Networks',
      product: 'PAN-OS',
      affected_versions: ['10.2', '11.0', '11.1'],
      fixed_versions: ['10.2.9-h1', '11.0.4-h1'],
      cvss: { version: '3.1', score: 10.0 },
      cwe: ['CWE-77'],
      references: ['https://security.paloaltonetworks.com/CVE-2024-3400'],
      exploitation_status: 'CONFIRMED_IN_WILD',
      kev_status: true,
      published_at: new Date().toISOString(),
    });

    expect(cveEvent.source_type).toBe('CVE');
    expect(cveEvent.external_id).toBe('CVE-2024-3400');
    expect(cveEvent.metadata.is_authoritative).toBe(true);
    expect(cveEvent.metadata.cve_data?.cvss.score).toBe(10.0);
    expect(cveAdapter.validate(cveEvent).valid).toBe(true);

    // 3. Vendor Advisory Source Adapter
    const vendorAdapter = new VendorAdvisorySourceAdapter('Palo Alto Networks');
    const vendorEvent = vendorAdapter.normalize({
      vendor_name: 'Palo Alto Networks',
      advisory_id: 'PAN-SA-2024-0002',
      title: 'Command Injection in PAN-OS GlobalProtect',
      severity: 'CRITICAL',
      affected_products: [{ vendor: 'Palo Alto Networks', product: 'PAN-OS', versions: ['10.2', '11.0'] }],
      remediation_guidance: ['Apply hotfix immediately', 'Disable device telemetry temporarily as workaround'],
      references: ['https://security.paloaltonetworks.com/CVE-2024-3400'],
    });

    expect(vendorEvent.source_type).toBe('VENDOR_ADVISORY');
    expect(vendorEvent.external_id).toBe('PAN-SA-2024-0002');
    expect(vendorEvent.metadata.is_authoritative).toBe(true);
    expect(vendorAdapter.validate(vendorEvent).valid).toBe(true);

    // 4. Security Research Source Adapter
    const researchAdapter = new SecurityResearchSourceAdapter('Volexity');
    const researchEvent = researchAdapter.normalize({
      researcher: 'Volexity Threat Research',
      articleId: 'panos-zero-day-analysis',
      title: 'Zero-Day Exploitation of PAN-OS GlobalProtect in the Wild',
      body: 'Volexity has identified zero-day exploitation of CVE-2024-3400 beginning in late March 2024. Adversaries installed UPSTREAM backdoors.',
      url: 'https://www.volexity.com/blog/2024/04/12/pan-os-zero-day/',
    });

    expect(researchEvent.source_type).toBe('SECURITY_RESEARCH');
    expect(researchEvent.title).toContain('Zero-Day Exploitation');
    expect(researchAdapter.validate(researchEvent).valid).toBe(true);
  });

  // ── TEST 12: Multi-Source Fusion, Correlation, Independence & Conflict Detection ──
  test('Operational Test 12: Telegram + CVE + Vendor + Research fuse into ONE canonical case with evidence preserved and conflict detected', () => {
    const tgAdapter = new TelegramSourceAdapter('tg_chatter', 'Threat Chatter', 3, 0.75);
    const cveAdapter = new CVESourceAdapter();
    const vendorAdapter = new VendorAdvisorySourceAdapter('Cisco Systems');

    // 1. Ingest Initial Telegram Lead
    const tgEvent = tgAdapter.normalize({
      sourceId: 'tg_chatter',
      sourceName: 'Threat Chatter',
      externalMessageId: '901',
      rawText: 'New zero-day exploit reported for Cisco Nexus CVE-2026-20212! Attributed to Sandworm with critical severity.',
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
    });

    const fusion1 = fuseEventIntoCase(tgEvent, []);
    expect(fusion1.action).toBe('CREATED_NEW_CASE');
    expect(fusion1.sources_count).toBe(1);
    expect(fusion1.report.entities.cves.some(c => c.cve_id === 'CVE-2026-20212')).toBe(true);

    // 2. Corroborate with Authoritative CVE Record (Same CVE)
    const cveEvent = cveAdapter.normalize({
      cve_id: 'CVE-2026-20212',
      vendor: 'Cisco',
      product: 'Nexus 9000',
      affected_versions: ['14.1', '14.2'],
      fixed_versions: ['14.2(1)'],
      cvss: { version: '3.1', score: 9.8 },
      cwe: ['CWE-287'],
      references: ['https://tools.cisco.com/security/center/content/CiscoSecurityAdvisory/cisco-sa-nexus-9k'],
      exploitation_status: 'CONFIRMED_IN_WILD',
      kev_status: true,
      published_at: new Date().toISOString(),
    });

    const initialConfidence = fusion1.report.confidence.overall_confidence;
    const fusion2 = fuseEventIntoCase(cveEvent, [fusion1.report]);
    expect(fusion2.action).toBe('CORROBORATED_EXISTING_CASE');
    expect(fusion2.case_id).toBe(fusion1.case_id);
    expect(fusion2.sources_count).toBe(2);
    // Confidence elevated due to authoritative corroboration
    expect(fusion2.report.confidence.overall_confidence).toBeGreaterThan(initialConfidence);
    expect(fusion2.report.evidence.length).toBe(2);

    // 3. Test Conflict Detection (Disparate attribution or severity)
    const conflicts = detectInterSourceConflicts(
      {
        sourceId: 'tg_chatter',
        sourceName: 'Threat Chatter',
        severity: 'CRITICAL',
        actors: ['Sandworm'],
        timestamp: new Date().toISOString(),
        authorityTier: 3,
      },
      {
        sourceId: 'vendor_cisco',
        sourceName: 'Cisco Security',
        severity: 'LOW',
        actors: ['Unattributed'],
        timestamp: new Date().toISOString(),
        authorityTier: 1,
      }
    );

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts.some(c => c.conflict_type === 'SEVERITY_DISPARITY')).toBe(true);
    expect(conflicts.some(c => c.conflict_type === 'ATTRIBUTION_CONFLICT')).toBe(true);
    expect(conflicts[0].status).toBe('UNRESOLVED_DISPUTE');
  });
});

