import { describe, expect, test } from 'bun:test';
import {
  acquireMalShareSample,
  parseRecentCandidates,
  selectFreshCandidate,
  verifyDetails,
  verifyRawPayload,
  MALSHARE_SOURCE_ID,
  MALSHARE_DISCOVERY_QUERY,
  type MalShareCandidate,
} from '../../packages/intelligence/src/malware/canonical/malwareShareFeedAdapter';

const SHA_A = 'a'.repeat(63) + '1';
const SHA_B = 'b'.repeat(63) + '2';
const SHA_C = 'c'.repeat(63) + '3';
const SHA_INVALID = 'xyz123';

function cand(sha: string, added: string | null, size = 50000): MalShareCandidate {
  return {
    sha256: sha,
    source_added_utc: added,
    file_name: `${sha}.bin`,
    file_size_bytes: size,
    type: 'PE32',
    source_metadata: {
      type: 'PE32',
      filename: `${sha}.bin`,
      file_size: size,
      url: `https://malshare.com/sample.php?hash=${sha}`,
      link: null,
    },
  };
}

describe('M18.1E MalShare Adapter — parseRecentCandidates', () => {
  test('1. valid getlist — parses array of MalShare records with various casings and metadata', () => {
    const payload = [
      {
        SHA256: SHA_A,
        ADDED: '2026-10-02 04:05:06',
        F_TYPE: 'PE32',
        FileName: 'trojan_a.exe',
        FILESIZE: 65536,
      },
      {
        sha256_hash: SHA_B,
        added: '2026-10-02T05:00:00Z',
        type: 'ELF',
        filename: 'malware_b',
        file_size: 12345,
      },
    ];
    const candidates = parseRecentCandidates(payload);
    expect(candidates.length).toBe(2);
    expect(candidates[0]!.sha256).toBe(SHA_A);
    expect(candidates[0]!.source_added_utc).toBe('2026-10-02T04:05:06.000Z');
    expect(candidates[0]!.type).toBe('PE32');
    expect(candidates[0]!.file_name).toBe('trojan_a.exe');
    expect(candidates[0]!.file_size_bytes).toBe(65536);

    expect(candidates[1]!.sha256).toBe(SHA_B);
    expect(candidates[1]!.source_added_utc).toBe('2026-10-02T05:00:00.000Z');
    expect(candidates[1]!.type).toBe('ELF');
  });

  test('1b. valid getlist — parses array of plain sha256 strings', () => {
    const payload = [SHA_A, SHA_B.toUpperCase()];
    const candidates = parseRecentCandidates(payload);
    expect(candidates.length).toBe(2);
    expect(candidates[0]!.sha256).toBe(SHA_A);
    expect(candidates[1]!.sha256).toBe(SHA_B);
  });

  test('2. empty getlist — returns empty array explicitly', () => {
    expect(parseRecentCandidates([])).toEqual([]);
    expect(parseRecentCandidates({ data: [] })).toEqual([]);
    expect(parseRecentCandidates(null)).toEqual([]);
    expect(parseRecentCandidates(undefined)).toEqual([]);
  });

  test('3. malformed getlist — fails closed on invalid shapes or API errors', () => {
    expect(parseRecentCandidates({ ERROR: 'Bad API Key' })).toEqual([]);
    expect(parseRecentCandidates({ error: 'invalid_action' })).toEqual([]);
    expect(parseRecentCandidates({ invalid: 'shape' } as any)).toEqual([]);
    expect(parseRecentCandidates(12345 as any)).toEqual([]);
    expect(parseRecentCandidates('string_not_json' as any)).toEqual([]);
  });

  test('7. invalid candidate SHA-256 — drops records without 64-hex SHA-256', () => {
    const payload = [
      { sha256: SHA_INVALID, added: '2026-10-02 00:00:00' },
      { sha256: 'xyz'.repeat(21), added: '2026-10-02 00:00:00' },
      { sha256: SHA_A, added: '2026-10-02 00:00:00' },
    ];
    const candidates = parseRecentCandidates(payload);
    expect(candidates.length).toBe(1);
    expect(candidates[0]!.sha256).toBe(SHA_A);
  });
});

describe('M18.1E MalShare Adapter — selectFreshCandidate', () => {
  test('selects freshest candidate by source_added_utc', () => {
    const list = [
      cand(SHA_A, '2026-10-02T01:00:00.000Z'),
      cand(SHA_B, '2026-10-02T03:00:00.000Z'),
      cand(SHA_C, '2026-10-02T02:00:00.000Z'),
    ];
    const sel = selectFreshCandidate({ candidates: list });
    expect(sel.status).toBe('SELECTED');
    expect(sel.selected!.sha256).toBe(SHA_B);
  });

  test('breaks tie by sha256 ascending', () => {
    const list = [
      cand(SHA_B, '2026-10-02T03:00:00.000Z'),
      cand(SHA_A, '2026-10-02T03:00:00.000Z'),
    ];
    const sel = selectFreshCandidate({ candidates: list });
    expect(sel.selected!.sha256).toBe(SHA_A);
  });

  test('respects already_analyzed skip set', () => {
    const list = [
      cand(SHA_A, '2026-10-02T01:00:00.000Z'),
      cand(SHA_B, '2026-10-02T03:00:00.000Z'),
    ];
    const sel = selectFreshCandidate({
      candidates: list,
      criteria: { already_analyzed_sha256: [SHA_B] },
    });
    expect(sel.selected!.sha256).toBe(SHA_A);
  });

  test('filters out candidates outside size bounds', () => {
    const list = [
      cand(SHA_A, '2026-10-02T03:00:00.000Z', 100), // too small
      cand(SHA_B, '2026-10-02T02:00:00.000Z', 50000), // valid
    ];
    const sel = selectFreshCandidate({
      candidates: list,
      criteria: { min_size_bytes: 1000 },
    });
    expect(sel.selected!.sha256).toBe(SHA_B);
  });
});

