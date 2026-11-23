import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  classifyVersionEntity,
  buildProductVersionMappings,
  selectPrimaryVersionMapping,
  flattenMappingFixed,
  deriveBoundaryTokens,
  deriveFixedFromAffectedBoundary,
  isSentinelVersionToken,
  verifyVersionMappings,
  resolveVersionMappings,
  detectLegacyCrossBranchContamination,
  validateReportSemantics,
  reconcileOpenSourceEnrichment,
  type ProductVersionMapping,
} from '../../packages/intelligence/src/sources/adapters';

import goldenFive from '../fixtures/phase1_golden_five_reports.json';

const REPORTS = (goldenFive as any).reports as Record<string, any>;
const CVES = Object.keys(REPORTS);

const adaptersSource = readFileSync(
  join(import.meta.dir, '..', '..', 'packages', 'intelligence', 'src', 'sources', 'adapters.ts'),
  'utf8'
);
const apiSource = readFileSync(
  join(import.meta.dir, '..', '..', 'workers', 'api', 'src', 'index.ts'),
  'utf8'
);
const uiSource = readFileSync(
  join(import.meta.dir, '..', '..', 'apps', 'web', 'app', 'components', 'VulnerabilityDetail.tsx'),
  'utf8'
);

/** Build the canonical model from a persisted report's SOURCE STATE: the per-branch
 * affected ranges plus the report-level fixed evidence. The persisted per-branch fixed
 * arrays are deliberately NOT passed as explicit branch evidence — that contaminated
 * list is exactly the V1 defect being repaired. */
function canonicalFromReport(cve: string): ProductVersionMapping[] {
  const sc = REPORTS[cve].affected_scope;
  const products = sc.products_affected || [];
  // The repair only redistributes evidence that was blanket-copied: when the persisted
  // per-branch fixed arrays are contaminated, drop them and re-derive per branch from
  // that branch's own affected boundary. Non-contaminated branch evidence is trusted.
  const contaminated = detectLegacyCrossBranchContamination(products) > 0;
  const scopes = products.map((p: any) => ({
    vendor: p.vendor,
    product: p.product,
    affected_versions: p.affected_versions || [],
    ...(contaminated ? {} : { fixed_versions: p.fixed_versions || [] }),
  }));
  const globalFixed = (Array.isArray(sc.fixed_versions)
    ? sc.fixed_versions
    : String(sc.fixed_versions || '').split(','))
    .map((s: any) => String(s).trim())
    .filter((s: string) => s && !isSentinelVersionToken(s));
  return buildProductVersionMappings({
    vendor: REPORTS[cve].identity.vendor,
    productsAffected: scopes,
    globalAffected: Array.isArray(sc.affected_versions) ? sc.affected_versions : [],
    globalFixed,
    sources: ['nvd-cpe', 'vendor-advisory'],
  });
}

function mappingFor(mappings: ProductVersionMapping[], product: string): ProductVersionMapping {
  const m = mappings.find(x => x.product.toLowerCase() === product.toLowerCase());
  if (!m) throw new Error(`no mapping for ${product}`);
  return m;
}

