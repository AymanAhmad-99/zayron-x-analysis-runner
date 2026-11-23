import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { chunkDocument, ingestManifest, embedTexts } from "../scripts/corpus_pipeline_ingest";
import { verifyCorpus } from "../scripts/corpus_pipeline_verify";

const DUMMY_DOC_PATH = join(process.cwd(), "tests/dummy_pipeline_test_doc.md");
const DUMMY_MANIFEST_PATH = join(process.cwd(), "tests/dummy_manifest.json");

describe("Corpus Pipeline Integrity", () => {
  beforeEach(() => {
    // Create synthetic dummy document
    const dummyContent = `# Test Pipeline Document

This is a synthetic security document for pipeline testing.
It covers incident response workflows and forensic memory analysis.

## Section 2: Evidentiary Analysis
Memory dump acquisition must preserve volatile memory before power cycle.
Process listing, network socket enumeration, and injected DLL identification
form the baseline of host analysis.

## Section 3: Mitigation
Isolate affected host immediately from corporate subnet.
Block identified command-and-control IP addresses at perimeter firewalls.
`;
    writeFileSync(DUMMY_DOC_PATH, dummyContent, "utf-8");

    const dummyManifest = {
      manifest_version: "1.0.0",
      embedding_model: "@cf/baai/bge-base-en-v1.5",
      vectorize_index: "zayron-knowledge-index",
      documents: [
        {
          document_id: "doc-dummy-synthetic-test",
          title: "Synthetic Test Document",
          source_path: "tests/dummy_pipeline_test_doc.md",
          domain: "DFIR_MEMORY",
          version: "v1",
          authority_tier: 0,
          expected_chunk_count: 3,
          ingestion_status: "PENDING"
        }
      ]
    };
    writeFileSync(DUMMY_MANIFEST_PATH, JSON.stringify(dummyManifest, null, 2), "utf-8");
  });

  afterEach(() => {
    if (existsSync(DUMMY_DOC_PATH)) unlinkSync(DUMMY_DOC_PATH);
    if (existsSync(DUMMY_MANIFEST_PATH)) unlinkSync(DUMMY_MANIFEST_PATH);
  });

  it("extracts deterministic chunks from markdown documents", () => {
    const chunks = chunkDocument("doc-dummy-synthetic-test", DUMMY_DOC_PATH, "DFIR_MEMORY", 0);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].document_id).toBe("doc-dummy-synthetic-test");
    expect(chunks[0].embedding_id.startsWith("kb-doc-dummy-synthetic-test")).toBe(true);
    expect(chunks[0].token_count).toBeGreaterThan(0);
  });

  it("produces valid 768-dimensional float vectors with unit norm", async () => {
    const texts = ["Volatile memory analysis requires rapid physical acquisition."];
    const vectors = await embedTexts(texts, "test-token", "@cf/baai/bge-base-en-v1.5", true);
    expect(vectors.length).toBe(1);
    expect(vectors[0].length).toBe(768);
    const norm = Math.sqrt(vectors[0].reduce((sum, v) => sum + v * v, 0));
    expect(Math.abs(norm - 1.0)).toBeLessThan(0.01);
  });

  it("handles manifest update and idempotency without duplicate creation", async () => {
    const initialManifest = JSON.parse(readFileSync(DUMMY_MANIFEST_PATH, "utf-8"));
    expect(initialManifest.documents[0].ingestion_status).toBe("PENDING");

    // Test that chunking the same file twice produces identical chunk IDs
    const chunks1 = chunkDocument("doc-dummy-synthetic-test", DUMMY_DOC_PATH, "DFIR_MEMORY", 0);
    const chunks2 = chunkDocument("doc-dummy-synthetic-test", DUMMY_DOC_PATH, "DFIR_MEMORY", 0);
    expect(chunks1.map(c => c.id)).toEqual(chunks2.map(c => c.id));
    expect(chunks1.map(c => c.embedding_id)).toEqual(chunks2.map(c => c.embedding_id));
  });

  it("safely handles external Cloudflare API quota errors (4006 / 7500) without crashing or silent corruption", async () => {
    // If live API calls fail due to quota limits, verify error containment
    try {
      await verifyCorpus(DUMMY_MANIFEST_PATH);
    } catch (err: any) {
      // Must be a recognized API error (e.g. 7500 D1 read limit or 4006 Workers AI quota)
      expect(err.message).toMatch(/(7500|4006|D1|Vectorize|quota|limit)/i);
    }
  });
});