describe('M18.1E MalShare Adapter — verifyDetails', () => {
  test('4. valid details — accepts documented scalar JSON object', () => {
    const payload = {
      MD5: '11111111111111111111111111111111',
      SHA1: '2222222222222222222222222222222222222222',
      SHA256: SHA_A,
      TYPE: 'PE32 executable (GUI) Intel 80386',
      ADDED: '2026-10-02 05:10:15',
      FILENAMES: ['sample.exe'],
      FILESIZE: '54321',
    };
    const res = verifyDetails(payload, SHA_A);
    expect(res.ok).toBe(true);
    expect(res.sha256_matches).toBe(true);
    expect(res.source_added_utc).toBe('2026-10-02T05:10:15.000Z');
    expect(res.file_name).toBe('sample.exe');
    expect(res.file_size_bytes).toBe(54321);
    expect(res.type).toBe('PE32 executable (GUI) Intel 80386');
    expect(res.rejection_reason).toBeNull();
  });

  test('5. details SHA mismatch — rejects when returned SHA does not match expected', () => {
    const payload = {
      SHA256: SHA_B,
      ADDED: '2026-10-02 05:10:15',
    };
    const res = verifyDetails(payload, SHA_A);
    expect(res.ok).toBe(false);
    expect(res.sha256_matches).toBe(false);
    expect(res.rejection_reason).toBe('details_identity_mismatch');
  });

  test('6. malformed details — fails closed on missing SHA, malformed payload, or API errors', () => {
    expect(verifyDetails({ ERROR: 'Sample not found' }, SHA_A).rejection_reason).toBe('details_returned_error');
    expect(verifyDetails({ error: 'bad_hash' }, SHA_A).rejection_reason).toBe('details_returned_error');
    expect(verifyDetails({}, SHA_A).rejection_reason).toBe('details_missing_sha256');
    expect(verifyDetails(null as any, SHA_A).rejection_reason).toBe('details_malformed_payload');
    expect(verifyDetails([] as any, SHA_A).rejection_reason).toBe('details_returned_no_record');
    expect(verifyDetails({ SHA256: 'not-valid-sha' }, SHA_A).rejection_reason).toBe('details_invalid_returned_sha256');
  });
});

describe('M18.1E MalShare Adapter — verifyRawPayload & Artifact', () => {
  test('11. raw payload SHA match — confirms verified status', () => {
    const res = verifyRawPayload({
      expected_sha256: SHA_A,
      computed_sha256: SHA_A,
    });
    expect(res.status).toBe('VERIFIED');
    expect(res.sha256).toBe(SHA_A);
    expect(res.rejection_reason).toBeNull();
  });

  test('12. raw payload SHA mismatch — rejects hash mismatch', () => {
    const res = verifyRawPayload({
      expected_sha256: SHA_A,
      computed_sha256: SHA_B,
    });
    expect(res.status).toBe('REJECTED_HASH_MISMATCH');
    expect(res.rejection_reason).toBe('payload_sha256_differs_from_source_sha256');
  });

  test('13. unsafe/invalid source metadata & Artifact construction', () => {
    const candidate = cand(SHA_A, '2026-10-02T01:00:00.000Z', 50000);
    const acq = acquireMalShareSample({
      candidate,
      downloaded_sha256: SHA_A,
      bytes_magic_class: 'PE',
      source_added_utc: '2026-10-02T01:00:00.000Z',
      acquired_at: '2026-10-02T10:00:00.000Z',
    });

    expect(acq.status).toBe('ACQUIRED');
    expect(acq.artifact).toBeDefined();
    expect(acq.artifact!.artifact_id).toBe(`art_mls_${SHA_A.slice(0, 16)}`);
    expect(acq.provenance_record.source).toBe('MalShare');
    expect(acq.provenance_record.source_query).toBe(MALSHARE_DISCOVERY_QUERY);
    expect(acq.provenance_record.source_added_utc).toBe('2026-10-02T01:00:00.000Z');

    // format_attributes must be strictly flat Record<string, string | number | boolean | null>
    const fa = acq.artifact!.format_attributes!;
    expect(fa.acquisition_source).toBe('MALSHARE');
    expect(fa.source_sha256).toBe(SHA_A);
    expect(fa.source_added_utc).toBe('2026-10-02T01:00:00.000Z');
    expect(fa.source_filename).toBe(`${SHA_A}.bin`);
    expect(fa.source_type).toBe('PE32');
    expect(fa.source_file_size).toBe(50000);
    expect((fa as any).source_metadata).toBeUndefined(); // Defect 2 proof: no nested object in format_attributes
  });
});
