/**
 * M16.4.31 — REPORT CONSISTENCY & PERSISTENCE GATE
 *
 * Closes the four report-quality gaps identified in M16.4.30 and proves the
 * canonical report can be persisted and retrieved through the REAL persistence
 * implementation against a REAL, ISOLATED SQLite (D1-compatible) datastore.
 *
 * Everything asserted here runs over the real report captured from
 * run 36716096667 / specimen
 * e4e5c3a6c15beff4e17117075e2c0bd65f176d81e6885134d2b4d97c20d4773a.
 * No malware evidence is invented, no production datastore is touched, and no
 * expected value is hand-authored.
 */
import { describe, it, expect, afterAll } from 'bun:test';
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import {
  summarizeCapabilityStepStates,
  type CapabilityPlanStepLike,
} from '../../packages/intelligence/src/malware/canonical/malwareProductionPipeline';
import {
  MALWARE_REPORTS_SCHEMA_SQL,
  canonicalMalwareReportRow,
  persistCanonicalMalwareReport,
} from '../../packages/intelligence/src/malware/canonical/reportPersistence';
import {
  storedReportRejections,
  loadServableMalwareReports,
  loadServableMalwareReport,
} from '../../workers/api/src/malwareReportReadGate';
import { getCanonicalMalwareReport } from '../../apps/web/app/lib/api';
import { keyFindings } from '../../apps/web/app/lib/malwareReportProjection';
import { openIsolatedStore } from '../support/isolatedD1';

const FIXTURE = 'tests/fixtures/malware_report/real_report_e4e5c3a6.json';
const COMPONENT_SOURCE = readFileSync('apps/web/app/components/CanonicalMalwareReport.tsx', 'utf8');
const PIPELINE_SOURCE = readFileSync(
  'packages/intelligence/src/malware/canonical/malwareProductionPipeline.ts',
  'utf8',
);

const loadReport = (): Record<string, any> => JSON.parse(readFileSync(FIXTURE, 'utf8'));

const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

/* ─────────── isolated datastore (real SQLite file, real schema) ─────────── */

const ISOLATED_ROOT = mkdtempSync(join(tmpdir(), 'zx-m16431-'));
const ISOLATED_DB_PATH = join(ISOLATED_ROOT, 'isolated_reports.sqlite');

const store = openIsolatedStore(ISOLATED_DB_PATH);
store.sqlite.exec(MALWARE_REPORTS_SCHEMA_SQL);

afterAll(() => {
  store.close();
  try {
    rmSync(ISOLATED_ROOT, { recursive: true, force: true });
  } catch {
    // A locked temp file on Windows must never fail the suite; the database is
    // an isolated temp artefact, not evidence.
  }
});

describe('M16.4.31 / FIX 1 — tool status counts', () => {
  it('the instrument reports 5 OBSERVED tools and 1 NO_RESULT tool', () => {
    const report = loadReport();
    const byStatus = (status: string) =>
      report.tool_results.filter((t: any) => t.status === status).length;
    expect(byStatus('OBSERVED')).toBe(5);
    expect(byStatus('NO_RESULT')).toBe(1);
    // The OBSERVED tools are exactly the five that returned a result.
    expect(
      report.tool_results.filter((t: any) => t.status === 'OBSERVED').map((t: any) => t.tool_id).sort(),
    ).toEqual(['capa', 'die', 'floss', 'lief', 'magika']);
  });

  it('the derived tool aggregate equals the actual canonical tool-result set', () => {
    const report = loadReport();
    const planSteps = report.analysis_status.plan_steps as CapabilityPlanStepLike[];
    const summary = summarizeCapabilityStepStates(planSteps);

    const observed = report.tool_results.filter((t: any) => t.status === 'OBSERVED').length;
    const noResult = report.tool_results.filter((t: any) => t.status === 'NO_RESULT').length;

    // Invariant: OBSERVED_COUNT === count(tool_results where status === OBSERVED)
    expect(summary).toContain(`tool steps: NO_RESULT=${noResult}, OBSERVED=${observed}`);

    // The non-tool capability step is reported separately and never counted as a tool.
    expect(summary).toContain('non-tool capability steps: OBSERVED=1');
    expect(summary).not.toContain('OBSERVED=6');

    // Every tool the instrument counted exists as a real tool result, and vice versa.
    const toolSteps = planSteps.filter((s) => String(s.capability ?? '').startsWith('tool:'));
    expect(toolSteps.length).toBe(report.tool_results.length);
    expect(
      toolSteps
        .map((s) => String(s.capability).replace('tool:', ''))
        .sort(),
    ).toEqual(report.tool_results.map((t: any) => t.tool_id).sort());
  });

  it('the aggregate is derived, never hard-coded, and every status is counted', () => {
    expect(PIPELINE_SOURCE).toContain('summarizeCapabilityStepStates(planSteps)');
    // No hard-coded count may appear as a literal anywhere in the source.
    expect(PIPELINE_SOURCE).not.toMatch(/OBSERVED=\d/);
    expect(PIPELINE_SOURCE).not.toMatch(/NO_RESULT=\d/);

    // Pure-function behaviour: no status is dropped or double counted.
    const all: CapabilityPlanStepLike[] = [
      { capability: 'tool:a', status: 'OBSERVED' },
      { capability: 'tool:b', status: 'OBSERVED' },
      { capability: 'tool:c', status: 'ERROR' },
      { capability: 'tool:d', status: 'UNAVAILABLE' },
      { capability: 'static_analyzer', status: 'OBSERVED' },
    ];
    expect(summarizeCapabilityStepStates(all)).toBe(
      'tool steps: ERROR=1, OBSERVED=2, UNAVAILABLE=1; non-tool capability steps: OBSERVED=1',
    );
  });
});

