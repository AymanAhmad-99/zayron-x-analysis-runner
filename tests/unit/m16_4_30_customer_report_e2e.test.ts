/**
 * M16.4.30 — CUSTOMER-FACING MALWARE REPORT E2E
 *
 * Proves the complete product-facing chain against a REAL report document:
 *
 *   real analysis result → canonical report → STORED document
 *     → read gate → REPORT API payload → UI projection
 *
 * The fixture (`tests/fixtures/malware_report/real_report_e4e5c3a6.json`) is the
 * EXACT stored document produced by the real `materializeCanonicalReport` for
 * the real fresh validation run 36716096667 (specimen
 * e4e5c3a6c15beff4e17117075e2c0bd65f176d81e6885134d2b4d97c20d4773a, capa 9.4.0
 * OBSERVED). It is not hand-authored: every capability, status, address-free
 * capability, ATT&CK/MBC state, provenance hash and limitation in it came out of
 * the analyzer envelope. See fixtures/capa/FIXTURES.json and
 * fixtures/malware_report/PROVENANCE.json for the capture record.
 *
 * What this test asserts at each boundary is PRESERVATION, never invention:
 * an evidence field present upstream must remain identical downstream, and a
 * field that was never produced must stay absent (never defaulted into a
 * "clean" value).
 *
 * Read-only: the store is an in-memory D1 shim, `fetch` is stubbed. No
 * production store is touched and no report is mutated.
 */
import { describe, it, expect, mock, afterEach } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  validateStoredDocumentPublicationRules,
  validateStoredMalwareReport,
} from '../../packages/intelligence/src/malware/canonical/storedReportValidation';
import {
  storedReportRejections,
  loadServableMalwareReports,
  loadServableMalwareReport,
  type MalwareReportStore,
  type MalwareReportStoreRow,
} from '../../workers/api/src/malwareReportReadGate';
import { getCanonicalMalwareReport } from '../../apps/web/app/lib/api';
import { keyFindings } from '../../apps/web/app/lib/malwareReportProjection';

const FIXTURE_PATH = join(import.meta.dir, '..', 'fixtures', 'malware_report', 'real_report_e4e5c3a6.json');

/** Deep clone so a negative mutation can never leak into another case. */
const loadStored = (): Record<string, any> => JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));

const REAL_SHA = 'e4e5c3a6c15beff4e17117075e2c0bd65f176d81e6885134d2b4d97c20d4773a';
const REAL_RUNNER = 'gh-runner-36716096667';
const REAL_CAPA_STDOUT_SHA = '94b15f832b17a025c0e8eda319edcaa6f1c848414d099ededeeb8ea337942931';

/** The row the pipeline's persisting step would INSERT into `malware_reports`. */
function rowFrom(report: Record<string, any>, overrides: Partial<MalwareReportStoreRow> = {}): MalwareReportStoreRow {
  return {
    id: report.report_id,
    sha256: report.sha256,
    report_json: JSON.stringify(report),
    title: `Malware intelligence report ${report.report_id}`,
    family: null,
    source: String(report.acquisition?.source ?? 'GITHUB_MALWARE_FEED'),
    severity: null,
    published_at: report.generated_at,
    ...overrides,
  };
}

