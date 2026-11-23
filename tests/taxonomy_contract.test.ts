import { describe, test, expect } from "bun:test";
import {
  VULNERABILITY_INTELLIGENCE_TYPE as SERVER_TOKEN,
  VULNERABILITY_SOURCE_CATEGORY as SERVER_SOURCE_CATEGORY,
  isVulnerabilityType,
  canonicalIntelligenceType,
  categoryFilterTokens,
} from "../packages/intelligence/src/pipeline/canonical";
import {
  VULNERABILITY_INTELLIGENCE_TYPE as WEB_TOKEN,
  VULNERABILITY_SOURCE_CATEGORY as WEB_SOURCE_CATEGORY,
  canonicalIntelligenceType as webCanonicalIntelligenceType,
} from "../apps/web/app/lib/taxonomy";

/**
 * Regression suite for the vulnerability taxonomy singular/plural drift.
 * Proves the canonical token is single-sourced and that both spellings resolve
 * to one population at read time.
 */
describe("ZAYRON-X — vulnerability taxonomy contract", () => {
  test("1. web mirror and server canonical constant are identical (no drift possible)", () => {
    expect(WEB_TOKEN).toBe(SERVER_TOKEN);
    expect(WEB_SOURCE_CATEGORY).toBe(SERVER_SOURCE_CATEGORY);
    expect(SERVER_TOKEN).toBe("vulnerabilities");
    expect(SERVER_SOURCE_CATEGORY).toBe("VULNERABILITIES");
  });

  test("2. every known vulnerability spelling normalises to the single canonical token", () => {
    for (const spelling of ["vulnerability", "vulnerabilities", "VULNERABILITY", "Vulnerabilities", " vulnerabilities "]) {
      expect(canonicalIntelligenceType(spelling)).toBe(SERVER_TOKEN);
      expect(webCanonicalIntelligenceType(spelling)).toBe(WEB_TOKEN);
      expect(isVulnerabilityType(spelling)).toBe(true);
    }
  });

  test("3. non-vulnerability categories are never rewritten to the vulnerability token", () => {
    for (const other of ["malware", "exploit", "threat_actor", "cve_feed", "ransomware"]) {
      expect(isVulnerabilityType(other)).toBe(false);
      expect(canonicalIntelligenceType(other)).toBe(other);
    }
    // 'cve' is a distinct category, not the vulnerability population.
    expect(canonicalIntelligenceType("CVE")).toBe("cve");
    expect(canonicalIntelligenceType("CVE")).not.toBe(SERVER_TOKEN);
  });

  test("4. an incoming vulnerability category matches BOTH stored spellings (singular + plural)", () => {
    const tokens = categoryFilterTokens("vulnerability");
    expect(new Set(tokens)).toEqual(new Set(["vulnerability", "vulnerabilities"]));
    // Same alias set regardless of which spelling the caller used.
    expect(new Set(categoryFilterTokens("vulnerabilities"))).toEqual(new Set(tokens));
    expect(new Set(categoryFilterTokens("VULNERABILITIES"))).toEqual(new Set(tokens));

    // Simulate the stored rows: a plural CISA-KEV row and a singular NVD row must
    // both match at least one token, proving no row is orphaned.
    const pluralRow = { source_category: "vulnerabilities", categories_json: '["vulnerabilities","cisa-kev"]' };
    const singularRow = { source_category: "VULNERABILITY", categories_json: '["VULNERABILITY","CVE"]' };
    const matches = (row: { source_category: string; categories_json: string }) =>
      tokens.some(
        (t) =>
          row.source_category.toLowerCase() === t ||
          row.categories_json.toLowerCase().includes(`"${t}"`),
      );
    expect(matches(pluralRow)).toBe(true);
    expect(matches(singularRow)).toBe(true);
  });

  test("5. a non-vulnerability category filter is passed through unchanged (no population merge)", () => {
    expect(categoryFilterTokens("exploit")).toEqual(["exploit"]);
    expect(categoryFilterTokens("malware")).toEqual(["malware"]);
    expect(categoryFilterTokens("")).toEqual([]);
  });
});
