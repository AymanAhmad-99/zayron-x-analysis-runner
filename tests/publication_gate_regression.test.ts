import { describe, it, expect } from 'bun:test';
import { normalizeIntelligenceSignal } from '../packages/intelligence/src/normalization/pipeline';
import { validateQualityGate, executePublishingWorkflow } from '../packages/intelligence/src/publishing/publisher';
import { auditZeroDefectPublicationStandard } from '../packages/intelligence/src/engine_v2/quality_gate';

describe('Production Publication Gate Regression Suite', () => {

  it('1. Russian input => BLOCKED from public publication', async () => {
    const rawRussian = 'Популярный пакет arrayref в Crates[.]io заразили инфостилером для кражи ключей.';
    const result = await normalizeIntelligenceSignal({
      sourceId: 'tg_russian_osint',
      sourceName: 'Russian OSINT',
      sourceTrustScore: 0.80,
      externalMessageId: '1001',
      rawText: rawRussian,
    });

    // Must NOT be eligible for standalone public article
    expect(result.isEligibleForArticle).toBe(false);
    expect(result.publicationStatus).not.toBe('PUBLISHED');
  });

  it('2. Arabic input => BLOCKED from public publication', async () => {
    const rawArabic = 'قلعة التقنية-أندرويد&حاسبات تحديث جديد للتطبيق وتفاصيل الحماية';
    const result = await normalizeIntelligenceSignal({
      sourceId: 'tg_arabic_channel',
      sourceName: 'Arabic Tech Fortress',
      sourceTrustScore: 0.70,
      externalMessageId: '1002',
      rawText: rawArabic,
    });

    expect(result.isEligibleForArticle).toBe(false);
    expect(result.publicationStatus).not.toBe('PUBLISHED');
  });

  it('3. Persian input => BLOCKED from public publication', async () => {
    const rawPersian = 'روانشناسی سایبری چیست و چگونه در حملات مهندسی اجتماعی و فیشینگ بدافزار استفاده می شود';
    const result = await normalizeIntelligenceSignal({
      sourceId: 'tg_persian_channel',
      sourceName: 'Persian Cyber Hub',
      sourceTrustScore: 0.70,
      externalMessageId: '1003',
      rawText: rawPersian,
    });

    expect(result.isEligibleForArticle).toBe(false);
    expect(result.publicationStatus).not.toBe('PUBLISHED');
  });

  it('4. Social banter & memes => BLOCKED as spam / low value', async () => {
    const rawBanter1 = '> How can you tell it was vibe coded? Proof I don\'t use stupid sissy AI, I make dumb typos';
    const res1 = await normalizeIntelligenceSignal({
      sourceId: 'tg_chatter',
      sourceName: 'Casual Chat',
      sourceTrustScore: 0.50,
      externalMessageId: '1004',
      rawText: rawBanter1,
    });
    expect(res1.isSpam).toBe(true);
    expect(res1.isEligibleForArticle).toBe(false);
    expect(res1.publicationStatus).toBe('REJECTED');

    const rawBanter2 = 'Reverse-engineering Find My People to stalk my ex a friend, cause I can https://ift.tt/example';
    const res2 = await normalizeIntelligenceSignal({
      sourceId: 'tg_reddit_memes',
      sourceName: 'Reddit Memes',
      sourceTrustScore: 0.50,
      externalMessageId: '1005',
      rawText: rawBanter2,
    });
    expect(res2.isSpam).toBe(true);
    expect(res2.isEligibleForArticle).toBe(false);
    expect(res2.publicationStatus).toBe('REJECTED');
  });

  it('5. Raw ChatGPT translation dump => BLOCKED', async () => {
    const rawDump = 'ParsedReport ChatGPT Translated Autotext: (TI Report Analyser + ChatGPT + Auto Translate) ------ Some unverified text';
    const result = await normalizeIntelligenceSignal({
      sourceId: 'tg_autobot',
      sourceName: 'AutoBot Channel',
      sourceTrustScore: 0.40,
      externalMessageId: '1006',
      rawText: rawDump,
    });

    expect(result.isSpam).toBe(true);
    expect(result.isEligibleForArticle).toBe(false);
    expect(result.publicationStatus).toBe('REJECTED');
  });

  it('6. Non-intelligence commercial spam => BLOCKED', async () => {
    const rawAd = 'Реклама. АО АКБ «НОВИКОМБАНК» специальные условия по кредитам для сотрудников предприятий';
    const result = await normalizeIntelligenceSignal({
      sourceId: 'tg_ad_channel',
      sourceName: 'Russian Ads',
      sourceTrustScore: 0.40,
      externalMessageId: '1007',
      rawText: rawAd,
    });

    expect(result.isSpam).toBe(true);
    expect(result.isEligibleForArticle).toBe(false);
    expect(result.publicationStatus).toBe('REJECTED');
  });

  it('7. Valid English cyber-intelligence advisory with verified CVE => PASS', async () => {
    const validAdvisory = `CRITICAL ADVISORY: Microsoft Confirms CVSS 10.0 Remote Code Execution Vulnerability in Entra ID (CVE-2026-69836).
Zero-day vulnerability in Microsoft Entra ID exploited in the wild prior to server-side patches.
Attackers targeting unauthenticated API endpoints to achieve remote privilege escalation.
Security teams should immediately audit external federation boundaries and apply available workarounds.`;

    const result = await normalizeIntelligenceSignal({
      sourceId: 'src_microsoft_msrc',
      sourceName: 'Microsoft MSRC',
      sourceTrustScore: 0.95,
      externalMessageId: '1008',
      rawText: validAdvisory,
      publishedAt: new Date().toISOString(),
    });

    expect(result.isSpam).toBe(false);
    expect(result.isEnglishValid).toBe(true);
    expect(result.entities.cves).toContain('CVE-2026-69836');
    expect(result.severity).toBe('critical');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.75);
    expect(result.isEligibleForArticle).toBe(true);
    expect(result.publicationStatus).toBe('PUBLISHED');
  });

  it('8. QualityGate fail-closed on foreign script leakage in headline', () => {
    const badReport: any = {
      assessment: {
        headline: 'Уязвимость ядра Linux CVE-2026-74583',
        executive_summary: 'Critical buffer overflow in Linux kernel routing subsystem.',
        threat_level: 'CRITICAL',
        confidence_score: 0.90,
        confidence_state: 'CONFIRMED',
      },
      evidence: [{ evidenceId: 'evi_01', snippet: 'kernel crash', sourceId: 'src_kernel' }],
    };

    const gate = validateQualityGate(badReport);
    expect(gate.passed).toBe(false);
    expect(gate.violations).toContain('Headline contains non-English characters');
  });

});
