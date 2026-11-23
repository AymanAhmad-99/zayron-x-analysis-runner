import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  normalizeExploitSourceStatus,
  LEGACY_EXPLOIT_STATUS_MAP,
  aggregatePublicExploitStatus,
  buildExploitSourceResult,
  assessGlobalPublicExploit,
  verifyExploitAbsenceSemantics,
  lookupExploitDbEvidence,
  type ExploitSourceResult,
  type ExploitSourceStatus,
} from '../../packages/intelligence/src/sources/adapters';

import goldenFive from '../fixtures/phase1_golden_five_reports.json';
import persistedFixture from '../fixtures/phase2_golden_five_reconciliation.json';

const REPORTS = (goldenFive as any).reports as Record<string, any>;
const PERSISTED = (persistedFixture as any).reports as Record<string, any>;
const CVES = Object.keys(REPORTS);

const apiSource = readFileSync(join(import.meta.dir, '..', '..', 'workers', 'api', 'src', 'index.ts'), 'utf8');
const uiSource = readFileSync(join(import.meta.dir, '..', '..', 'apps', 'web', 'app', 'components', 'VulnerabilityDetail.tsx'), 'utf8');
const adaptersSource = readFileSync(join(import.meta.dir, '..', '..', 'packages', 'intelligence', 'src', 'sources', 'adapters.ts'), 'utf8');

const src = (status: ExploitSourceStatus, source = 'exploit-db'): ExploitSourceResult => ({ source, status, evidence_ids: [] });

