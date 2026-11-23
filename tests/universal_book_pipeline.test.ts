import { describe, it, expect } from 'bun:test';
import {
  processBook,
  DocumentInput,
  PIPELINE_VERSION
} from '../packages/intelligence/src/ingestion/universal_book_pipeline';

describe('Z.X.INTELLIGENCE — Step 3 Universal Book Ingestion Standard', () => {
  const htmlDoc: DocumentInput = {
    filePath: '.zayron/knowledge/physical-15/07-first-cvss4.html',
    documentId: 'doc-unit-html-test',
    documentTitle: 'FIRST CVSS v4.0 Specification Document',
    domain: 'VULNERABILITY',
    authorityTier: 0,
    format: 'HTML'
  };

  const pdfDoc: DocumentInput = {
    filePath: '.zayron/knowledge/physical-15/05-nist-sp-800-61r3.pdf',
    documentId: 'doc-unit-pdf-test',
    documentTitle: 'NIST SP 800-61 Rev. 3',
    domain: 'INCIDENT_RESPONSE',
    authorityTier: 0,
    format: 'PDF'
  };

  it('processes real HTML technical source with 0 oversized chunks and 0 boilerplate contamination', () => {
    const res = processBook(htmlDoc, { forceReprocess: true });
    expect(res.skippedDueToIdempotency).toBe(false);
    expect(res.chunks.length).toBeGreaterThan(50);
    expect(res.metrics.oversized_chunks).toBe(0);
    expect(res.metrics.p95_char_size).toBeLessThan(3000);
    expect(res.d1Records.length).toBe(res.chunks.length);
    expect(res.vectorPayloads.length).toBe(res.chunks.length);

    // Verify 0 boilerplate contamination
    const hasBoilerplate = res.chunks.some(c => /member portal|board of directors/i.test(c.text));
    expect(hasBoilerplate).toBe(false);
  });

  it('processes real PDF technical source preserving real pages and section structure', () => {
    const res = processBook(pdfDoc, { forceReprocess: true });
    expect(res.skippedDueToIdempotency).toBe(false);
    expect(res.extraction.rawCharacters).toBeGreaterThan(50000);
    expect(res.chunks.length).toBeGreaterThan(50);
    expect(res.metrics.oversized_chunks).toBe(0);
    expect(res.metrics.p95_char_size).toBeLessThan(2500);

    // Verify real page numbers preserved
    const hasPages = res.chunks.some(c => c.page !== null && c.page > 0);
    expect(hasPages).toBe(true);
  }, 30000);

  it('demonstrates strict idempotency and zero redundant writes on second pass', () => {
    const pass2 = processBook(htmlDoc);
    expect(pass2.skippedDueToIdempotency).toBe(true);
    expect(pass2.chunks.length).toBe(0);
  });
});
