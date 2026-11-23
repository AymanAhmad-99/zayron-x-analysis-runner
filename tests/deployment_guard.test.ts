import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  evaluateWebPreviewTarget,
  WEB_PREVIEW_WORKER,
} from "../apps/web/scripts/preview-target-guard.mjs";
import {
  parseToml,
  evaluateApiPreviewTarget,
  API_PREVIEW_WORKER,
  API_PREVIEW_DB_ID,
  API_PRODUCTION_DB_ID,
} from "../workers/api/scripts/preview-target-guard.mjs";

const FIX = path.resolve(import.meta.dir, "fixtures/deployment-guard");
const readJson = (name: string) => JSON.parse(fs.readFileSync(path.join(FIX, name), "utf8"));
const readToml = (name: string) => fs.readFileSync(path.join(FIX, name), "utf8");

// ── Preview ZX_DB isolation (production reachability) ─────────────────────────
// `ZX_DB` is the canonical malware-report store binding. The preview environment
// must never carry the PRODUCTION database identity, in either the id or the
// name field. These strings are the exact blocks that appear in
// workers/api/wrangler.toml, so the tests below pin the real file.
const API_TOML_PATH = path.resolve(import.meta.dir, "../workers/api/wrangler.toml");
const readApiToml = () => fs.readFileSync(API_TOML_PATH, "utf8").replace(/\r\n/g, "\n");
const ZX_DB_PRODUCTION_BLOCK =
  'binding = "ZX_DB"\ndatabase_name = "zayron-x-db"\ndatabase_id = "c19c8f45-801b-4034-bd76-402e5e5389b5"';
const ZX_DB_ISOLATED_BLOCK =
  'binding = "ZX_DB"\ndatabase_name = "zayron-x-preview-db"\ndatabase_id = "34962f8f-abd1-4b0b-8bd7-b4eab59bd902"';
const PREVIEW_ZX_DB_TABLE = `[[env.preview.d1_databases]]\n${ZX_DB_ISOLATED_BLOCK}`;
/** The `[env.preview]` half of the file — the only part containment may touch. */
const previewSectionOf = (toml: string) => toml.slice(toml.indexOf("[env.preview]"));
// The TOP-LEVEL (production) section carries its own ZX_DB block, so the preview
// block must be addressed as the LAST occurrence, never the first.
function replaceLast(haystack: string, needle: string, replacement: string): string {
  const at = haystack.lastIndexOf(needle);
  if (at === -1) return haystack;
  return haystack.slice(0, at) + replacement + haystack.slice(at + needle.length);
}
/** Forges the pre-containment defect back into the REAL file (regression input). */
const forgePreviewZxDbProduction = (toml: string) =>
  replaceLast(toml, ZX_DB_ISOLATED_BLOCK, ZX_DB_PRODUCTION_BLOCK);
const removePreviewZxDb = (toml: string) => replaceLast(toml, PREVIEW_ZX_DB_TABLE, "");

const validWebPreview = {
  name: WEB_PREVIEW_WORKER,
  workers_dev: true,
  routes: [],
  vars: {
    ENVIRONMENT: "preview",
    NEXT_PUBLIC_SITE_URL: "https://zayron-x-web-preview.aabusabih.workers.dev",
    NEXT_PUBLIC_API_BASE_URL: "https://zayron-x-api-preview.aabusabih.workers.dev/api/v1",
  },
};

const validApiPreviewToml = `
name = "zayron-x-api"
main = "src/index.ts"
routes = [ { pattern = "zayron-x.co/api/*", zone_name = "zayron-x.co" } ]

[env.preview]
name = "${API_PREVIEW_WORKER}"
workers_dev = true
routes = []

[[env.preview.d1_databases]]
binding = "DB"
database_id = "34962f8f-abd1-4b0b-8bd7-b4eab59bd902"

[[env.preview.d1_databases]]
binding = "ZX_DB"
database_name = "zayron-x-preview-db"
database_id = "34962f8f-abd1-4b0b-8bd7-b4eab59bd902"

[env.preview.vars]
ENVIRONMENT = "preview"
ALLOWED_ORIGINS = "https://zayron-x-web-preview.aabusabih.workers.dev"

[[env.preview.services]]
binding = "INGEST"
service = "zayron-x-ingest-preview"

[[env.preview.services]]
binding = "TELEGRAM_COLLECTOR_SERVICE"
service = "zayron-telegram-collector-do-preview"

[[env.preview.queues.producers]]
binding = "INGEST_QUEUE"
queue = "zayron-ingest-queue-preview"

[[env.preview.vectorize]]
binding = "VECTORIZE"
index_name = "zayron-doc04-staging-index"
`;

describe("web preview guard", () => {
  test("accepts a valid preview config", () => {
    expect(evaluateWebPreviewTarget(readJson("web_preview_valid.json"))).toMatchObject({ ok: true });
  });

  test("rejects the production-shaped config (forged)", () => {
    const v = evaluateWebPreviewTarget(readJson("web_production_forged.json"));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PRODUCTION_TARGET");
  });

  test("rejects production route leakage", () => {
    const v = evaluateWebPreviewTarget(readJson("web_production_route_forged.json"));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PRODUCTION_ROUTE_LEAK");
  });

  test("rejects an ambiguous (non-flattened) config", () => {
    const v = evaluateWebPreviewTarget(readJson("web_ambiguous.json"));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("AMBIGUOUS_ENV_BLOCK");
  });

  test("rejects missing worker identity", () => {
    const v = evaluateWebPreviewTarget(readJson("web_missing_identity.json"));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("MISSING_IDENTITY");
  });

  test("rejects the redirected production identity (Phase E failure mode)", () => {
    const v = evaluateWebPreviewTarget(readJson("web_redirected_production.json"));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PRODUCTION_TARGET");
  });

  test("fails closed on missing environment", () => {
    const { ENVIRONMENT, ...vars } = validWebPreview.vars;
    const v = evaluateWebPreviewTarget({ ...validWebPreview, vars });
    expect(v.ok).toBe(false);
    expect(v.code).toBe("MISSING_ENVIRONMENT");
  });

  test("fails closed on workers_dev=false", () => {
    const v = evaluateWebPreviewTarget({ ...validWebPreview, workers_dev: false });
    expect(v.ok).toBe(false);
    expect(v.code).toBe("WORKERS_DEV_DISABLED");
  });

  test("fails closed on unknown worker", () => {
    const v = evaluateWebPreviewTarget({ ...validWebPreview, name: "some-other-worker" });
    expect(v.ok).toBe(false);
    expect(v.code).toBe("UNKNOWN_WORKER");
  });

  test("fails closed on unknown environment", () => {
    const v = evaluateWebPreviewTarget({
      ...validWebPreview,
      vars: { ...validWebPreview.vars, ENVIRONMENT: "staging" },
    });
    expect(v.ok).toBe(false);
    expect(v.code).toBe("UNKNOWN_ENVIRONMENT");
  });

  test("fails closed when the API binding points at production", () => {
    const v = evaluateWebPreviewTarget({
      ...validWebPreview,
      vars: { ...validWebPreview.vars, NEXT_PUBLIC_API_BASE_URL: "https://zayron-x.co/api/v1" },
    });
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PRODUCTION_API_BINDING");
  });

  test("fails closed when the site URL points at production", () => {
    const v = evaluateWebPreviewTarget({
      ...validWebPreview,
      vars: { ...validWebPreview.vars, NEXT_PUBLIC_SITE_URL: "https://zayron-x.co" },
    });
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PRODUCTION_SITE_URL");
  });

  test("fails closed on malformed input", () => {
    expect(evaluateWebPreviewTarget(null).ok).toBe(false);
    expect(evaluateWebPreviewTarget([]).ok).toBe(false);
  });
});

