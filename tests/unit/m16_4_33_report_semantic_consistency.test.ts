/**
 * M16.4.33 — REPORT FORENSIC SEMANTIC CONSISTENCY GATE
 *
 * Two-direction proof that the customer-facing report's cross-cutting states are
 * derived from canonical evidence and never from the sample's format:
 *
 *   NEGATIVE CONTROL — the REAL non-AutoIt .NET specimen
 *     e4e5c3a6c15beff4e17117075e2c0bd65f176d81e6885134d2b4d97c20d4773a
 *     (report mir_3fcf025450073591) establishes NO AutoIt capability and NO
 *     verified decoded child, so no AutoIt or decoded-child claim may appear, and
 *     its configuration / infrastructure / inner-decoder states are derived from
 *     its own evidence (no configuration-bearing container; 8 static
 *     infrastructure candidates, 0 verified; inner decoder NOT_APPLICABLE).
 *
 *   POSITIVE CONTROL — the REAL AutoIt specimen 7b98cd38… using its existing
 *     saved evidence shape (capability AUTOIT_COMPILED_SCRIPT_SUPPORT, embedded
 *     COMPILED_AUTOIT_SCRIPT object, verified DETERMINISTIC_DECODE child). Its
 *     AutoIt and decoded-child evidence is PRESERVED — the report is never
 *     normalized to the negative specimen's wording.
 *
 * All 12 enumerated failure modes are exercised as DELIBERATE MUTATIONS that the
 * deterministic semantic lint must DETECT (it detects, never repairs).
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import {
  deriveReportSemanticStates,
  type ReportSemanticStates,
} from "../../packages/intelligence/src/malware/canonical/reportSemanticStates";
import { lintReportSemantics } from "../../packages/intelligence/src/malware/canonical/reportSemanticLint";

const FIXTURE_PATH = join(import.meta.dir, "..", "fixtures", "malware_report", "real_report_e4e5c3a6.json");
const PROVENANCE_PATH = join(import.meta.dir, "..", "fixtures", "malware_report", "PROVENANCE.json");

const FIXTURE_TEXT = readFileSync(FIXTURE_PATH, "utf8");
const load = (): Record<string, any> => JSON.parse(FIXTURE_TEXT) as Record<string, any>;
const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

const REAL_SHA = "e4e5c3a6c15beff4e17117075e2c0bd65f176d81e6885134d2b4d97c20d4773a";
const REAL_CAPA_STDOUT_SHA = "94b15f832b17a025c0e8eda319edcaa6f1c848414d099ededeeb8ea337942931";
const AUTOIT_SHA = "7b98cd3800dede6537cf78e7b61eeeda71d251dc97c70cb7c2135c6aa310ab7f";

const allStatements = (report: Record<string, any>): string[] =>
  ((report.executive_assessment?.statements ?? []) as { statement: string }[]).map((s) => s.statement);
const coverageStatement = (report: Record<string, any>): string =>
  allStatements(report).find((s) => /ANALYSIS COVERAGE — per-domain state:/i.test(s)) ?? "";
const notEstablishedStatement = (report: Record<string, any>): string =>
  allStatements(report).find((s) => /WHAT WAS NOT ESTABLISHED/i.test(s)) ?? "";
const evidenceSupportsStatement = (report: Record<string, any>): string =>
  allStatements(report).find((s) => /WHAT THE EVIDENCE SUPPORTS/i.test(s)) ?? "";

const clone = (report: Record<string, any>): Record<string, any> => structuredClone(report);

/* ───────────────────────── positive control (real AutoIt shape) ───────────────────────── */