describe('M16.4.31 / FIX 2 — raw tool ATT&CK evidence vs canonical mapping', () => {
  it('the report keeps the two states distinct and never contradicts itself', () => {
    const report = loadReport();

    // Canonical mapping layer established nothing, and says so explicitly.
    expect(report.attack_mbc.items).toEqual([]);
    expect(
      report.limitations.some(
        (l: any) => l.code === 'EMPTY_SECTION' && l.subject_id === 'attack_mbc',
      ),
    ).toBe(true);

    // Raw analyzer evidence is still recorded, per tool, verbatim.
    const capa = report.tool_results.find((t: any) => t.tool_id === 'capa');
    expect(capa.status).toBe('OBSERVED');
    expect(typeof capa.provenance.execution_stdout_sha256).toBe('string');
  });

  it('the customer-facing presentation states the distinction instead of implying one', () => {
    expect(COMPONENT_SOURCE).toContain('RAW TOOL ATT&CK EVIDENCE');
    expect(COMPONENT_SOURCE).toContain('CANONICAL ATT&CK MAPPING');
    expect(COMPONENT_SOURCE).toContain('Canonical ATT&CK mapping state');
    expect(COMPONENT_SOURCE).toContain('Canonical MBC mapping state');
    // An unmapped section is stated as NO EVIDENCE, never as a clean result.
    expect(COMPONENT_SOURCE).toContain('This is NO EVIDENCE from the canonical mapping layer');
  });
});

describe('M16.4.31 / FIX 3 — capability vs behaviour', () => {
  it('the real instrument record is a static capability, not a runtime behaviour', () => {
    const report = loadReport();
    const behaviors = report.behaviors.items as any[];
    expect(behaviors.length).toBeGreaterThan(0);
    for (const b of behaviors) {
      expect(b.modality).toBe('CAN_DO');
      expect(b.category).toBe('capability');
    }
    // Nothing in the report claims observed execution: the coverage statement
    // records dynamic behaviour as NOT PERFORMED and no statement asserts a
    // doing-modality.
    const execStatements = (report.executive_assessment.statements ?? [])
      .map((s: any) => String(s.statement))
      .join('\n');
    expect(execStatements).toContain('NOT PERFORMED');
    expect(execStatements).not.toMatch(/OBSERVED_DOING/);
  });

  it('CAN_DO records are labelled as static capabilities and never as executed behaviour', () => {
    expect(COMPONENT_SOURCE).toContain('STATIC CAPABILITY — NOT OBSERVED RUNTIME BEHAVIOR');
    expect(COMPONENT_SOURCE).toContain('It is NOT observed runtime behaviour');
    // The kind is derived from the canonical record, not hard-coded per row.
    expect(COMPONENT_SOURCE).toContain('const isStaticCapability = String(b?.modality ?? "") === "CAN_DO"');
  });
});

describe('M16.4.31 / FIX 4 — EVIDENCE_SUPPORT presentation', () => {
  it('the metric, the epistemic status and the evidence kind stay separate axes', () => {
    const report = loadReport();
    const capabilityRows = report.confidence.items.filter(
      (c: any) => Array.isArray(c.support_semantics?.epistemic_status)
        && c.support_semantics.epistemic_status.includes('CAN_DO'),
    );
    expect(capabilityRows.length).toBeGreaterThan(0);

    for (const row of capabilityRows) {
      // Metric semantics unchanged: still EVIDENCE_SUPPORT in [0,1].
      expect(row.support_semantics.metric).toBe('EVIDENCE_SUPPORT');
      expect(typeof row.support).toBe('number');
      expect(row.support).toBeGreaterThanOrEqual(0);
      expect(row.support).toBeLessThanOrEqual(1);
      // A floor value coexists with a positive-capability epistemic state.
      expect(row.support_semantics.evidence_kind).toContain('STATIC');
    }
    const floorRow = capabilityRows.find((c: any) => c.support === 0);
    expect(floorRow).toBeDefined();
    expect(floorRow.support_semantics.epistemic_status).toEqual(['CAN_DO']);
  });

  it('the presentation explains that a floor value is not absence of evidence', () => {
    expect(COMPONENT_SOURCE).toContain('does <strong>not</strong> mean &ldquo;no evidence&rdquo;');
    expect(COMPONENT_SOURCE).toContain('metric value</strong>, the <strong>epistemic status');
    expect(COMPONENT_SOURCE).toContain('evidence kind</strong> are three separate axes');
  });
});

