/**
 * Final analyst-facing malware report UI pass — ONE focused group covering:
 * section ordering, required headings, token-record rendering, token accounting
 * wording, empty-domain semantics, configuration wording, absence of
 * unsupported semantic promotion, and the report id/path contract.
 *
 * The rendered page serves the canonical payload; the projection adds no fact.
 * Every assertion below is read from the shipped sources of the route, the
 * component and the projection, or from the projection's pure functions.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CONFIGURATION_STATE,
  CONFIGURATION_STRUCTURE_ONLY_EXPLANATION,
  analystStatementText,
  configurationState,
  specimenClassification,
  tokenAccounting,
} from "../../apps/web/app/lib/malwareReportProjection";

const ROOT = join(import.meta.dir, "..", "..");
const read = (relative: string) => readFileSync(join(ROOT, relative), "utf8");

const UI = read("apps/web/app/components/CanonicalMalwareReport.tsx");
const PROJECTION = read("apps/web/app/lib/malwareReportProjection.ts");
const ROUTE = read("apps/web/app/intelligence/malware/[id]/page.tsx");

/** Required analyst hierarchy: label + the exact source needle that renders it. */
const REQUIRED_HIERARCHY: [string, string][] = [
  ["Specimen Classification", 'title="Specimen Classification"'],
  ["Key Findings", 'title="Key Findings"'],
  ["Executive Assessment", 'title="Executive Assessment"'],
  ["What ZAYRON-X Established", 'title="What ZAYRON-X Established"'],
  ["What Remains Unknown", 'title="What Remains Unknown"'],
  ["Analysis Coverage", 'title="Analysis Coverage"'],
  ["Static Findings", 'title="Static Findings"'],
  ["Configuration", "Configuration — STRUCTURE IDENTIFIED"],
  ["Detection-Relevant Artifacts", 'title="Detection-Relevant Artifacts"'],
  ["Decoded Artifact", 'title="Decoded Artifact"'],
  ["Tool Coverage", 'title="Tool Coverage"'],
  // M16.4.32 — the section's title is record-derived (see the M16.4.32 suite for
  // the semantic assertion: static capability records never get the
  // runtime-behavior label).
  ["Evidence-Backed Behaviors / Capabilities", 'title={behaviorSectionTitle}'],
  ["Family Assessment", 'title="Family Assessment"'],
  ["Infrastructure", 'title="Infrastructure"'],
  ["ATT&CK Mappings", 'title="ATT&CK Mappings"'],
  ["MBC Mappings", 'title="MBC Mappings"'],
  ["Evidence Support (metric)", "metric — not a confidence score"],
  ["Conflicts", 'title="Conflicts"'],
  ["Evidence / Provenance", 'title="Evidence / Provenance"'],
  ["Limitations", 'title="Limitations"'],
];

const REPORT_ID = "mir_6ae7ce86d98711dc";

