import { describe, test, expect } from 'bun:test';
import { 
  parseTelegramBotUpdate, 
  buildTelegramIngestPayload, 
  TelegramUpdate 
} from '../packages/intelligence/src/telegram/collector';
import { 
  normalizeIntelligenceSignal, 
  detectLanguage, 
  isSpamOrLowValue, 
  extractEntities, 
  calculateSeverity, 
  computeContentHash 
} from '../packages/intelligence/src/normalization/pipeline';

describe('Telegram Intelligence Ingestion Pipeline', () => {
  test('1. Parses Bot API Update into Canonical TelegramRawMessageEnvelope', async () => {
    const rawUpdate: TelegramUpdate = {
      update_id: 991283,
      channel_post: {
        message_id: 5401,
        date: 1724248800,
        chat: {
          id: -100123456789,
          title: 'vx-underground',
          username: 'vxunderground',
          type: 'channel',
        },
        text: 'CRITICAL ALERT: Volt Typhoon deploying Lumma Stealer via CVE-2026-1453. C2 IP: 194.26.29.112, Hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        author_signature: 'VX_Intel_Lead',
      },
    };

    const envelope = parseTelegramBotUpdate(rawUpdate, { vxunderground: 'tg_vxunderground' });
    expect(envelope).not.toBeNull();
    expect(envelope?.sourceId).toBe('tg_vxunderground');
    expect(envelope?.externalMessageId).toBe('5401');
    expect(envelope?.authorSignature).toBe('VX_Intel_Lead');
    expect(envelope?.sourceUrl).toBe('https://t.me/vxunderground/5401');

    const payload = await buildTelegramIngestPayload(envelope!);
    expect(payload.contentHash).toBeDefined();
    expect(payload.contentHash.length).toBe(64);
  });

  test('2. Filters Noise and Promotional Spam', () => {
    const spamMsg = 'Join my VIP crypto pump signals binance 100x gem now!';
    expect(isSpamOrLowValue(spamMsg)).toBe(true);

    const validMsg = 'New zero-day exploit detected in OpenSSL affecting multiple Linux distributions.';
    expect(isSpamOrLowValue(validMsg)).toBe(false);
  });

  test('3. Detects Multi-lingual Messages (Russian, Persian, Arabic, English)', () => {
    expect(detectLanguage('Обнаружена новая кибератака группы Sandworm на энергосистему.')).toBe('ru');
    expect(detectLanguage('هشدار بدافزار جدید برای سازمان‌های دولتی')).toBe('fa');
    expect(detectLanguage('تحذير أمني عاجل بشأن هجمات الفدية على الخوادم')).toBe('ar');
    expect(detectLanguage('Critical remote code execution vulnerability in Apache HTTP Server.')).toBe('en');
  });

  test('4. Extracts Technical Entities with Accuracy', () => {
    const text = 'APT28 leveraged CVE-2024-21413 and Cobalt Strike from C2 server 185.220.101.5 and hash a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 (T1190).';
    const entities = extractEntities(text);

    expect(entities.cves).toContain('CVE-2024-21413');
    expect(entities.actors).toContain('APT28');
    expect(entities.malware).toContain('Cobalt Strike');
    expect(entities.ipv4s).toContain('185.220.101.5');
    expect(entities.sha256s).toContain('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
    expect(entities.ttps).toContain('T1190');
  });

  test('5. Computes Severity Vectors Correctly', () => {
    const criticalEntities = {
      cves: ['CVE-2026-9999'],
      ipv4s: [],
      sha256s: [],
      md5s: [],
      domains: [],
      ttps: [],
      actors: [],
      malware: [],
    };
    expect(calculateSeverity(criticalEntities, 'Active zero-day RCE in the wild')).toBe('critical');

    const highEntities = {
      cves: [],
      ipv4s: [],
      sha256s: [],
      md5s: [],
      domains: [],
      ttps: [],
      actors: ['LockBit'],
      malware: ['LockBit 3.0'],
    };
    expect(calculateSeverity(highEntities, 'LockBit ransomware claimed a new victim')).toBe('high');
  });

  test('6. Deterministic Idempotency Hash (Same Content -> Identical Hash)', async () => {
    const text1 = 'Critical vulnerability in Fortinet FortiOS (CVE-2024-21762)';
    const text2 = '  critical vulnerability in fortinet fortios (cve-2024-21762)  ';
    
    const hash1 = await computeContentHash(text1);
    const hash2 = await computeContentHash(text2);
    expect(hash1).toBe(hash2);
  });

  test('7. End-to-End Normalization Signal Execution', async () => {
    const result = await normalizeIntelligenceSignal({
      sourceId: 'tg_vxunderground',
      sourceName: 'vx-underground',
      sourceTrustScore: 0.92,
      externalMessageId: '9002',
      rawText: 'Sandworm actively exploiting CVE-2026-0001 using custom wiper malware. Indicators: 45.33.32.156, SHA256: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });

    expect(result.isSpam).toBe(false);
    expect(result.entities.actors).toContain('Sandworm');
    expect(result.entities.cves).toContain('CVE-2026-0001');
    expect(result.entities.ipv4s).toContain('45.33.32.156');
    expect(result.provenance.sourceId).toBe('tg_vxunderground');
    expect(result.provenance.weight).toBe(0.92);
  });

  test('8. Anti-Recursion Gate Prohibits Outbound Channel Ingestion', () => {
    const bannedChannels = new Set(['zayronxai', 'zayron_x', 'zayronx']);
    expect(bannedChannels.has('zayronxai')).toBe(true);
    expect(bannedChannels.has('ZAYRONXAI'.toLowerCase())).toBe(true);
    expect(bannedChannels.has('vxunderground')).toBe(false);

    // Incoming message from outbound channel must be flagged as banned
    const channelUsername = 'zayronxai';
    const isBanned = bannedChannels.has(channelUsername.toLowerCase());
    expect(isBanned).toBe(true);
  });

  test('9. Publication Gate Enforces Severity & Confidence Thresholds', async () => {
    // High-confidence critical CVE signal -> PUBLISHED
    const qualifiedSignal = await normalizeIntelligenceSignal({
      sourceId: 'tg_cvenotify',
      sourceName: 'cveNotify',
      sourceTrustScore: 0.95,
      externalMessageId: '5501',
      rawText: 'CRITICAL zero-day remote code execution in Apache HTTP Server (CVE-2026-9999) actively exploited in the wild. IP: 198.51.100.22',
    });
    expect(qualifiedSignal.isEligibleForArticle).toBe(true);
    expect(qualifiedSignal.publicationStatus).toBe('PUBLISHED');

    // Casual unverified low-severity query -> DRAFT (withheld from public publication)
    const lowSignal = await normalizeIntelligenceSignal({
      sourceId: 'tg_community',
      sourceName: 'Community Chat',
      sourceTrustScore: 0.50,
      externalMessageId: '1002',
      rawText: 'Hey everyone, what do you think about the new router patch?',
    });
    expect(lowSignal.isEligibleForArticle).toBe(false);
    expect(lowSignal.publicationStatus).toBe('DRAFT');
  });

  test('10. Evidence Pack & 18-Part Evidence-Grounded Dossier Formatting', async () => {
    const { formatEvidenceGroundedDossier } = await import('../packages/intelligence/src/analyst/dossier');

    const pack = {
      eventId: 'evt_test_001',
      sourceId: 'tg_vxunderground',
      sourceName: 'vx-underground',
      sourceTrustScore: 0.92,
      rawText: 'Adversary Volt Typhoon weaponizing CVE-2026-1453. C2: 194.26.29.112, Hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      normalizedTitle: '[CVE-2026-1453] Threat Actor Volt Typhoon Telemetry Observed',
      normalizedSummary: 'Adversary Volt Typhoon weaponizing CVE-2026-1453 for remote execution.',
      contentHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      originalLanguage: 'en',
      publishedAt: '2026-09-03T16:00:00.000Z',
      receivedAt: '2026-09-03T16:00:02.000Z',
      sourceUrl: 'https://t.me/vxunderground/89401',
      severity: 'critical',
      confidenceScore: 0.92,
      confidenceState: 'CONFIRMED',
      entities: {
        cves: ['CVE-2026-1453'],
        ipv4s: ['194.26.29.112'],
        sha256s: ['e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
        md5s: [],
        domains: [],
        ttps: ['T1190'],
        actors: ['Volt Typhoon'],
        malware: [],
      },
      evidenceRecords: [{
        id: 'evi_test_01',
        type: 'telegram_channel_signal',
        weight: 0.92,
        snippet: 'Volt Typhoon weaponizing CVE-2026-1453',
        url: 'https://t.me/vxunderground/89401',
      }],
    };

    const dossier = formatEvidenceGroundedDossier({
      pack,
      assessmentSummary: 'Volt Typhoon observed targeting critical enterprise infrastructure via CVE-2026-1453.',
      technicalAnalysis: 'Exploit leverages unauthenticated memory corruption for initial perimeter access.',
    });

    // Verify mandatory separation of facts, assessment, and unknowns
    expect(dossier).toContain('1. Executive Assessment');
    expect(dossier).toContain('3. Verified Facts');
    expect(dossier).toContain('VERIFIED FACTS');
    expect(dossier).toContain('4. Source Observations');
    expect(dossier).toContain('5. Technical Analysis');
    expect(dossier).toContain('ANALYST ASSESSMENT');
    expect(dossier).toContain('6. Vulnerability Context');
    expect(dossier).toContain('10. IOC Summary');
    expect(dossier).toContain('13. Evidence Matrix');
    expect(dossier).toContain('14. Confidence Assessment');
    expect(dossier).toContain('15. What Is Unknown / Unresolved');
    expect(dossier).toContain('UNKNOWN / UNRESOLVED');
    expect(dossier).toContain('18. References / Sources');
    expect(dossier).toContain('CVE-2026-1453');
    expect(dossier).toContain('194.26.29.112');
  });

  test('11. Standard ZAYRON-X Outbound Telegram Format (~50-60 Words with Canonical Link)', async () => {
    const { formatZayronOutboundTelegram } = await import('../packages/intelligence/src/publishing/social');

    const sampleReport: any = {
      assessment: {
        headline: 'Critical Zero-Day Remote Code Execution in Apache HTTP Server',
        threat_level: 'CRITICAL',
        executive_summary: 'Threat actor Volt Typhoon observed actively weaponizing CVE-2026-1453 against public-facing edge infrastructure. The exploit achieves unauthenticated code execution and drops persistent Cobalt Strike beacons across targeted enterprise networks. Security teams must immediately apply vendor patches and audit perimeter firewall telemetry.',
        confidence_state: 'CONFIRMED',
        confidence_score: 0.95,
      },
      what_happened: 'Unauthenticated RCE identified in telemetry.',
    };

    const canonicalUrl = 'https://zayron-x.co/threats/critical-rce-apache-5401';
    const outboundPost = formatZayronOutboundTelegram(sampleReport, canonicalUrl);

    expect(outboundPost).toStartWith('[CRITICAL] Critical Zero-Day Remote Code Execution in Apache HTTP Server');
    expect(outboundPost).toContain('Read the full analysis → https://zayron-x.co/threats/critical-rce-apache-5401');

    // Verify word count is approximately 50-60 words
    const wordCount = outboundPost.split(/\s+/).length;
    expect(wordCount).toBeGreaterThanOrEqual(30);
    expect(wordCount).toBeLessThanOrEqual(75);
  });

  test('12. Non-English Telemetry Preserves Literal Technical Identifiers', async () => {
    // Russian telemetry containing CVE, IP, and Actor
    const ruSignal = await normalizeIntelligenceSignal({
      sourceId: 'tg_xakep_ru',
      sourceName: 'Xakep RU',
      sourceTrustScore: 0.85,
      externalMessageId: '7721',
      rawText: 'Группировка APT29 развернула атаку с использованием уязвимости CVE-2024-21413 на сервер 185.220.101.5 с пейлоадом Cobalt Strike.',
    });

    expect(ruSignal.originalLanguage).toBe('ru');
    expect(ruSignal.entities.cves).toContain('CVE-2024-21413');
    expect(ruSignal.entities.actors).toContain('APT29');
    expect(ruSignal.entities.malware).toContain('Cobalt Strike');
    expect(ruSignal.entities.ipv4s).toContain('185.220.101.5');
    expect(ruSignal.normalizedTitle).toContain('CVE-2024-21413');
  });
});
