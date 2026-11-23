/**
 * Phase 6.5 — focused tests for the surgical malware-intelligence semantic pass.
 *
 * Group A — token-record accounting semantics: hits (detected) vs validated vs
 *           retained vs configured parse cap vs scan window vs coverage state.
 *           A configured maximum is never rendered as an actual record count.
 *
 * Group B — canonical report semantic projection: configuration container vs
 *           configuration value, specimen classification vs collection context
 *           vs behavioral verdict, tokenized-payload (not decrypted) wording,
 *           the analyst assessment questions, meaningful coverage states, the
 *           EVIDENCE_SUPPORT metric never reading as a confidence score, and
 *           the absence of any unsupported promotion (CAN_DO never becomes DID).
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  TOKEN_RECORD_BUDGETS,
  parseTokenRecords,
} from "../../packages/intelligence/src/malware/canonical/decodedTokenRecordParser";

const ROOT = join(import.meta.dir, "..", "..");
const read = (relative: string) => readFileSync(join(ROOT, relative), "utf8");

const PIPELINE_SOURCE = read("packages/intelligence/src/malware/canonical/malwareProductionPipeline.ts");
const CONFIG_LAYER_SOURCE = read("packages/intelligence/src/malware/canonical/staticConfigurationLayer.ts");
const DECODED_SOURCE = read(
  "packages/intelligence/src/malware/canonical/decodedStructuralIntelligence.ts",
);

/** One structurally valid UTF-16LE string record: [u32 LE length][content]. */
function record(text: string): Uint8Array {
  const chars = text.length;
  const out = new Uint8Array(4 + chars * 2);
  out[0] = chars & 0xff;
  out[1] = (chars >> 8) & 0xff;
  out[2] = (chars >> 16) & 0xff;
  out[3] = (chars >> 24) & 0xff;
  for (let i = 0; i < chars; i += 1) out[4 + i * 2] = text.charCodeAt(i) & 0x7f;
  return out;
}

function payload(records: Uint8Array[]): Uint8Array {
  const total = records.reduce((sum, r) => sum + r.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const r of records) {
    out.set(r, offset);
    offset += r.length;
  }
  return out;
}

/* ─────────────────────────── GROUP A ─────────────────────────── */

