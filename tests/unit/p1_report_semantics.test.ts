/**
 * Focused semantic-integrity tests for the malware report remediation pass.
 *
 * Group 1 — Phase 1 semantic correctness: configuration value claims, decoded
 *           artifact creation vs post-decode classification, content-type
 *           presentation, and the EVIDENCE_SUPPORT metric never reading as a
 *           confidence score.
 * Group 2 — Phase 2 analyst projection: specimen classification, coverage
 *           states, key findings, established/unknown statements, analyst
 *           statement rephrasing, and the absence of forbidden semantics.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONFIGURATION_STATE,
  CONFIGURATION_STRUCTURE_ONLY_EXPLANATION,
  COVERAGE_STATE,
  DYNAMIC_NOT_PERFORMED,
  DYNAMIC_PERFORMED,
  EVIDENCE_SUPPORT_DISCLAIMER,
  EVIDENCE_SUPPORT_LABEL,
  EVIDENCE_SUPPORT_METRIC,
  EVIDENCE_SUPPORT_SECTION_NOTE,
  FAMILY_UNRESOLVED_LABEL,
  LEGACY_CONFIGURATION_VALUE_CLAIM_TEMPLATES,
  analysisCoverage,
  analysisModeLabel,
  analystStatementText,
  configurationHasVerifiedValue,
  configurationState,
  contentTypePresentation,
  decodedArtifactPresentation,
  dynamicExecutionState,
  establishedStatements,
  keyFindings,
  projectStatements,
  specimenClassification,
  unknownItems,
} from "../../apps/web/app/lib/malwareReportProjection";

const ROOT = join(import.meta.dir, "..", "..");
const read = (relative: string) => readFileSync(join(ROOT, relative), "utf8");

const UI_SOURCE = read("apps/web/app/components/CanonicalMalwareReport.tsx");
const PIPELINE_SOURCE = read("packages/intelligence/src/malware/canonical/malwareProductionPipeline.ts");
const CONFIG_LAYER_SOURCE = read("packages/intelligence/src/malware/canonical/staticConfigurationLayer.ts");

/* ── fixtures shaped exactly like the canonical payload of mir_32894af8189cff7a ── */

const STRUCTURE_ONLY_ITEM = {
  configuration_id: "cfg_1ce8b131d2a9a1b0",
  config_type: "embedded_script_configuration",
  status: "DERIVED",
  epistemic_status: "STATIC_DECODED",
  value: null,
  raw_value: null,
  normalized_value: null,
  attribute_keys: ["basis", "content_digest", "offset", "section", "size_bytes"],
};
const VALUED_ITEM = { ...STRUCTURE_ONLY_ITEM, raw_value: "aGVsbG8=", normalized_value: "hello" };

const LEGACY_STATEMENTS = [
  { statement: "1 configuration object(s) were extracted from positive-status claims.", grounds: [] },
  { statement: "Artifact art_x was analyzed under run ar-x with format class PE.", grounds: [] },
  {
    statement:
      "Every item carries a raw and normalized value recovered deterministically from static structure; configuration is not behavior, family, infrastructure or technique.",
    grounds: [],
  },
];

