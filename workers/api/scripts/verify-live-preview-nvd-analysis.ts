/**
 * BOUNDED LIVE PREVIEW NVD ANALYSIS — operator runner.
 *
 * Drives EXACTLY ONE evidence-grounded, Gemini-selected analysis of a GENUINELY
 * NEWLY PUBLISHED, NON-KEV CVE through the deployed Preview-only route
 * `POST /api/v1/canary/analyst-grade-cve-nvd-preview`.
 *
 *   step 0  select  → NVD CVE API 2.0, `published` inside TODAY's `Asia/Amman`
 *                     window, excluding any record that already carries CISA KEV
 *                     designation (those must use the KEV route), ranked by
 *                     whether the UNCHANGED enterprise relevance gate will admit
 *                     the record to DEEP_ANALYSIS
 *   step 1  analyse → ONE POST to the Preview route with the operator credential
 *   step 2  verify  → `GET /api/v1/intelligence/<CVE>` and the website URL
 *
 * This runner deliberately does NOT reimplement the rules it depends on. It
 * imports the authoritative modules the worker itself runs:
 *   · `ammanDayWindow` / `parseNvdTimestamp` / `CVE_ID_PATTERN`  (day window, parsing)
 *   · `assessEnterpriseVulnerabilityRelevance`                   (the admission gate)
 * so selection cannot drift from production behaviour.
 *
 * Why the gate matters here: the gate admits a non-KEV CVE to DEEP_ANALYSIS when
 * it matches enterprise infrastructure signals; a record matching NEITHER an
 * enterprise NOR a consumer keyword falls through to a KEV-only branch and is
 * correctly STORE_ONLY, producing no model call at all. Selecting such a CVE
 * would spend the single bounded call on nothing, so those records are ranked
 * last and reported as such.
 *
 * Run with bun (TypeScript, matching the workspace package convention):
 *   bun run scripts/verify-live-preview-nvd-analysis.ts --select-only
 *   ADMIN_API_TOKEN=<preview token> bun run scripts/verify-live-preview-nvd-analysis.ts \
 *     [--cve CVE-YYYY-NNNN] [--out .tmp-preview-nvd/live-analysis.json] [--fail-on-predicted-store-only]
 *
 * The credential is read from the `ADMIN_API_TOKEN` environment variable and is
 * never printed, logged, or written to the evidence file. `/api/v1/canary/*` is
 * classified `admin_or_internal`, so the header is `X-Admin-Token` (NOT
 * `Authorization: Bearer`, which `workers/api/src/security.ts` does not read).
 *
 * Exit codes:
 *   0  analysis completed, provider reached, report retrievable and rendering
 *   1  no usable credential in the environment (no ZAYRON-X call was made)
 *   2  no admissible today-published non-KEV CVE was found (no call was made)
 *   3  the single analysis call did not succeed
 *   4  the analysis was refused by the unchanged enterprise gate (no model call)
 *   5  usage / transport / parse error
 *   6  the report was not retrievable, or the website did not render it
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ammanDayWindow,
  parseNvdTimestamp,
  CVE_ID_PATTERN,
  fetchRecentNvdCve,
} from "../../../packages/intelligence/src/vulnerability/recentNvdCve";
import { assessEnterpriseVulnerabilityRelevance } from "../../../packages/intelligence/src/relevance/vulnerability";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

const API_PREVIEW = "https://zayron-x-api-preview.aabusabih.workers.dev";
const WEB_PREVIEW = "https://zayron-x-web-preview.aabusabih.workers.dev";
const ROUTE = "/api/v1/canary/analyst-grade-cve-nvd-preview";
const NVD_CVE_API_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const CISA_KEV_FEED =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

interface NvdReference {
  url: string;
  tags: string[];
}

/**
 * AUTHORITATIVE admission for one CVE.
 *
 * No approximation and no duplicated pipeline logic:
 *   1. `fetchRecentNvdCve` (the production validator the deployed route calls)
 *      decides whether the record is genuinely published inside the current
 *      `Asia/Amman` window, carries a description and http(s) references, and is
 *      not already KEV-designated. Its rejection codes are reported verbatim.
 *   2. The gate is the production `assessEnterpriseVulnerabilityRelevance`
 *      imported above, fed with EXACTLY the fields the worker feeds it, with
 *      `isKev: false` because the NVD primary authority is not KEV.
 * The worker re-runs both of these itself; this is a pre-flight, not a bypass.
 */