/** The saved real AutoIt specimen's canonical evidence shape (tests/unit/p1_report_semantics). */
const AUTOIT_EVIDENCE = {
  capabilities: {
    count: 1,
    items: [
      {
        catalog_id: "AUTOIT_COMPILED_SCRIPT_SUPPORT",
        capability_name: "Compiled AutoIt script support",
        modality: "CAN_DO",
      },
    ],
  },
  embedded_objects: {
    count: 1,
    objects: [{ object_type: "COMPILED_AUTOIT_SCRIPT", signature: "compiled_autoit_script" }],
  },
  detection_artifacts: {
    derived_artifacts: [
      {
        artifact_id: "art_4561adf7d7fb25815973f362a12aeed5d3a83832048b9f6f198ec8558db374f3",
        origin: "DETERMINISTIC_DECODE:AUTOIT_EA06_SCRIPT",
        extractor_version: "AUTOIT_RIPPER_EA06_LAME_DEFLATE@1.2.0",
        extraction_method: "AUTOIT_RIPPER_EA06_LAME_DEFLATE",
        file_size_bytes: 1656795,
      },
    ],
  },
  decoded_structure: {
    status: "OBSERVED",
    artifact_id: "art_4561adf7d7fb25815973f362a12aeed5d3a83832048b9f6f198ec8558db374f3",
    observations: [{ subject: "representation", representation: "TOKENIZED_PAYLOAD" }],
  },
  configuration: { items: [], assessment: { outcome: "NO_RESULT", containers_considered: [] } },
  infrastructure: { items: [] },
};

/**
 * Build a positive-control report from the AutoIt evidence. The declared
 * `semantic_states` is always the DERIVED state, so only the wording under test
 * is ever mutated — never the declared state.
 */
function autoitReport(overrides: Record<string, unknown> = {}): Record<string, any> {
  const payload: Record<string, any> = { ...structuredClone(AUTOIT_EVIDENCE), ...overrides };
  if (!payload.executive_assessment) {
    payload.executive_assessment = {
      statements: [
        {
          statement:
            "ANALYSIS COVERAGE — per-domain state: static structure = VERIFIED; " +
            "compiled-script capability = VERIFIED (modality CAN_DO only); " +
            "inner decoder = UNAVAILABLE; dynamic behavior = NOT PERFORMED; " +
            "configuration values = NO EVIDENCE (no configuration-bearing container within the supported scope); " +
            "infrastructure = NO EVIDENCE.",
          grounds: [],
        },
      ],
    };
  }
  payload.semantic_states = deriveReportSemanticStates(payload);
  return payload;
}

/* ══════════════════════ 1. NEGATIVE CONTROL — the real .NET specimen ══════════════════════ */

describe("M16.4.33 / real .NET specimen — negative control", () => {
  it("1. derives AutoIt = NOT ESTABLISHED and decoded child = NO VERIFIED CHILD from evidence", () => {
    const report = load();
    const states = deriveReportSemanticStates(report);

    expect(states.autoit.state).toBe("NOT_ESTABLISHED");
    expect(states.autoit.basis).toEqual([]);
    expect(states.decoded_child.state).toBe("NO_VERIFIED_CHILD");
    expect(states.decoded_child.artifact_id).toBeNull();

    // The evidence itself agrees: no compiled-script capability, no derived child.
    expect(report.detection_artifacts.derived_artifacts).toEqual([]);
    expect(report.decoded_structure.status).toBe("NOT_APPLICABLE");
    expect(report.decoded_structure.artifact_id).toBeNull();
    expect((report.capabilities?.items ?? []).some((c: any) => /autoit/i.test(String(c.catalog_id)))).toBe(false);
  });

  it("2. derives configuration / infrastructure / inner-decoder states from evidence, not hard-coded", () => {
    const report = load();
    const states = deriveReportSemanticStates(report);

    // Configuration: two containers were considered, none configuration-bearing,
    // and no value was recovered — so there is NO CONTAINER in the supported scope.
    expect(states.configuration.state).toBe("NO_CONTAINER");
    expect(states.configuration.container_count).toBe(2);
    expect(states.configuration.configuration_bearing_container_count).toBe(0);
    expect(states.configuration.verified_value_count).toBe(0);
    expect(
      (report.configuration.assessment.containers_considered as any[]).every(
        (c) => c.configuration_bearing === false,
      ),
    ).toBe(true);

    // Infrastructure: 8 static candidates, none verified — never "empty", never
    // promoted to a verified relationship.
    expect(states.infrastructure.state).toBe("STATIC_CANDIDATES");
    expect(states.infrastructure.count).toBe(8);
    expect(states.infrastructure.count).toBe(report.infrastructure.items.length);
    expect(states.infrastructure.verified_count).toBe(0);
    expect(states.infrastructure.candidate_count).toBe(8);

    // Inner decoder: no verified child ⇒ NOT_APPLICABLE (which is NOT UNAVAILABLE).
    expect(states.inner_decoder.state).toBe("NOT_APPLICABLE");
  });

  it("3. no statement carries an AutoIt claim or an unsupported decoded-child claim", () => {
    const report = load();
    const statements = allStatements(report);

    // The negative specimen names AutoIt nowhere, and never claims a decoded
    // child; only the explicit negation is allowed.
    expect(statements.join("\n")).not.toMatch(/autoit/i);
    const decodedChildStatements = statements.filter((s) => /decoded child artifact/i.test(s));
    for (const statement of decodedChildStatements) {
      expect(statement).toMatch(/no verified decoded child/i);
    }
    // The coverage sentence names the derived state, not a hard-coded one.
    expect(coverageStatement(report)).toContain("compiled-script capability = NOT ESTABLISHED");
    expect(coverageStatement(report)).toContain("inner decoder = NOT_APPLICABLE");
    expect(coverageStatement(report)).toContain(
      "configuration values = NO EVIDENCE (no configuration-bearing container within the supported scope)",
    );
    expect(coverageStatement(report)).toContain(
      "infrastructure = STATIC CANDIDATES (8 record(s), not verified relationships)",
    );
  });

  it("4. no synthetic decoded-child lineage is claimed in WHAT THE EVIDENCE SUPPORTS", () => {
    const report = load();
    const supports = evidenceSupportsStatement(report);
    expect(supports).toContain("no verified decoded child artifact exists for this run");
    expect(supports).not.toContain("deterministic extraction lineage of the decoded child artifact");
  });

  it("5. the full deterministic semantic lint passes on the real report", () => {
    const report = load();
    expect(lintReportSemantics(report)).toEqual([]);
    expect(lintReportSemantics(report)).toEqual(lintReportSemantics(report));
  });
});

