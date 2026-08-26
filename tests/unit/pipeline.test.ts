import { describe, it, expect } from 'vitest';
import {
  detectLanguage,
  isSpamOrLowValue,
  extractEntities,
  calculateSeverity,
  calculateConfidence,
  normalizeIntelligenceSignal,
} from '../../packages/intelligence/src/normalization/pipeline';

describe('Content Intelligence Pipeline (Days 4-7 Specification)', () => {
  it('should detect languages accurately', () => {
    expect(detectLanguage('Обнаружена новая критическая уязвимость')).toBe('ru');
    expect(detectLanguage('هشدار امنیتی در خصوص بدافزار')).toBe('fa');
    expect(detectLanguage('New 0-day vulnerability actively exploited')).toBe('en');
    expect(detectLanguage('Yeni kritik güvenlik açığı tespit edildi')).toBe('tr');
  });

  it('should filter spam and promotional noise', () => {
    expect(isSpamOrLowValue('JOIN VIP CRYPTO PUMP NOW 100x')).toBe(true);
    expect(isSpamOrLowValue('Short')).toBe(true);
    expect(isSpamOrLowValue('Critical RCE in Apache Struts CVE-2026-9999 allows unauthorized code execution')).toBe(false);
  });

  it('should extract technical entities with high precision', () => {
    const text = `
      APT28 group deployed Cobalt Strike loader from IP 198.51.100.45.
      Exploiting CVE-2026-1337 (CVSS 9.8) using technique T1059.001.
      SHA256: 2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae
    `;

    const entities = extractEntities(text);
    expect(entities.cves).toContain('CVE-2026-1337');
    expect(entities.actors).toContain('APT28');
    expect(entities.malware).toContain('Cobalt Strike');
    expect(entities.ttps).toContain('T1059.001');
    expect(entities.ipv4s).toContain('198.51.100.45');
    expect(entities.sha256s).toContain('2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae');
  });

  it('should calculate critical severity for actively exploited RCE', () => {
    const entities = extractEntities('CVE-2026-1234');
    const severity = calculateSeverity(entities, 'Zero-day RCE actively exploited in the wild');
    expect(severity).toBe('critical');
  });

  it('should execute full multi-language normalization into analyst-grade English intelligence object', async () => {
    const russianSignal = `
      APT29 использует новый бэкдор для атак на правительственные структуры.
      Используется CVE-2026-5544 для первоначального доступа.
      IP адрес C2: 203.0.113.19
    `;

    const result = await normalizeIntelligenceSignal({
      sourceId: 'tg_redteams_ru',
      sourceName: 'Russian Threat Intel Channel',
      sourceTrustScore: 0.85,
      externalMessageId: '1042',
      rawText: russianSignal,
    });

    expect(result.isSpam).toBe(false);
    expect(result.originalLanguage).toBe('ru');
    expect(result.entities.cves).toContain('CVE-2026-5544');
    expect(result.entities.actors).toContain('APT29');
    expect(result.normalizedTitle).toContain('[CVE-2026-5544]');
    expect(result.confidenceScore).toBeGreaterThan(0.7);
    expect(['VERY_HIGH', 'CONFIRMED']).toContain(result.confidenceState);
    expect(result.provenance.sourceId).toBe('tg_redteams_ru');
  });
});