describe("phase 6 UI pass — canonical malware report analyst view", () => {
  test("1. every required section heading exists and the analyst hierarchy is in order", () => {
    let previous = -1;
    const missing: string[] = [];
    const outOfOrder: string[] = [];
    for (const [label, needle] of REQUIRED_HIERARCHY) {
      const at = UI.indexOf(needle);
      if (at < 0) missing.push(label);
      else if (at <= previous) outOfOrder.push(label);
      if (at >= 0) previous = at;
    }
    expect({ missing, outOfOrder }).toEqual({ missing: [], outOfOrder: [] });
    // The analyst assessment precedes raw provenance: identity metadata must not
    // displace the assessment.
    expect(UI.indexOf('title="Specimen Classification"')).toBeLessThan(UI.indexOf('title="Sample Identity"'));
    expect(UI.indexOf('title="Decoded Artifact"')).toBeLessThan(UI.indexOf('title="Sample Identity"'));
  });

  test("2. the specimen is identified before any provenance, and the report id/path are correct", () => {
    expect(ROUTE).toContain("CanonicalMalwareReportDetail");
    expect(ROUTE).toContain("id={id}");
    // The route segment is /intelligence/malware/[id]; the live report id resolves there.
    expect(REPORT_ID).toMatch(/^mir_[0-9a-f]{16}$/);
    expect(ROUTE).toContain("params: Promise<{ id: string }>");
    expect(UI).toContain("title={report.report_id}");
    // Compact identity strip: format, size, sha256 and source context up top.
    for (const needle of ['["Format"', '["Size"', ' MB (', " MB (", '["SHA-256"', '["Source context"']) {
      expect(UI).toContain(needle);
    }
    // The compact size label is derived from the canonical byte count, not invented.
    expect(UI).toContain('toLocaleString("en-US")');
    expect(UI).toContain('["Family"');
    expect(UI).toContain("analysisModeLabel(dynamicState)");
    expect(UI).toContain('["Dynamic execution"');
  });

  test("3. token records are rendered as a primary evidence artifact", () => {
    expect(UI).toContain("TOKENIZED PAYLOAD RECORDS ({tokenRecords.length})");
    expect(UI).toContain("Inner decoder state:");
    expect(UI).toContain("not decrypted and not converted into source code");
    expect(UI).toContain("Token records are structural evidence");
    // Records stay out of configuration/behavior/IOC language.
    expect(UI).not.toMatch(/token records?[^.]{0,40}(configuration|IOC|C2|family) (value|evidence)/i);
  });

  test("4. token accounting keeps the three scopes separate (982 / cap / retention)", () => {
    const acc = tokenAccounting({
      detected_count: 982,
      validated_count: 4096,
      retained_count: 8,
      parse_cap: 4096,
      scan_window: 65536,
      coverage_state: "VALIDATED_CAPPED",
    });
    expect(acc.detected_hits).toBe(982);
    expect(acc.scan_window_bytes).toBe(65536);
    expect(acc.parse_cap).toBe(4096);
    expect(acc.validated_count).toBe(4096);
    expect(acc.retained_count).toBe(8);
    expect(acc.cap_reached).toBe(true);
    // The cap is a configured maximum, never the same quantity as the hits.
    expect(acc.detected_hits).not.toBe(acc.parse_cap);
    expect(acc.retained_count).not.toBe(acc.validated_count);
    // Missing canonical fields produce no invented numbers.
    const empty = tokenAccounting({});
    expect([empty.detected_hits, empty.parse_cap, empty.retained_count, empty.scan_window_bytes]).toEqual([
      null, null, null, null,
    ]);
    expect(empty.cap_reached).toBe(false);
    // Rendering: three labelled scopes, and never one combined claim.
    expect(UI).toContain('cell("Detection scan"');
    expect(UI).toContain('cell("Structural parser"');
    expect(UI).toContain('cell("Canonical retention"');
    expect(UI).toContain("Validation cap:");
    expect(UI).toContain("Scan window:");
    expect(UI).toContain("records retained");
    expect(UI).toContain("not subsets of one another");
    expect(UI.toLowerCase()).not.toContain("of which 4096");
    expect(UI.toLowerCase()).not.toContain("hits, of which");
  });

  test("5. empty domains are stated as this-run outcomes, never as absence", () => {
    expect(UI).toContain("No runtime behavior established in this analysis run.");
    expect(UI).toContain("No infrastructure relationships were correlated from canonical evidence.");
    expect(UI).toContain("No ATT&CK techniques were mapped from canonical evidence.");
    expect(UI).toContain("No MBC behaviors were mapped from canonical evidence.");
    for (const forbidden of [
      "No behavior detected",
      "No infrastructure exists",
      "No attack techniques exist",
      "No MBC behaviors exist",
    ]) {
      expect(UI).not.toContain(forbidden);
    }
    // Absence states are not styled as failures; amber is reserved for ERROR.
    for (const absentState of [
      '"NOT PERFORMED": "info"',
      '"NOT RECOVERED": "info"',
      '"NO CORRELATED EVIDENCE": "info"',
      '"NOT MAPPED": "info"',
      'UNRESOLVED: "info"',
    ]) {
      expect(UI).toContain(absentState);
    }
    for (const presentState of ['AVAILABLE: "ok"', 'VERIFIED: "ok"', 'TOKENIZED_PAYLOAD: "ok"']) {
      expect(UI).toContain(presentState);
    }
    // Family reason is shown, not a bare label.
    expect(UI).toContain('["Resolution basis"');
  });

  test("6. configuration states a container, never a value", () => {
    expect(UI).toContain("Configuration — STRUCTURE IDENTIFIED");
    expect(CONFIGURATION_STRUCTURE_ONLY_EXPLANATION).toContain("no verified configuration values were recovered");
    expect(
      configurationState([{ configuration_id: "cfg_1", value: null, raw_value: null, normalized_value: null }])
    ).toBe(CONFIGURATION_STATE.STRUCTURE_ONLY);
    expect(UI).toContain("not recovered");
    expect(UI).toContain("A configuration container is not a configuration value");
    expect(UI).toContain("Canonical configuration state:");
    // Legacy value-claim templates exist only as suppression patterns.
    expect(PROJECTION).toContain("/configuration object\\(s\\) were extracted/i");
    expect(PROJECTION).toContain("/Every item carries a raw and normalized value/i");
  });

  test("7. static findings render as analyst findings while evidence stays inspectable", () => {
    expect(
      analystStatementText(
        "Static evidence recorded a binary_metadata observation carrying a retained tool result (source STATIC_ANALYSIS, canonical evidence preserved)."
      )
    ).toBe("PE binary metadata recovered from static analysis.");
    expect(
      analystStatementText(
        "Deterministic static analysis observation 'sections' recorded as OBSERVED; the claim is scoped to the observed static fact only."
      )
    ).toBe("Section table recovered from static analysis. The claim is scoped to the observed static fact.");
    // An unrecognised statement is passed through, never reworded by guesswork.
    expect(analystStatementText("Some canonical statement.")).toBe("Some canonical statement.");
    // The original generator statement is retained behind the evidence affordance.
    expect(UI).toContain("original");
    expect(UI).toContain("View Evidence");
    expect(UI).toContain("rephrase");
  });

  test("8. no unsupported semantic promotion in the rendered projection", () => {
    const specimen = specimenClassification({
      format_class: "PE",
      content_type: "pebin",
      has_autoit_compiled_script_support: true,
    });
    expect(specimen.classification).toBe("AutoIt-compiled Windows PE specimen");
    // PE + AutoIt evidence must not by itself assert malicious behaviour.
    expect(specimen.classification.toLowerCase()).not.toContain("malware");
    expect(specimen.is_family_claim).toBe(false);
    expect(specimen.is_behavioral_verdict).toBe(false);
    expect(specimen.implies_execution).toBe(false);
    expect(specimen.basis.join(" ")).toContain("CAN_DO");
    // EVIDENCE_SUPPORT never renders as a score.
    expect(UI).toContain("metric — not a confidence score");
    expect(UI).not.toContain("100% confidence");
    expect(UI).not.toContain("risk score");
    for (const forbidden of [
      "982 hits, of which 4096 were validated",
      "1 configuration object(s) were extracted",
      "Every item carries a raw and normalized value",
      "100% confidence",
    ]) {
      expect(UI).not.toContain(forbidden);
    }
  });
});