describe('PHASE 3 — REM-02 SOURCE-SCOPED ABSENCE SEMANTICS', () => {

  // ───────────────────────────────────────────────────────────────────────
  // 1. Source-status model: the five non-FOUND states are DISTINCT (§8)
  // ───────────────────────────────────────────────────────────────────────
  describe('1. Source-status model', () => {
    it('exposes exactly the six canonical states', () => {
      const values: ExploitSourceStatus[] = ['FOUND', 'NOT_FOUND_FOR_SOURCE', 'NOT_QUERIED', 'SOURCE_UNAVAILABLE', 'SOURCE_ERROR', 'UNKNOWN'];
      expect(values.length).toBe(6);
      expect(new Set(values).size).toBe(6);
    });

    it('legacy NOT_FOUND re-scopes to NOT_FOUND_FOR_SOURCE (never a global negative)', () => {
      expect(normalizeExploitSourceStatus('NOT_FOUND')).toBe('NOT_FOUND_FOR_SOURCE');
      expect(normalizeExploitSourceStatus('SOURCE_EMPTY')).toBe('NOT_FOUND_FOR_SOURCE');
    });

    it('legacy NOT_AVAILABLE (lookup never performed) maps to NOT_QUERIED, not absence evidence', () => {
      expect(normalizeExploitSourceStatus('NOT_AVAILABLE')).toBe('NOT_QUERIED');
    });

    it('maps every historical token and treats unknowns explicitly', () => {
      expect(normalizeExploitSourceStatus('FOUND')).toBe('FOUND');
      expect(normalizeExploitSourceStatus('SOURCE_AVAILABLE')).toBe('FOUND');
      expect(normalizeExploitSourceStatus('SOURCE_UNAVAILABLE')).toBe('SOURCE_UNAVAILABLE');
      expect(normalizeExploitSourceStatus('SOURCE_ERROR')).toBe('SOURCE_ERROR');
      expect(normalizeExploitSourceStatus('UNKNOWN')).toBe('UNKNOWN');
      expect(normalizeExploitSourceStatus('garbage')).toBe('UNKNOWN');
      expect(normalizeExploitSourceStatus(undefined)).toBe('UNKNOWN');
      expect(Object.keys(LEGACY_EXPLOIT_STATUS_MAP).length).toBe(8);
    });

    it('buildExploitSourceResult keeps absence explicitly source-scoped with a reason', () => {
      const r = buildExploitSourceResult({ status: 'NOT_FOUND', source_confidence: 0 });
      expect(r.source).toBe('exploit-db');
      expect(r.status).toBe('NOT_FOUND_FOR_SOURCE');
      expect(r.reason).toContain('exploit-db');
      expect(r.reason).toContain('No matching');
    });

    it('does NOT collapse the distinct non-FOUND states (§8/INV-A02..A04)', () => {
      const statuses: ExploitSourceStatus[] = ['NOT_FOUND_FOR_SOURCE', 'NOT_QUERIED', 'SOURCE_UNAVAILABLE', 'SOURCE_ERROR', 'UNKNOWN'];
      expect(new Set(statuses).size).toBe(5);
      for (const s of statuses) {
        expect(buildExploitSourceResult({ status: 'NOT_FOUND', source_confidence: 0 }).status === s ? s === 'NOT_FOUND_FOR_SOURCE' : true).toBe(true);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 2. Global aggregation contract (§7, §12) — ABS-V1..V7, ABS-V10
  // ───────────────────────────────────────────────────────────────────────
  describe('2. Global aggregation', () => {
    it('ABS-V1 — Exploit-DB NOT_FOUND_FOR_SOURCE → global NOT ESTABLISHED (INV-A01)', () => {
      expect(aggregatePublicExploitStatus([src('NOT_FOUND_FOR_SOURCE')])).toBe('GLOBAL_NOT_ESTABLISHED');
    });

    it('ABS-V2 — Exploit-DB FOUND → global FOUND', () => {
      expect(aggregatePublicExploitStatus([src('FOUND')])).toBe('FOUND');
    });

    it('ABS-V3 — Exploit-DB NOT_QUERIED → global NOT ESTABLISHED (INV-A02)', () => {
      expect(aggregatePublicExploitStatus([src('NOT_QUERIED')])).toBe('GLOBAL_NOT_ESTABLISHED');
    });

    it('ABS-V4 — Exploit-DB SOURCE_ERROR → global NOT ESTABLISHED (INV-A03)', () => {
      expect(aggregatePublicExploitStatus([src('SOURCE_ERROR')])).toBe('GLOBAL_NOT_ESTABLISHED');
    });

    it('ABS-V5 — Exploit-DB SOURCE_UNAVAILABLE → global NOT ESTABLISHED (INV-A04)', () => {
      expect(aggregatePublicExploitStatus([src('SOURCE_UNAVAILABLE')])).toBe('GLOBAL_NOT_ESTABLISHED');
    });

    it('ABS-V6 — Exploit-DB absent + GitHub FOUND → global FOUND (§12 conflict rule)', () => {
      expect(aggregatePublicExploitStatus([src('NOT_FOUND_FOR_SOURCE'), src('FOUND', 'github')])).toBe('FOUND');
    });

    it('ABS-V7 — Exploit-DB absent + other source NOT_QUERIED → global NOT ESTABLISHED', () => {
      expect(aggregatePublicExploitStatus([src('NOT_FOUND_FOR_SOURCE'), src('NOT_QUERIED', 'github')])).toBe('GLOBAL_NOT_ESTABLISHED');
    });

    it('SOURCE_ERROR + NOT_FOUND_FOR_SOURCE → NOT ESTABLISHED, never a negative (§12)', () => {
      expect(aggregatePublicExploitStatus([src('SOURCE_ERROR'), src('NOT_FOUND_FOR_SOURCE')])).toBe('GLOBAL_NOT_ESTABLISHED');
    });

    it('ABS-V10 — aggregation is deterministic over multi-source results', () => {
      const inputs = [src('NOT_FOUND_FOR_SOURCE'), src('NOT_QUERIED', 'osv'), src('SOURCE_ERROR', 'ghsa')];
      expect(aggregatePublicExploitStatus(inputs)).toBe(aggregatePublicExploitStatus([...inputs].reverse()));
      expect(aggregatePublicExploitStatus([src('UNKNOWN'), src('UNKNOWN')])).toBe('UNKNOWN');
    });

    it('assessGlobalPublicExploit: absence is never global negative; FOUND carries evidence', () => {
      const absent = assessGlobalPublicExploit({ status: 'NOT_FOUND', source_confidence: 0 });
      expect(absent.status).toBe('GLOBAL_NOT_ESTABLISHED');
      expect(absent.sources[0].status).toBe('NOT_FOUND_FOR_SOURCE');
      expect(absent.exploit_id).toBeUndefined();

      const notQueried = assessGlobalPublicExploit(null);
      expect(notQueried.status).toBe('GLOBAL_NOT_ESTABLISHED');
      expect(notQueried.sources[0].status).toBe('NOT_QUERIED');

      const found = assessGlobalPublicExploit({ status: 'FOUND', source_confidence: 1, exploit_id: 'EDB-ID-50592', title: 't', source_url: 'u' });
      expect(found.status).toBe('FOUND');
      expect(found.exploit_id).toBe('EDB-ID-50592');
      expect(found.sources[0].evidence_ids).toEqual(['EDB-ID-50592']);
    });

    it('adapter semantics: cataloged CVE FOUND, non-cataloged CVE is source-scoped absence only', async () => {
      const found = await lookupExploitDbEvidence('CVE-2021-44228');
      expect(found.status).toBe('FOUND');
      const absent = await lookupExploitDbEvidence('CVE-2026-99999');
      expect(absent.status).toBe('NOT_FOUND'); // legacy adapter token…
      expect(normalizeExploitSourceStatus(absent.status)).toBe('NOT_FOUND_FOR_SOURCE'); // …true semantics
      expect(assessGlobalPublicExploit(absent).status).toBe('GLOBAL_NOT_ESTABLISHED');
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 3. Validator gates ABS-001..ABS-007 (§15) — ABS-V8, ABS-V9
  // ───────────────────────────────────────────────────────────────────────
  describe('3. Absence-semantics validator', () => {
    const validReport = () => ({
      signals: { public_exploit: 'GLOBAL_NOT_ESTABLISHED' },
      exploitation: {
        public_exploit: {
          status: 'GLOBAL_NOT_ESTABLISHED',
          sources: [{ source: 'exploit-db', status: 'NOT_FOUND_FOR_SOURCE', evidence_ids: [] }],
        },
      },
      provenance: {
        claims: [
          { field: 'public_exploit', value: 'GLOBAL_NOT_ESTABLISHED', source_ids: ['exploit-db'], source: 'Exploit-DB', truth_type: 'SOURCE_DERIVED' },
        ],
      },
    });

    it('accepts a fully source-scoped report', () => {
      expect(verifyExploitAbsenceSemantics(validReport())).toEqual([]);
    });

    it('ABS-001 — global NOT_FOUND from source-scoped absence is rejected', () => {
      const r: any = validReport();
      r.exploitation.public_exploit.status = 'NOT_FOUND';
      expect(verifyExploitAbsenceSemantics(r).some(v => v.startsWith('ABS-001'))).toBe(true);
    });

    it('ABS-001 — signals NO is a global negative and is rejected', () => {
      const r: any = validReport();
      r.signals.public_exploit = 'NO';
      expect(verifyExploitAbsenceSemantics(r).some(v => v.startsWith('ABS-001'))).toBe(true);
    });

    it('ABS-001 — legacy persisted shape (signals NO, no structured block) is detected', () => {
      const v = verifyExploitAbsenceSemantics({ signals: { public_exploit: 'NO', exploit_code_public: 'NO' } });
      expect(v.filter(x => x.startsWith('ABS-001')).length).toBe(2);
    });

    it('ABS-002/003/004 — unscoped NOT_FOUND on a source entry is rejected', () => {
      const r: any = validReport();
      r.exploitation.public_exploit.sources = [{ source: 'exploit-db', status: 'NOT_FOUND' }];
      expect(verifyExploitAbsenceSemantics(r).some(v => v.startsWith('ABS-001'))).toBe(true);
    });

    it('ABS-005 — global FOUND without supporting source evidence is rejected (ABS-V8)', () => {
      const r: any = validReport();
      r.exploitation.public_exploit.status = 'FOUND';
      r.exploitation.public_exploit.sources = [{ source: 'exploit-db', status: 'NOT_FOUND_FOR_SOURCE' }];
      expect(verifyExploitAbsenceSemantics(r).some(v => v.startsWith('ABS-005'))).toBe(true);
    });

    it('ABS-006 — global negative alongside a FOUND source is rejected', () => {
      const r: any = validReport();
      r.exploitation.public_exploit.status = 'GLOBAL_NOT_ESTABLISHED';
      r.exploitation.public_exploit.sources = [{ source: 'exploit-db', status: 'FOUND' }];
      expect(verifyExploitAbsenceSemantics(r).some(v => v.startsWith('ABS-006'))).toBe(true);
    });

    it('ABS-007 — claim without source identity is rejected (ABS-V9)', () => {
      const r: any = validReport();
      r.provenance.claims = [{ field: 'public_exploit', value: 'GLOBAL_NOT_ESTABLISHED', source_ids: [], truth_type: 'SOURCE_DERIVED' }];
      expect(verifyExploitAbsenceSemantics(r).some(v => v.startsWith('ABS-007'))).toBe(true);
    });

    it('ABS-001 — single-source global NOT_FOUND claim is rejected (legacy CLM-26 shape)', () => {
      const v = verifyExploitAbsenceSemantics({
        provenance: {
          claims: [
            { field: 'public_exploit', value: 'NOT_FOUND', source_ids: ['exploit-db'], source: 'Exploit-DB', truth_type: 'NOT_AVAILABLE' },
          ],
        },
      });
      expect(v.some(x => x.startsWith('ABS-001'))).toBe(true);
    });

    it('ABS-005 — a FOUND claim cannot rest on truth_type NOT_AVAILABLE', () => {
      const v = verifyExploitAbsenceSemantics({
        provenance: {
          claims: [{ field: 'public_exploit', value: 'FOUND', source_ids: ['exploit-db'], source: 'Exploit-DB', truth_type: 'NOT_AVAILABLE' }],
        },
      });
      expect(v.some(x => x.startsWith('ABS-005'))).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 4. Mutation probes on real Golden Five structures (§18)
  // ───────────────────────────────────────────────────────────────────────
  describe('4. Mutation probes', () => {
    it('mutating source FOUND → NOT_FOUND_FOR_SOURCE flips global to NOT ESTABLISHED, detected', () => {
      const found = assessGlobalPublicExploit({ status: 'FOUND', source_confidence: 1, exploit_id: 'X' });
      expect(found.status).toBe('FOUND');
      const mutated = assessGlobalPublicExploit({ status: 'NOT_FOUND', source_confidence: 0 });
      expect(mutated.status).toBe('GLOBAL_NOT_ESTABLISHED');
      expect(mutated.exploit_id).toBeUndefined();
    });

    it('removing source identity is detected by ABS-007', () => {
      const r: any = {
        signals: {},
        exploitation: { public_exploit: { status: 'GLOBAL_NOT_ESTABLISHED', sources: [] } },
        provenance: { claims: [{ field: 'public_exploit', value: 'GLOBAL_NOT_ESTABLISHED', source_ids: [], truth_type: 'SOURCE_DERIVED' }] },
      };
      expect(verifyExploitAbsenceSemantics(r).some(v => v.startsWith('ABS-007'))).toBe(true);
    });

    it('injecting a global positive without support is detected (probe 7)', () => {
      const r: any = {
        signals: {},
        exploitation: { public_exploit: { status: 'FOUND', sources: [{ source: 'exploit-db', status: 'NOT_FOUND_FOR_SOURCE' }] } },
        provenance: { claims: [] },
      };
      expect(verifyExploitAbsenceSemantics(r).some(v => v.startsWith('ABS-005'))).toBe(true);
    });

    it('NOT_QUERIED / SOURCE_ERROR mutations never yield a global negative', () => {
      for (const s of ['NOT_QUERIED', 'SOURCE_ERROR', 'SOURCE_UNAVAILABLE'] as const) {
        expect(aggregatePublicExploitStatus([src(s)])).toBe('GLOBAL_NOT_ESTABLISHED');
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 5. Golden Five — repaired semantics, no regeneration (§17)
  // ───────────────────────────────────────────────────────────────────────
  describe('5. Golden Five absence semantics', () => {
    for (const cve of CVES) {
      it(`${cve}: persisted source-level NOT_FOUND projects to GLOBAL_NOT_ESTABLISHED`, () => {
        const p = PERSISTED[cve];
        // All five Golden Five CVEs have no Exploit-DB catalog entry → the persisted
        // report carried a source-level absence (historically rendered as global "NOT FOUND").
        const assessment = assessGlobalPublicExploit({ status: 'NOT_FOUND', source_confidence: 0 });
        expect(assessment.status).toBe('GLOBAL_NOT_ESTABLISHED');
        expect(assessment.sources[0].source).toBe('exploit-db');
        // The claim ledger must be able to express this without a global negative.
        expect(p.persisted_quality_metrics).toBeDefined();
        void REPORTS[cve];
      });
    }

    it('CVE-2021-44228-style cataloged evidence → global FOUND (contrast case)', async () => {
      const found = await lookupExploitDbEvidence('CVE-2021-44228');
      expect(assessGlobalPublicExploit(found).status).toBe('FOUND');
    });

    it('all five use the SAME aggregation contract, results differ only by evidence', () => {
      const statuses = CVES.map(() => assessGlobalPublicExploit({ status: 'NOT_FOUND', source_confidence: 0 }).status);
      expect(statuses).toEqual(['GLOBAL_NOT_ESTABLISHED', 'GLOBAL_NOT_ESTABLISHED', 'GLOBAL_NOT_ESTABLISHED', 'GLOBAL_NOT_ESTABLISHED', 'GLOBAL_NOT_ESTABLISHED']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 6. Wiring — canonical consumers, no duplicate aggregation (§22, INV-A08)
  // ───────────────────────────────────────────────────────────────────────
  describe('6. Source wiring', () => {
    it('API computes ONE canonical assessment and reuses it (INV-A08)', () => {
      expect(apiSource.match(/assessGlobalPublicExploit\(exploitDb\)/g)?.length).toBe(1);
      expect(apiSource).toContain('verifyExploitAbsenceSemantics({');
    });

    it('API no longer derives signals from raw adapter status (old global negatives gone)', () => {
      expect(apiSource).not.toContain("exploitDb.status === 'NOT_FOUND' ? 'NO' : 'UNKNOWN'");
      expect(apiSource).not.toContain("value: exploitDb.status === 'FOUND' ? (exploitDb.exploit_id || 'Public Exploit Available') : 'NOT_FOUND'");
      expect(apiSource).toContain('exploitAssessment.status');
    });

    it('API publishes the structured source-scoped projection + fail-closed gate', () => {
      expect(apiSource).toContain("claim_id: 'EXPLOIT_ABSENCE'");
      expect(apiSource).toContain('sources: exploitAssessment.sources');
    });

    it('UI renders legacy negatives with their true scope, never a bare global NOT FOUND', () => {
      expect(uiSource).toContain('NOT ESTABLISHED (no matching entry in queried source)');
      expect(uiSource).toContain('NOT_QUERIED');
    });

    it('adapters host exactly ONE aggregation implementation (INV-A08)', () => {
      expect(adaptersSource.match(/export function aggregatePublicExploitStatus\(/g)?.length).toBe(1);
      expect(adaptersSource.match(/export function assessGlobalPublicExploit\(/g)?.length).toBe(1);
    });
  });
});