/* ══════════════════════ 2. POSITIVE CONTROL — the real AutoIt specimen ══════════════════════ */

describe("M16.4.33 / real AutoIt specimen — positive control", () => {
  it("6. genuine AutoIt evidence establishes the capability and is preserved", () => {
    const report = autoitReport();
    const states = deriveReportSemanticStates(report);

    expect(states.autoit.state).toBe("SUPPORTED");
    expect(states.autoit.basis).toContain("capability:AUTOIT_COMPILED_SCRIPT_SUPPORT");
    expect(states.autoit.basis).toContain("embedded_object:COMPILED_AUTOIT_SCRIPT");

    // The positive fixture is NOT normalized to the negative specimen's wording.
    expect(coverageStatement(report)).toContain("compiled-script capability = VERIFIED");
    expect(lintReportSemantics(report).some((v) => v.startsWith("semantics:autoit_claim_without_evidence"))).toBe(false);
  });

  it("7. a verified child keeps decoded-child presentation and a UNAVAILABLE inner decoder", () => {
    const report = autoitReport({
      executive_assessment: {
        statements: [
          { statement: "A verified decoded child artifact was recovered for this run from the deterministic decoder.", grounds: [] },
          { statement: "ANALYSIS COVERAGE — per-domain state: compiled-script capability = VERIFIED (modality CAN_DO only); inner decoder = UNAVAILABLE; configuration values = NO EVIDENCE (no configuration-bearing container within the supported scope); infrastructure = NO EVIDENCE.", grounds: [] },
        ],
      },
    });
    const states = deriveReportSemanticStates(report);

    expect(states.decoded_child.state).toBe("VERIFIED_CHILD_PRESENT");
    expect(states.decoded_child.artifact_id).toBe(AUTOIT_EVIDENCE.decoded_structure.artifact_id);
    // A verified child whose representation is TOKENIZED_PAYLOAD has no verified
    // inner decoder — UNAVAILABLE, not NOT_APPLICABLE.
    expect(states.inner_decoder.state).toBe("UNAVAILABLE");

    const violations = lintReportSemantics(report);
    expect(violations.some((v) => v.startsWith("semantics:decoded_child_claim_without_child"))).toBe(false);
    expect(violations.some((v) => v.startsWith("semantics:inner_decoder_state_mismatch"))).toBe(false);
  });

  it("8. the two specimens are NOT normalized to the same wording", () => {
    const negative = deriveReportSemanticStates(load());
    const positive = deriveReportSemanticStates(autoitReport());
    expect(negative.autoit.state).toBe("NOT_ESTABLISHED");
    expect(positive.autoit.state).toBe("SUPPORTED");
    expect(negative.decoded_child.state).toBe("NO_VERIFIED_CHILD");
    expect(positive.decoded_child.state).toBe("VERIFIED_CHILD_PRESENT");
    expect(negative.inner_decoder.state).toBe("NOT_APPLICABLE");
    expect(positive.inner_decoder.state).toBe("UNAVAILABLE");
  });
});