async function authoritativeAdmission(cveId: string): Promise<{
  ok: boolean;
  code?: string;
  decision?: "DEEP_ANALYSIS" | "STORE_ONLY";
  category?: string;
}> {
  const outcome = await fetchRecentNvdCve({ cveId, fetchFn: fetch, timeoutMs: 8000 });
  if (!outcome.ok) return { ok: false, code: outcome.code };
  const e = outcome.evidence;
  const gate = assessEnterpriseVulnerabilityRelevance({
    cveId,
    vendor: e.vendor,
    product: e.product,
    vulnerabilityName: e.vulnerabilityName,
    description: e.description,
    isKev: false,
  });
  return { ok: true, decision: gate.processDecision, category: gate.category };
}

interface Candidate {
  cve_id: string;
  published_at: string;
  last_modified_at: string | null;
  vuln_status: string;
  vendor: string;
  product: string;
  vulnerability_name: string;
  description: string;
  cwe_ids: string[];
  cvss_score: string | null;
  cvss_severity: string | null;
  cvss_vector: string | null;
  references: NvdReference[];
  kev_designated_by_nvd_record: boolean;
  kev_listed_in_catalog: boolean | null;
  /** Prediction from the SAME gate the worker runs; the worker remains authoritative. */
  predicted_process_decision: "DEEP_ANALYSIS" | "STORE_ONLY";
  predicted_category: string;
  predicted_reasons: string[];
  /**
   * Whether the NVD record carries real vendor/product identity (CPE data).
   * Observed failure mode: a record with no CPE data yields vendor/product
   * "Unknown", which the Semantic Isolation Gate then rejects as
   * `CLM-xx <UNKNOWN> asserted as SOURCE_FACT` and marks the report CONFLICT.
   * A record with identity avoids that spurious conflict.
   */
  has_identity: boolean;
  admissible: boolean;
}

function nvdRangeParam(isoUtc: string): string {
  // NVD expects `YYYY-MM-DDTHH:mm:ss.SSS` (UTC, no designator) for range queries.
  return isoUtc.replace("Z", "");
}

function firstEnglish(values: any): string {
  if (!Array.isArray(values)) return "";
  const entry = values.find((e: any) => e?.lang === "en" && typeof e?.value === "string");
  return entry ? String(entry.value) : "";
}

function parseCpe(criteria: unknown): { vendor: string; product: string; version: string } | null {
  const parts = String(criteria || "").split(":");
  if (parts.length < 6 || parts[0] !== "cpe" || parts[1] !== "2.3") return null;
  const clean = (v: string) => (v === "*" || v === "-" || v === "" ? "" : decodeURIComponent(v.replace(/\\(.)/g, "$1")));
  return { vendor: clean(parts[3]), product: clean(parts[4]), version: clean(parts[5]) };
}