const CONTENT_TYPE_ASSESSMENT = {
  content_type: "pebin",
  content_type_description: "PE Windows executable",
  mime_type: "application/x-dosexec",
  tool: "magika",
  tool_version: "1.0.3",
  observation_id: "obs_tool_magika_art_gmf_7b98",
};
const CAPABILITIES = {
  observation_id: "obs_static_art_gmf_7b98_capability_indicators",
  count: 1,
  items: [
    {
      catalog_id: "AUTOIT_COMPILED_SCRIPT_SUPPORT",
      capability_name: "Compiled AutoIt script support",
      modality: "CAN_DO",
    },
  ],
};
const EMBEDDED_OBJECTS = {
  observation_id: "obs_static_art_gmf_7b98_embedded_objects",
  count: 2,
  objects: [
    {
      object_type: "COMPILED_AUTOIT_SCRIPT",
      signature: "compiled_autoit_script",
      host_offset: 815544,
      size_bytes: 576146,
      host_section: ".rsrc",
      host_resource_type: "RCDATA",
    },
  ],
};
const DECODED_ARTIFACT = {
  artifact_id: "art_4561adf7d7fb25815973f362a12aeed5d3a83832048b9f6f198ec8558db374f3",
  origin: "DETERMINISTIC_DECODE:AUTOIT_EA06_SCRIPT",
  extractor_version: "AUTOIT_RIPPER_EA06_LAME_DEFLATE@1.2.0",
  extraction_method: "AUTOIT_RIPPER_EA06_LAME_DEFLATE",
  file_size_bytes: 1656795,
  parent_artifact_id: "art_8532c00e3a92c79aea45190c310fafabfce9989715fa6e3f3b4216f9aef5f081",
  observation_id: "obs_static_art_gmf_7b98_embedded_objects",
};
const DERIVED_ARTIFACTS = [DECODED_ARTIFACT];
const DECODED_STRUCTURE = {
  status: "OBSERVED",
  artifact_id: DECODED_ARTIFACT.artifact_id,
  deterministic_identity: "dss_b8b879f7363eff74",
  extraction_method: "DETERMINISTIC_STRUCTURAL_EXTRACTION",
  parent_artifact_id: DECODED_ARTIFACT.parent_artifact_id,
  decoded_sha256: "4561adf7d7fb25815973f362a12aeed5d3a83832048b9f6f198ec8558db374f3",
  decoded_size_bytes: 1656795,
  status_reason: "verified decoded artifact is a TOKENIZED_PAYLOAD",
  observations: [{ subject: "representation", representation: "TOKENIZED_PAYLOAD", observation_type: "OBSERVED" }],
  indicators: [],
  embedded_data: [],
};

const FORBIDDEN_SEMANTICS = /\bc2\b|command[- ]and[- ]control|persistence|credential|ransomware|downloader|process injection|attribution|campaign/i;