/* ══════════════════════ 3. MUTATION TESTS — the lint detects every failure mode ══════════════════════ */

describe("M16.4.33 / semantic lint detects deliberate mutations", () => {
  it("9. AutoIt claim injected into the non-AutoIt report is detected", () => {
    const doc = clone(load());
    const statement = coverageStatement(doc);
    doc.executive_assessment.statements = doc.executive_assessment.statements.map((s: any) =>
      s.statement === statement
        ? { ...s, statement: statement.replace(/compiled-script capability = NOT ESTABLISHED[^;]*/, "compiled-script capability = VERIFIED (modality CAN_DO only)") }
        : s,
    );
    expect(lintReportSemantics(doc).some((v) => v.startsWith("semantics:autoit_claim_without_evidence"))).toBe(true);
  });

  it("10. unsupported decoded-child claim is detected", () => {
    const doc = clone(load());
    const supports = evidenceSupportsStatement(doc);
    doc.executive_assessment.statements = doc.executive_assessment.statements.map((s: any) =>
      s.statement === supports
        ? { ...s, statement: supports.replace(/no verified decoded child artifact exists for this run[^.]*\./, "and the deterministic extraction lineage of the decoded child artifact.") }
        : s,
    );
    expect(lintReportSemantics(doc).some((v) => v.startsWith("semantics:decoded_child_claim_without_child"))).toBe(true);
  });

  it("11. configuration presence/absence contradiction is detected", () => {
    const doc = clone(load());
    const statement = coverageStatement(doc);
    doc.executive_assessment.statements = doc.executive_assessment.statements.map((s: any) =>
      s.statement === statement
        ? { ...s, statement: statement.replace(/configuration values = [^;]+/, "configuration values = NO EVIDENCE (container structure only, state STRUCTURE_IDENTIFIED)") }
        : s,
    );
    expect(lintReportSemantics(doc).some((v) => v.startsWith("semantics:configuration_state_contradiction"))).toBe(true);
  });

  it("12. a verified-configuration claim without verified values is detected", () => {
    const doc = clone(load());
    const statement = coverageStatement(doc);
    doc.executive_assessment.statements = doc.executive_assessment.statements.map((s: any) =>
      s.statement === statement
        ? { ...s, statement: statement.replace(/configuration values = [^;]+/, "configuration values = VERIFIED") }
        : s,
    );
    const violations = lintReportSemantics(doc);
    expect(violations.some((v) => v.startsWith("semantics:configuration_value_claim_without_values"))).toBe(true);
    expect(violations.some((v) => v.startsWith("semantics:coverage_summary_state_mismatch:configuration"))).toBe(true);
  });

  it("13. infrastructure-empty statement with canonical records is detected", () => {
    const doc = clone(load());
    doc.executive_assessment.statements = doc.executive_assessment.statements.map((s: any) =>
      /WHY THESE DOMAINS/.test(s.statement)
        ? { ...s, statement: "The runtime-behavior, infrastructure and ATT&CK/MBC domains are empty because their inputs are absent." }
        : s,
    );
    expect(lintReportSemantics(doc).some((v) => v.startsWith("semantics:infrastructure_empty_claim_with_records"))).toBe(true);
  });

  it("14. a static infrastructure candidate promoted to a verified relationship is detected", () => {
    const doc = clone(load());
    const statement = coverageStatement(doc);
    doc.executive_assessment.statements = doc.executive_assessment.statements.map((s: any) =>
      s.statement === statement ? { ...s, statement: statement.replace(/infrastructure = [^;]+/, "infrastructure = VERIFIED") } : s,
    );
    const violations = lintReportSemantics(doc);
    expect(violations.some((v) => v.startsWith("semantics:infrastructure_candidate_promoted_to_relationship"))).toBe(true);
    expect(violations.some((v) => v.startsWith("semantics:coverage_summary_state_mismatch:infrastructure"))).toBe(true);
  });

  it("15. an inner-decoder state contradiction is detected", () => {
    const doc = clone(load());
    const statement = coverageStatement(doc);
    doc.executive_assessment.statements = doc.executive_assessment.statements.map((s: any) =>
      s.statement === statement ? { ...s, statement: statement.replace(/inner decoder = [A-Z_]+/, "inner decoder = UNAVAILABLE") } : s,
    );
    expect(lintReportSemantics(doc).some((v) => v.startsWith("semantics:inner_decoder_state_mismatch"))).toBe(true);
  });

  it("15b. decoder AVAILABLE mutated to NOT_APPLICABLE while evidence says AVAILABLE is detected", () => {
    // A genuinely AVAILABLE inner decoder (verified child, non-tokenized representation).
    const doc = autoitReport({
      decoded_structure: {
        status: "OBSERVED",
        artifact_id: AUTOIT_EVIDENCE.decoded_structure.artifact_id,
        inner_decoder_state: "AVAILABLE",
        observations: [{ subject: "representation", representation: "SOURCE_TEXT" }],
      },
      executive_assessment: {
        statements: [
          { statement: "ANALYSIS COVERAGE — per-domain state: compiled-script capability = VERIFIED (modality CAN_DO only); inner decoder = NOT_APPLICABLE; configuration values = NO EVIDENCE (no configuration-bearing container within the supported scope); infrastructure = NO EVIDENCE.", grounds: [] },
        ],
      },
    });
    expect(deriveReportSemanticStates(doc).inner_decoder.state).toBe("AVAILABLE");
    expect(lintReportSemantics(doc).some((v) => v.startsWith("semantics:inner_decoder_state_mismatch"))).toBe(true);
  });

  it("16. missing execution provenance is detected where a canonical execution record exists", () => {
    const doc = clone(load());
    const capa = doc.tool_results.find((t: any) => t.tool_id === "capa");
    delete capa.provenance.execution_exit_status;
    expect(lintReportSemantics(doc).some((v) => v.startsWith("semantics:execution_provenance_missing:capa"))).toBe(true);
  });

  it("17. a summary count mismatch is detected (infrastructure + observation)", () => {
    const infraDoc = clone(load());
    const notEstablished = notEstablishedStatement(infraDoc);
    infraDoc.executive_assessment.statements = infraDoc.executive_assessment.statements.map((s: any) =>
      s.statement === notEstablished
        ? { ...s, statement: notEstablished.replace(/correlated infrastructure:\s*\d+/, "correlated infrastructure: 9") }
        : s,
    );
    expect(lintReportSemantics(infraDoc).some((v) => v.startsWith("semantics:summary_infrastructure_count_mismatch"))).toBe(true);

    const observedDoc = clone(load());
    const recovered = observedDoc.executive_assessment.statements.find((s: any) => /WHAT WAS RECOVERED/.test(s.statement));
    observedDoc.executive_assessment.statements = observedDoc.executive_assessment.statements.map((s: any) =>
      s.statement === recovered.statement
        ? { ...s, statement: recovered.statement.replace(/14 canonical tool observation\(s\)/, "15 canonical tool observation(s)") }
        : s,
    );
    expect(lintReportSemantics(observedDoc).some((v) => v.startsWith("semantics:summary_observation_count_mismatch"))).toBe(true);
  });

  it("18. a declared semantic state that drifts from its evidence is detected", () => {
    // INFRASTRUCTURE_RECORD_COUNT → 0 while records remain.
    const infraZeroed = clone(load());
    infraZeroed.semantic_states.infrastructure.count = 0;
    expect(lintReportSemantics(infraZeroed).some((v) => v.startsWith("semantics:semantic_states_mismatch"))).toBe(true);

    // CANONICAL_CONTAINER_PRESENT → false while a configuration-bearing container
    // remains in the evidence.
    const containerPresent = clone(load());
    containerPresent.configuration.assessment.containers_considered = [
      { object_type: "COMPILED_AUTOIT_SCRIPT", configuration_bearing: true, reason: "configuration-bearing container" },
    ];
    containerPresent.configuration.assessment.outcome = "STRUCTURE_IDENTIFIED";
    const declaredFalse = deriveReportSemanticStates(containerPresent);
    expect(declaredFalse.configuration.state).toBe("STRUCTURE_IDENTIFIED");
    containerPresent.semantic_states = { ...declaredFalse, configuration: { ...declaredFalse.configuration, state: "NO_CONTAINER" } };
    expect(lintReportSemantics(containerPresent).some((v) => v.startsWith("semantics:semantic_states_mismatch"))).toBe(true);

    // Inner decoder AVAILABLE → NOT_APPLICABLE declared while evidence is AVAILABLE.
    const decoderDrift = autoitReport({
      decoded_structure: {
        status: "OBSERVED",
        artifact_id: AUTOIT_EVIDENCE.decoded_structure.artifact_id,
        inner_decoder_state: "AVAILABLE",
        observations: [{ subject: "representation", representation: "SOURCE_TEXT" }],
      },
    });
    decoderDrift.semantic_states.inner_decoder.state = "NOT_APPLICABLE";
    expect(lintReportSemantics(decoderDrift).some((v) => v.startsWith("semantics:semantic_states_mismatch"))).toBe(true);
  });

  it("19. the unmutated real report stays clean through every mutation scenario", () => {
    expect(lintReportSemantics(load())).toEqual([]);
  });
});