/** CVSS v3.1 > v3.0 > v2; primary source preferred. Mirrors the worker's preference. */
function selectMetric(metrics: any): any {
  if (!metrics || typeof metrics !== "object") return null;
  for (const key of ["cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]) {
    const list = metrics[key];
    if (Array.isArray(list) && list.length > 0) {
      return list.find((m: any) => m?.type === "Primary") || list[0];
    }
  }
  return null;
}

interface Opts {
  cve: string | null;
  selectOnly: boolean;
  authoritative: boolean;
  failOnPredictedStoreOnly: boolean;
  out: string;
}

function parseArgs(argv: string[]): Opts {
  const opts: Opts = {
    cve: null,
    selectOnly: false,
    authoritative: false,
    failOnPredictedStoreOnly: false,
    out: path.resolve(SCRIPT_DIR, "..", "..", "..", ".tmp-preview-nvd", "live-analysis.json"),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--select-only") opts.selectOnly = true;
    else if (arg === "--authoritative") opts.authoritative = true;
    else if (arg === "--fail-on-predicted-store-only") opts.failOnPredictedStoreOnly = true;
    else if (arg === "--cve") opts.cve = String(argv[++i] ?? "").trim().toUpperCase();
    else if (arg === "--out") opts.out = path.resolve(String(argv[++i] ?? ""));
    else {
      console.error(`[preview-nvd] unsupported argument '${arg}'`);
      process.exit(5);
    }
  }
  if (opts.cve !== null && !CVE_ID_PATTERN.test(opts.cve)) {
    console.error("[preview-nvd] --cve must match CVE-YYYY-NNNN");
    process.exit(5);
  }
  return opts;
}

async function fetchKevSet(): Promise<Set<string> | null> {
  try {
    const res = await fetch(CISA_KEV_FEED, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data: any = await res.json();
    return new Set<string>(
      (data?.vulnerabilities || []).map((v: any) => String(v?.cveID || "").toUpperCase()),
    );
  } catch {
    // Cannot prove non-listing → report it rather than assume it.
    return null;
  }
}

async function collectCandidates(window: { day: string; windowStartUtc: string; windowEndUtc: string }) {
  const url = `${NVD_CVE_API_BASE}?pubStartDate=${encodeURIComponent(nvdRangeParam(window.windowStartUtc))}` +
    `&pubEndDate=${encodeURIComponent(nvdRangeParam(window.windowEndUtc))}&resultsPerPage=2000`;
  const headers: Record<string, string> = { accept: "application/json" };
  const nvdApiKey = (process.env.NVD_API_KEY ?? "").trim();
  if (nvdApiKey) headers.apiKey = nvdApiKey;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`NVD HTTP ${res.status}`);
  const data: any = await res.json();

  const kev = await fetchKevSet();
  const startMs = Date.parse(window.windowStartUtc);
  const endMs = Date.parse(window.windowEndUtc);
  const candidates: Candidate[] = [];

  for (const item of data?.vulnerabilities || []) {
    const cve = item?.cve;
    const id = String(cve?.id || "").toUpperCase();
    if (!CVE_ID_PATTERN.test(id)) continue;
    const published = parseNvdTimestamp(cve?.published);
    if (!published) continue;
    if (published.getTime() < startMs || published.getTime() >= endMs) continue;

    const description = firstEnglish(cve?.descriptions);
    const references: NvdReference[] = (cve?.references || [])
      .map((r: any) => ({ url: String(r?.url || ""), tags: Array.isArray(r?.tags) ? r.tags : [] }))
      .filter((r: NvdReference) => /^https?:\/\//i.test(r.url));
    const cweIds: string[] = (cve?.weaknesses || [])
      .flatMap((w: any) => w?.description || [])
      .filter((d: any) => d?.lang === "en" && String(d?.value || "").startsWith("CWE-"))
      .map((d: any) => String(d.value));
    const metric = selectMetric(cve?.metrics);
    const cvss = metric?.cvssData || null;
    const cpeMatches = (cve?.configurations || [])
      .flatMap((c: any) => c?.nodes || [])
      .flatMap((n: any) => n?.cpeMatch || [])
      .map((m: any) => parseCpe(m?.criteria))
      .filter(Boolean) as Array<{ vendor: string; product: string; version: string }>;

    const vendor = cpeMatches[0]?.vendor || "Unknown";
    const product = cpeMatches[0]?.product || "Unknown";
    // EXACTLY the worker's construction (recentNvdCve.ts / nvdEvidenceToPrimarySource):
    // productLabel = product || vendor, and both are already the literal "Unknown"
    // when the NVD record carries no CPE data ("Unknown" is truthy, so the
    // fallback branch is effectively unreachable — matching that is the point).
    // An earlier version of this runner used `${id} Security Advisory`, which fed
    // the gate DIFFERENT text than the worker does and could mispredict admission.
    const productLabel = product || vendor;
    const vulnerabilityName = productLabel
      ? `${vendor ? `${vendor} ` : ""}${productLabel}${cweIds.length > 0 ? ` (${cweIds[0]})` : ""} Vulnerability`
      : `${id} Security Advisory`;

    const kevByNvdRecord = !!(cve?.cisaExploitAdd || cve?.cisaRequiredAction);
    const kevByCatalog = kev instanceof Set ? kev.has(id) : null;

    // The gate the worker will actually run, with isKev=false (NVD authority).
    const gate = assessEnterpriseVulnerabilityRelevance({
      cveId: id,
      vendor,
      product,
      vulnerabilityName,
      description,
      isKev: false,
    });

    candidates.push({
      cve_id: id,
      published_at: published.toISOString(),
      last_modified_at: parseNvdTimestamp(cve?.lastModified)?.toISOString() || null,
      vuln_status: String(cve?.vulnStatus || "") || "UNKNOWN",
      vendor,
      product,
      vulnerability_name: vulnerabilityName,
      description,
      cwe_ids: cweIds,
      cvss_score: cvss?.baseScore != null ? String(cvss.baseScore) : null,
      cvss_severity: cvss?.baseSeverity ? String(cvss.baseSeverity) : null,
      cvss_vector: cvss?.vectorString ? String(cvss.vectorString) : null,
      references,
      kev_designated_by_nvd_record: kevByNvdRecord,
      kev_listed_in_catalog: kevByCatalog,
      predicted_process_decision: gate.processDecision,
      predicted_category: gate.category,
      predicted_reasons: gate.reasons,
      has_identity: vendor !== "Unknown" && product !== "Unknown",
      admissible:
        description.length > 0 &&
        references.length > 0 &&
        !kevByNvdRecord &&
        kevByCatalog !== true,
    });
  }

  // DEEP_ANALYSIS first (so the single bounded call actually reaches a model),
  // then records with real vendor/product identity (so the Semantic Isolation
  // Gate does not reject an UNKNOWN value asserted as SOURCE_FACT), then
  // highest CVSS, then stable id.
  candidates.sort((a, b) => {
    const ax = a.predicted_process_decision === "DEEP_ANALYSIS" ? 0 : 1;
    const bx = b.predicted_process_decision === "DEEP_ANALYSIS" ? 0 : 1;
    if (ax !== bx) return ax - bx;
    const ai = a.has_identity ? 0 : 1;
    const bi = b.has_identity ? 0 : 1;
    if (ai !== bi) return ai - bi;
    const av = Number.parseFloat(a.cvss_score ?? "0") || 0;
    const bv = Number.parseFloat(b.cvss_score ?? "0") || 0;
    return bv - av || a.cve_id.localeCompare(b.cve_id);
  });

  return { candidates, total: data?.totalResults ?? candidates.length, kevAvailable: kev instanceof Set };
}

const opts = parseArgs(process.argv.slice(2));
const now = new Date();
const window = ammanDayWindow(now);

console.log("=== PREVIEW NVD ANALYSIS — BOUNDED OPERATOR RUN ===");
console.log(`now (UTC)      : ${now.toISOString()}`);
console.log(`Asia/Amman day : ${window.day}`);
console.log(`UTC interval   : ${window.windowStartUtc} → ${window.windowEndUtc}`);
console.log(`api            : ${API_PREVIEW}${ROUTE}\n`);

// ── step 0 — select a genuinely newly published, non-KEV, gate-admitted CVE ──
console.log("[0/3] selecting from the NVD CVE API for today's Asia/Amman window …");
let selection;
try {
  selection = await collectCandidates(window);
} catch (error) {
  console.error(`[preview-nvd] NVD selection failed: ${error instanceof Error ? error.message : error}`);
  process.exit(5);
}

const admissible = selection.candidates.filter((c) => c.admissible);
const admitted = admissible.filter((c) => c.predicted_process_decision === "DEEP_ANALYSIS");
console.log(`      ${selection.total} in window; ${selection.candidates.length} parsed; ` +
  `${admissible.length} admissible; ${admitted.length} predicted DEEP_ANALYSIS`);
if (!selection.kevAvailable) {
  console.log("      note: the CISA KEV catalog was unreachable; non-listing could not be proven here.");
}
for (const c of admitted.slice(0, 8)) {
  console.log(`      · ${c.cve_id}  ${c.published_at}  CVSS ${c.cvss_score ?? "N/A"}  ` +
    `${c.vendor}/${c.product}${c.has_identity ? " [identity✓]" : " [no CPE identity]"}  ` +
    `[${c.predicted_category}]  refs ${c.references.length}`);
}
const storeOnlyCount = admissible.length - admitted.length;
if (storeOnlyCount > 0) {
  console.log(`      (${storeOnlyCount} admissible record(s) predicted STORE_ONLY by the unchanged gate — ` +
    `no model call would occur, so they are ranked last)`);
}

// ── authoritative admission pass (production validator + production gate) ──
let eligibleIds: Set<string> | null = null;
if (opts.authoritative) {
  const topN = selection.candidates.slice(0, 12);
  console.log(`\n[0b] authoritative admission: production validator + production gate, top ${topN.length} by rank`);
  const decisions: Array<{ cve: string; decision: string | null; code: string | null }> = [];
  for (let i = 0; i < topN.length; i += 1) {
    const c = topN[i];
    const r = await authoritativeAdmission(c.cve_id);
    decisions.push({ cve: c.cve_id, decision: r.ok ? (r.decision ?? null) : null, code: r.ok ? null : (r.code ?? null) });
    console.log(`      ${c.cve_id}: ${r.ok ? `${r.decision} [${r.category}]` : `REJECTED ${r.code}`}`);
    // NVD public rate limit is ~5 requests / 30s; stay well inside it.
    if (i < topN.length - 1) await new Promise((res) => setTimeout(res, 6500));
  }
  eligibleIds = new Set(decisions.filter((d) => d.decision === "DEEP_ANALYSIS").map((d) => d.cve));
  console.log(`      → ${eligibleIds.size} authoritative DEEP_ANALYSIS candidate(s)`);
}

let chosen: Candidate | undefined;
if (opts.cve) {
  chosen = selection.candidates.find((c) => c.cve_id === opts.cve);
  if (!chosen) {
    console.error(`[preview-nvd] ${opts.cve} is not published inside today's Amman window (per NVD).`);
    process.exit(2);
  }
  if (!chosen.admissible) {
    console.error(`[preview-nvd] ${opts.cve} is not admissible (KEV-designated, or missing description/references).`);
    process.exit(2);
  }
} else if (eligibleIds) {
  chosen = selection.candidates.find((c) => eligibleIds!.has(c.cve_id));
} else {
  chosen = admitted[0] ?? admissible[0];
}

if (eligibleIds && !opts.cve && !chosen) {
  console.error("\n[preview-nvd] NO AUTHORITATIVELY ELIGIBLE CVE in the current Asia/Amman window.");
  console.error("[preview-nvd] Every in-window candidate was rejected by the production validator or returned " +
    "STORE_ONLY from the production gate. Nothing was called; eligibility was NOT forced.");
  process.exit(2);
}

if (opts.selectOnly) {
  console.log("\n[select-only] no request was made to the ZAYRON-X origin and no credential was read.");
  if (!chosen) process.exit(2);
  console.log(`[select-only] would analyse: ${chosen.cve_id} ` +
    `(predicted ${chosen.predicted_process_decision}, ${chosen.predicted_category})`);
  console.log(JSON.stringify({ window, selected: chosen }, null, 2));
  process.exit(0);
}

if (!chosen) {
  console.error("\n[preview-nvd] ABORT: no admissible today-published non-KEV CVE was found. Nothing was called.");
  process.exit(2);
}

if (opts.failOnPredictedStoreOnly && chosen.predicted_process_decision !== "DEEP_ANALYSIS") {
  console.error(`\n[preview-nvd] ABORT: ${chosen.cve_id} is predicted STORE_ONLY by the unchanged enterprise ` +
    `gate, so the single bounded call would perform no model generation. Nothing was called.`);
  process.exit(4);
}

const token = (process.env.ADMIN_API_TOKEN ?? "").trim();
if (!token) {
  console.error("\n[preview-nvd] ADMIN_API_TOKEN is not set in this shell.");
  console.error("[preview-nvd] No request to the ZAYRON-X origin was made and no credential was read or written.");
  process.exit(1);
}

const chosenForEvidence = { ...chosen, description: chosen.description.slice(0, 1200) };
if (chosenForEvidence.description.length < chosen.description.length) {
  chosenForEvidence.description = `${chosenForEvidence.description} …[truncated]`;
}
console.log(`\n[selected] ${chosen.cve_id}  (predicted ${chosen.predicted_process_decision})\n`);

const evidence: Record<string, any> = {
  started_at: now.toISOString(),
  window,
  selected_cve: { ...chosenForEvidence, references: chosen.references.slice(0, 10) },
  credential: "ADMIN_API_TOKEN from the environment (value never read into this file)",
  analysis: null,
  report_retrieval: null,
  website: null,
  invariants: {},
};

const redact = (value: unknown) => JSON.stringify(value ?? null).replaceAll(token, "<redacted>");

function writeEvidence() {
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  fs.writeFileSync(opts.out, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`[preview-nvd] evidence written to ${opts.out}`);
}

// ── step 1 — exactly ONE bounded analysis ─────────────────────────────────
console.log("[1/3] POST analysis (one call; Gemini selected by the NVD authority) …");
const startedAt = Date.now();
let analysisRes: Response;
try {
  analysisRes = await fetch(`${API_PREVIEW}${ROUTE}`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Admin-Token": token },
    body: JSON.stringify({ cve_id: chosen.cve_id }),
  });
} catch (error) {
  console.error(`[preview-nvd] transport failure: ${error instanceof Error ? error.message : error}`);
  process.exit(5);
}
const analysisText = await analysisRes.text();
let analysisBody: any;
try {
  analysisBody = JSON.parse(analysisText);
} catch {
  analysisBody = { unparsable_body: analysisText.slice(0, 500) };
}
const analysisMs = Date.now() - startedAt;

const provider = String(
  analysisBody?.ai_provider ?? analysisBody?.provider ?? analysisBody?.report?.ai_provider ?? "",
).toLowerCase();
const model = analysisBody?.ai_model ?? analysisBody?.model ?? analysisBody?.cloudflare_ai_model ?? null;

evidence.analysis = {
  status: analysisRes.status,
  latency_ms: analysisMs,
  process_decision: analysisBody?.process_decision ?? analysisBody?.enterprise_relevance?.process_decision ?? null,
  ai_executed: analysisBody?.ai_executed ?? null,
  ai_provider: provider || null,
  ai_model: model,
  cisa_kev_field: analysisBody?.report?.signals?.kev_listed ?? null,
  usage: analysisBody?.usage ?? analysisBody?.token_usage ?? null,
  body: analysisBody,
};
console.log(`      status ${analysisRes.status} in ${analysisMs} ms`);
console.log(`      process_decision: ${evidence.analysis.process_decision ?? "(not returned)"}  ` +
  `ai_executed: ${evidence.analysis.ai_executed ?? "(not returned)"}  provider: ${provider || "(not returned)"}`);
console.log(`      ${redact(analysisBody).slice(0, 1200)}`);

if (analysisRes.status !== 200) {
  evidence.invariants.analysis_ok = false;
  writeEvidence();
  console.error(`\n[preview-nvd] ABORT: analysis returned ${analysisRes.status}. No retry is issued (one bounded call).`);
  if (analysisRes.status === 401) {
    console.error("[preview-nvd] 401 means the credential was rejected or is not the Preview ADMIN_API_TOKEN.");
  }
  if (analysisRes.status === 422) {
    console.error("[preview-nvd] 422 NOT_PUBLISHED_TODAY means the worker's own NVD window disagreed with selection.");
  }
  process.exit(3);
}
evidence.invariants.analysis_ok = true;

if (evidence.analysis.process_decision !== "DEEP_ANALYSIS" || evidence.analysis.ai_executed === "NO") {
  evidence.invariants.gate_admitted = false;
  writeEvidence();
  console.error("\n[preview-nvd] REFUSED BY THE UNCHANGED ENTERPRISE GATE: the record was stored, but no model " +
    "generation occurred (this is the gate working as designed, not a failure of the route).");
  console.error("[preview-nvd] Re-run with a different --cve, or drop the credential and use --select-only to " +
    "rank today's candidates by predicted admission.");
  process.exit(4);
}
evidence.invariants.gate_admitted = true;

if (provider) {
  evidence.invariants.provider_is_gemini = provider === "gemini";
  console.log(`      provider check: ${provider}${provider === "gemini" ? " — as required" : " — NOT Gemini"}`);
}

// ── step 2 — the report must be retrievable, and the website must render it ─
console.log("\n[2/3] GET report from the Preview API …");
let retrieval: any = null;
try {
  const res = await fetch(`${API_PREVIEW}/api/v1/intelligence/${chosen.cve_id}`, {
    headers: { accept: "application/json" },
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = { unparsable_body: text.slice(0, 300) }; }
  retrieval = { status: res.status, body };
} catch (error) {
  retrieval = { status: 0, error: String(error instanceof Error ? error.message : error) };
}
evidence.report_retrieval = retrieval;
console.log(`      status ${retrieval.status}`);
if (retrieval.status !== 200) {
  evidence.invariants.report_retrievable = false;
  writeEvidence();
  console.error("[preview-nvd] ABORT: the report is not retrievable from the Preview API; the website cannot render it.");
  process.exit(6);
}
evidence.invariants.report_retrievable = true;

const reportId = retrieval.body?.report?.intelligence_id ?? retrieval.body?.intelligence_id ?? null;
evidence.report_id = reportId;
console.log(`      report identifier: ${reportId ?? "(not returned)"}`);

console.log("\n[3/3] GET the Preview website report page …");
const websiteUrl = `${WEB_PREVIEW}/intelligence/vulnerabilities/${chosen.cve_id}`;
let webStatus = 0;
try {
  const res = await fetch(websiteUrl, { headers: { accept: "text/html" } });
  webStatus = res.status;
} catch { /* reported below */ }
evidence.website = { url: websiteUrl, status: webStatus };
evidence.invariants.website_renders = webStatus === 200;
console.log(`      ${websiteUrl} → ${webStatus}`);

writeEvidence();

if (webStatus !== 200) {
  console.error("\n[preview-nvd] FAIL: the report is persisted but the website did not render it (status above).");
  process.exit(6);
}

console.log("\n[preview-nvd] OK — one bounded analysis, report persisted and viewable:");
console.log(`              ${websiteUrl}`);
process.exit(0);