describe("api preview guard", () => {
  test("CONTAINED: the real wrangler.toml is accepted with the preview ZX_DB bound to the approved preview database", () => {
    const real = readApiToml();
    const preview = previewSectionOf(real);
    expect(preview).toContain(PREVIEW_ZX_DB_TABLE);
    const v = evaluateApiPreviewTarget(parseToml(real));
    expect(v.ok).toBe(true);
    expect(v.code).toBe("PREVIEW_VALID");
    // The production database identity appears NOWHERE in the preview env — not
    // as a binding id, not as a binding name, not anywhere in the effective model.
    expect(preview.includes("c19c8f45")).toBe(false);
    expect(preview.includes("zayron-x-db")).toBe(false);
  });

  test("resolves the dedicated Preview database identity EXACTLY, and it is not production", () => {
    const real = readApiToml();
    const parsed = parseToml(real) as any;
    const previewD1: any[] = parsed.env?.preview?.d1_databases ?? [];
    const zxdb = previewD1.find((b) => b.binding === "ZX_DB");
    expect(zxdb).toBeTruthy();
    expect(zxdb.database_id).toBe(API_PREVIEW_DB_ID);
    expect(zxdb.database_name).toBe("zayron-x-preview-db");
    expect(zxdb.database_id).not.toBe(API_PRODUCTION_DB_ID);
    // The preview report store and the preview primary store are the same verified
    // dedicated database, and neither is the production database.
    expect(previewD1.find((b) => b.binding === "DB")?.database_id).toBe(API_PREVIEW_DB_ID);
    // Exact resolution in BOTH directions: the approved identity is accepted here,
    // and every other identity is refused (see the UNKNOWN_ZXDB / PRODUCTION cases).
    expect(evaluateApiPreviewTarget(parseToml(real))).toMatchObject({ ok: true, code: "PREVIEW_VALID" });
  });

  test("the PRODUCTION configuration is untouched by containment", () => {
    const real = readApiToml();
    // Exactly two ZX_DB blocks remain: the top-level production one and the
    // isolated preview one. No production identity was removed or rewritten.
    expect(real.split(ZX_DB_PRODUCTION_BLOCK).length - 1).toBe(1);
    expect(real.split(ZX_DB_ISOLATED_BLOCK).length - 1).toBe(1);
    const production = real.slice(0, real.indexOf("[env.preview]"));
    expect(production).toContain(ZX_DB_PRODUCTION_BLOCK);
    const parsed = parseToml(real) as any;
    const topLevelZx = (parsed.d1_databases ?? []).find((b: any) => b.binding === "ZX_DB");
    expect(topLevelZx?.database_id).toBe(API_PRODUCTION_DB_ID);
    expect(topLevelZx?.database_name).toBe("zayron-x-db");
  });

  test("accepts a preview environment with the ZX_DB binding removed entirely", () => {
    const withoutZx = removePreviewZxDb(readApiToml());
    expect(withoutZx).not.toContain(PREVIEW_ZX_DB_TABLE);
    expect(evaluateApiPreviewTarget(parseToml(withoutZx))).toMatchObject({ ok: true });
  });

  test("REGRESSION: fails closed if the production database identity returns to the preview ZX_DB", () => {
    const forged = forgePreviewZxDbProduction(readApiToml());
    expect(forged).not.toBe(readApiToml());
    const v = evaluateApiPreviewTarget(parseToml(forged));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PREVIEW_ZX_DB_PRODUCTION");
  });

  test("fails closed when ZX_DB points at a database that is not the approved preview database", () => {
    const forged = readApiToml().replace(
      ZX_DB_ISOLATED_BLOCK,
      ZX_DB_ISOLATED_BLOCK.replace("34962f8f-abd1-4b0b-8bd7-b4eab59bd902", "00000000-0000-4000-8000-000000000000"),
    );
    const v = evaluateApiPreviewTarget(parseToml(forged));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("UNKNOWN_ZXDB");
  });

  test("fails closed on a production ZX_DB database_name even with the preview id", () => {
    const forged = readApiToml().replace(
      'binding = "ZX_DB"\ndatabase_name = "zayron-x-preview-db"',
      'binding = "ZX_DB"\ndatabase_name = "zayron-x-db"',
    );
    const v = evaluateApiPreviewTarget(parseToml(forged));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PRODUCTION_REFERENCE");
  });

  test("fails closed on a MISSING preview ZX_DB database identity", () => {
    const forged = readApiToml().replace(
      `${ZX_DB_ISOLATED_BLOCK}`,
      'binding = "ZX_DB"\ndatabase_name = "zayron-x-preview-db"',
    );
    const v = evaluateApiPreviewTarget(parseToml(forged));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("UNKNOWN_ZXDB");
  });

  test("fails closed on AMBIGUOUS duplicate preview ZX_DB bindings", () => {
    // An extra ZX_DB pointing at production, alongside the isolated one: the
    // binding-level check and the independent production-reference scan must both
    // reject it, whichever binding a reader resolves first.
    const real = readApiToml();
    const preview = previewSectionOf(real);
    const forged = real.replace(
      preview,
      preview.replace(
        PREVIEW_ZX_DB_TABLE,
        `[[env.preview.d1_databases]]\n${ZX_DB_PRODUCTION_BLOCK}\n\n${PREVIEW_ZX_DB_TABLE}`,
      ),
    );
    const v = evaluateApiPreviewTarget(parseToml(forged));
    expect(v.ok).toBe(false);
    expect(["PREVIEW_ZX_DB_PRODUCTION", "PRODUCTION_REFERENCE", "UNKNOWN_ZXDB"]).toContain(v.code);
  });

  test("the preview malware-report read routes have NO silent fallback to another binding", () => {
    // Static invariant (Wave 4A contract): the two malware-report read routes
    // resolve the canonical store from EXACTLY ONE binding, `env.DB`, which is
    // bound per environment (the preview environment binds the preview database),
    // so retargeting or removing the binding can never make the preview host read
    // production data through a second path.
    //
    // Wave 4A repointed these reads from the duplicate `ZX_DB` binding to `DB`
    // (both point at the same database_id; only `DB` is environment-scoped). This
    // assertion pins that contract instead of the retired `env.ZX_DB` read.
    const src = fs.readFileSync(path.resolve(import.meta.dir, "../workers/api/src/index.ts"), "utf8");
    const start = src.indexOf("if (path === '/api/v1/malware/intelligence/reports'");
    const end = src.indexOf("// ── GET /api/v1/malware ──", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const region = src.slice(start, end);

    // 1. Exactly one binding, taken explicitly: both routes bind `const zx = env.DB;`.
    expect(region.match(/const zx = env\.DB;/g)).toHaveLength(2);

    // 2. The retired duplicate binding is never read here.
    expect(region).not.toContain("env.ZX_DB");
    expect(region).not.toContain("ZX_DB_UNCONFIGURED");

    // 3. NO silent fallback: no `||`/`??` chain may pick another D1 binding.
    expect(region).not.toMatch(/env\.\w+\s*(?:\|\||\?\?)/);
    expect(region).not.toMatch(/(?:\|\||\?\?)\s*env\./);
    expect(region).not.toMatch(/env\.DB\s*\?\?|env\.DB\s*\|\|/);

    // 4. Both routes still go through the canonical read gate (never a raw query
    //    that could bypass the withheld/invalid-row exclusion).
    expect(region).toContain("loadServableMalwareReports(");
    expect(region).toContain("loadServableMalwareReport(");
  });

  test("accepts ZX_DB bound to the approved preview database (isolated replica)", () => {
    const fixture = readToml("api_preview_valid.toml");
    expect(fixture).toContain(ZX_DB_ISOLATED_BLOCK);
    expect(evaluateApiPreviewTarget(parseToml(fixture))).toMatchObject({ ok: true });
  });

  test("accepts a valid preview fixture", () => {
    expect(evaluateApiPreviewTarget(parseToml(readToml("api_preview_valid.toml")))).toMatchObject({ ok: true });
  });

  test("rejects the production worker identity in env.preview", () => {
    const v = evaluateApiPreviewTarget(parseToml(readToml("api_production_forged.toml")));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PRODUCTION_TARGET");
  });

  test("rejects production route leakage", () => {
    const v = evaluateApiPreviewTarget(parseToml(readToml("api_production_route_forged.toml")));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PRODUCTION_ROUTE_LEAK");
  });

  test("rejects an undefined preview environment", () => {
    const v = evaluateApiPreviewTarget(parseToml(readToml("api_ambiguous.toml")));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("MISSING_ENVIRONMENT");
  });

  test("rejects missing worker identity", () => {
    const v = evaluateApiPreviewTarget(parseToml(readToml("api_missing_identity.toml")));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("MISSING_IDENTITY");
  });

  test("rejects a D1 DB binding to the production database", () => {
    const v = evaluateApiPreviewTarget(parseToml(readToml("api_production_binding_forged.toml")));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PRODUCTION_D1_BINDING");
  });

  test("rejects a service binding to the production service", () => {
    const forged = validApiPreviewToml.replace("zayron-x-ingest-preview", "zayron-x-ingest");
    const v = evaluateApiPreviewTarget(parseToml(forged));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PRODUCTION_SERVICE_BINDING");
  });

  test("rejects a vectorize binding to the production index", () => {
    const forged = validApiPreviewToml.replace("zayron-doc04-staging-index", "zayron-knowledge-index");
    const v = evaluateApiPreviewTarget(parseToml(forged));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PRODUCTION_VECTORIZE_BINDING");
  });

  test("rejects a queue producer bound to the production queue", () => {
    const forged = validApiPreviewToml.replace("zayron-ingest-queue-preview", "zayron-ingest-queue");
    const v = evaluateApiPreviewTarget(parseToml(forged));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PRODUCTION_QUEUE_BINDING");
  });

  test("rejects malformed input", () => {
    expect(evaluateApiPreviewTarget(null).ok).toBe(false);
    expect(evaluateApiPreviewTarget([]).ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE F.5 — wrapper-level tests. Everything below uses synthetic fixtures in
// temp dirs and a FAKE Wrangler binary. No test can contact Cloudflare.
// ─────────────────────────────────────────────────────────────────────────────

const REPO = path.resolve(import.meta.dir, "..");
const WEB_WRAPPER = path.join(REPO, "apps/web/scripts/deploy-preview.mjs");
const API_WRAPPER = path.join(REPO, "workers/api/scripts/deploy-preview.mjs");
const GATE = path.join(REPO, "scripts/release/production-release-gate.mjs");
const tmpRoots: string[] = [];
const mk = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "zx-guard-"));
  tmpRoots.push(d);
  return d;
};
afterAll(() => {
  for (const d of tmpRoots) fs.rmSync(d, { recursive: true, force: true });
});

const FAKE_WRANGLER = path.join(mk(), "fake-wrangler.cjs");
fs.writeFileSync(
  FAKE_WRANGLER,
  "require('fs').writeFileSync(process.env.FAKE_WRANGLER_MARKER, JSON.stringify(process.argv.slice(2)));",
);

type RunResult = { exit: number; called: boolean; calledArgs: string[]; stderr: string; stdout: string };
function runWrapper(script: string, args: string[], opts: { cwd?: string } = {}): RunResult {
  const marker = path.join(mk(), "marker.json");
  const r = Bun.spawnSync(["node", script, ...args], {
    cwd: opts.cwd ?? REPO,
    env: { ...process.env, ZAYRON_WRANGLER_BIN: FAKE_WRANGLER, FAKE_WRANGLER_MARKER: marker },
    stdout: "pipe",
    stderr: "pipe",
  });
  const called = fs.existsSync(marker);
  return {
    exit: r.exitCode ?? -1,
    called,
    calledArgs: called ? JSON.parse(fs.readFileSync(marker, "utf8")) : [],
    stderr: r.stderr.toString(),
    stdout: r.stdout.toString(),
  };
}

const PREVIEW_WEB: any = JSON.parse(readFileSyncSafe("web_preview_valid.json"));
function readFileSyncSafe(name: string) {
  return fs.readFileSync(path.join(FIX, name), "utf8");
}
const PRODUCTION_WEB: any = {
  name: "zayron-x-web",
  workers_dev: false,
  routes: [{ pattern: "zayron-x.co/*", zone_name: "zayron-x.co" }],
  vars: {
    ENVIRONMENT: "production",
    NEXT_PUBLIC_SITE_URL: "https://zayron-x.co",
    NEXT_PUBLIC_API_BASE_URL: "https://zayron-x.co/api/v1",
  },
};

/** Build a synthetic web project: dist configs + the vinext/Wrangler redirect. */
function webProject(files: Record<string, unknown>, redirectTo: string | null = "dist/server/wrangler.json") {
  const root = mk();
  for (const [rel, cfg] of Object.entries(files)) {
    const f = path.join(root, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, typeof cfg === "string" ? cfg : JSON.stringify(cfg));
  }
  if (redirectTo !== null) {
    const rf = path.join(root, ".wrangler/deploy/config.json");
    fs.mkdirSync(path.dirname(rf), { recursive: true });
    const rel = path.relative(path.dirname(rf), path.join(root, redirectTo));
    fs.writeFileSync(rf, JSON.stringify({ configPath: rel, auxiliaryWorkers: [] }));
  }
  return root;
}
const webRun = (root: string, extra: string[] = [], cwd?: string) =>
  runWrapper(WEB_WRAPPER, ["--project-dir", root, "--no-prepare", ...extra], { cwd });

describe("F.5 web preview wrapper — synthetic fixture matrix (exit codes + no deploy)", () => {
  const cases: Array<[string, any, number]> = [
    ["WEB_VALID_PREVIEW", PREVIEW_WEB, 0],
    ["WEB_PRODUCTION_CONFIG", PRODUCTION_WEB, 1],
    ["WEB_PRODUCTION_ROUTE", { ...PREVIEW_WEB, routes: [{ pattern: "zayron-x.co/*" }] }, 1],
    ["WEB_PRODUCTION_ROUTE_SINGULAR", { ...PREVIEW_WEB, route: "zayron-x.co/*" }, 1],
    ["WEB_PRODUCTION_BINDING_D1", { ...PREVIEW_WEB, d1_databases: [{ binding: "DB", database_id: "c19c8f45-801b-4034-bd76-402e5e5389b5" }] }, 1],
    ["WEB_PRODUCTION_BINDING_SERVICE", { ...PREVIEW_WEB, services: [{ binding: "API", service: "zayron-x-api" }] }, 1],
    ["WEB_PRODUCTION_BINDING_R2", { ...PREVIEW_WEB, r2_buckets: [{ binding: "K", bucket_name: "zayron-x-knowledge" }] }, 1],
    ["WEB_PRODUCTION_BINDING_QUEUE", { ...PREVIEW_WEB, queues: { producers: [{ binding: "Q", queue: "zayron-ingest-queue" }] } }, 1],
    ["WEB_UNCLASSIFIED_BINDING", { ...PREVIEW_WEB, kv_namespaces: [{ binding: "KV", id: "abc" }] }, 1],
    ["WEB_PRODUCTION_HOST_SITE", { ...PREVIEW_WEB, vars: { ...PREVIEW_WEB.vars, NEXT_PUBLIC_SITE_URL: "https://zayron-x.co" } }, 1],
    ["WEB_PRODUCTION_HOST_API", { ...PREVIEW_WEB, vars: { ...PREVIEW_WEB.vars, NEXT_PUBLIC_API_BASE_URL: "https://zayron-x-api.aabusabih.workers.dev/api/v1" } }, 1],
    ["WEB_PRODUCTION_HOST_HIDDEN_VAR", { ...PREVIEW_WEB, vars: { ...PREVIEW_WEB.vars, SOME_OTHER: "https://www.zayron-x.co/x" } }, 1],
    ["WEB_MISSING_API_TARGET", { ...PREVIEW_WEB, vars: { ENVIRONMENT: "preview", NEXT_PUBLIC_SITE_URL: PREVIEW_WEB.vars.NEXT_PUBLIC_SITE_URL } }, 1],
    ["WEB_AMBIGUOUS_ENV_BLOCK", { ...PREVIEW_WEB, env: { production: { name: "zayron-x-web" } } }, 1],
    ["WEB_AMBIGUOUS_WORKERS_DEV", (({ workers_dev, ...r }) => r)(PREVIEW_WEB), 1],
    ["WEB_AMBIGUOUS_ROUTES", (({ routes, ...r }) => r)(PREVIEW_WEB), 1],
    ["WEB_MISSING_IDENTITY", (({ name, ...r }) => r)(PREVIEW_WEB), 1],
    ["WEB_UNKNOWN_ENV", { ...PREVIEW_WEB, vars: { ...PREVIEW_WEB.vars, ENVIRONMENT: "staging" } }, 1],
    ["WEB_MISSING_ENV", { ...PREVIEW_WEB, vars: { NEXT_PUBLIC_SITE_URL: PREVIEW_WEB.vars.NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_API_BASE_URL: PREVIEW_WEB.vars.NEXT_PUBLIC_API_BASE_URL } }, 1],
    ["WEB_UNKNOWN_WORKER", { ...PREVIEW_WEB, name: "some-other-worker" }, 1],
    [
      "WEB_MIXED_RESOURCES",
      { ...PREVIEW_WEB, services: [{ binding: "INGEST", service: "zayron-x-ingest" }], d1_databases: [{ binding: "DB", database_id: "34962f8f-abd1-4b0b-8bd7-b4eab59bd902" }] },
      1,
    ],
  ];
  for (const [label, cfg, expected] of cases) {
    test(`${label} → exit ${expected}`, () => {
      const r = webRun(webProject({ "dist/server/wrangler.json": cfg }));
      expect(r.exit).toBe(expected);
      expect(r.called).toBe(expected === 0); // fake Wrangler runs ONLY for the valid preview
    });
  }

  test("WEB_MALFORMED_CONFIG (not JSON) → exit 1, no deploy", () => {
    const r = webRun(webProject({ "dist/server/wrangler.json": "{ not json" }));
    expect(r.exit).toBe(1);
    expect(r.called).toBe(false);
  });

  test("WEB_REDIRECT_MISSING (Wrangler would fall back to production top-level) → exit 1", () => {
    const r = webRun(webProject({ "dist/server/wrangler.json": PREVIEW_WEB }, null));
    expect(r.exit).toBe(1);
    expect(r.called).toBe(false);
  });

  test("WEB_REDIRECT_TARGET_MISSING → exit 1", () => {
    const r = webRun(webProject({}, "dist/server/wrangler.json"));
    expect(r.exit).toBe(1);
    expect(r.called).toBe(false);
  });

  test("WEB_REDIRECT_ESCAPES_PROJECT → exit 1", () => {
    const root = webProject({ "dist/server/wrangler.json": PREVIEW_WEB });
    fs.writeFileSync(path.join(root, ".wrangler/deploy/config.json"), JSON.stringify({ configPath: "../../../../elsewhere.json", auxiliaryWorkers: [] }));
    const r = webRun(root);
    expect(r.exit).toBe(1);
    expect(r.called).toBe(false);
  });

  test("WEB_REDIRECT_AUXILIARY_WORKERS (unvalidated extra workers) → exit 1", () => {
    const root = webProject({ "dist/server/wrangler.json": PREVIEW_WEB });
    fs.writeFileSync(path.join(root, ".wrangler/deploy/config.json"), JSON.stringify({ configPath: "../../dist/server/wrangler.json", auxiliaryWorkers: [{ configPath: "x.json" }] }));
    const r = webRun(root);
    expect(r.exit).toBe(1);
    expect(r.called).toBe(false);
  });

  test("valid preview: fake Wrangler is called with the EXACT validated config, never --env", () => {
    const root = webProject({ "dist/server/wrangler.json": PREVIEW_WEB });
    const r = webRun(root);
    expect(r.exit).toBe(0);
    expect(r.calledArgs).toEqual(["deploy", "--config", path.join(root, "dist/server/wrangler.json")]);
  });
});

describe("F.5 web — config REDIRECTION defense (the Phase E failure mode)", () => {
  test("redirect → production-shaped generated config: guard exits 1, deployment never starts", () => {
    // A valid-looking preview file sits at the DEFAULT path, but the redirect
    // (what Wrangler actually consumes) points at a production-shaped file.
    const root = webProject(
      { "dist/server/wrangler.json": PREVIEW_WEB, "dist/other/wrangler.json": PRODUCTION_WEB },
      "dist/other/wrangler.json",
    );
    const r = webRun(root);
    expect(r.exit).toBe(1);
    expect(r.called).toBe(false);
    expect(r.stderr).toContain("PRODUCTION_TARGET");
  });

  test("the guard validates the REDIRECT TARGET, not the default path (preview target accepted even if default path is production)", () => {
    const root = webProject(
      { "dist/server/wrangler.json": PRODUCTION_WEB, "dist/other/wrangler.json": PREVIEW_WEB },
      "dist/other/wrangler.json",
    );
    const r = webRun(root);
    expect(r.exit).toBe(0);
    expect(r.calledArgs[2]).toBe(path.join(root, "dist/other/wrangler.json"));
  });

  test("a post-prepare production edit is detected (wrapper does not trust prepare output)", () => {
    const root = webProject({ "dist/server/wrangler.json": PREVIEW_WEB });
    expect(webRun(root).exit).toBe(0);
    for (const tweak of [
      { name: "zayron-x-web" },
      { routes: [{ pattern: "zayron-x.co/*" }] },
      { vars: { ...PREVIEW_WEB.vars, ENVIRONMENT: "production" } },
      { vars: { ...PREVIEW_WEB.vars, NEXT_PUBLIC_SITE_URL: "https://zayron-x.co" } },
      { d1_databases: [{ binding: "DB", database_id: "c19c8f45-801b-4034-bd76-402e5e5389b5" }] },
      { r2_buckets: [{ binding: "K", bucket_name: "zayron-x-knowledge" }] },
      { services: [{ binding: "A", service: "zayron-x-api" }] },
      { queues: { producers: [{ binding: "Q", queue: "zayron-ingest-queue" }] } },
    ]) {
      fs.writeFileSync(path.join(root, "dist/server/wrangler.json"), JSON.stringify({ ...PREVIEW_WEB, ...tweak }));
      const r = webRun(root);
      expect(r.exit).toBe(1);
      expect(r.called).toBe(false);
    }
  });
});

describe("F.5 web — working directory and CLI flag independence", () => {
  const root = () => webProject({ "dist/server/wrangler.json": PREVIEW_WEB });
  for (const [label, cwd] of [
    ["repository root", REPO],
    ["apps/web", path.join(REPO, "apps/web")],
    ["workers/api", path.join(REPO, "workers/api")],
    ["temporary directory", os.tmpdir()],
  ] as const) {
    test(`valid preview resolves identically from ${label}`, () => {
      const r = webRun(root(), [], cwd);
      expect(r.exit).toBe(0);
      expect(r.called).toBe(true);
    });
    test(`production config is refused from ${label}`, () => {
      const r = webRun(webProject({ "dist/server/wrangler.json": PRODUCTION_WEB }), [], cwd);
      expect(r.exit).toBe(1);
      expect(r.called).toBe(false);
    });
  }

  test("default project dir is derived from the script location, not cwd (real repo, dry-run, from a temp cwd)", () => {
    const r = runWrapper(WEB_WRAPPER, ["--no-prepare", "--dry-run"], { cwd: os.tmpdir() });
    // Exit code depends on whether a local build exists; it must never be a
    // deploy, and the reported path must be inside apps/web.
    expect(r.called).toBe(false);
    expect(`${r.stdout}${r.stderr}`).toContain(path.join("apps", "web"));
  });

  for (const [label, args, expected] of [
    ["no --env", [], 0],
    ["--env preview", ["--env", "preview"], 0],
    ["--env=preview", ["--env=preview"], 0],
    ["wrong environment (--env production)", ["--env", "production"], 1],
    ["--env=production", ["--env=production"], 1],
    ["unknown environment (--env staging)", ["--env", "staging"], 1],
    ["--env with no value", ["--env"], 1],
    ["worker-name override (--name)", ["--name", "zayron-x-web"], 1],
    ["config override (--config)", ["--config", "wrangler.jsonc"], 1],
    ["route override (--routes)", ["--routes", "zayron-x.co/*"], 1],
  ] as Array<[string, string[], number]>) {
    test(`web wrapper flag variation: ${label} → exit ${expected}`, () => {
      const r = webRun(webProject({ "dist/server/wrangler.json": PREVIEW_WEB }), args);
      expect(r.exit).toBe(expected);
      expect(r.called).toBe(expected === 0);
    });
  }

  test("dry-run runs the guard, shows the target, and never calls Wrangler", () => {
    const root = webProject({ "dist/server/wrangler.json": PREVIEW_WEB });
    const r = webRun(root, ["--dry-run"]);
    expect(r.exit).toBe(0);
    expect(r.called).toBe(false);
    expect(r.stdout).toContain("zayron-x-web-preview");
    expect(r.stdout).toContain("nothing uploaded or deployed");
  });

  test("dry-run still refuses production", () => {
    const r = webRun(webProject({ "dist/server/wrangler.json": PRODUCTION_WEB }), ["--dry-run"]);
    expect(r.exit).toBe(1);
  });
});

// ── API ──────────────────────────────────────────────────────────────────────
const REAL_API_TOML = readApiToml();
const PREVIEW_AT = REAL_API_TOML.indexOf("[env.preview]");
const API_HEAD = REAL_API_TOML.slice(0, PREVIEW_AT);
const API_TAIL = REAL_API_TOML.slice(PREVIEW_AT);
// CONTAINMENT (2026-10-10): the real file's preview `ZX_DB` now points at the
// approved preview database, so the REAL file is the valid preview target. The
// pre-containment shape (production identity inside the preview env) is
// reconstructed explicitly here and must still be REFUSED by the wrapper.
const REAL_API_TOML_PRECONTAINMENT = API_HEAD + forgePreviewZxDbProduction(API_TAIL);

function apiProject(toml: string, redirect = false) {
  const root = mk();
  fs.writeFileSync(path.join(root, "wrangler.toml"), toml);
  if (redirect) {
    fs.mkdirSync(path.join(root, ".wrangler/deploy"), { recursive: true });
    fs.writeFileSync(path.join(root, ".wrangler/deploy/config.json"), JSON.stringify({ configPath: "../../wrangler.toml" }));
  }
  return root;
}
const apiRun = (root: string, extra: string[] = [], cwd?: string) => runWrapper(API_WRAPPER, ["--project-dir", root, ...extra], { cwd });
const tail = (from: string, to: string) => {
  const normFrom = from.replace(/\r\n/g, "\n");
  if (!API_TAIL.includes(normFrom)) {
    throw new Error(`tail: pattern not found in API_TAIL: ${JSON.stringify(normFrom)}`);
  }
  return API_HEAD + API_TAIL.replace(normFrom, to);
};

describe("F.5 API preview wrapper — synthetic fixture matrix (exit codes + no deploy)", () => {
  const cases: Array<[string, string, number]> = [
    ["API_ZX_DB_PRODUCTION (pre-containment shape)", REAL_API_TOML_PRECONTAINMENT, 1],
    ["API_VALID_PREVIEW (the real, contained config)", REAL_API_TOML, 0],
    ["API_PRODUCTION_CONFIG (env.preview.name = production)", tail('name = "zayron-x-api-preview"', 'name = "zayron-x-api"'), 1],
    ["API_PRODUCTION_D1", tail("34962f8f-abd1-4b0b-8bd7-b4eab59bd902", "c19c8f45-801b-4034-bd76-402e5e5389b5"), 1],
    ["API_PRODUCTION_R2", API_HEAD + API_TAIL + '\n[[env.preview.r2_buckets]]\nbinding = "KNOWLEDGE_BUCKET"\nbucket_name = "zayron-x-knowledge"\n', 1],
    ["API_PRODUCTION_QUEUE", tail('queue = "zayron-ingest-queue-preview"', 'queue = "zayron-ingest-queue"'), 1],
    ["API_PRODUCTION_SERVICE", tail('service = "zayron-x-ingest-preview"', 'service = "zayron-x-ingest"'), 1],
    ["API_PRODUCTION_ROUTE", tail("routes = []", 'routes = [ { pattern = "zayron-x.co/api/*", zone_name = "zayron-x.co" } ]'), 1],
    ["API_PRODUCTION_HOST (var)", tail('ENVIRONMENT = "preview"', 'ENVIRONMENT = "preview"\nUPSTREAM = "https://zayron-x.co/api"'), 1],
    ["API_PRODUCTION_VECTORIZE", tail("zayron-doc04-staging-index", "zayron-knowledge-index"), 1],
    ["API_PRODUCTION_WORKFLOW", API_HEAD + API_TAIL + '\n[[env.preview.workflows]]\nname = "zayron-research-workflow"\nbinding = "RESEARCH_WORKFLOW"\nclass_name = "ResearchWorkflow"\n', 1],
    ["API_UNCLASSIFIED_KEY (kv)", API_HEAD + API_TAIL + '\n[[env.preview.kv_namespaces]]\nbinding = "KV"\nid = "abc"\n', 1],
    ["API_UNCLASSIFIED_KEY (singular route)", tail("routes = []", 'routes = []\nroute = "zayron-x.co/api/*"'), 1],
    ["API_NO_PREVIEW_ENV", API_HEAD, 1],
    ["API_MISSING_IDENTITY", tail('name = "zayron-x-api-preview"\n', ""), 1],
    ["API_UNKNOWN_WORKER", tail('name = "zayron-x-api-preview"', 'name = "zayron-x-api-staging"'), 1],
    ["API_WORKERS_DEV_FALSE", tail("workers_dev = true", "workers_dev = false"), 1],
    ["API_UNKNOWN_ENV", tail('ENVIRONMENT = "preview"', 'ENVIRONMENT = "staging"'), 1],
    ["API_MIXED_RESOURCES", tail('service = "zayron-x-ingest-preview"', 'service = "zayron-x-ingest"').replace("34962f8f-abd1-4b0b-8bd7-b4eab59bd902", "34962f8f-abd1-4b0b-8bd7-b4eab59bd902"), 1],
    ["API_MALFORMED_TOML (unparseable value)", API_HEAD + API_TAIL + "\nbroken = not_a_value\n", 1],
  ];
  for (const [label, toml, expected] of cases) {
    test(`${label} → exit ${expected}`, () => {
      const r = apiRun(apiProject(toml));
      expect(r.exit).toBe(expected);
      expect(r.called).toBe(expected === 0);
    });
  }

  test("API_REDIRECTED_PRODUCTION_CONFIG (redirect present) → exit 1, no deploy", () => {
    const r = apiRun(apiProject(REAL_API_TOML, true));
    expect(r.exit).toBe(1);
    expect(r.called).toBe(false);
    expect(r.stderr).toContain("REDIRECT_PRESENT");
  });

  test("valid preview: fake Wrangler gets the exact validated --config and --env preview", () => {
    const root = apiProject(REAL_API_TOML);
    const r = apiRun(root);
    expect(r.exit).toBe(0);
    expect(r.calledArgs).toEqual(["deploy", "--config", path.join(root, "wrangler.toml"), "--env", "preview"]);
  });

  for (const [label, cwd] of [
    ["repository root", REPO],
    ["apps/web", path.join(REPO, "apps/web")],
    ["workers/api", path.join(REPO, "workers/api")],
    ["temporary directory", os.tmpdir()],
  ] as const) {
    test(`valid preview resolves identically from ${label}`, () => {
      const r = apiRun(apiProject(REAL_API_TOML), [], cwd);
      expect(r.exit).toBe(0);
      expect(r.called).toBe(true);
    });
    test(`production-shaped config is refused from ${label}`, () => {
      const r = apiRun(apiProject(tail('name = "zayron-x-api-preview"', 'name = "zayron-x-api"')), [], cwd);
      expect(r.exit).toBe(1);
      expect(r.called).toBe(false);
    });
  }

  for (const [label, args, expected] of [
    ["no --env", [], 0],
    ["--env preview", ["--env", "preview"], 0],
    ["wrong environment (--env production)", ["--env", "production"], 1],
    ["unknown environment (--env staging)", ["--env=staging"], 1],
    ["config override (--config)", ["--config", "wrangler.toml"], 1],
    ["name override (--name)", ["--name", "zayron-x-api"], 1],
  ] as Array<[string, string[], number]>) {
    test(`api wrapper flag variation: ${label} → exit ${expected}`, () => {
      const r = apiRun(apiProject(REAL_API_TOML), args);
      expect(r.exit).toBe(expected);
      expect(r.called).toBe(expected === 0);
    });
  }

  test("API dry-run runs the guard, shows the target, never calls Wrangler", () => {
    const r = apiRun(apiProject(REAL_API_TOML), ["--dry-run"]);
    expect(r.exit).toBe(0);
    expect(r.called).toBe(false);
    expect(r.stdout).toContain("nothing uploaded or deployed");
  });

  test("API dry-run still refuses production", () => {
    expect(apiRun(apiProject(tail('name = "zayron-x-api-preview"', 'name = "zayron-x-api"')), ["--dry-run"]).exit).toBe(1);
  });

  test("API dry-run refuses the pre-containment shape and allows the contained real config", () => {
    const refused = apiRun(apiProject(REAL_API_TOML_PRECONTAINMENT), ["--dry-run"]);
    expect(refused.exit).toBe(1);
    expect(refused.called).toBe(false);
    expect(refused.stderr).toContain("PREVIEW_ZX_DB_PRODUCTION");

    const allowed = apiRun(apiProject(REAL_API_TOML), ["--dry-run"]);
    expect(allowed.exit).toBe(0);
    expect(allowed.called).toBe(false);
    expect(allowed.stdout).toContain("nothing uploaded or deployed");
  });
});

describe("F.5 API TOML parser safety (must never misclassify production as preview)", () => {
  const withPreview = (extra: string) => `${API_HEAD}${API_TAIL}\n${extra}\n`;

  test("the real wrangler.toml parses and is ACCEPTED (contained ZX_DB)", () => {
    const v = evaluateApiPreviewTarget(parseToml(REAL_API_TOML));
    expect(v.ok).toBe(true);
    expect(v.code).toBe("PREVIEW_VALID");
  });

  test("the pre-containment shape parses and is refused", () => {
    const v = evaluateApiPreviewTarget(parseToml(REAL_API_TOML_PRECONTAINMENT));
    expect(v.ok).toBe(false);
    expect(v.code).toBe("PREVIEW_ZX_DB_PRODUCTION");
  });
  test("comments (incl. '#' inside quoted strings) are handled", () => {
    const doc: any = parseToml('a = "x#y" # trailing\n# full line\nb = 1');
    expect(doc.a).toBe("x#y");
    expect(doc.b).toBe(1);
  });
  test("multiline arrays parse", () => {
    const doc: any = parseToml('xs = [\n  "a", # c\n  "b",\n]\n');
    expect(doc.xs).toEqual(["a", "b"]);
  });
  test("arrays of tables, nested sections, and ordering (preview before top-level) parse", () => {
    const doc: any = parseToml('[env.preview]\nname = "p"\n[[env.preview.services]]\nbinding = "A"\n[[env.preview.services]]\nbinding = "B"\n[top]\nx = 1');
    expect(doc.env.preview.services.map((s: any) => s.binding)).toEqual(["A", "B"]);
    expect(doc.top.x).toBe(1);
  });
  test("escaped characters in quoted strings", () => {
    const doc: any = parseToml('a = "q\\"uote"');
    expect(doc.a).toBe('q"uote');
  });
  test("whitespace variations", () => {
    const doc: any = parseToml("  a   =   1  \n\n\n[ t ]\n b= \"x\" ");
    expect(doc.a).toBe(1);
    expect(doc.t.b).toBe("x");
  });
  test("unknown fields do not make production look like preview", () => {
    const v = evaluateApiPreviewTarget(parseToml(withPreview("")));
    expect(v.ok).toBe(true);
    expect(evaluateApiPreviewTarget(parseToml(tail("routes = []", 'routes = []\nmystery = "x"'))).ok).toBe(false);
  });
  for (const [label, text] of [
    ["duplicate key", 'a = 1\na = 2'],
    ["duplicate table", "[t]\na = 1\n[t]\nb = 2"],
    ["dotted key (would silently nest in real TOML)", 'env.preview.name = "zayron-x-api-preview"'],
    ["quoted key", '"name" = "x"'],
    ["quoted table header", '["env"."preview"]\nname = "x"'],
    ["literal (single-quoted) string", "name = 'zayron-x-api-preview'"],
    ["multiline basic string", 'name = """zayron-x-api-preview"""'],
    ["bare unknown value", "name = zayron-x-api-preview"],
    ["statement without equals", "just_a_word"],
  ] as Array<[string, string]>) {
    test(`parser rejects (fails closed): ${label}`, () => {
      expect(() => parseToml(text)).toThrow();
    });
  }
  test("a parser rejection makes the WRAPPER exit 1 (no deploy)", () => {
    const r = apiRun(apiProject(`${API_HEAD}${API_TAIL}\nname = 'x'\n`));
    expect(r.exit).toBe(1);
    expect(r.called).toBe(false);
  });
  test("preview identity written with a literal string cannot pass", () => {
    const r = apiRun(apiProject(tail('name = "zayron-x-api-preview"', "name = 'zayron-x-api-preview'")));
    expect(r.exit).toBe(1);
    expect(r.called).toBe(false);
  });
});

// ── Direct Wrangler / package-script / CI bypass ────────────────────────────
const PACKAGES = ["apps/web", "workers/api", "workers/ingest", "workers/telegram-collector-do"];
const readScripts = (pkg: string): Record<string, string> =>
  JSON.parse(fs.readFileSync(path.join(REPO, pkg, "package.json"), "utf8")).scripts ?? {};

describe("F.5 package-script bypass", () => {
  test("no package script runs bare `wrangler deploy` / `versions` outside the guards", () => {
    for (const pkg of PACKAGES) {
      for (const [name, cmd] of Object.entries(readScripts(pkg))) {
        if (!/wrangler\s+(deploy|versions|publish)/.test(cmd)) continue;
        const viaGate = cmd.includes("production-release-gate.mjs");
        expect({ pkg, name, viaGate }).toEqual({ pkg, name, viaGate: true });
      }
    }
  });

  test("every generic `deploy` alias fails loudly (and is never a real deploy)", () => {
    for (const pkg of PACKAGES) {
      const cmd = readScripts(pkg).deploy;
      if (cmd === undefined) continue;
      expect(cmd).toContain("process.exit(1)");
      expect(cmd).not.toMatch(/wrangler/);
      const r = Bun.spawnSync(["npm", "run", "deploy", "--silent"], { cwd: path.join(REPO, pkg), stdout: "pipe", stderr: "pipe", shell: true } as any);
      expect(r.exitCode).toBe(1);
    }
  });

  test("web `deploy:production` is disabled (holding gate active)", () => {
    expect(readScripts("apps/web")["deploy:production"]).toContain("process.exit(1)");
  });

  test("preview scripts resolve to exactly one canonical guarded entrypoint per component", () => {
    expect(readScripts("apps/web")["deploy:preview"]).toBe("node scripts/deploy-preview.mjs");
    expect(readScripts("workers/api")["deploy:preview"]).toBe("node scripts/deploy-preview.mjs");
    expect(readScripts("apps/web")["deploy:preview:dry-run"]).toBe("node scripts/deploy-preview.mjs --dry-run");
    expect(readScripts("workers/api")["deploy:preview:dry-run"]).toBe("node scripts/deploy-preview.mjs --dry-run");
  });

  test("web `build` always emits a preview-shaped redirect target (bare `wrangler deploy` after a build cannot be production)", () => {
    expect(readScripts("apps/web").build).toContain("prepare-preview.js");
  });

  test("preview tooling has no production fallback branch", () => {
    for (const f of [WEB_WRAPPER, API_WRAPPER]) {
      const src = fs.readFileSync(f, "utf8");
      expect(src).not.toMatch(/production-release-gate/);
      expect(src).not.toMatch(/--env["',\s]+production/);
      expect(src).not.toMatch(/["']production["']\s*\]/);
    }
  });
});

describe("F.5 production process separation (explicit gate)", () => {
  const gate = (env: Record<string, string>, component = "demo") =>
    Bun.spawnSync(["node", GATE, component, "--", "node", "-e", "console.log('RAN')"], {
      env: { ...process.env, CI: "", ZAYRON_PRODUCTION_RELEASE_AUTHORIZED: "", ...env },
      stdout: "pipe",
      stderr: "pipe",
    });

  test("refuses without authorization (command not executed)", () => {
    const r = gate({});
    expect(r.exitCode).toBe(1);
    expect(r.stdout.toString()).not.toContain("RAN");
  });
  test("refuses authorization for a different component", () => {
    const r = gate({ ZAYRON_PRODUCTION_RELEASE_AUTHORIZED: "I-AUTHORIZE-PRODUCTION-DEPLOY:other" });
    expect(r.exitCode).toBe(1);
    expect(r.stdout.toString()).not.toContain("RAN");
  });
  test("refuses under CI even when authorized (no automatic production deploys)", () => {
    const r = gate({ CI: "true", ZAYRON_PRODUCTION_RELEASE_AUTHORIZED: "I-AUTHORIZE-PRODUCTION-DEPLOY:demo" });
    expect(r.exitCode).toBe(1);
    expect(r.stdout.toString()).not.toContain("RAN");
  });
  test("runs only with exact per-component authorization outside CI", () => {
    const r = gate({ ZAYRON_PRODUCTION_RELEASE_AUTHORIZED: "I-AUTHORIZE-PRODUCTION-DEPLOY:demo" });
    expect(r.exitCode).toBe(0);
    expect(r.stdout.toString()).toContain("RAN");
  });
  test("production package scripts all route through the gate", () => {
    for (const [pkg, name] of [["workers/api", "deploy:production"], ["workers/ingest", "deploy:production"], ["workers/telegram-collector-do", "deploy:production"], ["apps/web", "deploy:holding"]]) {
      expect(readScripts(pkg)[name]).toContain("production-release-gate.mjs");
    }
  });
});

describe("F.5 CI/CD protection", () => {
  test("no GitHub Actions workflow runs a Cloudflare deploy command", () => {
    const dir = path.join(REPO, ".github/workflows");
    for (const f of fs.readdirSync(dir)) {
      const text = fs.readFileSync(path.join(dir, f), "utf8");
      expect({ f, deploys: /wrangler\s+(deploy|versions|publish)|deploy:(preview|production|holding)|wrangler-action/.test(text) }).toEqual({ f, deploys: false });
    }
  });
});