/** Minimal in-memory D1 surface the read gate's two real queries need. */
function storeFrom(rows: MalwareReportStoreRow[]): MalwareReportStore {
  return {
    prepare(_sql: string) {
      return {
        async all<T>() {
          return { results: rows as unknown as T[] };
        },
        bind(...values: unknown[]) {
          return {
            async first<T>() {
              return (rows.find((r) => r.id === values[0]) ?? null) as unknown as T | null;
            },
          };
        },
      };
    },
  };
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe('M16.4.30 — customer-facing report: write path', () => {
  it('the real stored document satisfies the write/read publication rules', () => {
    const report = loadStored();
    expect(validateStoredDocumentPublicationRules(report)).toEqual([]);
    expect(
      validateStoredMalwareReport({
        stored_id: report.report_id,
        stored_sha256: report.sha256,
        payload: report,
      }),
    ).toEqual([]);
  });

  it('the real document carries the run execution evidence the capability≠behavior rule requires', () => {
    const report = loadStored();
    expect(Array.isArray(report.tool_results)).toBe(true);
    expect(report.tool_results.length).toBeGreaterThan(0);
    expect(report.overall_status).toBe('SUCCEEDED');

    const capa = report.tool_results.find((t: any) => t.tool_id === 'capa');
    // CAPA observed on the real analysis path, with a real execution record.
    expect(capa).toBeDefined();
    expect(capa.status).toBe('OBSERVED');
    expect(capa.tool_version).toBe('9.4.0');
    expect(capa.provenance.execution_exit_status).toBe(0);
    expect(capa.provenance.execution_stdout_sha256).toBe(REAL_CAPA_STDOUT_SHA);
    expect(capa.provenance.input_sha256).toBe(REAL_SHA);
    expect(capa.provenance.runner_identity).toBe(REAL_RUNNER);

    // NO_RESULT stays NO_RESULT — never collapsed into a clean/negative result.
    const yara = report.tool_results.find((t: any) => t.tool_id === 'yara-x');
    expect(yara.status).toBe('NO_RESULT');
    expect(report.limitations.some((l: any) => l.code === 'NO_RESULT_ANALYZER')).toBe(true);
  });
});

describe('M16.4.30 — customer-facing report: read gate → report API', () => {
  it('serves the real report through the real read gate and list projection', async () => {
    const report = loadStored();
    const store = storeFrom([rowFrom(report)]);

    const list = await loadServableMalwareReports(store);
    expect(list.excluded).toBe(0);
    expect(list.rows).toHaveLength(1);

    // The list projection is exactly what the API route serialises.
    const row = list.rows[0];
    const item = {
      report_id: row.id,
      title: row.title,
      sha256: row.sha256,
      family: row.family || null,
      source: row.source,
      severity: row.severity || null,
      published_at: row.published_at,
    };
    expect(item.report_id).toBe(report.report_id);
    expect(item.sha256).toBe(REAL_SHA);

    const detail = await loadServableMalwareReport(store, report.report_id);
    expect(detail.rejections).toEqual([]);
    expect(detail.row).not.toBeNull();
  });

  it('serves the stored document byte-identically through the API detail route', async () => {
    const report = loadStored();
    const store = storeFrom([rowFrom(report)]);

    const gate = await loadServableMalwareReport(store, report.report_id);
    expect(gate.row).not.toBeNull();
    const row = gate.row!;

    // Exactly what `workers/api/src/index.ts` returns for this route.
    const routeBody = {
      report: JSON.parse(row.report_json) as unknown,
      meta: { report_id: row.id, sha256: row.sha256, source: row.source, published_at: row.published_at },
    };

    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify(routeBody), { status: 200, headers: { 'content-type': 'application/json' } }),
    ) as unknown as typeof fetch;

    const result = await getCanonicalMalwareReport(report.report_id);
    expect(result.state).toBe('success');
    // No field may be added, renamed, reordered-by-value or dropped in transit.
    expect(result.data).toEqual(report);
    expect(JSON.stringify(result.data)).toBe(JSON.stringify(report));
  });

  it('an absent report id is not found, never a fabricated report', async () => {
    const report = loadStored();
    const store = storeFrom([rowFrom(report)]);
    const gate = await loadServableMalwareReport(store, 'mir_does_not_exist');
    expect(gate.row).toBeNull();
    expect(gate.rejections).toEqual([]);

    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify({ error: 'not found' }), { status: 404 }),
    ) as unknown as typeof fetch;
    const result = await getCanonicalMalwareReport('mir_does_not_exist');
    expect(result.state).toBe('empty');
    expect(result.data).toBeNull();
  });

  it('an invalid stored row uses not-found semantics and is excluded from the list', async () => {
    const report = loadStored();
    const invalid = rowFrom(report, { report_json: '{"report_id":' });

    expect(storedReportRejections(invalid)).toEqual(['stored_report:unparsable_json']);

    const store = storeFrom([invalid]);
    const list = await loadServableMalwareReports(store);
    expect(list.rows).toHaveLength(0);
    expect(list.excluded).toBe(1);

    const detail = await loadServableMalwareReport(store, invalid.id);
    expect(detail.row).toBeNull();
    expect(detail.rejections.length).toBeGreaterThan(0);
  });
});

