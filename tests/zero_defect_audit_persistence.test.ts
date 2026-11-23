import { describe, it, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { executeDeepIntelligenceAnalysisV2 } from '../packages/intelligence/src/engine_v2/index';
import { publishCanonicalReportV2 } from '../packages/intelligence/src/publishing/publisher';

describe('Durable Zero-Defect Metric Persistence Suite (Mandate Part 3)', () => {
  const db = new Database(':memory:');

  // Set up exact D1 schema
  db.run(`
    CREATE TABLE IF NOT EXISTS zero_defect_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      citation_gate_passed INTEGER NOT NULL,
      unsupported_claims_check_passed INTEGER NOT NULL,
      relevance_sanity_passed INTEGER NOT NULL,
      non_generic_check_passed INTEGER NOT NULL,
      overall_status TEXT NOT NULL,
      rejection_reason TEXT
    );
  `);

  // Wrap db into D1-compatible mock interface
  const d1Mock = {
    prepare: (sql: string) => {
      const stmt = db.prepare(sql);
      return {
        bind: (...params: any[]) => ({
          run: async () => stmt.run(...params),
          all: async () => ({ results: stmt.all(...params) }),
        }),
      };
    },
  };

  const cleanVulnSignal = `Red Hat Security Advisory: Critical vulnerability in OpenSSL package
CVE-2024-0553: A flaw was found in openssl where memory corruption occurs during TLS handshake.
CVSS Base Score: 9.8 (CRITICAL) CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Advisory URL: https://access.redhat.com/security/cve/CVE-2024-0553
Mitigation: Upgrade openssl package to version 3.0.7-27 or later immediately.`;

  it('generates 5 real publication attempts (mix of pass/fail) and persists them durably into zero_defect_audit_log', async () => {
    // ── Attempt 1: Approved Clean OpenSSL Report ──
    const rep1 = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_openssl',
      channelTitle: 'Red Hat Security',
      messageId: 'msg_01',
      rawText: cleanVulnSignal,
    }).report;
    rep1.report_id = 'intel_attempt_01_pass';
    const res1 = await publishCanonicalReportV2(rep1, { rawTelemetryText: cleanVulnSignal, db: d1Mock });
    expect(res1.status).toBe('PUBLISHED');

    // ── Attempt 2: Rejected Irrelevant KEV Citation ──
    const rep2 = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_openssl',
      channelTitle: 'Red Hat Security',
      messageId: 'msg_02',
      rawText: cleanVulnSignal,
    }).report;
    rep2.report_id = 'intel_attempt_02_fail_irrelevant';
    rep2.knowledge_trace.push({
      document_id: 'doc-cisa-kev',
      chunk_id: 'doc-cisa-kev-record-640',
      title: 'CISA KEV Record: CVE-2023-33063 (Qualcomm)',
      status: 'USED',
      reason_retrieved: 'Semantic proximity',
      section_influenced: ['03 — TECHNICAL ANALYSIS'],
      claim_influenced: ['Vulnerability mechanics'],
    });
    const res2 = await publishCanonicalReportV2(rep2, { rawTelemetryText: cleanVulnSignal, db: d1Mock });
    expect(res2.status).toBe('REJECTED');

    // ── Attempt 3: Rejected Generic Boilerplate Contamination ──
    const rep3 = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_openssl',
      channelTitle: 'Red Hat Security',
      messageId: 'msg_03',
      rawText: cleanVulnSignal,
    }).report;
    rep3.report_id = 'intel_attempt_03_fail_generic';
    rep3.sections[0].content += '\nDefenders should remain vigilant and ensure all systems are updated immediately.';
    const res3 = await publishCanonicalReportV2(rep3, { rawTelemetryText: cleanVulnSignal, db: d1Mock });
    expect(res3.status).toBe('REJECTED');

    // ── Attempt 4: Approved Clean Second Vulnerability Report ──
    const rep4 = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_openssl_2',
      channelTitle: 'Red Hat Security',
      messageId: 'msg_04',
      rawText: cleanVulnSignal,
    }).report;
    rep4.report_id = 'intel_attempt_04_pass';
    const res4 = await publishCanonicalReportV2(rep4, { rawTelemetryText: cleanVulnSignal, db: d1Mock });
    expect(res4.status).toBe('PUBLISHED');

    // ── Attempt 5: Rejected Unsupported In-The-Wild Exploitation Claim ──
    const rep5 = executeDeepIntelligenceAnalysisV2({
      sourceId: 'src_openssl',
      channelTitle: 'Red Hat Security',
      messageId: 'msg_05',
      rawText: cleanVulnSignal,
    }).report;
    rep5.report_id = 'intel_attempt_05_fail_unsupported';
    rep5.enrichment.exploit_status = 'EXPLOITATION_IN_THE_WILD';
    const res5 = await publishCanonicalReportV2(rep5, { rawTelemetryText: cleanVulnSignal, db: d1Mock });
    expect(res5.status).toBe('REJECTED');

    // ── Query durable table ──
    const rows = db.prepare('SELECT id, report_id, timestamp, citation_gate_passed, unsupported_claims_check_passed, relevance_sanity_passed, non_generic_check_passed, overall_status, rejection_reason FROM zero_defect_audit_log ORDER BY id ASC').all() as any[];

    console.log('=== DURABLE ZERO-DEFECT AUDIT LOG ROWS (PROVED) ===');
    console.log(JSON.stringify(rows, null, 2));

    expect(rows.length).toBe(5);
    expect(rows[0].overall_status).toBe('APPROVED');
    expect(rows[1].overall_status).toBe('REJECTED');
    expect(rows[1].relevance_sanity_passed).toBe(0);
    expect(rows[2].overall_status).toBe('REJECTED');
    expect(rows[2].non_generic_check_passed).toBe(0);
    expect(rows[3].overall_status).toBe('APPROVED');
    expect(rows[4].overall_status).toBe('REJECTED');
    expect(rows[4].unsupported_claims_check_passed).toBe(0);
  });
});
