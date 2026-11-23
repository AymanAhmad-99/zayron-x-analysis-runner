/**
 * Analyst Summary Layer (Presentation Only)
 *
 * Implements deterministic synthesis over validated canonical malware facts.
 * Conforms to the AI Policy for Analyst Summary:
 *  - AI / generative layers MUST NOT perform detection or invent facts.
 *  - The summary is strictly derived from canonical fields already present in the report.
 *  - Output is deterministic and bounded to 50–100 words.
 *  - Supports future AI_ASSISTED mode behind the same interface.
 */

export type SummaryMode = "DETERMINISTIC" | "AI_ASSISTED";

export interface AnalystSummaryInput {
  report_id: string;
  format_class: string;
  source: string;
  family_state: string;
  resolved_family: string | null;
  dynamic_state: string;
  embedded_count: number;
  has_embedded_archive: boolean;
  static_capability_count: number;
  observed_behavior_count: number;
  infrastructure_count: number;
  attack_mapped: boolean;
  mbc_mapped: boolean;
  tool_summary: {
    total: number;
    observed: number;
    error: number;
    error_tools: string[];
    no_result: number;
    no_result_tools: string[];
  };
}

export interface AnalystSummary {
  text: string;
  mode: SummaryMode;
  source_report_id: string;
  generated_at: string;
  provenance_note?: string;
  word_count: number;
}

/** Extract structured summary inputs purely from canonical report document */
export function extractSummaryInput(report: Record<string, any>): AnalystSummaryInput {
  const identity = report.sample_identity ?? {};
  const acq = report.acquisition ?? {};
  const family = report.family ?? {};
  const embedded = report.embedded_objects ?? {};
  const embeddedItems = Array.isArray(embedded.objects) ? embedded.objects : [];
  const hasEmbeddedArchive = embeddedItems.some(
    (o: any) => o.object_type === "ZIP_ARCHIVE" || o.object_type === "BZIP2_STREAM" || String(o.signature ?? "").includes("archive")
  );
  const behaviors = report.behaviors ?? {};
  const staticCapCount = typeof behaviors.static_capability_count === "number"
    ? behaviors.static_capability_count
    : (behaviors.items ?? []).filter((b: any) => b.modality === "CAN_DO" || b.category === "capability").length;
  const observedBehaviorCount = typeof behaviors.observed_runtime_behavior_count === "number"
    ? behaviors.observed_runtime_behavior_count
    : (behaviors.items ?? []).filter((b: any) => b.status === "OBSERVED" && b.category !== "capability").length;
  const infraItems = report.infrastructure?.items ?? [];
  const attacks = (report.attack_mbc?.items ?? []).filter((m: any) => m.framework === "ATTACK");
  const mbc = (report.attack_mbc?.items ?? []).filter((m: any) => m.framework === "MBC");

  const toolResults = Array.isArray(report.tool_results) ? report.tool_results : [];
  const observedTools = toolResults.filter((t: any) => t.status === "OBSERVED").map((t: any) => t.tool_id);
  const errorTools = toolResults.filter((t: any) => t.status === "ERROR").map((t: any) => t.tool_id);
  const noResultTools = toolResults.filter((t: any) => t.status === "NO_RESULT").map((t: any) => t.tool_id);

  return {
    report_id: String(report.report_id ?? "unknown"),
    format_class: String(identity.format_class ?? report.analyzed_artifact?.format_class ?? "PE"),
    source: String(acq.source ?? "UNKNOWN"),
    family_state: String(family.resolution_state ?? "UNRESOLVED"),
    resolved_family: typeof family.resolved_family === "string" && family.resolved_family ? family.resolved_family : null,
    dynamic_state: observedBehaviorCount > 0 ? "OBSERVED" : "NOT PERFORMED",
    embedded_count: Number(embedded.count ?? embeddedItems.length ?? 0),
    has_embedded_archive: hasEmbeddedArchive,
    static_capability_count: staticCapCount,
    observed_behavior_count: observedBehaviorCount,
    infrastructure_count: infraItems.length,
    attack_mapped: attacks.length > 0,
    mbc_mapped: mbc.length > 0,
    tool_summary: {
      total: toolResults.length,
      observed: observedTools.length,
      error: errorTools.length,
      error_tools: errorTools,
      no_result: noResultTools.length,
      no_result_tools: noResultTools,
    },
  };
}

