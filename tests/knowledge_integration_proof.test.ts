/**
 * ZAYRON-X — CANONICAL KNOWLEDGE INTEGRATION PERMANENT REGRESSION SUITE
 * 
 * Machine-verifies end-to-end operational knowledge integration across 10 required domains:
 * 1. CVSS query -> correct canonical document (doc-07-first-cvss4)
 * 2. EPSS query -> correct canonical document (doc-08-first-epss)
 * 3. KEV query -> correct canonical document (doc-cisa-kev)
 * 4. NIST DFIR query -> correct canonical document (doc-04-nist-sp-800-86)
 * 5. Retrieved knowledge reaches reasoning stage (visible in Section 03/06/09)
 * 6. Material claim retains knowledge evidence (book_citations & knowledge_ids bound)
 * 7. Contradiction is preserved (disagreement remains EVIDENTIARY_DISPUTE, not collapsed)
 * 8. Knowledge unavailable -> fail closed (no fabricated claims, downgraded/safe status)
 * 9. Legacy/mock references -> zero in active state (chk_ and doc_ref_ count is 0)
 * 10. Valid analysis without hallucinated knowledge references (verbatim citations exist in canonical corpus)
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  executeDeepIntelligenceAnalysisV2,
  evaluateDeepQualityGateV2,
  executeShadowVectorizeRetrieval,
  computeChunkContentHash,
  buildGeminiReasoningPrompt,
  INSUFFICIENT_GROUNDING_SENTENCE,
} from '../packages/intelligence/src/engine_v2';
import { detectContradictions } from '../packages/intelligence/src/engine_v2/contradictions';
import { runCanonicalRetrievalBenchmark } from '../scripts/test_canonical_retrieval';

describe('ZAYRON-X — Canonical Knowledge Integration Proof Suite', () => {

  // ── 1. CVSS query -> correct canonical document ───────────────────────────
  it('1. CVSS query retrieves doc-07-first-cvss4 as top canonical document', async () => {
    const results = await runCanonicalRetrievalBenchmark([
      { id: 'TEST_CVSS', query: 'CVSS v4 scoring methodology Attack Vector', expectedDoc: 'doc-07-first-cvss4' }
    ]);
    expect(results[0].pass).toBe(true);
    expect(results[0].retrievedDoc).toBe('doc-07-first-cvss4');
    expect(results[0].retrievedChunkId.startsWith('doc-07-first-cvss4')).toBe(true);
    expect(results[0].score).toBeGreaterThan(5);
  });

  // ── 2. EPSS query -> correct canonical document ───────────────────────────
  it('2. EPSS query retrieves doc-08-first-epss as top canonical document', async () => {
    const results = await runCanonicalRetrievalBenchmark([
      { id: 'TEST_EPSS', query: 'EPSS probability exploitation likelihood methodology 30 days', expectedDoc: 'doc-08-first-epss' }
    ]);
    expect(results[0].pass).toBe(true);
    expect(results[0].retrievedDoc).toBe('doc-08-first-epss');
    expect(results[0].retrievedChunkId.startsWith('doc-08-first-epss')).toBe(true);
  });

  // ── 3. KEV query -> correct canonical document ────────────────────────────
  it('3. KEV query retrieves doc-cisa-kev as top canonical document', async () => {
    const results = await runCanonicalRetrievalBenchmark([
      { id: 'TEST_KEV', query: 'Known Exploited Vulnerabilities prioritization CISA KEV catalog', expectedDoc: 'doc-cisa-kev' }
    ]);
    expect(results[0].pass).toBe(true);
    expect(results[0].retrievedDoc).toBe('doc-cisa-kev');
    expect(results[0].retrievedChunkId.startsWith('doc-cisa-kev')).toBe(true);
  });

  // ── 4. NIST DFIR query -> correct canonical document ──────────────────────
  it('4. NIST DFIR query retrieves doc-04-nist-sp-800-86 as top canonical document', async () => {
    const results = await runCanonicalRetrievalBenchmark([
      { id: 'TEST_DFIR', query: 'Digital memory malware forensic investigation NIST SP 800-86', expectedDoc: 'doc-04-nist-sp-800-86' }
    ]);
    expect(results[0].pass).toBe(true);
    expect(results[0].retrievedDoc).toBe('doc-04-nist-sp-800-86');
    expect(results[0].retrievedChunkId.startsWith('doc-04-nist-sp-800-86')).toBe(true);
  });

  // ── 5. Retrieved knowledge reaches reasoning stage ────────────────────────
  it('5. Retrieved canonical knowledge reaches reasoning stage in report and prompt synthesis', () => {
    const rawSignal = 'Security Advisory: Flaw CVE-2024-40766 in SonicWall SonicOS allows remote unauthenticated attackers to execute arbitrary code. CVSS Base Score: 9.3 (CRITICAL).';
    const { report } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_sonicwall_test',
      channelTitle: 'SonicWall PSIRT',
      messageId: 'sw_01',
      rawText: rawSignal,
      // P0.1: measured EPSS evidence injected so the methodological-grounding claim is evidence-backed
      epssEvidence: { lookup: (cveId: string) => cveId === 'CVE-2024-40766' ? { cve_id: 'CVE-2024-40766', score: 0.962, percentile: 98, retrieved_at: '2026-09-18T00:00:00.000Z' } : null },
    });

    // Visible in Section 09: Knowledge Applied
    const sec09 = report.sections.find(s => s.section_number === '09');
    expect(sec09).toBeDefined();
    expect(sec09!.content).toContain('doc-07-first-cvss4');
    expect(sec09!.content).toContain('USED');

    // Visible in Section 03: Technical Analysis (methodological grounding)
    const sec03 = report.sections.find(s => s.section_number === '03');
    expect(sec03).toBeDefined();
    const hasCanonicalDoc = sec03!.content.includes('doc-07-first-cvss4') || sec03!.content.includes('doc-08-first-epss') || sec03!.content.includes('Methodological Grounding');
    expect(hasCanonicalDoc).toBe(true);

    // Knowledge traces reach Gemini reasoning prompt
    const prompt = buildGeminiReasoningPrompt({
      entity: {
        id: 'CVE-2024-40766',
        type: 'VULNERABILITY',
        name: 'SonicOS Buffer Overflow',
        cvss_score: 9.3,
        affected_product: 'SonicOS',
        raw_telemetry: rawSignal,
      },
      citations: [
        {
          document_id: 'doc-07-first-cvss4',
          chunk_id: 'doc-07-first-cvss4-p1-2',
          quoted_fragment: 'The Common Vulnerability Scoring System (CVSS) is an open framework',
        }
      ]
    });
    expect(prompt.userPrompt).toContain('[Citation 1] (doc-07-first-cvss4 / doc-07-first-cvss4-p1-2)');
    expect(prompt.userPrompt).toContain('The Common Vulnerability Scoring System (CVSS) is an open framework');
  });

  // ── 6. Material claim retains knowledge evidence ──────────────────────────
  it('6. Material analytical claim binds to exact canonical knowledge evidence without orphan status', () => {
    const rawSignal = 'Security Advisory: CVE-2024-40766 SonicWall SonicOS flaw. CVSS Base Score: 9.3. PoC public.';
    const { report } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_sw_claim_test',
      channelTitle: 'SonicWall PSIRT',
      messageId: 'sw_02',
      rawText: rawSignal,
    });

    const cvssClaim = report.claims.find(c => c.statement.includes('CVSS Base Score registered at 9.3'));
    expect(cvssClaim).toBeDefined();
    expect(cvssClaim!.book_citations.length).toBeGreaterThan(0);

    const cit = cvssClaim!.book_citations[0];
    expect(cit.document_id).toBe('doc-07-first-cvss4');
    expect(cit.chunk_id.startsWith('doc-07-first-cvss4')).toBe(true);
    expect(cit.quoted_fragment.length).toBeGreaterThan(15);
    expect(cvssClaim!.knowledge_ids).toContain(cit.chunk_id);
    expect(cvssClaim!.evidence_ids.length).toBeGreaterThan(0);
  });

  // ── 7. Contradiction is preserved ─────────────────────────────────────────
  it('7. Inter-source contradiction is preserved as EVIDENTIARY_DISPUTE and not collapsed into false certainty', () => {
    const rawSignal = 'Advisory CVE-2024-9999: Vendor reports no evidence of exploitation at this time. However, threat community telemetry confirms malware is under active exploitation in the wild.';
    const enrichment: any = {
      cve_id: 'CVE-2024-9999',
      cvss_score: 8.5,
      cvss_severity: 'HIGH',
      cisa_kev: { is_in_kev: false },
      exploit_status: 'EXPLOITATION_IN_THE_WILD',
    };

    const contradictions = detectContradictions({
      rawText: rawSignal,
      issuingAuthority: 'Acme PSIRT',
      collectionChannel: '@threatintel_feed',
      enrichment,
    });

    expect(contradictions.length).toBeGreaterThan(0);
    const c = contradictions[0];
    expect(c.topic).toBe('Exploitation-In-The-Wild Divergence');
    expect(c.resolution_status).toBe('EVIDENTIARY_DISPUTE');
    expect(c.analyst_note).toContain('Discrepancy preserved');
    expect(c.analyst_note).toContain('Verification pending telemetry corroboration');
  });

  // ── 8. Knowledge unavailable -> fail closed ───────────────────────────────
  it('8. Unavailable knowledge retrieval triggers safe fail-closed behavior without fabricated claims', () => {
    const rawSignal = 'Security Advisory: CVE-2024-40766 in SonicOS. CVSS Base Score: 9.3.';
    const { report, qualityGate } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_fail_closed_test',
      channelTitle: 'SonicWall PSIRT',
      messageId: 'sw_fail',
      rawText: rawSignal,
      skipKnowledgeRetrieval: true, // Knowledge unavailable simulation
    });

    // 1. Knowledge trace must be empty - zero fabricated records
    expect(report.knowledge_trace.length).toBe(0);

    // 2. Section 09 explicitly acknowledges unavailability
    const sec09 = report.sections.find(s => s.section_number === '09');
    expect(sec09!.content).toBe('No external knowledge corpus documents satisfied evidentiary preconditions for this raw advisory signal.');

    // 3. Claims must not hallucinate book citations
    report.claims.forEach(c => {
      expect(c.book_citations.length).toBe(0);
      expect(c.knowledge_ids.length).toBe(0);
    });

    // 4. Gemini prompt generates fallback sentence when citations are empty
    const geminiPrompt = buildGeminiReasoningPrompt({
      entity: { id: 'CVE-2024-40766', type: 'VULNERABILITY', raw_telemetry: rawSignal },
      citations: [],
    });
    expect(geminiPrompt.userPrompt).toContain('NO RETRIEVED CITATIONS PROVIDED.');
  });

  // ── 9. Legacy/mock references -> zero in active state ──────────────────────
  it('9. Active database and production state contain ZERO mock references (chk_ / doc_ref_)', () => {
    const activeBackupPath = resolve(process.cwd(), 'db/backups/live_intelligence_backup_20260904.json');
    expect(existsSync(activeBackupPath)).toBe(true);

    const rawData = readFileSync(activeBackupPath, 'utf8');
    const chkMatches = rawData.match(/chk_[a-zA-Z0-9_]+/g) || [];
    const docRefMatches = rawData.match(/doc_ref_[a-zA-Z0-9_]+/g) || [];

    expect(chkMatches.length).toBe(0);
    expect(docRefMatches.length).toBe(0);

    // Also verify unpublish backup contains 23 affected articles
    const unpublishBackupPath = resolve(process.cwd(), 'db/backups/unpublish_backup_23_articles_20260906.json');
    expect(existsSync(unpublishBackupPath)).toBe(true);
    const unpublishData = JSON.parse(readFileSync(unpublishBackupPath, 'utf8'));
    expect(unpublishData.total_articles || unpublishData.articles?.length).toBe(23);
  });

  // ── 10. Valid analysis without hallucinated knowledge references ──────────
  it('10. Valid analysis with canonical knowledge produces strictly verified verbatim citations that exist in corpus', () => {
    const rawSignal = 'Security Advisory: CVE-2024-40766 SonicWall SonicOS allows remote code execution. CVSS Base Score: 9.3.';
    const { report, qualityGate } = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_verbatim_test',
      channelTitle: 'SonicWall PSIRT',
      messageId: 'sw_v',
      rawText: rawSignal,
    });

    // Quality gate passes
    expect(qualityGate.passed).toBe(true);
    expect(qualityGate.stage_results.knowledge_validation.passed).toBe(true);
    expect(qualityGate.stage_results.zero_defect_operational.passed).toBe(true);

    // Every cited chunk in claims must exist in the report knowledge_trace
    const usedChunkIds = new Set(report.knowledge_trace.filter(k => k.status === 'USED').map(k => k.chunk_id));
    for (const clm of report.claims) {
      for (const cit of clm.book_citations || []) {
        expect(usedChunkIds.has(cit.chunk_id)).toBe(true);
        expect(cit.quoted_fragment.trim().length).toBeGreaterThan(10);
        // Verify cited fragment exists inside chunk text
        const traceChunk = report.knowledge_trace.find(k => k.chunk_id === cit.chunk_id);
        expect(traceChunk).toBeDefined();
        expect(traceChunk!.chunk_text).toContain(cit.quoted_fragment);
      }
    }
  });

});