describe('M16.4.30 — customer-facing report: negative / fail-closed', () => {
  it('rejects a stored document with the execution evidence removed', () => {
    const report = loadStored();
    delete report.tool_results;
    const rejections = validateStoredDocumentPublicationRules(report);
    expect(rejections).toContain('tool_results:absent');
    expect(validateStoredMalwareReport({ stored_id: report.report_id, stored_sha256: report.sha256, payload: report }).length).toBeGreaterThan(0);
  });

  it('rejects a tool record whose provenance input hash does not match the report specimen', () => {
    const report = loadStored();
    report.tool_results.find((t: any) => t.tool_id === 'capa').provenance.input_sha256 = 'f'.repeat(64);
    expect(storedReportRejections(rowFrom(report))).toContain('tool_results:sha256_mismatch:capa');
  });

  it('rejects a run binding that disagrees with the stored specimen identity', () => {
    const report = loadStored();
    report.run_binding.sha256 = 'a'.repeat(64);
    expect(storedReportRejections(rowFrom(report))).toContain('run_binding:sha256_mismatch');
  });

  it('rejects a row stored under an id or hash other than the document claims', () => {
    const report = loadStored();
    expect(storedReportRejections(rowFrom(report, { sha256: 'b'.repeat(64) })).length).toBeGreaterThan(0);
    expect(validateStoredMalwareReport({ stored_id: 'mir_other', stored_sha256: report.sha256, payload: report }).length).toBeGreaterThan(0);
  });

  it('rejects a report with no run binding rather than serving ungrounded evidence', () => {
    const report = loadStored();
    delete report.run_binding;
    expect(storedReportRejections(rowFrom(report))).toContain('run_binding:absent');
  });
});

describe('M16.4.30 — customer-facing report: UI projection', () => {
  const projectFindings = (report: Record<string, any>) => {
    const identity = (report.sample_identity ?? {}) as Record<string, any>;
    return keyFindings({
      artifact_id: report.artifact_id,
      sha256: report.sha256,
      format_class: identity.format_class ?? null,
      file_size_bytes: identity.file_size_bytes ?? null,
      content_type_assessment: report.content_type_assessment ?? {},
      capabilities: report.capabilities ?? {},
      embedded_objects: report.embedded_objects ?? {},
      derived_artifacts: report.detection_artifacts?.derived_artifacts ?? [],
      decoded_structure: report.decoded_structure ?? {},
    });
  };

  it('names the capability the report actually carries — never a fabricated analyzer label', () => {
    const report = loadStored();
    const capability = report.capabilities.items[0];
    expect(capability.catalog_id).toBe('EMBEDDED_ARCHIVE_PAYLOAD_STRUCTURE');

    const findings = projectFindings(report);
    const titles = findings.map((f) => f.title);
    // The real capability is an embedded archive payload structure, so the UI
    // must NOT label the report as an AutoIt specimen.
    expect(titles).not.toContain('Compiled AutoIt indicators');
    expect(titles).toContain('Static capability indicators');

    const capabilityFinding = findings.find((f) => f.title === 'Static capability indicators')!;
    expect(capabilityFinding.detail).toContain(capability.capability_name);
    expect(capabilityFinding.detail).toContain('CAN_DO');
    // Static capability support is never presented as observed execution.
    expect(capabilityFinding.detail).toContain('not observed execution');
    expect(capabilityFinding.provenance_statement).toContain('EMBEDDED_ARCHIVE_PAYLOAD_STRUCTURE');
  });

  it('still uses the AutoIt wording when the capability set IS the AutoIt catalog entry', () => {
    const report = loadStored();
    report.capabilities.items = [
      { ...report.capabilities.items[0], catalog_id: 'AUTOIT_COMPILED_SCRIPT_SUPPORT', capability_name: 'AutoIt compiled script support' },
    ];
    const findings = projectFindings(report);
    expect(findings.map((f) => f.title)).toContain('Compiled AutoIt indicators');
  });
});