describe("phase 6.5 — group A: token-record accounting semantics", () => {
  test("A1. the configured parse cap and retention cap are distinct configured maxima, never counts", () => {
    expect(TOKEN_RECORD_BUDGETS.max_validated).toBe(4096);
    expect(TOKEN_RECORD_BUDGETS.retained).toBe(8);
    // The two caps are independent: retention is bounded far below the count cap.
    expect(TOKEN_RECORD_BUDGETS.retained).toBeLessThan(TOKEN_RECORD_BUDGETS.max_validated);
  });

  test("A2. validated, retained and detected are three different quantities", () => {
    const bytes = payload(Array.from({ length: 12 }, (_, i) => record(`findings-${i + 10}`)));
    const result = parseTokenRecords(bytes);
    // 12 records validated ...
    expect(result.validated_count).toBe(12);
    // ... but only the retention cap is kept in the report section.
    expect(result.records.length).toBe(TOKEN_RECORD_BUDGETS.retained);
    // Retained is never presented as the total.
    expect(result.records.length).not.toBe(result.validated_count);
    // Hits (detected) is a scan-level quantity: 12 record headers were found.
    expect(result.records.map((r) => r.record_index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(result.validated_count_capped).toBe(false);
    expect(result.bytes_scanned).toBe(bytes.length);
  });

  test("A3. the cap is reported as a cap and is never silently exceeded or masked as a count", () => {
    const over = TOKEN_RECORD_BUDGETS.max_validated + 1;
    const bytes = payload(Array.from({ length: over }, () => record("capcheck")));
    const result = parseTokenRecords(bytes);
    expect(result.validated_count).toBe(TOKEN_RECORD_BUDGETS.max_validated);
    expect(result.validated_count_capped).toBe(true);
    expect(result.records.length).toBe(TOKEN_RECORD_BUDGETS.retained);
    // The counted value is the cap, and the section reports that it was reached
    // instead of presenting the configured maximum as an observed record count.
    expect(result.validated_count).toBeLessThan(over);
  });

  test("A4. an un-parsable candidate is not counted, so hits never overstate validated records", () => {
    const good = record("valid-record");
    const truncated = new Uint8Array([8, 0, 0, 0, 0x41, 0x00, 0x42]);
    const bytes = payload([good, truncated]);
    const result = parseTokenRecords(bytes);
    expect(result.validated_count).toBe(1);
    expect(result.records.length).toBe(1);
    expect(result.bytes_scanned).toBe(bytes.length);
  });

  test("A5. the decoded section exposes the six distinct accounting fields", () => {
    const allowlistStart = DECODED_SOURCE.indexOf("DECODED_STRUCTURE_COVERAGE_FIELDS");
    expect(allowlistStart).toBeGreaterThan(-1);
    const allowlist = DECODED_SOURCE.slice(allowlistStart, DECODED_SOURCE.indexOf("];", allowlistStart));
    for (const field of [
      "detected_count",
      "validated_count",
      "retained_count",
      "parse_cap",
      "scan_window",
      "coverage_state",
    ]) {
      expect(DECODED_SOURCE).toContain(`${field}:`);
      expect(allowlist).toContain(field);
    }
    // Detected is the scan-hit quantity, validated is the parser count, retained
    // is what the report keeps, and the cap is read from the configured budget.
    expect(DECODED_SOURCE).toContain("detected_count: representation.token_record_hits");
    expect(DECODED_SOURCE).toContain("validated_count:");
    expect(DECODED_SOURCE).toContain("retained_count:");
    expect(DECODED_SOURCE).toContain("parse_cap: TOKEN_RECORD_BUDGETS.max_validated");
    expect(DECODED_SOURCE).toContain("scan_window: representation.scan_bytes");
    expect(DECODED_SOURCE).toContain("coverage_state:");
  });

  test("A6. the CAPPED/COMPLETE coverage state reflects the cap, not the count", () => {
    expect(DECODED_SOURCE).toMatch(/coverage_state:\s*tokenParse\.validated_count_capped\s*\?\s*'VALIDATED_CAPPED'\s*:\s*'VALIDATED_COMPLETE'/);
    expect(DECODED_SOURCE).toContain("'token_record_count'");
  });

  test("A7. the section reason never renders the configured cap as the record count", () => {
    // hits are labelled as scan-window structure hits ...
    expect(DECODED_SOURCE).toMatch(/token-record structure hits detected inside a/);
    // ... the validated count and the cap are labelled separately and verbatim ...
    expect(DECODED_SOURCE).toMatch(
      /validated \$\{String\(tokenParse\.validated_count\)\} record\(s\) against a validation cap of \$\{String\(TOKEN_RECORD_BUDGETS\.max_validated\)\}/,
    );
    // ... retention is stated as a retention, and "cap reached" is explicit.
    expect(DECODED_SOURCE).toMatch(/record\(s\) were retained in this report/);
    expect(DECODED_SOURCE).toContain("(cap reached)");
    // The legacy conflation — the cap asserted as the parsed record count — is gone.
    expect(DECODED_SOURCE).not.toMatch(
      /structurally validated \$\{String\(TOKEN_RECORD_BUDGETS\.max_validated\)\} record/,
    );
  });
});

/* ─────────────────────────── GROUP B ─────────────────────────── */

describe("phase 6.5 — group B: canonical report semantic projection", () => {
  test("B1. a container is never called a configuration value", () => {
    expect(PIPELINE_SOURCE).toContain("embedded script-bearing container(s)");
    expect(CONFIG_LAYER_SOURCE).toContain("embedded script-bearing container(s)");
    expect(CONFIG_LAYER_SOURCE).toContain("no verified configuration values were recovered");
    expect(PIPELINE_SOURCE).toContain("a configuration container is not a configuration value");
    expect(CONFIG_LAYER_SOURCE).toContain("a configuration container is not a configuration value");
    // No analyst text still asserts that a container IS a recovered value.
    expect(PIPELINE_SOURCE).not.toMatch(/identified \d+ configuration-bearing container/);
  });

  test("B2. specimen classification, collection context and behavioral verdict are separated", () => {
    expect(PIPELINE_SOURCE).toContain("WHAT IS THIS — specimen classification:");
    expect(PIPELINE_SOURCE).toContain("Collection context: this artifact is processed inside the ZAYRON-X malware analysis corpus");
    expect(PIPELINE_SOURCE).toContain("Behavioral verdict: NOT ESTABLISHED");
    expect(PIPELINE_SOURCE).toContain("is never promoted into a verdict");
    // Classification is derived from structure/compiler evidence only.
    expect(PIPELINE_SOURCE).toContain("derived from static container structure and compiler/resource evidence only");
    // The malware-analysis context is not weakened into a benign verdict.
    expect(PIPELINE_SOURCE).not.toMatch(/behavioral verdict:\s*(BENIGN|CLEAN)/i);
  });

  test("B3. the tokenized representation is never described as decrypted source", () => {
    expect(PIPELINE_SOURCE).toContain("INNER PAYLOAD INTERPRETATION —");
    expect(PIPELINE_SOURCE).toContain("structurally classified as TOKENIZED_PAYLOAD");
    expect(PIPELINE_SOURCE).toContain(
      "not decrypted and was not converted into verified source text or semantic script instructions",
    );
    expect(PIPELINE_SOURCE).toContain("inner_decoder_state = UNAVAILABLE");
    expect(PIPELINE_SOURCE).toContain("Token records are structural framing only");
    // Scope the forbidden-promotion check to the analyst layer itself (doc
    // comments elsewhere may legitimately name the transform they refuse).
    const analystBlock = PIPELINE_SOURCE.slice(
      PIPELINE_SOURCE.indexOf("Phase 6.5 — analyst-grade semantic layer"),
      PIPELINE_SOURCE.indexOf("Phase 5 — static configuration projection is validated on the WRITE path"),
    );
    expect(analystBlock.length).toBeGreaterThan(2000);
    // Strip whole-line comments: the forbidden-promotion check targets the
    // PUBLISHED analyst text, not a comment naming what it refuses.
    const analystCode = analystBlock
      .split("\n")
      .filter((line) => !/^\s*\/\//.test(line))
      .join("\n");
    // Forbidden promotions: no claimed decryption, source recovery or C2 recovery.
    expect(analystCode).not.toMatch(/decrypted (source|script|configuration|payload)/i);
    expect(analystCode).not.toMatch(/recovered C2/i);
    expect(analystCode).not.toMatch(/outer EA06 (key|password)/i);
  });

  test("B4. the analyst assessment answers the six required questions", () => {
    for (const question of [
      "WHAT IS THIS —",
      "WHAT WAS RECOVERED —",
      "WHAT THE EVIDENCE SUPPORTS —",
      "WHAT WAS NOT ESTABLISHED —",
      "WHY THESE DOMAINS REMAIN UNRESOLVED —",
      "ANALYSIS COVERAGE —",
    ]) {
      expect(PIPELINE_SOURCE).toContain(question);
    }
    // Recovery names the artifacts and the retention of records.
    expect(PIPELINE_SOURCE).toContain("decoded child artifact");
    expect(PIPELINE_SOURCE).toContain("embedded parent-resource artifact");
    expect(PIPELINE_SOURCE).toContain("retained in this report");
    // Unresolved domains list every domain explicitly.
    expect(PIPELINE_SOURCE).toContain("malware family:");
    expect(PIPELINE_SOURCE).toContain("runtime/executed behavior:");
    expect(PIPELINE_SOURCE).toContain("verified configuration values:");
    expect(PIPELINE_SOURCE).toContain("correlated infrastructure:");
    expect(PIPELINE_SOURCE).toContain("ATT&CK/MBC mappings:");
    expect(PIPELINE_SOURCE).toContain("execution outcome: NOT PERFORMED");
    // "Why unresolved" gives a reason, not a bare UNRESOLVED label.
    expect(PIPELINE_SOURCE).toContain("family_resolution.resolution_reason");
    expect(PIPELINE_SOURCE).toContain("is never a clean bill of health");
  });

  test("B5. coverage states stay semantically distinct instead of flattening into zeroes", () => {
    expect(PIPELINE_SOURCE).toContain("dynamic behavior = NOT PERFORMED");
    // M16.4.33 — the inner-decoder domain state is DERIVED from the single
    // semantic authority, never a hard-coded UNAVAILABLE. A specimen with no
    // verified child is NOT_APPLICABLE, which is a demonstrably different state
    // from UNAVAILABLE; the source must not pin one specimen's state.
    expect(PIPELINE_SOURCE).toContain("inner decoder = ${semanticStates.inner_decoder.state}");
    expect(PIPELINE_SOURCE).not.toContain("inner decoder = UNAVAILABLE");
    expect(PIPELINE_SOURCE).toContain("configuration values =");
    // Configuration distinguishes three different states: verified value,
    // structure-only container (no verified values), and no configuration-
    // bearing container at all. None is rendered as another.
    expect(PIPELINE_SOURCE).toContain(
      "NO VERIFIED VALUES (container structure identified, no verified values recovered)",
    );
    expect(PIPELINE_SOURCE).toContain(
      "NO EVIDENCE (no configuration-bearing container within the supported scope)",
    );
    // ...and the same for infrastructure: static candidates are not verified
    // relationships, and neither is flattened into an empty domain.
    expect(PIPELINE_SOURCE).toContain("STATIC CANDIDATES (${semanticStates.infrastructure.count} record(s), not verified relationships)");
    expect(PIPELINE_SOURCE).toContain(
      "NOT PERFORMED, NO EVIDENCE, ERROR, NO_RESULT, UNAVAILABLE and VERIFIED are different states",
    );
    // Per-capability-step statuses are reported as counts per state.
    expect(PIPELINE_SOURCE).toContain("Requested capability step statuses:");
    expect(PIPELINE_SOURCE).toContain("stepStatusCounts");
  });

  test("B6. EVIDENCE_SUPPORT stays a support metric, not a confidence score", () => {
    const start = PIPELINE_SOURCE.indexOf("export function deriveSupportSemantics");
    expect(start).toBeGreaterThan(-1);
    const body = PIPELINE_SOURCE.slice(
      start,
      PIPELINE_SOURCE.indexOf("export interface MalwareIntelligenceReport", start),
    );
    expect(body).toContain("metric: 'EVIDENCE_SUPPORT'");
    expect(body).toContain("interpretation:");
    expect(body).toContain("lineage_count:");
    expect(body).not.toMatch(/percent|probability|score|confidence/i);
    const ifaceStart = PIPELINE_SOURCE.indexOf("export interface SupportSemantics");
    const iface = PIPELINE_SOURCE.slice(ifaceStart, PIPELINE_SOURCE.indexOf("\n}", ifaceStart));
    expect(iface).toContain("metric: 'EVIDENCE_SUPPORT'");
    expect(iface).not.toMatch(/percent|probability|score|confidence/i);
  });

  test("B7. no unsupported promotion: CAN_DO is never rendered as DID", () => {
    expect(PIPELINE_SOURCE).toContain("modality is CAN_DO");
    expect(PIPELINE_SOURCE).toContain("no executed capability is claimed");
    expect(PIPELINE_SOURCE).toContain("never what this sample was observed doing");
    expect(PIPELINE_SOURCE).toContain("No structural fact is promoted into an executed capability.");
    // Forbidden transformations must not appear as analyst assertions.
    expect(PIPELINE_SOURCE).not.toMatch(/family (resolved|identified) (to|as)/i);
    expect(PIPELINE_SOURCE).not.toMatch(/attributed to (the )?(actor|group|family)/i);
    expect(PIPELINE_SOURCE).not.toMatch(/technique (T\d{4}|mapped)/);
  });
});