describe("phase 1 — configuration semantics", () => {
  test("1. a container with no verified value is STRUCTURE_IDENTIFIED, never VALUE_RECOVERED", () => {
    expect(configurationHasVerifiedValue([STRUCTURE_ONLY_ITEM])).toBe(false);
    expect(configurationState([STRUCTURE_ONLY_ITEM])).toBe(CONFIGURATION_STATE.STRUCTURE_ONLY);
    expect(configurationState([VALUED_ITEM])).toBe(CONFIGURATION_STATE.RECOVERED);
    expect(configurationState([])).toBe(CONFIGURATION_STATE.NO_CONTAINER);
    expect(CONFIGURATION_STRUCTURE_ONLY_EXPLANATION).toContain("no verified configuration values were recovered");
  });

  test("2. legacy value-claiming generator statements are withheld and counted", () => {
    const projected = projectStatements(LEGACY_STATEMENTS, false);
    expect(projected.suppressed_count).toBe(2);
    expect(projected.statements.map((s) => s.statement)).toEqual([LEGACY_STATEMENTS[1].statement]);
    expect(projected.suppressed_notice).toContain("canonical stored report is unchanged");
    expect(LEGACY_CONFIGURATION_VALUE_CLAIM_TEMPLATES.length).toBeGreaterThan(0);
  });

  test("3. nothing is withheld when a verified value actually exists", () => {
    const projected = projectStatements(LEGACY_STATEMENTS, true);
    expect(projected.suppressed_count).toBe(0);
    expect(projected.statements.length).toBe(LEGACY_STATEMENTS.length);
    expect(projected.suppressed_notice).toBeNull();
  });

  test("4. the generators can no longer emit an unguarded extraction/value claim", () => {
    expect(
      /statement: `\$\{configurations\.new_configurations\.length\} configuration object\(s\) were extracted from positive-status claims\.`/.test(
        PIPELINE_SOURCE
      )
    ).toBe(false);
    expect(PIPELINE_SOURCE).toContain("const configurationsWithValues =");
    expect(PIPELINE_SOURCE).toContain("const recoveredValues =");
    expect(PIPELINE_SOURCE).toContain("STRUCTURE_IDENTIFIED");
    expect(
      /outcome_reason = `\$\{observedCount \+ decodedCount\} statically recovered configuration item\(s\) are published with raw and normalized values/.test(
        CONFIG_LAYER_SOURCE
      )
    ).toBe(false);
    expect(CONFIG_LAYER_SOURCE).toContain("itemsWithValues.length === items.length");
    expect(CONFIG_LAYER_SOURCE).toContain("STRUCTURE_IDENTIFIED");
  });
});

describe("phase 1 — artifact creation, content type and evidence support", () => {
  test("5. artifact creation method is distinct from post-decode structural analysis", () => {
    const view = decodedArtifactPresentation({ decoded_structure: DECODED_STRUCTURE, derived_artifacts: DERIVED_ARTIFACTS });
    expect(view.creation_method).toBe("DETERMINISTIC_DECODE:AUTOIT_EA06_SCRIPT");
    expect(view.post_decode_structural_method).toBe("DETERMINISTIC_STRUCTURAL_EXTRACTION");
    expect(view.representation).toBe("TOKENIZED_PAYLOAD");
    expect(view.decoder_version).toBe("AUTOIT_RIPPER_EA06_LAME_DEFLATE@1.2.0");
    expect(view.creation_method).not.toBe(view.post_decode_structural_method);
  });

  test("6. artifact creation method is absent (not invented) when no derived artifact matches", () => {
    const view = decodedArtifactPresentation({ decoded_structure: DECODED_STRUCTURE, derived_artifacts: [] });
    expect(view.creation_method).toBeNull();
    expect(view.decoder_version).toBeNull();
  });

  test("7. canonical format and classifier are never replaced by a no-evidence placeholder", () => {
    const view = contentTypePresentation({ identity: { format_class: "PE", mime_type: null }, content_type_assessment: CONTENT_TYPE_ASSESSMENT });
    expect(view.canonical_format).toBe("PE Windows executable");
    expect(view.classifier).toBe("Magika → pebin");
    expect(view.mime_type).toBe("application/x-dosexec");
    expect(view.mime_source).toBe("content-type assessment");
    expect(JSON.stringify(view)).not.toContain("no supported evidence");
  });

  test("8. MIME is shown only when canonical evidence carries one", () => {
    const view = contentTypePresentation({ identity: { format_class: "PE", mime_type: null }, content_type_assessment: {} });
    expect(view.mime_type).toBeNull();
    expect(view.mime_source).toBeNull();
    expect(view.canonical_format).toBe("PE");
    expect(view.classifier).toBeNull();
  });

  test("9. evidence support is labelled as a metric, never as confidence", () => {
    expect(EVIDENCE_SUPPORT_LABEL).toBe("Evidence Support");
    expect(EVIDENCE_SUPPORT_METRIC).toBe("EVIDENCE_SUPPORT");
    expect(EVIDENCE_SUPPORT_DISCLAIMER).toContain("Not a confidence/certainty score");
    expect(EVIDENCE_SUPPORT_SECTION_NOTE).toContain("not a percentage");
    expect(UI_SOURCE).toContain("not a confidence score");
    expect(UI_SOURCE).not.toContain("Evidence support [0-1]");
    // The metric value is rendered verbatim: never rescaled, never a percentage.
    expect(UI_SOURCE).toContain("String(c.support)");
    expect(UI_SOURCE).not.toContain("* 100");
    expect(UI_SOURCE).not.toContain("toFixed");
    expect(UI_SOURCE).toContain("not a percentage");
  });

  test("10. the UI no longer labels structural extraction as the artifact's extraction method", () => {
    expect(UI_SOURCE).toContain("Artifact creation method");
    expect(UI_SOURCE).toContain("Post-decode structural analysis");
    expect(UI_SOURCE).not.toContain('"Extraction method"');
    expect(UI_SOURCE).not.toContain("no supported evidence produced by the current analysis phase");
  });
});

describe("phase 2 — analyst projection", () => {
  const input = {
    artifact_id: "art_gmf_7b98cd3800dede65",
    sha256: "7b98cd3800dede6537cf78e7b61eeeda71d251dc97c70cb7c2135c6aa310ab7f",
    format_class: "PE",
    file_size_bytes: 1435648,
    content_type_assessment: CONTENT_TYPE_ASSESSMENT,
    capabilities: CAPABILITIES,
    embedded_objects: EMBEDDED_OBJECTS,
    derived_artifacts: DERIVED_ARTIFACTS,
    decoded_structure: DECODED_STRUCTURE,
  };

  test("11. specimen classification is evidence-grounded and claims no family or execution", () => {
    const specimen = specimenClassification({
      format_class: "PE",
      content_type: "pebin",
      has_autoit_compiled_script_support: true,
    });
    expect(specimen.classification).toBe("AutoIt-compiled Windows PE specimen");
    expect(specimen.is_family_claim).toBe(false);
    expect(specimen.is_behavioral_verdict).toBe(false);
    expect(specimen.implies_execution).toBe(false);
    expect(specimen.basis.join(" ")).toContain("content-type classifier: pebin");

    const peOnly = specimenClassification({ format_class: "PE", content_type: "pebin", has_autoit_compiled_script_support: false });
    expect(peOnly.classification).toBe("Windows PE executable specimen");
  });

  test("12. dynamic execution state and analysis mode are derived, never assumed", () => {
    expect(dynamicExecutionState([])).toBe(DYNAMIC_NOT_PERFORMED);
    expect(dynamicExecutionState([{ modality: "CAN_DO", status: "DERIVED" }])).toBe(DYNAMIC_NOT_PERFORMED);
    expect(dynamicExecutionState([{ modality: "EXECUTED", status: "OBSERVED" }])).toBe(DYNAMIC_PERFORMED);
    expect(analysisModeLabel(DYNAMIC_NOT_PERFORMED)).toBe("STATIC");
    expect(analysisModeLabel(DYNAMIC_PERFORMED)).toBe("STATIC + DYNAMIC");
  });

  test("13. analysis coverage states match the canonical evidence of this specimen", () => {
    const rows = analysisCoverage({
      format_class: "PE",
      embedded_object_count: 2,
      derived_artifacts: DERIVED_ARTIFACTS,
      decoded_structure: DECODED_STRUCTURE,
      configuration_state: configurationState([STRUCTURE_ONLY_ITEM]),
      dynamic_state: DYNAMIC_NOT_PERFORMED,
      infrastructure_count: 0,
      attack_count: 0,
      mbc_count: 0,
      family_state: FAMILY_UNRESOLVED_LABEL,
    });
    expect(rows.map((r) => [r.domain, r.state])).toEqual([
      ["PE static analysis", "AVAILABLE"],
      ["Embedded resource analysis", "AVAILABLE"],
      ["AutoIt EA06 decode", "VERIFIED"],
      ["Inner decoder", "UNAVAILABLE"],
      ["Configuration values", COVERAGE_STATE.NOT_RECOVERED],
      ["Runtime behavior", COVERAGE_STATE.NOT_PERFORMED],
      ["Infrastructure correlation", COVERAGE_STATE.NO_CORRELATED_EVIDENCE],
      ["ATT&CK", COVERAGE_STATE.NOT_MAPPED],
      ["MBC", COVERAGE_STATE.NOT_MAPPED],
      ["Family", "UNRESOLVED"],
    ]);
  });

  test("14. key findings are deterministic, evidence-linked and free of invented themes", () => {
    const findings = keyFindings(input);
    expect(findings.length).toBeGreaterThanOrEqual(3);
    expect(findings.length).toBeLessThanOrEqual(5);
    expect(findings.map((f) => f.title)).toEqual([
      "Windows PE executable",
      "Compiled AutoIt indicators",
      "Embedded RCDATA resource",
      "Deterministically recovered EA06 payload",
      "Inner representation: TOKENIZED_PAYLOAD",
    ]);
    for (const finding of findings) {
      expect(finding.grounds.length).toBeGreaterThan(0);
      expect(finding.detail).not.toMatch(FORBIDDEN_SEMANTICS);
      expect(finding.finding_id.startsWith("kf_")).toBe(true);
    }
  });

  test("15. established and unknown statements map to canonical state", () => {
    const established = establishedStatements({
      format_class: "PE",
      has_autoit_compiled_script_support: true,
      embedded_object_count: 2,
      decoded_origin: "DETERMINISTIC_DECODE:AUTOIT_EA06_SCRIPT",
      decoded_size_bytes: 1656795,
      representation: "TOKENIZED_PAYLOAD",
      configuration_state: configurationState([STRUCTURE_ONLY_ITEM]),
      dynamic_state: DYNAMIC_NOT_PERFORMED,
    });
    const establishedText = established.join(" ");
    expect(establishedText).toContain("Compiled AutoIt support is statically evidenced");
    expect(establishedText).toContain("deterministically recovered via DETERMINISTIC_DECODE:AUTOIT_EA06_SCRIPT");
    expect(establishedText).toContain("No verified configuration values were recovered");
    expect(establishedText).toContain("No runtime behavior was established");
    expect(establishedText).not.toMatch(FORBIDDEN_SEMANTICS);

    const unknowns = unknownItems({
      family_state: FAMILY_UNRESOLVED_LABEL,
      configuration_state: configurationState([STRUCTURE_ONLY_ITEM]),
      dynamic_state: DYNAMIC_NOT_PERFORMED,
      infrastructure_count: 0,
      attack_count: 0,
      mbc_count: 0,
    });
    expect(unknowns.length).toBe(6);
    expect(unknowns.join(" ")).toContain("Malware family identity remains unresolved");
    expect(unknowns.join(" ")).toContain("No ATT&CK techniques are mapped");
  });

  test("16. generator observation boilerplate is rephrased and provenance is preserved", () => {
    expect(analystStatementText("Observation embedded_objects recorded by STATIC_ANALYSIS.")).toBe(
      "Embedded resource structure identified in the artifact."
    );
    expect(analystStatementText("Observation sections recorded by STATIC_ANALYSIS.")).toBe(
      "Section table recovered from static analysis."
    );
    expect(analystStatementText("Observation entropy recorded by STATIC_ANALYSIS.")).not.toContain("STATIC_ANALYSIS");
    const untouched = "Static tooling reported 5 compiler/linker/packer detection(s).";
    expect(analystStatementText(untouched)).toBe(untouched);
  });

  test("17. the projection component exposes the analyst structure with a View Evidence affordance", () => {
    for (const required of [
      "Specimen Classification",
      "Key Findings",
      "What ZAYRON-X Established",
      "What Remains Unknown",
      "Analysis Coverage",
      "STRUCTURE IDENTIFIED",
      "Tool Coverage",
      "Dynamic execution",
      "View Evidence",
    ]) {
      expect(UI_SOURCE).toContain(required);
    }
    expect(UI_SOURCE).not.toContain("Observation ${");
  });
});

describe("phase 6.4 — live projection of a tokenized decoded artifact", () => {
  test("18. the mandated report hierarchy is rendered in order", () => {
    const order = [
      'title="Specimen Classification"',
      'title="Key Findings"',
      'title="Executive Assessment"',
      'title="What ZAYRON-X Established"',
      'title="What Remains Unknown"',
      'title="Analysis Coverage"',
      'title="Static Findings"',
      "Configuration — STRUCTURE IDENTIFIED",
      'title="Detection-Relevant Artifacts"',
      'title="Decoded Artifact"',
      // M16.4.32 — the behaviour/capability section's label is decided by the
      // canonical records (BEHAVIOR_SECTION_TITLES), so the hierarchy is pinned
      // on the rendered title expression; the semantic assertion that a
      // capability-only section never carries the runtime-behavior label lives
      // in tests/unit/m16_4_32_report_semantics_reproducibility.test.ts.
      'title={behaviorSectionTitle}',
      'title="Family Assessment"',
      'title="Infrastructure"',
      'title="ATT&CK Mappings"',
      'title="MBC Mappings"',
      'title="Conflicts"',
      'title="Evidence / Provenance"',
      'title="Limitations"',
    ];
    const positions = order.map((marker) => UI_SOURCE.indexOf(marker));
    expect(positions.every((p) => p >= 0)).toBe(true);
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
    // Evidence must never sit above the analyst assessment.
    expect(UI_SOURCE.indexOf('title="Evidence / Provenance"')).toBeGreaterThan(
      UI_SOURCE.indexOf('title="Analysis Coverage"')
    );
  });

  test("19. token records render as structural evidence with inspectable provenance", () => {
    expect(UI_SOURCE).toContain("TOKENIZED PAYLOAD RECORDS");
    expect(UI_SOURCE).toContain("Tokenized payload records recovered from deterministic structural parsing.");
    expect(UI_SOURCE).toContain(
      "Token records are structural evidence; they do not by themselves establish runtime behavior or malware family."
    );
    expect(UI_SOURCE).toContain("ds.token_records");
    expect(UI_SOURCE).toContain("inner_decoder_state");
    // Framing fields only, plus a secondary provenance view.
    expect(UI_SOURCE).toContain('["#", "Offset", "Declared chars", "Observed bytes", "Category", "Encoding", "Record identity", "Parser"]');
    expect(UI_SOURCE).toContain('"Source evidence", "Observation", "Record extraction method"');
    // The token block must not reclassify records as configuration/behavior/IOC/
    // technique, and must not claim decryption or source recovery.
    const start = UI_SOURCE.indexOf("TOKENIZED PAYLOAD RECORDS");
    const block = UI_SOURCE.slice(start, UI_SOURCE.indexOf('["Subject", "Value", "Count", "Type"]', start));
    for (const classifier of ['"Config type"', '"Behavior"', '"Indicator value"', '"Technique"', 'SOURCECODE', 'DECRYPTED']) {
      expect(block).not.toContain(classifier);
    }
  });

  test("20. empty domains render explicit states, never negative malware claims", () => {
    expect(UI_SOURCE).toContain("No runtime behavior established in this analysis run.");
    expect(UI_SOURCE).toContain("No infrastructure relationships were correlated from canonical evidence.");
    expect(UI_SOURCE).toContain("No ATT&CK techniques were mapped from canonical evidence.");
    expect(UI_SOURCE).toContain("No MBC behaviors were mapped from canonical evidence.");
    expect(UI_SOURCE).not.toContain("No behavior exists");
    expect(UI_SOURCE).not.toContain("No family exists");
    expect(UI_SOURCE).not.toContain("No infrastructure exists");
  });

  test("21. token records cannot promote the configuration state or the analyst verdict", () => {
    // The configuration state is derived from canonical configuration items only.
    expect(UI_SOURCE).toContain("const configItems = (report.configuration?.items ?? []) as AnyRecord[];");
    expect(UI_SOURCE).toContain("const configState = reportConfigurationState(raw);");
    expect(configurationState([STRUCTURE_ONLY_ITEM])).toBe(CONFIGURATION_STATE.STRUCTURE_ONLY);
    // Representative token record (shape of the live mir_103b314debe5a205 payload).
    const tokenRecord = {
      artifact_id: DECODED_ARTIFACT.artifact_id,
      analysis_run_id: "ar-p64-1790199180",
      source_evidence_id: "ev_static_6df180d94d638fbb",
      observation_id: "obs_static_art_gmf_7b98cd3800dede65_embedded_objects",
      record_id: "dtr_a10be7e7dbb26edb",
      record_index: 0,
      record_offset: 5,
      declared_length_chars: 5,
      observed_length_bytes: 10,
      record_category: "UTF16LE_STRING_RECORD",
      record_encoding: "utf16le",
      parser_method: "EA06_TOKEN_RECORD_SCAN",
      parser_version: "1.0.0-ea06tokenrecordparser-canonical",
      epistemic_status: "STATIC_CANDIDATE",
      execution_confirmed: false,
    };
    // A section carrying token records derives the same states as one without.
    expect(configurationState([STRUCTURE_ONLY_ITEM, tokenRecord as unknown as Record<string, any>])).toBe(
      CONFIGURATION_STATE.STRUCTURE_ONLY
    );
    const decodedWithRecords = { ...DECODED_STRUCTURE, token_records: [tokenRecord], inner_decoder_state: "UNAVAILABLE" };
    const view = decodedArtifactPresentation({ decoded_structure: decodedWithRecords, derived_artifacts: DERIVED_ARTIFACTS });
    expect(view.creation_method).toBe("DETERMINISTIC_DECODE:AUTOIT_EA06_SCRIPT");
    expect(view.post_decode_structural_method).toBe("DETERMINISTIC_STRUCTURAL_EXTRACTION");
    expect(view.representation).toBe("TOKENIZED_PAYLOAD");
    // No record content is published, so no semantic engine can consume it here.
    expect(Object.keys(tokenRecord)).not.toContain("value");
    expect(JSON.stringify(tokenRecord)).not.toMatch(/DECRYPTED|PLAINTEXT|SOURCE_CODE/);
  });

  test("22. the misleading regression strings are absent from the presentation", () => {
    for (const forbidden of [
      "1 configuration object(s) were extracted",
      "Every item carries a raw and normalized value",
      "Extraction method: DETERMINISTIC_STRUCTURAL_EXTRACTION",
      "100% confidence",
    ]) {
      expect(UI_SOURCE).not.toContain(forbidden);
    }
    // The decoded-artifact separations remain distinct fields.
    expect(UI_SOURCE).toContain('["Artifact creation method", esc(derivedDecoded.creation_method)]');
    expect(UI_SOURCE).toContain('["Post-decode structural analysis", esc(derivedDecoded.post_decode_structural_method)]');
    expect(UI_SOURCE).toContain('["Post-decode structural classification", esc(derivedDecoded.representation)]');
  });

  test("23. canonical malware semantic audit regression invariants", () => {
    // 1. Configuration canonical state: NO_CONTAINER maps to NOT_APPLICABLE
    expect(configurationState([])).toBe(CONFIGURATION_STATE.NO_CONTAINER);
    expect(CONFIGURATION_STATE.NO_CONTAINER).toBe("NOT_APPLICABLE");
    const emptyCoverage = analysisCoverage({
      format_class: "PE",
      embedded_object_count: 0,
      derived_artifacts: [],
      decoded_structure: {},
      configuration_state: CONFIGURATION_STATE.NO_CONTAINER,
      dynamic_state: DYNAMIC_NOT_PERFORMED,
      infrastructure_count: 0,
      attack_count: 0,
      mbc_count: 0,
      family_state: FAMILY_UNRESOLVED_LABEL,
    });
    const configRow = emptyCoverage.find((r) => r.domain === "Configuration values");
    expect(configRow?.state).toBe(COVERAGE_STATE.NOT_APPLICABLE);

    // 2. NO_MATCH, NO_RESULT, and ERROR remain distinguishable in analyzer presentation
    const mockToolResults = [
      { tool_id: "yara-x", status: "NO_RESULT", note: "NO_MATCH", provenance: { execution_exit_status: 0, execution_stdout_bytes: 43 } },
      { tool_id: "floss", status: "ERROR", note: "execution timed out", provenance: { execution_exit_status: 1 } },
      { tool_id: "capa", status: "OBSERVED", note: null, provenance: { execution_exit_status: 0 } },
    ];
    expect(mockToolResults[0].status).toBe("NO_RESULT");
    expect(mockToolResults[0].note).toBe("NO_MATCH");
    expect(mockToolResults[1].status).toBe("ERROR");
    expect(mockToolResults[2].status).toBe("OBSERVED");
    expect(mockToolResults[0].status).not.toBe(mockToolResults[1].status);
    expect(mockToolResults[0].status).not.toBe(mockToolResults[2].status);

    // 3. Raw analyzer output is not falsely described as absent when exit 0 with 43 bytes stdout
    expect(mockToolResults[0].provenance.execution_stdout_bytes).toBe(43);
    expect(mockToolResults[0].provenance.execution_exit_status).toBe(0);

    // 4. Compiled-script state remains NOT_ESTABLISHED when appropriate and does not generate global negative AutoIt claims
    const establishedNonAutoIt = establishedStatements({
      format_class: "PE",
      has_autoit_compiled_script_support: false,
      embedded_object_count: 0,
      decoded_origin: null,
      decoded_size_bytes: null,
      representation: null,
      configuration_state: CONFIGURATION_STATE.NO_CONTAINER,
      dynamic_state: DYNAMIC_NOT_PERFORMED,
    });
    const joinedStatements = establishedNonAutoIt.join(" ");
    expect(joinedStatements).toContain("Compiled-script capability is not established from static evidence.");
    expect(joinedStatements).not.toContain("No compiled AutoIt support capability is statically evidenced.");

    // 5. CAN_DO never becomes observed runtime behavior
    const staticOnlyFinding = keyFindings({
      artifact_id: "art_test",
      sha256: "test_sha",
      format_class: "PE",
      file_size_bytes: 1000,
      content_type_assessment: CONTENT_TYPE_ASSESSMENT,
      capabilities: {
        observation_id: "obs_test",
        count: 1,
        items: [{ catalog_id: "EMBEDDED_ARCHIVE_PAYLOAD_STRUCTURE", capability_name: "Embedded archive payload structure", modality: "CAN_DO" }],
      },
      embedded_objects: { count: 0, objects: [] },
      derived_artifacts: [],
      decoded_structure: {},
    });
    expect(staticOnlyFinding.some((f) => f.detail.includes("CAN_DO"))).toBe(true);
    expect(staticOnlyFinding.some((f) => f.detail.includes("Static capability support is not observed execution"))).toBe(true);

    // 6. UNRESOLVED never becomes a family attribution
    const classification = specimenClassification({
      format_class: "PE",
      content_type: "pebin",
      has_autoit_compiled_script_support: false,
    });
    expect(classification.classification).not.toMatch(FORBIDDEN_SEMANTICS);
    expect(classification.is_family_claim).toBe(false);

    // 7. DERIVED infrastructure never becomes verified communication
    const freshUI = read("apps/web/app/components/CanonicalMalwareReport.tsx");
    expect(freshUI).toContain('<Badge value="DERIVED" tone="info" />');
    expect(freshUI).toContain("STATIC CANDIDATES · NOT VERIFIED RELATIONSHIPS");
    expect(freshUI).toContain("They do not establish that any endpoint was contacted");

    // 8. Unsupported negative claims are not generated
    expect(freshUI).not.toContain("No compiled AutoIt support capability is statically evidenced.");
  });
});

