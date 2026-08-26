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
});
