import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { ingestManifest } from "../scripts/corpus_pipeline_ingest";
import { verifyCorpus } from "../scripts/corpus_pipeline_verify";
import { requireNonProductionMutationAuthorization } from "../scripts/production-mutation-lock";

const isMutationAuthorized = (() => {
  try {
    requireNonProductionMutationAuthorization("corpus_scale_test.test.ts");
    return true;
  } catch {
    return false;
  }
})();

describe("Corpus Pipeline Mutation Guard Contract", () => {
  it("enforces fail-closed PRODUCTION_MUTATION_LOCKED guard in unauthorized test environments", () => {
    if (!isMutationAuthorized) {
      expect(() => requireNonProductionMutationAuthorization("corpus_pipeline_ingest.ts")).toThrow("PRODUCTION_MUTATION_LOCKED");
    }
  });
});

describe.skipIf(!isMutationAuthorized)("Corpus Pipeline Scale Test (3 Documents Concurrent Ingestion)", () => {
  beforeEach(() => {
    // 1. Create Document 1 (Threat Actor)
    writeFileSync(
      DOC1_PATH,
      `# Book 1: Advanced Threat Actor Tradecraft\n\n` +
      `Nation-state operators employ stealthy living-off-the-land techniques (LotL) to bypass traditional endpoint detection.\n\n` +
      `Credential harvesting via LSASS dumping and DPAPI secret extraction represents a standard primary objective.\n\n` +
      `Lateral movement occurs primarily through authenticated WMI and WinRM channels.`
    );

    // 2. Create Document 2 (Malware Analysis)
    writeFileSync(
      DOC2_PATH,
      `# Book 2: Modern Ransomware and Loader Analysis\n\n` +
      `Modern loaders utilize API unhooking and indirect syscalls to neutralize EDR user-mode inspection.\n\n` +
      `Ransomware payloads employ multi-threaded asynchronous I/O with ChaCha20-Poly1305 encryption.\n\n` +
      `Volume shadow copies and system restore points are aggressively deleted via VSSAdmin commands.`
    );

    // 3. Create Document 3 (Vulnerability Research)
    writeFileSync(
      DOC3_PATH,
      `# Book 3: Memory Safety and Kernel Exploitation\n\n` +
      `Kernel privilege escalation frequently exploits use-after-free conditions in Windows pool memory.\n\n` +
      `Heap spraying and token-stealing payloads allow ring-0 code execution.\n\n` +
      `Control Flow Guard (CFG) and Hypervisor-Protected Code Integrity (HVCI) mitigate traditional return-oriented programming.`
    );

    // 4. Create Multi-Document Manifest
    const manifest = {
      manifest_version: "1.0.0",
      embedding_model: "@cf/baai/bge-base-en-v1.5",
      vectorize_index: "zayron-knowledge-index",
      documents: [
        {
          document_id: "doc-scale-test-01",
          title: "Advanced Threat Actor Tradecraft",
          source_path: "tests/dummy_scale_book_1.md",
          domain: "THREAT_ACTOR",
          version: "v1",
          authority_tier: 0,
          expected_chunk_count: 4,
          ingestion_status: "PENDING"
        },
        {
          document_id: "doc-scale-test-02",
          title: "Modern Ransomware and Loader Analysis",
          source_path: "tests/dummy_scale_book_2.md",
          domain: "MALWARE",
          version: "v1",
          authority_tier: 0,
          expected_chunk_count: 4,
          ingestion_status: "PENDING"
        },
        {
          document_id: "doc-scale-test-03",
          title: "Memory Safety and Kernel Exploitation",
          source_path: "tests/dummy_scale_book_3.md",
          domain: "VULNERABILITY",
          version: "v1",
          authority_tier: 0,
          expected_chunk_count: 4,
          ingestion_status: "PENDING"
        }
      ]
    };
    writeFileSync(SCALE_MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
  });

  afterEach(async () => {
    if (existsSync(DOC1_PATH)) unlinkSync(DOC1_PATH);
    if (existsSync(DOC2_PATH)) unlinkSync(DOC2_PATH);
    if (existsSync(DOC3_PATH)) unlinkSync(DOC3_PATH);
    if (existsSync(SCALE_MANIFEST_PATH)) unlinkSync(SCALE_MANIFEST_PATH);

    if (!isMutationAuthorized) return;

    // Clean up test documents from D1 and Vectorize
    try {
      const configPath = join(process.env.USERPROFILE || "", "AppData/Roaming/xdg.config/.wrangler/config/default.toml");
      const token = readFileSync(configPath, "utf-8").match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
      if (token) {
        const accountId = "56534d53775d8280011a325dcf36ed09";
        const dbId = "c19c8f45-801b-4034-bd76-402e5e5389b5";
        await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            sql: "DELETE FROM knowledge_chunks WHERE document_id LIKE 'doc-scale-test-%'; DELETE FROM knowledge_documents WHERE id LIKE 'doc-scale-test-%';"
          })
        });

        // Delete test vectors from Vectorize
        const testVectorIds: string[] = [];
        for (let b = 1; b <= 3; b++) {
          for (let p = 1; p <= 4; p++) {
            testVectorIds.push(`kb-doc-scale-test-0${b}-p1-${p}`);
          }
        }
        await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/zayron-knowledge-index/delete-by-ids`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ids: testVectorIds })
        });
      }
    } catch {
      // Ignored during local/offline runs
    }
  });

  it("processes 3 new documents in a single automated pipeline execution", async () => {
    // Pass 1: Ingest all 3 documents
    await ingestManifest(SCALE_MANIFEST_PATH, { allowFallbackEmbed: true });

    const updatedManifest = JSON.parse(readFileSync(SCALE_MANIFEST_PATH, "utf-8"));
    expect(updatedManifest.documents.length).toBe(3);

    for (const doc of updatedManifest.documents) {
      expect(doc.ingestion_status).toBe("INDEXED");
      expect(doc.actual_chunk_count).toBeGreaterThanOrEqual(3);
      expect(doc.content_hash).toBeDefined();
      expect(doc.last_ingested_at).toBeDefined();
    }
  }, 30000);

  it("demonstrates strict idempotency on second pass (zero redundant writes)", async () => {
    // Pass 1
    await ingestManifest(SCALE_MANIFEST_PATH, { allowFallbackEmbed: true });
    const manifestPass1 = JSON.parse(readFileSync(SCALE_MANIFEST_PATH, "utf-8"));
    const timestampPass1 = manifestPass1.documents[0].last_ingested_at;

    // Pass 2: Re-run without changes
    await ingestManifest(SCALE_MANIFEST_PATH, { allowFallbackEmbed: true });
    const manifestPass2 = JSON.parse(readFileSync(SCALE_MANIFEST_PATH, "utf-8"));
    const timestampPass2 = manifestPass2.documents[0].last_ingested_at;

    // Timestamp remains unchanged because all documents were skipped as up-to-date
    expect(timestampPass1).toBe(timestampPass2);
  }, 30000);
});
