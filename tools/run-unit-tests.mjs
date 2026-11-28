// ZAYRON-X — scoped local unit gate (Phase 12.27).
// Runs ONLY the local-safe suites (no network, no live endpoints, no remote writes)
// under `bun test`, which executes both `bun:test` and `vitest` imports without
// converting runners. Fails if bun fails OR if zero tests ran (the old root
// `bun --filter '*' test` succeeded while running nothing).
// NOTE: lives in tools/ (not scripts/) because root scripts/ is gitignored.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SUITES = [
  'tests/benchmark_integrity.test.ts',
  'tests/canonical_cve_processor.test.ts',
  'tests/citation_boundary_matrix.test.ts',
  'tests/citation_validation_gate.test.ts',
  'tests/control_plane_contract.test.ts',
  'tests/d1_resolution_integrity.test.ts',
  'tests/deep_intelligence_engine_v2.test.ts',
  'tests/dfir_retrieval_integrity.test.ts',
  'tests/dossier_gate_engine.test.ts',
  'tests/embedding_boundary.test.ts',
  'tests/epistemic_safeguards.test.ts',
  'tests/gemini_reasoner.test.ts',
  'tests/independent_retrieval_validation.test.ts',
  'tests/knowledge_integration_proof.test.ts',
  'tests/knowledge_v3_embedding.test.ts',
  'tests/knowledge_v3_fts_rrf.test.ts',
  'tests/knowledge_v3_unicode.test.ts',
  'tests/live_vectorize_benchmark_integrity.test.ts',
  'tests/operational_pipeline.test.ts',
  'tests/prove_real_intelligence_grounding.test.ts',
  'tests/publication_gate_regression.test.ts',
  'tests/report_engine.test.ts',
  'tests/report_variation_specificity.test.ts',
  'tests/shadow_vectorize.test.ts',
  'tests/taxonomy_contract.test.ts',
  'tests/truthfulness_remediation.test.ts',
  'tests/universal_book_pipeline.test.ts',
  'tests/vectorize_reconciliation.test.ts',
  'tests/vulnerability_ai_integration.test.ts',
  'tests/zero_defect_audit_persistence.test.ts',
  'tests/zero_defect_publication_gate.test.ts',
  // Verified AI/provider unit suites (local, mocked fetch):
  'tests/unit/ai_provider_router.test.ts',
  'tests/unit/ai_provider_failover_state.test.ts',
  'tests/unit/gemini_timeout_bound.test.ts',
  'tests/unit/grounded_cve_analysis.test.ts',
  'tests/unit/web_preview_target_guard.test.ts',
  // Phase 4A — selective authoritative cron, ai_analyst_assessment.v3 and the
  // guarded production web deploy config.
  'tests/unit/phase4a_authoritative_cron.test.ts',
  'tests/unit/phase4a_strategic_brief.test.ts',
  'tests/unit/phase4b_malware_strategic.test.ts',
  'tests/unit/phase5a_cti_enrichment.test.ts',
  // Phase 4C — executive Telegram wire formatter, validator and dispatcher.
  'tests/unit/phase4c_telegram_wire.test.ts',
  'tests/unit/phase4a_web_prod_deploy.test.ts',
  // Verified malware pipeline suites (Phase 12.27 Task 5: all green locally):
  'tests/unit/m14_4_report_materialization.test.ts',
  'tests/unit/m14_malware_production_pipeline.test.ts',
  'tests/unit/m14_malware_report.test.ts',
  'tests/unit/api_malware_report_read_gate.test.ts',
  'tests/unit/m16_4_30_customer_report_e2e.test.ts',
  'tests/unit/m16_3_7_validation_plane.test.ts',
  'tests/unit/m16_2_gate0_write_read_parity.test.ts',
  'tests/unit/m15_ingest_seam.test.ts',
  // Wave 2A: explicit public-read allowlist, production origin policy,
  // degraded durable limiter semantics, and baseline security headers.
  'tests/unit/wave2a_security_contracts.test.ts',
  // Wave 3: named admin principals + digest comparison, prompt-injection fencing,
  // trusted client identity, 429 backoff contract, webhook replay expiry affinity.
  'tests/unit/wave3_hardening.test.ts',
  // Wave 4A audit gate: this suite (57 tests) was missing from the registry,
  // which is the whole 530 -> 490 delta. It is pure local logic (no network,
  // no live endpoints) and passes inside the combined gate run.
  'tests/security_boundary.test.ts',
  // Wave 4A: authenticated-response cache policy, /feed count + q bounds and
  // search rate class, Telegram claim-before-send idempotency (no double post),
  // 429/Retry-After propagation, and fail-closed production dispatch auth.
  'tests/unit/wave4a_prelaunch_contracts.test.ts',
  // Wave 4B: JSON-LD safety + zero fabrication, site/API URL resolution,
  // sitemap XML/shard/robots contracts, API sitemap PUBLISHED gate + clamps,
  // and the clean launch navigation surface.
  'tests/unit/wave4b_seo_and_sitemap.test.ts',
  // Phase 7A: 48-character token geometry, HMAC-SHA256 vault (no plaintext in
  // D1), 60s key-metadata cache, tier/edge rate-limit + 429 contract, and the
  // OpenAPI 3.1 document. Local-only: injected D1 shim and cache double.
  'tests/api_key_vault.test.ts',
  // Phase 7B: IOC normalization/dedup, allowlist shield, decay TTLs, STIX 2.1
  // bundle validity, EDL >= 85 gate, OpenSSF/abuse.ch/Spamhaus mappers and the
  // 25-subrequest Free-tier ceiling. Local-only: pure modules, no D1, no network.
  'tests/ioc_engine_v2.test.ts',
  // Phase 7C: SAFE-RENDER guarantee (no indicator in an href), Sigma/Nuclei
  // matcher, staggered ingest slot, family hub Dataset JSON-LD + indexability,
  // transient-lookup noindex and /llms.txt. Local-only, no network.
  'tests/phase7c_ioc_workspace_seo.test.ts',
  'tests/phase7d_telegram_wire_og.test.ts',
  'apps/web/tests/phase71_malware_dossier_render.test.ts',
  // Phase 7.2: Turnstile render + CSP allowlist on /developers, and the
  // corrected Cloudflare Radar L3 pulse endpoint. Local-only reads.
  'tests/unit/phase72_turnstile_and_radar.test.ts',
  'tests/unit/phase73_malware_workspace.test.ts',
  // Phase 8A: Telegram dedupe normalization + 7-day lock, bulk lookup + ?since=
  // incremental sync, PoC-in-GitHub slot isolation, EPSS velocity, KQL/SPL and
  // MITRE ATT&CK mapping, and the zero-raw-IOC anchor invariant.
  'tests/unit/phase8a_platform_hardening.test.ts',
  // Wave 4C: Free-Tier Survival Mode — edge cache fast path (zero D1 on a hit,
  // fail-closed eligibility, CORS safety), ingest cron throttle, sitemap shard
  // cap, and the Gate 1 config fixes (migrations_dir, secret-scan fixture).
  'tests/unit/wave4c_free_tier_survival.test.ts',
  // Gate 3A.3: VER-006 projection, bounded provider circuit (half-open probe),
  // IOC/hash sanity, public error-leak shield, sitemap parity, ai_runs contract.
  'tests/unit/gate3a3_cve_trust_engine.test.ts',
  // Gate 3A.4: infrastructure hygiene, CAPA grouping, tool-derived ATT&CK,
  // static triage signal, grounded brief, sha256 dedupe + SEO indexation gate.
  'tests/unit/gate3a4_malware_report_elevation.test.ts',
  // Gate 3A.5: preview noindex precedence, CVE title/branch formatting,
  // pending-notice threshold, /methodology, security.txt, waitlist pricing.
  'tests/unit/gate3a5_launch_polish.test.ts',
  // Gate 3A.6: deterministic CVSS vector parser, triage posture, remediation
  // matrix, and the short visible CVE heading.
  'tests/unit/gate3a6_cve_analysis.test.ts',
  // Phase 8B: honest OG severity/priority + crisp supersampled PNG, OSV narrative
  // sanitizer, enum labels, Telegram malware routing, PoC quiet-slot isolation and
  // the live 4-tier exploit radar.
  'tests/unit/phase8b_institutional_polish.test.ts',
  // Phase 8C: MITRE extractor/sanitizer, two-tier live correlation, Navigator
  // 4.5 export, CISA KEV quiet-slot isolation and the live threat graph.
  'tests/unit/phase8c_threat_graph.test.ts',
  // Phase 9A: discriminated reads (no false 404), guaranteed og:image, permanent
  // Telegram dedupe, Radar quiet-slot isolation, technique edges and the
  // bidirectional family/CVE attribution.
  'tests/unit/phase9a_neural_mesh.test.ts',
  // PHASE 9B — newsroom ingest, slot isolation, entity linker, linked @graph,
  // Google News sitemap, live llms.txt, programmatic hubs and the build guard.
  'tests/unit/phase9b_newsroom_seo_geo.test.ts',
  // PHASE 9C — release-candidate hardening: unified malware family resolution,
  // source-fair newsroom allocation, category labels, sitemap completeness, the
  // catalog-CVE link gate and edge-cache coverage for the new read surfaces.
  'tests/unit/phase9c_release_hardening.test.ts',
  // PHASE 9C — live IndexNow, sitemap Googlebot hardening, X & LinkedIn
  // distribution, email briefings & Telegram funnel, and RSS/WebSub.
  'tests/unit/phase9c_distribution_growth.test.ts',
  // PHASE 9C-MAIL-PRO — Brevo transactional pipeline, Welcome Briefing,
  // digest messageVersions batching and the inbound desk anti-loop shield.
  'tests/unit/phase9c_mail_pro.test.ts',
  // PHASE 10A — enterprise inquiry intake (validation, D1 persistence, Brevo
  // alert + receipt), the deterministic editorial cover renderer, and the
  // /developers + /news token and wiring integrity.
  'tests/unit/phase10a_enterprise_inquiries_newsroom.test.ts',
  // PHASE 10B-1 — multilingual OSINT wire: public Telegram HTML parser, noise
  // filtering, defanging, script detection, provenance firewall, cross-lingual
  // convergence, fail-closed translation, the signed webhook, the read model,
  // the Global Wire surface and the 200-channel importer. Local-only.
  'tests/unit/phase10b_osint_global_wire.test.ts',
  // PHASE 10-SEO-FORENSICS — canonical hosts, query-isolated ?view=wire cache
  // guard, crawler allowlists, title-template dedupe, and NewsArticle image.
  'tests/unit/phase10_seo_forensics.test.ts',
  // PHASE 11-SEO-RECOVERY (v2) — 410/301 legacy purge, utility noindex,
  // SSR intelligence hub, pagination, KQL clone removal, and honest sitemap curation.
  'tests/unit/phase11_seo_recovery.test.ts',
  // PHASE 12-EXECUTE — D1 row-read rescue, outage shield, Kill List, canonicals,
  // Depth-0 SSR homepage, WebSub push, and 2028 GEO/JSON-LD lockdown.
  'tests/unit/phase12_seo_geo_lockdown.test.ts',
];
// Explicitly NOT in the gate (network/live-endpoint class, Phase 12.26 baseline):
// corpus_pipeline_integrity, corpus_scale_test, deployment_guard,
// p03_runtime_contracts, telegram_pipeline.
// Also excluded until verified: remaining tests/unit/* and packages/**/__tests__/*.

const missing = SUITES.filter((f) => {
  try { fs.accessSync(f); return false; } catch { return true; }
});
if (missing.length > 0) {
  console.error(`[test:unit] MISSING suite files (gate is stale):\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

const r = spawnSync('bun', ['test', ...SUITES], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
// NOTE: `bun test` writes results and the summary line to STDERR, not stdout.
const combined = `${r.stdout || ''}\n${r.stderr || ''}`;
const m = /Ran (\d+) tests? across (\d+) files?/.exec(combined);
const ran = m ? Number(m[1]) : 0;
console.error(`[test:unit] bun exit=${r.status} tests_ran=${ran} files=${m ? m[2] : '?'}`);
if (r.status !== 0) {
  console.error('[test:unit] FAIL: bun test reported failures.');
  process.exit(1);
}
if (ran === 0) {
  console.error('[test:unit] FAIL: zero tests ran — gate refuses to pass silently.');
  process.exit(1);
}
console.error(`[test:unit] PASS: ${ran} tests ran with no failures.`);
