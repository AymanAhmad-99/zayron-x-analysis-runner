import { describe, it, expect } from 'bun:test';
import {
  OsvClient,
  GhsaClient,
  NvdClient,
  EpssClient,
  CisaVulnrichmentClient,
  fetchCanonicalVulnerabilitySources,
} from '../../packages/intelligence/src/sources/sourceClients';

describe('PHASE 2 — SOURCE CLIENTS & FAILURE SEMANTICS', () => {
  // ── 1. OSV Client (Phase 2C) ────────────────────────────────────────────────
  describe('1. OSV Client (Phase 2C)', () => {
    it('successfully retrieves and normalizes OSV record with full provenance, packages, ranges, and aliases', async () => {
      const mockOsvPayload = {
        id: 'PYSEC-2023-1234',
        summary: 'Vulnerability in requests',
        aliases: ['CVE-2023-1234', 'GHSA-abcd-1234-efgh'],
        affected: [
          {
            package: { name: 'requests', ecosystem: 'PyPI' },
            ranges: [
              {
                type: 'ECOSYSTEM',
                events: [{ introduced: '2.0.0' }, { fixed: '2.31.0' }],
              },
            ],
            versions: ['2.28.0', '2.29.0', '2.30.0'],
          },
        ],
        references: [{ type: 'ADVISORY', url: 'https://example.com/advisory' }],
      };

      const mockFetch: typeof fetch = async (url) => {
        expect(String(url)).toContain('CVE-2023-1234');
        return new Response(JSON.stringify(mockOsvPayload), { status: 200 });
      };

      const client = new OsvClient();
      const result = await client.fetchByCve('CVE-2023-1234', { fetchFn: mockFetch });

      expect(result.status).toBe('SOURCE_AVAILABLE');
      expect(result.statusCode).toBe(200);
      expect(result.data).not.toBeNull();
      expect(result.data?.source).toBe('osv');
      expect(result.data?.source_record_id).toBe('PYSEC-2023-1234');
      expect(result.data?.package).toBe('requests');
      expect(result.data?.ecosystem).toBe('PyPI');
      expect(result.data?.fixed_versions).toEqual(['2.31.0']);
      expect(result.data?.affected_versions).toContain('introduced:2.0.0');
      expect(result.data?.affected_versions).toContain('2.28.0');
      expect(result.data?.aliases).toEqual(['CVE-2023-1234', 'GHSA-abcd-1234-efgh']);
      expect(result.data?.references).toEqual(['https://example.com/advisory']);
    });

    it('handles missing aliases gracefully without fabrication', async () => {
      const mockPayloadNoAliases = {
        id: 'OSV-2024-0001',
        affected: [{ package: { name: 'express', ecosystem: 'npm' }, ranges: [] }],
      };

      const mockFetch: typeof fetch = async () => new Response(JSON.stringify(mockPayloadNoAliases), { status: 200 });
      const client = new OsvClient();
      const result = await client.fetchByCve('CVE-2024-0001', { fetchFn: mockFetch });

      expect(result.status).toBe('SOURCE_AVAILABLE');
      expect(result.data?.aliases).toBeUndefined();
      expect(result.data?.package).toBe('express');
    });

    it('preserves multiple aliases (CVEs, GHSAs, PYSECs)', async () => {
      const mockMultiAlias = {
        id: 'GHSA-test-01',
        aliases: ['CVE-2024-1111', 'GHSA-test-01', 'PYSEC-2024-11', 'SNYK-PYTHON-TEST'],
        affected: [{ package: { name: 'test-pkg', ecosystem: 'PyPI' } }],
      };

      const mockFetch: typeof fetch = async () => new Response(JSON.stringify(mockMultiAlias), { status: 200 });
      const client = new OsvClient();
      const result = await client.fetchByCve('CVE-2024-1111', { fetchFn: mockFetch });

      expect(result.data?.aliases).toHaveLength(4);
      expect(result.data?.aliases).toContain('SNYK-PYTHON-TEST');
    });

    it('returns SOURCE_EMPTY on 404 response without creating fabricated evidence', async () => {
      const mockFetch: typeof fetch = async () => new Response('Not Found', { status: 404 });
      const client = new OsvClient();
      const result = await client.fetchByCve('CVE-2024-NONE', { fetchFn: mockFetch });

      expect(result.status).toBe('SOURCE_EMPTY');
      expect(result.statusCode).toBe(404);
      expect(result.data).toBeNull();
    });

    it('returns SOURCE_ERROR on malformed JSON', async () => {
      const mockFetch: typeof fetch = async () => new Response('{"bad-json: truncated', { status: 200 });
      const client = new OsvClient();
      const result = await client.fetchByCve('CVE-2024-BAD', { fetchFn: mockFetch });

      expect(result.status).toBe('SOURCE_ERROR');
      expect(result.data).toBeNull();
      expect(result.error).toContain('Malformed JSON');
    });

    it('returns SOURCE_UNAVAILABLE on rate limiting (429)', async () => {
      const mockFetch: typeof fetch = async () => new Response('Too Many Requests', { status: 429 });
      const client = new OsvClient();
      const result = await client.fetchByCve('CVE-2024-RATE', { fetchFn: mockFetch });

      expect(result.status).toBe('SOURCE_UNAVAILABLE');
      expect(result.statusCode).toBe(429);
      expect(result.error).toContain('Rate limit exceeded');
    });
  });

  // ── 2. GHSA Client (Phase 2D) ────────────────────────────────────────────────
  describe('2. GHSA Client (Phase 2D)', () => {
    it('successfully retrieves and normalizes GitHub Advisory with vulnerable and patched ranges', async () => {
      const mockGhsaList = [
        {
          ghsa_id: 'GHSA-35jh-r3h4-6jhm',
          cve_id: 'CVE-2023-99903',
          identifiers: [{ type: 'GHSA', value: 'GHSA-35jh-r3h4-6jhm' }, { type: 'CVE', value: 'CVE-2023-99903' }],
          vulnerabilities: [
            {
              package: { name: 'lodash', ecosystem: 'npm' },
              vulnerable_version_range: '< 4.17.21',
              first_patched_version: '4.17.21',
            },
          ],
          cvss: { score: 7.4, vector_string: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:L' },
          cwe_ids: ['CWE-1321'],
          references: [{ url: 'https://github.com/advisories/GHSA-35jh-r3h4-6jhm' }],
        },
      ];

      const mockFetch: typeof fetch = async (url, init) => {
        expect(String(url)).toContain('CVE-2023-99903');
        expect(init?.headers).toBeDefined();
        return new Response(JSON.stringify(mockGhsaList), { status: 200 });
      };

      const client = new GhsaClient('https://api.github.com/advisories', 'gh_test_token');
      const result = await client.fetchByCve('CVE-2023-99903', { fetchFn: mockFetch });

      expect(result.status).toBe('SOURCE_AVAILABLE');
      expect(result.data?.source).toBe('github-advisory');
      expect(result.data?.source_record_id).toBe('GHSA-35jh-r3h4-6jhm');
      expect(result.data?.package).toBe('lodash');
      expect(result.data?.ecosystem).toBe('npm');
      expect(result.data?.affected_versions).toEqual(['< 4.17.21']);
      expect(result.data?.fixed_versions).toEqual(['4.17.21']);
      expect(result.data?.cvss?.score).toBe('7.4');
      expect(result.data?.cwe_ids).toContain('CWE-1321');
      expect(result.data?.aliases).toContain('CVE-2023-99903');
    });

    it('returns SOURCE_EMPTY when advisory list is empty', async () => {
      const mockFetch: typeof fetch = async () => new Response(JSON.stringify([]), { status: 200 });
      const client = new GhsaClient();
      const result = await client.fetchByCve('CVE-2024-EMPTY', { fetchFn: mockFetch });

      expect(result.status).toBe('SOURCE_EMPTY');
      expect(result.data).toBeNull();
    });

    it('returns SOURCE_UNAVAILABLE on upstream 503 error', async () => {
      const mockFetch: typeof fetch = async () => new Response('Service Unavailable', { status: 503 });
      const client = new GhsaClient();
      const result = await client.fetchByCve('CVE-2024-ERR', { fetchFn: mockFetch });

      expect(result.status).toBe('SOURCE_UNAVAILABLE');
      expect(result.statusCode).toBe(503);
      expect(result.data).toBeNull();
    });
  });

  // ── 3. NVD, EPSS, CISA Vulnrichment & Unified Coordinator (Phase 2E & 2F) ────
  describe('3. Unified Coordinator & Failure Semantics (Phase 2E & 2F)', () => {
    it('executes parallel fetch across all sources and returns structured failure states', async () => {
      const mockFetch: typeof fetch = async (url) => {
        const u = String(url);
        if (u.includes('services.nvd.nist.gov')) {
          return new Response(JSON.stringify({
            vulnerabilities: [{
              cve: {
                id: 'CVE-2024-3400',
                cpes: ['cpe:2.3:o:paloaltonetworks:pan-os:10.2:*:*:*:*:*:*:*'],
                weaknesses: [{ description: [{ value: 'CWE-77' }] }],
              },
            }],
          }), { status: 200 });
        }
        if (u.includes('first.org')) {
          return new Response(JSON.stringify({ data: [{ cve: 'CVE-2024-3400', epss: '0.95', percentile: '0.99' }] }), { status: 200 });
        }
        if (u.includes('raw.githubusercontent.com')) {
          return new Response('Not Found', { status: 404 });
        }
        if (u.includes('api.osv.dev')) {
          return new Response('Server Error', { status: 500 });
        }
        if (u.includes('api.github.com')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response('Not Found', { status: 404 });
      };

      const bundle = await fetchCanonicalVulnerabilitySources('CVE-2024-3400', { fetchFn: mockFetch });

      expect(bundle.nvd.status).toBe('SOURCE_AVAILABLE');
      expect(bundle.nvd.data).not.toBeNull();

      expect(bundle.epss.status).toBe('SOURCE_AVAILABLE');
      expect(bundle.epss.data?.score).toBe('0.95');

      expect(bundle.cisaVulnrichment.status).toBe('SOURCE_EMPTY'); // 404
      expect(bundle.cisaVulnrichment.data).toBeNull();

      expect(bundle.osv.status).toBe('SOURCE_UNAVAILABLE'); // 500
      expect(bundle.osv.data).toBeNull();

      expect(bundle.ghsa.status).toBe('SOURCE_EMPTY'); // []
      expect(bundle.ghsa.data).toBeNull();

      expect(bundle.exploitDb.status).toBe('SOURCE_AVAILABLE');
      expect(bundle.exploitDb.data?.exploit_id).toBe('EDB-ID-52000');
    });
  });
});