// ═══════════════════════════════════════════════════════════════════════════════
describe('PHASE 4 — REM-03 PRODUCT-AWARE VERSION NORMALIZATION', () => {

  // ── 1. Version entity taxonomy (VER-008 / INV-V03 / INV-V08) ────────────────
  describe('1. Version entity taxonomy — release != patch != build != commit', () => {
    it('classifies release, patch, build, commit, range, branch and CPE distinctly', () => {
      expect(classifyVersionEntity('8.8.15')).toBe('VERSION_RELEASE');
      expect(classifyVersionEntity('9.0.0')).toBe('VERSION_RELEASE');
      expect(classifyVersionEntity('10.0.9')).toBe('VERSION_RELEASE');
      expect(classifyVersionEntity('10.1.1')).toBe('VERSION_RELEASE');
      expect(classifyVersionEntity('8.8.15-p46')).toBe('VERSION_PATCH');
      expect(classifyVersionEntity('9.0.0-p41')).toBe('VERSION_PATCH');
      expect(classifyVersionEntity('8.8.15-p31.1')).toBe('VERSION_PATCH');
      expect(classifyVersionEntity('10.2.9-h1')).toBe('VERSION_PATCH');
      expect(classifyVersionEntity('10.0.10240.20796')).toBe('VERSION_BUILD');
      expect(classifyVersionEntity('10.0.14393.7428')).toBe('VERSION_BUILD');
      expect(classifyVersionEntity('16.0.5465.1001')).toBe('VERSION_BUILD');
      expect(classifyVersionEntity('2c67cbdfaebf6a71928749b7146f4852876b63ff')).toBe('FIX_COMMIT');
      expect(classifyVersionEntity('b68c7b31a1d94f94903a79c53f1bd316b792de1d')).toBe('FIX_COMMIT');
      expect(classifyVersionEntity('introduced:0')).toBe('RANGE');
      expect(classifyVersionEntity('last_affected:52b539ef205db233bfd8116e8130e27735b4153c')).toBe('RANGE');
      expect(classifyVersionEntity('< 2.0.0')).toBe('RANGE');
      expect(classifyVersionEntity('>= 1.0.0 < 1.5.0')).toBe('RANGE');
      expect(classifyVersionEntity('2021')).toBe('BRANCH');
      expect(classifyVersionEntity('2016')).toBe('BRANCH');
      expect(classifyVersionEntity('cpe:2.3:a:adobe:coldfusion:*:*:*:*:*:*:*:*')).toBe('CPE_VERSION');
    });

    it('never mistakes a decimal release for a commit hash', () => {
      // A 7+ char all-digit token is a version, not a hex commit.
      expect(classifyVersionEntity('1234567')).not.toBe('FIX_COMMIT');
      expect(classifyVersionEntity('10240')).not.toBe('FIX_COMMIT');
    });

    it('recognizes absence sentinels so they are never counted as versions', () => {
      expect(isSentinelVersionToken('UNKNOWN')).toBe(true);
      expect(isSentinelVersionToken('NOT_AVAILABLE')).toBe(true);
      expect(isSentinelVersionToken('10.0.9')).toBe(false);
    });
  });

  // ── 2. Evidence-gated boundary derivation ──────────────────────────────────
  describe('2. Evidence-gated boundary derivation (no false fixed invention)', () => {
    it('derives the branch boundary only when the report-level fixed set confirms it', () => {
      expect(deriveBoundaryTokens(['< 10.0.10240.20796'])).toEqual(['10.0.10240.20796']);
      expect(deriveBoundaryTokens(['>= 10.0.0 < 10.0.9'])).toEqual(['10.0.9']);
      expect(deriveBoundaryTokens(['7.x before 7.0 U2c'])).toEqual(['7.0 U2c']);
      // Ungated derivation finds the boundary...
      expect(deriveBoundaryTokens(['< 1.5.0'])).toEqual(['1.5.0']);
      // ...but WITHOUT authoritative confirmation it is NOT promoted to a fixed version.
      expect(deriveFixedFromAffectedBoundary(['< 1.5.0'], [])).toEqual([]);
      expect(deriveFixedFromAffectedBoundary(['< 1.5.0'], ['4.2.0'])).toEqual([]);
      expect(deriveFixedFromAffectedBoundary(['< 1.5.0'], ['1.5.0'])).toEqual(['1.5.0']);
    });
  });

  // ── 3. Canonical mapping preserves branch association (INV-V01..V03) ───────
  describe('3. Canonical product-aware mapping', () => {
    it('keeps each branch paired with its own fixed evidence and never copies a global list', () => {
      const mappings = buildProductVersionMappings({
        vendor: 'Microsoft',
        productsAffected: [
          { vendor: 'microsoft', product: 'Windows 10 1507', affected_versions: ['< 10.0.10240.20796'] },
          { vendor: 'microsoft', product: 'Windows 11 24H2', affected_versions: ['< 10.0.26100.2033'] },
        ],
        globalFixed: ['10.0.10240.20796', '10.0.26100.2033'],
        sources: ['nvd-cpe', 'vendor-advisory'],
      });
      expect(mappings).toHaveLength(2);
      expect(mappingFor(mappings, 'Windows 10 1507').fixed.build).toEqual(['10.0.10240.20796']);
      expect(mappingFor(mappings, 'Windows 11 24H2').fixed.build).toEqual(['10.0.26100.2033']);
      expect(mappings.every(m => m.fixed_provenance === 'DERIVED_BOUNDARY')).toBe(true);
      // No branch inherits the full global list.
      expect(mappings.some(m => m.fixed_tokens.length === 2)).toBe(false);
    });

    it('separates release, patch and fix-commit inside one branch (Zimbra shape)', () => {
      const commits = [
        '2c67cbdfaebf6a71928749b7146f4852876b63ff',
        '41db44a222b547dcc89ab50273cb8684195c09c2',
        'd30e647f21ecef5490f21facf2e06e228b44a36e',
      ];
      const mappings = buildProductVersionMappings({
        vendor: 'Synacor',
        productsAffected: [{
          vendor: 'synacor',
          product: 'zimbra collaboration suite',
          affected_versions: ['< 8.8.15'],
          fixed_versions: [...commits, '8.8.15', '8.8.15-p46', '9.0.0', '9.0.0-p41', '10.0.9', '10.1.1'],
        }],
        sources: ['osv', 'vendor-advisory'],
      });
      const m = mappings[0];
      expect(m.fixed.commit.slice().sort()).toEqual(commits.slice().sort());
      expect(m.fixed.release).toEqual(['8.8.15', '9.0.0', '10.0.9', '10.1.1']);
      expect(m.fixed.patch).toEqual(['8.8.15-p46', '9.0.0-p41']);
      // Commits never appear in any product-version class.
      for (const c of commits) {
        expect(m.fixed.release).not.toContain(c);
        expect(m.fixed.patch).not.toContain(c);
        expect(m.fixed.build).not.toContain(c);
      }
      // The legacy projection omits commits entirely.
      expect(flattenMappingFixed(m)).toEqual(['8.8.15', '8.8.15-p46', '9.0.0', '9.0.0-p41', '10.0.9', '10.1.1']);
      expect(flattenMappingFixed(m, { includeCommits: true })).toContain(commits[0]);
    });

    it('selects the primary mapping by identity product and defaults to the first scope', () => {
      const mappings = buildProductVersionMappings({
        vendor: 'Adobe',
        productsAffected: [
          { vendor: 'adobe', product: 'coldfusion', affected_versions: ['2021'], fixed_versions: ['2021.0.9'] },
          { vendor: 'adobe', product: 'coldfusion 2023', affected_versions: ['2023'], fixed_versions: ['2023.0.4'] },
        ],
        sources: ['nvd-cpe'],
      });
      expect(selectPrimaryVersionMapping(mappings, 'coldfusion 2023')!.product).toBe('coldfusion 2023');
      expect(selectPrimaryVersionMapping(mappings, undefined)!.product).toBe('coldfusion');
    });
  });

  // ── 4. Golden Five — CVE-2024-43572 Microsoft Windows ─────────────────────
  describe('4. Golden Five — CVE-2024-43572 (Microsoft Windows branch↔build pairing)', () => {
    it('pairs every build-named branch with its OWN build and copies nothing across branches', () => {
      const mappings = canonicalFromReport('CVE-2024-43572');
      expect(mappings.length).toBe(REPORTS['CVE-2024-43572'].affected_scope.products_affected.length);

      const expected: Record<string, string> = {
        'windows 10 1507': '10.0.10240.20796',
        'windows 10 1607': '10.0.14393.7428',
        'windows 11 24h2': '10.0.26100.2033',
        'windows server 2022': '10.0.20348.2762',
      };
      for (const [branch, build] of Object.entries(expected)) {
        const m = mappings.find(x => x.product.toLowerCase() === branch);
        expect(m).toBeDefined();
        expect(m!.fixed.build).toEqual([build]);
        expect(m!.fixed.release).toEqual([]);
        expect(m!.fixed.commit).toEqual([]);
      }
      // No branch receives more than its own single derived build.
      expect(mappings.every(m => m.fixed_tokens.length <= 1)).toBe(true);
      expect(mappings.filter(m => m.fixed_tokens.length === 1).length).toBe(13);
      // The persisted (pre-repair) report IS contaminated.
      expect(detectLegacyCrossBranchContamination(REPORTS['CVE-2024-43572'].affected_scope.products_affected)).toBeGreaterThan(0);
    });

    it('rejects the canonical mapping when a Windows 11 24H2 build is attached to Windows 10 1507 (VER-V1)', () => {
      const mappings = canonicalFromReport('CVE-2024-43572');
      const mutated = mappings.map(m =>
        m.product.toLowerCase() === 'windows 10 1507'
          ? { ...m, fixed: { ...m.fixed, build: ['10.0.26100.2033'] }, fixed_tokens: ['10.0.26100.2033'], fixed_provenance: 'EXPLICIT' as const }
          : m
      );
      const violations = verifyVersionMappings({ mappings: mutated, productsAffected: REPORTS['CVE-2024-43572'].affected_scope.products_affected });
      expect(violations.some(v => v.rule === 'VER-002' && v.severity === 'BLOCKING')).toBe(true);
    });

    it('rejects blanket-copying the global fixed list into every branch (VER-V2)', () => {
      const mappings = canonicalFromReport('CVE-2024-43572');
      const globalFixed = mappings.flatMap(m => m.fixed_tokens);
      const mutated = mappings.map(m => ({
        ...m,
        fixed: { ...m.fixed, build: globalFixed.slice() },
        fixed_tokens: globalFixed.slice(),
        fixed_provenance: 'EXPLICIT' as const,
      }));
      const violations = verifyVersionMappings({ mappings: mutated });
      expect(violations.filter(v => v.rule === 'VER-002').length).toBeGreaterThan(0);
    });

    it('rejects restoring the legacy per-branch global copy in the emitted report shape', () => {
      // The exact defect shape from the persisted rows: identical 15-value lists.
      const legacyScopes = REPORTS['CVE-2024-43572'].affected_scope.products_affected;
      const violations = verifyVersionMappings({
        mappings: canonicalFromReport('CVE-2024-43572'),
        productsAffected: legacyScopes,
        flatFixedVersions: REPORTS['CVE-2024-43572'].affected_scope.fixed_versions,
      });
      // The canonical (repaired) mapping itself is clean.
      expect(violations.filter(v => v.severity === 'BLOCKING')).toHaveLength(0);
      // The legacy detector still reports the historical contamination.
      expect(detectLegacyCrossBranchContamination(legacyScopes)).toBeGreaterThanOrEqual(13);
    });
  });

  // ── 5. Golden Five — CVE-2024-45519 Zimbra ───────────────────────────────
  describe('5. Golden Five — CVE-2024-45519 (Zimbra release/patch vs fix commit)', () => {
    it('keeps releases distinct, patch levels distinct, and commits out of product versions', () => {
      const mappings = canonicalFromReport('CVE-2024-45519');
      const m = mappings[0];
      const commitTokens = m.fixed.commit;
      // The persisted Zimbra fixed list mixes commits with product releases.
      expect(commitTokens.length).toBeGreaterThanOrEqual(7);
      for (const c of commitTokens) expect(c).toMatch(/^[0-9a-f]{40}$/);
      expect(m.fixed.release).toEqual(['8.8.15', '9.0.0', '10.0.9', '10.1.1']);
      // Legacy projection exposes NO commit hash as a version.
      const projected = flattenMappingFixed(m);
      for (const c of commitTokens) expect(projected).not.toContain(c);
      expect(projected).toEqual(['8.8.15', '9.0.0', '10.0.9', '10.1.1']);
    });

    it('rejects a Git commit hash presented as a product version (VER-V3)', () => {
      const mappings = canonicalFromReport('CVE-2024-45519');
      const commit = mappings[0].fixed.commit[0];
      const mutated = [{ ...mappings[0], fixed: { ...mappings[0].fixed, release: [...mappings[0].fixed.release, commit] } }];
      const violations = verifyVersionMappings({ mappings: mutated, flatFixedVersions: mappings[0].fixed_tokens });
      expect(violations.some(v => v.rule === 'VER-003' && v.severity === 'BLOCKING')).toBe(true);
      // …and the flat legacy projection path is rejected too.
      const flatViolations = verifyVersionMappings({ mappings: [], flatFixedVersions: [commit, '10.0.9'] });
      expect(flatViolations.some(v => v.rule === 'VER-003')).toBe(true);
    });
  });

  // ── 6. Golden Five — CVE-2024-38226 Microsoft Publisher ──────────────────
  describe('6. Golden Five — CVE-2024-38226 (Microsoft Publisher family/branch/build)', () => {
    it('preserves every represented product family and does not drop branches', () => {
      const mappings = canonicalFromReport('CVE-2024-38226');
      const products = mappings.map(m => m.product).sort();
      expect(products).toEqual(['office long term servicing channel', 'publisher']);
      for (const m of mappings) {
        expect(m.affected.map(a => a.value)).toHaveLength(1);
        expect(m.fixed.build).toEqual(['16.0.5465.1001']);
      }
      // A single legitimately shared build is NOT flagged as contamination.
      const violations = verifyVersionMappings({ mappings });
      expect(violations.filter(v => v.rule === 'VER-002')).toHaveLength(0);
    });

    it('rejects dropping a known affected product branch (VER-V4)', () => {
      const mappings = canonicalFromReport('CVE-2024-38226');
      const dropped = mappings.slice(0, 1);
      const violations = verifyVersionMappings({ mappings: dropped, productsAffected: REPORTS['CVE-2024-38226'].affected_scope.products_affected });
      expect(violations.some(v => v.rule === 'VER-005' && v.severity === 'BLOCKING')).toBe(true);
    });

    it('does not flatten a single fixed build into unrelated Office branches without evidence', () => {
      const mappings = buildProductVersionMappings({
        vendor: 'Microsoft',
        productsAffected: [
          { vendor: 'microsoft', product: 'publisher', affected_versions: ['2016'], fixed_versions: ['16.0.5465.1001'] },
          { vendor: 'microsoft', product: 'office 2019', affected_versions: ['2019'] },
        ],
        globalFixed: ['16.0.5465.1001'],
        sources: ['nvd-cpe'],
      });
      expect(mappingFor(mappings, 'publisher').fixed.build).toEqual(['16.0.5465.1001']);
      // 'office 2019' has no boundary evidence → it receives NOTHING.
      expect(mappingFor(mappings, 'office 2019').fixed_tokens).toEqual([]);
    });
  });

  // ── 7. Golden Five — CVE-2024-20767 Adobe ColdFusion ─────────────────────
  describe('7. Golden Five — CVE-2024-20767 (Adobe ColdFusion 2021 vs 2023)', () => {
    it('preserves the represented ColdFusion branches from the persisted record', () => {
      const mappings = canonicalFromReport('CVE-2024-20767');
      expect(mappings[0].affected.map(a => a.value)).toEqual(['2021', '2023']);
      // No authoritative fixed evidence in the persisted record → nothing is invented.
      expect(mappings[0].fixed_tokens).toEqual([]);
      expect(mappings[0].fixed_provenance).toBe('NONE');
    });

    it('attaches distinct fixed updates to distinct branches without collapsing them', () => {
      const mappings = buildProductVersionMappings({
        vendor: 'Adobe',
        productsAffected: [
          { vendor: 'adobe', product: 'ColdFusion 2021', affected_versions: ['2021'], fixed_versions: ['2021.0.9'] },
          { vendor: 'adobe', product: 'ColdFusion 2023', affected_versions: ['2023'], fixed_versions: ['2023.0.4'] },
        ],
        sources: ['nvd-cpe', 'vendor-advisory'],
      });
      expect(mappingFor(mappings, 'ColdFusion 2021').fixed.release).toEqual(['2021.0.9']);
      expect(mappingFor(mappings, 'ColdFusion 2023').fixed.release).toEqual(['2023.0.4']);
      expect(mappingFor(mappings, 'ColdFusion 2021').fixed.release).not.toContain('2023.0.4');
      const violations = verifyVersionMappings({ mappings });
      expect(violations.filter(v => v.severity === 'BLOCKING')).toHaveLength(0);
    });

    it('rejects UNKNOWN fixed when authoritative fixed evidence exists (VER-V5)', () => {
      const mappings = buildProductVersionMappings({
        vendor: 'Adobe',
        productsAffected: [
          { vendor: 'adobe', product: 'ColdFusion 2021', affected_versions: ['2021'], fixed_versions: ['2021.0.9'] },
        ],
        sources: ['vendor-advisory'],
      });
      const violations = verifyVersionMappings({ mappings, flatFixedVersions: 'UNKNOWN' });
      expect(violations.some(v => v.rule === 'VER-006' && v.severity === 'BLOCKING')).toBe(true);
      // The same mapping with an honest projection passes.
      const ok = verifyVersionMappings({ mappings, flatFixedVersions: flattenMappingFixed(mappings[0]) });
      expect(ok.some(v => v.rule === 'VER-006')).toBe(false);
    });
  });

  // ── 8. Golden Five — CVE-2022-23227 NuuO (EOL / no fixed release) ─────────
  describe('8. Golden Five — CVE-2022-23227 (NuuO EOL / no fixed release)', () => {
    it('never invents a fixed version when none is established', () => {
      const sc = REPORTS['CVE-2022-23227'].affected_scope;
      expect(sc.products_affected).toHaveLength(0);
      const mappings = buildProductVersionMappings({
        vendor: 'NUUO',
        productsAffected: [],
        globalAffected: [],
        globalFixed: [],
        sources: ['cisa-kev'],
      });
      expect(mappings).toHaveLength(0);
    });

    it('represents affected-known / fixed-not-established / EOL without fabrication', () => {
      const mappings = buildProductVersionMappings({
        vendor: 'NUUO',
        productsAffected: [{ vendor: 'nuuo', product: 'NVRmini2 Devices', affected_versions: ['< 3.9.1'] }],
        globalFixed: [],
        sources: ['cisa-kev'],
        productStatus: { 'NVRmini2 Devices': 'EOL' },
      });
      const m = mappings[0];
      expect(m.product_status).toBe('EOL');
      expect(m.affected.length).toBe(1);
      expect(m.fixed_tokens).toEqual([]);
      expect(m.fixed_provenance).toBe('NONE');
      const violations = verifyVersionMappings({ mappings, flatFixedVersions: 'UNKNOWN' });
      expect(violations.filter(v => v.severity === 'BLOCKING')).toHaveLength(0);
    });

    it('rejects attaching a fixed version to a branch with no supporting evidence (VER-V6)', () => {
      const mappings = canonicalFromReport('CVE-2024-43572');
      const mutated = mappings.map(m =>
        m.product.toLowerCase() === 'windows 10 1507'
          ? { ...m, sourceRefs: [] as string[] }
          : m
      );
      const violations = verifyVersionMappings({ mappings: mutated });
      expect(violations.some(v => v.rule === 'VER-007' && v.severity === 'BLOCKING')).toBe(true);
    });
  });

  // ── 9. Type-semantics mutation (VER-008 / VER-V7) ────────────────────────
  describe('9. Version type semantics', () => {
    it('normalizes a patch identifier into the patch field, never the release field', () => {
      const mappings = buildProductVersionMappings({
        vendor: 'Synacor',
        productsAffected: [{ vendor: 'synacor', product: 'zimbra', affected_versions: ['< 8.8.15'], fixed_versions: ['8.8.15-p46'] }],
        sources: ['vendor-advisory'],
      });
      expect(mappings[0].fixed.patch).toEqual(['8.8.15-p46']);
      expect(mappings[0].fixed.release).toEqual([]);
    });

    it('rejects a patch identifier placed in the release field (VER-V7)', () => {
      const mappings = buildProductVersionMappings({
        vendor: 'Synacor',
        productsAffected: [{ vendor: 'synacor', product: 'zimbra', affected_versions: ['< 8.8.15'], fixed_versions: ['8.8.15-p46'] }],
        sources: ['vendor-advisory'],
      });
      const mutated = [{ ...mappings[0], fixed: { ...mappings[0].fixed, release: ['8.8.15-p46'] } }];
      const violations = verifyVersionMappings({ mappings: mutated });
      expect(violations.some(v => v.rule === 'VER-008' && v.severity === 'BLOCKING')).toBe(true);
    });
  });

  // ── 10. Report-level wiring & no CVE-specific hardcoding ─────────────────
  describe('10. Report wiring and generic implementation', () => {
    it('resolves canonical mappings from the emitted report shape', () => {
      const mappings = canonicalFromReport('CVE-2024-43572');
      const report = { affected_scope: { version_mappings: mappings, products_affected: REPORTS['CVE-2024-43572'].affected_scope.products_affected } };
      expect(resolveVersionMappings(report)).toHaveLength(mappings.length);
    });

    it('validateReportSemantics blocks a report whose canonical mapping is contaminated', () => {
      const mappings = canonicalFromReport('CVE-2024-43572');
      const globalFixed = mappings.flatMap(m => m.fixed_tokens);
      const contaminated = mappings.map(m => ({ ...m, fixed: { ...m.fixed, build: globalFixed.slice() }, fixed_tokens: globalFixed.slice() }));
      const report = {
        affected_scope: {
          version_mappings: contaminated,
          products_affected: REPORTS['CVE-2024-43572'].affected_scope.products_affected,
          fixed_versions: globalFixed,
        },
        provenance: { claims: [] },
      };
      const res = validateReportSemantics(report);
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.includes('Version semantics [VER-002]'))).toBe(true);
    });

    it('emits the canonical model from reconcileOpenSourceEnrichment for the multi-branch case', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2024-43572',
        cisaKev: { cveID: 'CVE-2024-43572', vendorProject: 'Microsoft', product: 'Windows' },
        nvdCpe: {
          cpes: [],
          affectedRanges: [],
          productScopedRanges: {},
          productScopes: [
            { vendor: 'microsoft', product: 'windows 10 1507', affected_versions: ['< 10.0.10240.20796'] },
            { vendor: 'microsoft', product: 'windows 11 24h2', affected_versions: ['< 10.0.26100.2033'] },
          ],
          references: [],
          cweIds: [],
        } as any,
        vulnrichment: {
          source: 'cisa-vulnrichment',
          source_record_id: 'CVE-2024-43572',
          fixed_versions: ['10.0.10240.20796', '10.0.26100.2033'],
        },
      });
      expect(reconciled.affected_scope.version_mappings).toBeDefined();
      expect(reconciled.affected_scope.version_mappings!.length).toBe(2);
      const a = reconciled.affected_scope.products_affected[0];
      const b = reconciled.affected_scope.products_affected[1];
      // No branch receives the other branch's fixed build.
      expect(a.fixed_versions || []).not.toEqual(b.fixed_versions || []);
    });

    it('never removes commits from the affected-range evidence (RANGE semantics preserved)', () => {
      const reconciled = reconcileOpenSourceEnrichment({
        cveId: 'CVE-2024-45519',
        cisaKev: { cveID: 'CVE-2024-45519', vendorProject: 'Synacor', product: 'ZCS' },
        osv: {
          source: 'osv',
          source_record_id: 'OSV-1',
          package: 'zimbra',
          ecosystem: 'Linux',
          affected_versions: ['introduced:b68c7b31a1d94f94903a79c53f1bd316b792de1d', '< 8.8.15'],
          fixed_versions: ['2c67cbdfaebf6a71928749b7146f4852876b63ff', '8.8.15', '10.0.9'],
        },
      });
      // Commits are excluded from the FIXED product-version projection…
      expect(reconciled.affected_scope.fixed_versions).not.toContain('2c67cbdfaebf6a71928749b7146f4852876b63ff');
      expect(reconciled.affected_scope.fixed_versions).toContain('10.0.9');
      // …and preserved as separated fix commits.
      expect(reconciled.affected_scope.fixed_commits).toContain('2c67cbdfaebf6a71928749b7146f4852876b63ff');
      // Affected range markers are still present (they describe the range, not a version).
      expect(reconciled.affected_scope.affected_versions).toContain('introduced:b68c7b31a1d94f94903a79c53f1bd316b792de1d');
    });

    it('implements NO CVE-specific branch in the canonical normalization logic', () => {
      const start = adaptersSource.indexOf('PHASE 4 (REM-03) — PRODUCT-AWARE VERSION NORMALIZATION (CANONICAL MODEL)');
      const end = adaptersSource.indexOf('export function reconcileOpenSourceEnrichment');
      expect(start).toBeGreaterThan(-1);
      const block = adaptersSource.slice(start, end);
      for (const cve of [...CVES, 'CVE-2024-43572', 'CVE-2024-45519', 'CVE-2024-20767', 'CVE-2024-38226', 'CVE-2022-23227']) {
        expect(block.includes(cve)).toBe(false);
      }
    });
  });

  // ── 11. Production & projection wiring ───────────────────────────────────
  describe('11. Production wiring', () => {
    it('API persists canonical version mappings and enforces a fail-closed version gate', () => {
      expect(apiSource.includes('verifyVersionMappings')).toBe(true);
      expect(apiSource.includes('buildProductVersionMappings')).toBe(true);
      expect(apiSource.includes('version_mappings: reconciled.affected_scope.version_mappings')).toBe(true);
      expect(apiSource.includes("claim_id: 'VERSION_MAPPING'")).toBe(true);
    });

    it('the UI consumes the branch-aware products_affected projection (no independent merge logic)', () => {
      expect(uiSource.includes('affected_scope.products_affected')).toBe(true);
      expect(uiSource.includes('p.fixed_versions')).toBe(true);
    });

    it('adapters expose exactly one canonical normalization implementation', () => {
      const occurrences = adaptersSource.split('export function buildProductVersionMappings').length - 1;
      expect(occurrences).toBe(1);
    });
  });
});
