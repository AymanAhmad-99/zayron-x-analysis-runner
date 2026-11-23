import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractSummaryInput,
  generateDeterministicAnalystSummary,
} from "../../apps/web/app/lib/analystSummary";

const ROOT = join(import.meta.dir, "..", "..");
const canonicalReport = JSON.parse(
  readFileSync(join(ROOT, ".tmp-m16417/canonical_report.json"), "utf8")
);

describe("Analyst Summary Layer — Semantic Integrity & Bounded Synthesis", () => {
  test("1. extracts structured summary input without loss of truth", () => {
    const input = extractSummaryInput(canonicalReport);
    expect(input.report_id).toBe("mir_66cd231d1563b12f");
    expect(input.format_class).toBe("PE");
    expect(input.source).toBe("MALSHARE");
    expect(input.family_state).toBe("UNRESOLVED");
    expect(input.dynamic_state).toBe("NOT PERFORMED");
    expect(input.static_capability_count).toBe(1);
    expect(input.observed_behavior_count).toBe(0);
    expect(input.infrastructure_count).toBe(20);
    expect(input.attack_mapped).toBe(false);
    expect(input.mbc_mapped).toBe(false);
    expect(input.tool_summary.observed).toBe(4);
    expect(input.tool_summary.error).toBe(1);
    expect(input.tool_summary.error_tools).toContain("floss");
    expect(input.tool_summary.no_result).toBe(1);
    expect(input.tool_summary.no_result_tools).toContain("yara-x");
  });

  test("2. produces deterministic output for identical input", () => {
    const sum1 = generateDeterministicAnalystSummary(canonicalReport);
    const sum2 = generateDeterministicAnalystSummary(canonicalReport);
    expect(sum1.text).toBe(sum2.text);
    expect(sum1.mode).toBe("DETERMINISTIC");
    expect(sum1.word_count).toBeGreaterThanOrEqual(50);
    expect(sum1.word_count).toBeLessThanOrEqual(110);
  });

  test("3. explicitly preserves UNRESOLVED family without fabrication", () => {
    const summary = generateDeterministicAnalystSummary(canonicalReport);
    expect(summary.text).toContain("unresolved");
    expect(summary.text).not.toContain("RedLine");
    expect(summary.text).not.toContain("Lumma");
    expect(summary.text).not.toContain("Vidar");
  });

  test("4. explicitly preserves dynamic execution NOT PERFORMED", () => {
    const summary = generateDeterministicAnalystSummary(canonicalReport);
    expect(summary.text).toContain("dynamic execution was not performed");
    expect(summary.text).not.toContain("executed in sandbox");
  });

  test("5. preserves CAN_DO modality and does not promote to observed execution", () => {
    const summary = generateDeterministicAnalystSummary(canonicalReport);
    expect(summary.text).toContain("CAN_DO");
    expect(summary.text).toContain("not treated as observed execution");
  });

  test("6. explicitly exposes tool ERROR and NO_RESULT without claiming absence or clean", () => {
    const summary = generateDeterministicAnalystSummary(canonicalReport);
    expect(summary.text).toContain("floss");
    expect(summary.text).toContain("error");
    expect(summary.text).toContain("yara-x");
    expect(summary.text).toContain("no-result");
    expect(summary.text).not.toContain("clean");
  });

  test("7. infrastructure candidates remain static candidates and not verified relationships", () => {
    const summary = generateDeterministicAnalystSummary(canonicalReport);
    expect(summary.text).toContain("static candidates rather than verified relationships");
  });
});