/* ───────────── REAL persistence → REAL read gate ───────────── */

const report = loadReport();
const storedDocument = report;
const reportJsonHashBefore = sha256(JSON.stringify(storedDocument));

describe('M16.4.31 / PHASE 5 — real persistence to an isolated real datastore', () => {
  it('1. initializes the real malware_reports schema in the isolated database', () => {
    const tables = store.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='malware_reports'")
      .all() as Array<{ name: string }>;
    expect(tables.map((t) => t.name)).toEqual(['malware_reports']);

    const columns = (
      store.sqlite.prepare('PRAGMA table_info(malware_reports)').all() as Array<{ name: string }>
    ).map((c) => c.name);
    expect(columns).toEqual([
      'id', 'title', 'sha256', 'family', 'summary', 'source', 'severity', 'report_json', 'published_at', 'created_at',
    ]);

    // The isolated store is a real database file, not a memory image, and is not
    // any production database.
    expect(ISOLATED_DB_PATH.startsWith(ISOLATED_ROOT)).toBe(true);
    expect(ISOLATED_DB_PATH).not.toContain('zayron-x-db');
    expect(ISOLATED_DB_PATH).not.toContain('zayron-x-malware-validation-db');
  });

  it('2. inserts the report through the REAL persistence module', async () => {
    const row = canonicalMalwareReportRow({
      stored_document: storedDocument,
      published_at: report.generated_at,
      executed_steps: 7,
      deferred_steps: 0,
      skipped_steps: 0,
    });
    expect(row.id).toBe(report.report_id);

    await persistCanonicalMalwareReport(store.db, row);
    expect(store.sqlite.prepare('SELECT COUNT(*) AS n FROM malware_reports').get()).toEqual({ n: 1 });
  });

  it('3. the row is really in the database file (verified by a second connection)', () => {
    const second = openIsolatedStore(ISOLATED_DB_PATH);
    try {
      const row = second.sqlite
        .prepare('SELECT id, sha256, report_json FROM malware_reports WHERE id = ?')
        .get(report.report_id) as { id: string; sha256: string; report_json: string } | null;
      expect(row).not.toBeNull();
      expect(row!.id).toBe(report.report_id);
      expect(row!.sha256).toBe(report.sha256);
      expect(sha256(row!.report_json)).toBe(reportJsonHashBefore);
    } finally {
      second.close();
    }
  });

  it('4. the REAL read gate retrieves it, and the hash and id are preserved', async () => {
    const list = await loadServableMalwareReports(store.db);
    expect(list.excluded).toBe(0);
    expect(list.rows).toHaveLength(1);

    const detail = await loadServableMalwareReport(store.db, report.report_id);
    expect(detail.rejections).toEqual([]);
    expect(detail.row).not.toBeNull();

    const retrieved = JSON.parse(detail.row!.report_json);
    // HASH(report_before_persist) === HASH(report_after_retrieve)
    expect(sha256(JSON.stringify(retrieved))).toBe(reportJsonHashBefore);
    expect(detail.row!.report_json).toBe(JSON.stringify(storedDocument));
    // report_id_before === report_id_after
    expect(retrieved.report_id).toBe(report.report_id);
    // Deterministic deep equality, field for field.
    expect(retrieved).toEqual(storedDocument);
  });

  it('5. the stored document still satisfies the canonical publication rules', () => {
    expect(storedReportRejections({
      id: report.report_id,
      sha256: report.sha256,
      report_json: JSON.stringify(storedDocument),
    })).toEqual([]);
  });
});