/* ══════════════════════ 4. EXECUTION PROVENANCE (Phase 7) ══════════════════════ */

describe("M16.4.33 / execution provenance and summary consistency", () => {
  it("20. CAPA provenance is complete and matches the canonical execution record", () => {
    const report = load();
    const capa = report.tool_results.find((t: any) => t.tool_id === "capa");
    const provenance = capa.provenance;

    expect(provenance.input_sha256).toBe(REAL_SHA);
    expect(provenance.runner_identity).toBe("gh-runner-36716096667");
    expect(provenance.ruleset_version).toBe("9.4.0");
    expect(provenance.execution_exit_status).toBe(0);
    expect(provenance.execution_duration_seconds).toBeCloseTo(10.137, 3);
    expect(provenance.execution_stdout_bytes).toBe(66297);
    expect(provenance.execution_stdout_sha256).toBe(REAL_CAPA_STDOUT_SHA);
    expect(provenance.execution_stderr_bytes).toBe(0);
    expect(provenance.execution_count).toBe(1);

    // Missing execution metadata stays absent ("—"), never coerced to 0/clean.
    const lief = report.tool_results.find((t: any) => t.tool_id === "lief");
    expect(lief.provenance.execution_exit_status ?? null).toBeNull();
    expect(lief.provenance.execution_stdout_sha256 ?? null).toBeNull();
    // OBSERVED / NO_RESULT stay distinct.
    expect(report.tool_results.map((t: any) => `${t.tool_id}:${t.status}`).sort()).toEqual([
      "capa:OBSERVED", "die:OBSERVED", "floss:OBSERVED", "lief:OBSERVED",
      "magika:OBSERVED", "yara-x:NO_RESULT",
    ]);
  });

  it("21. the declared semantic_states equal the states DERIVED from the same evidence", () => {
    const report = load();
    const derived: ReportSemanticStates = deriveReportSemanticStates(report);
    expect(report.semantic_states).toEqual(derived);
    // And the summary counts agree with the detail sections they describe.
    expect(report.static_findings.observation_count).toBe(14);
    expect(report.static_findings.claim_count).toBe(12);
    const recovered = allStatements(report).find((s) => /WHAT WAS RECOVERED/.test(s)) ?? "";
    expect(recovered).toContain(`${report.static_findings.observation_count} canonical tool observation(s)`);
    expect(recovered).toContain(`${report.static_findings.claim_count} canonical claim(s)`);
    expect(notEstablishedStatement(report)).toContain(`correlated infrastructure: ${derived.infrastructure.count}`);
  });

  it("22. the committed fixture is the deterministic generator output and unchanged evidence", () => {
    const provenance = JSON.parse(readFileSync(PROVENANCE_PATH, "utf8")) as Record<string, any>;
    const report = load();

    expect(sha256(FIXTURE_TEXT)).toBe(provenance.fixture_sha256);
    expect(Buffer.byteLength(FIXTURE_TEXT, "utf8")).toBe(provenance.fixture_bytes);
    expect(JSON.stringify(report, null, 1)).toBe(FIXTURE_TEXT);

    // Identity / run binding / autoit positive-control provenance retained.
    expect(report.report_id).toBe("mir_3fcf025450073591");
    expect(report.sha256).toBe(REAL_SHA);
    expect(provenance.autoit_positive_control.specimen_sha256).toBe(AUTOIT_SHA);
    expect(provenance.autoit_positive_control.specimen_sha256.startsWith("7b98cd38")).toBe(true);
  });
});