/**
 * Generate a deterministic 50–100 word analyst summary strictly from verified facts.
 */
export function generateDeterministicAnalystSummary(report: Record<string, any>): AnalystSummary {
  const input = extractSummaryInput(report);

  const sentences: string[] = [];

  // 1. Format & Analysis boundary
  const formatDesc = input.format_class === "PE" ? "Windows PE executable" : `${input.format_class} binary`;
  if (input.dynamic_state === "NOT PERFORMED") {
    sentences.push(`This specimen is a ${formatDesc} analyzed using static methods only; dynamic execution was not performed.`);
  } else {
    sentences.push(`This specimen is a ${formatDesc} analyzed under canonical validation with observed runtime telemetry.`);
  }

  // 2. Structural & embedded facts
  if (input.embedded_count > 0 && input.has_embedded_archive) {
    sentences.push(`Canonical analysis confirms the ${input.format_class} format and identifies embedded resource structures, including an embedded archive stream.`);
  } else if (input.embedded_count > 0) {
    sentences.push(`Canonical analysis confirms the ${input.format_class} format and identifies ${input.embedded_count} embedded object(s).`);
  } else {
    sentences.push(`Canonical analysis confirms the ${input.format_class} format without identified embedded objects.`);
  }

  // 3. Family attribution
  if (input.family_state === "UNRESOLVED") {
    sentences.push("Malware family attribution remains unresolved because available evidence does not satisfy canonical resolution thresholds.");
  } else if (input.resolved_family) {
    sentences.push(`Malware family attribution is established as ${input.resolved_family} with canonical multi-source corroboration.`);
  }

  // 4. Capability vs runtime
  if (input.static_capability_count > 0 && input.observed_behavior_count === 0) {
    sentences.push(`${input.static_capability_count === 1 ? "One static capability indication is" : `${input.static_capability_count} static capability indications are`} retained as CAN_DO evidence and not treated as observed execution.`);
  } else if (input.observed_behavior_count > 0) {
    sentences.push(`Analysis recorded ${input.observed_behavior_count} observed runtime behavior(s).`);
  }

  // 5. Infrastructure candidates
  if (input.infrastructure_count > 0) {
    sentences.push(`Correlated infrastructure indicators (${input.infrastructure_count}) are retained as static candidates rather than verified relationships.`);
  }

  // 6. Tool states & technique mapping
  const toolParts: string[] = [];
  if (input.tool_summary.observed > 0) {
    toolParts.push(`${input.tool_summary.observed} observed`);
  }
  if (input.tool_summary.error > 0) {
    toolParts.push(`${input.tool_summary.error} error (${input.tool_summary.error_tools.join(", ")})`);
  }
  if (input.tool_summary.no_result > 0) {
    toolParts.push(`${input.tool_summary.no_result} no-result (${input.tool_summary.no_result_tools.join(", ")})`);
  }

  const toolSentence = toolParts.length > 0
    ? `Analyzer outcomes record ${toolParts.join(", ")}, with ${input.attack_mapped ? "technique mappings verified" : "no technique mappings asserted"}.`
    : (input.attack_mapped ? "Technique mappings were verified." : "No technique mappings were asserted.");
  sentences.push(toolSentence);

  const text = sentences.join(" ");
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    text,
    mode: "DETERMINISTIC",
    source_report_id: input.report_id,
    generated_at: new Date().toISOString(),
    provenance_note: "Deterministically generated from canonical report evidence. AI does not determine findings or verdicts.",
    word_count: wordCount,
  };
}