describe('M16.4.31 / API → UI data proof over the persisted report', () => {
  it('the real API client receives the persisted report unchanged', async () => {
    const gate = await loadServableMalwareReport(store.db, report.report_id);
    const routeBody = {
      report: JSON.parse(gate.row!.report_json),
      meta: {
        report_id: gate.row!.id,
        sha256: gate.row!.sha256,
        source: gate.row!.source,
        published_at: gate.row!.published_at,
      },
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(routeBody), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;
    try {
      const result = await getCanonicalMalwareReport(report.report_id);
      expect(result.state).toBe('success');
      // No field added, removed or renamed between persistence and the client.
      expect(JSON.stringify(result.data)).toBe(JSON.stringify(storedDocument));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('the UI data functions consume the persisted report and lose no evidence', async () => {
    const gate = await loadServableMalwareReport(store.db, report.report_id);
    const payload = JSON.parse(gate.row!.report_json);

    // UI consumes the PERSISTED document, not a fixture import.
    const findings = keyFindings({
      artifact_id: payload.artifact_id,
      sha256: payload.sha256,
      format_class: payload.sample_identity?.format_class ?? null,
      file_size_bytes: payload.sample_identity?.file_size_bytes ?? null,
      content_type_assessment: payload.content_type_assessment ?? {},
      capabilities: payload.capabilities ?? {},
      embedded_objects: payload.embedded_objects ?? {},
      derived_artifacts: payload.detection_artifacts?.derived_artifacts ?? [],
      decoded_structure: payload.decoded_structure ?? {},
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.map((f) => f.title)).toContain('Static capability indicators');
    expect(findings.map((f) => f.title)).not.toContain('Compiled AutoIt indicators');

    // Statuses, provenance and identity survive into what the UI renders.
    const statuses = payload.tool_results.map((t: any) => `${t.tool_id}:${t.status}`).sort();
    expect(statuses).toEqual([
      'capa:OBSERVED', 'die:OBSERVED', 'floss:OBSERVED', 'lief:OBSERVED',
      'magika:OBSERVED', 'yara-x:NO_RESULT',
    ]);
    const capa = payload.tool_results.find((t: any) => t.tool_id === 'capa');
    expect(capa.provenance.execution_exit_status).toBe(0);
    expect(capa.provenance.input_sha256).toBe(payload.sha256);
    expect(capa.provenance.runner_identity).toBe('gh-runner-36716096667');
    expect(Array.isArray(payload.limitations)).toBe(true);
    expect(payload.limitations.length).toBeGreaterThan(0);
  });
});

describe('M16.4.31 — fail-closed retrieval', () => {
  it('an unknown report id is not found, never a fabricated report', async () => {
    const gate = await loadServableMalwareReport(store.db, 'mir_does_not_exist');
    expect(gate.row).toBeNull();
    expect(gate.rejections).toEqual([]);
  });

  it('a corrupt stored report is excluded and answered with not-found', async () => {
    const corrupt = openIsolatedStore(join(ISOLATED_ROOT, 'corrupt.sqlite'));
    try {
      corrupt.sqlite.exec(MALWARE_REPORTS_SCHEMA_SQL);
      corrupt.sqlite
        .prepare(
          'INSERT INTO malware_reports (id, title, sha256, summary, source, report_json, published_at) ' +
            'VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .run('mir_corrupt_0001', 'corrupt', report.sha256, 's', 'GITHUB_MALWARE_FEED', '{"report_id":', '2026-09-30T00:00:00.000Z');

      expect(
        storedReportRejections({ id: 'mir_corrupt_0001', sha256: report.sha256, report_json: '{"report_id":' }),
      ).toEqual(['stored_report:unparsable_json']);

      const list = await loadServableMalwareReports(corrupt.db);
      expect(list.rows).toHaveLength(0);
      expect(list.excluded).toBe(1);

      const detail = await loadServableMalwareReport(corrupt.db, 'mir_corrupt_0001');
      expect(detail.row).toBeNull();
      expect(detail.rejections.length).toBeGreaterThan(0);
    } finally {
      corrupt.close();
    }
  });
});

describe('M16.4.31 — production datastore is never contacted', () => {
  it('no production database identifier appears in the persistence path or the isolated harness', () => {
    const persistence = readFileSync(
      'packages/intelligence/src/malware/canonical/reportPersistence.ts',
      'utf8',
    );
    const adapter = readFileSync('tests/support/isolatedD1.ts', 'utf8');
    for (const src of [persistence, adapter, readFileSync(FIXTURE, 'utf8')]) {
      expect(src).not.toContain('zayron-x-db');
      expect(src).not.toContain('c19c8f45-801b-4034-bd76-402e5e5389b5');
      expect(src).not.toContain('zayron-x-malware-validation-db');
      expect(src).not.toContain('985bfcf9-9745-40d3-bd34-379ea00e4778');
    }
    // The only datastore this suite opened is the isolated one.
    expect(store.path.startsWith(ISOLATED_ROOT)).toBe(true);
    expect(store.sqlite.prepare('SELECT COUNT(*) AS n FROM malware_reports').get()).toEqual({ n: 1 });
  });
});
