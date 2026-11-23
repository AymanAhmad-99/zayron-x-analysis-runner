/**
 * Preview report-store binding — ONE focused group.
 *
 * The deployed preview origin must read the CANONICAL intelligence API, the one
 * store proven to serve canonical malware reports. An environment-specific
 * fallback is exactly the defect this group guards against: it silently pointed
 * a deployed origin at a store that does not hold those reports, so the report
 * route rendered "Report not found" while the canonical API served HTTP 200.
 *
 * Local development stays valid: the environment variable always wins, nothing
 * is hard-coded into a component, and no localhost origin is assumed.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const read = (relative: string) => readFileSync(join(ROOT, relative), "utf8");

const API_SOURCE = read("apps/web/app/lib/api.ts");
const WRANGLER = JSON.parse(read("apps/web/wrangler.jsonc")) as {
  vars: Record<string, string>;
  env: Record<string, { vars: Record<string, string> }>;
};

const CANONICAL_API_BASE = "https://zayron-x-api.aabusabih.workers.dev/api/v1";
const PREVIEW_STORE_API_BASE = "https://zayron-x-api-preview.aabusabih.workers.dev/api/v1";

describe("preview report-store binding", () => {
  test("1. the fetch base defaults to the canonical intelligence API", () => {
    expect(API_SOURCE).toContain(CANONICAL_API_BASE);
    expect(API_SOURCE).not.toContain(PREVIEW_STORE_API_BASE);
    // The default is a fallback after the environment variable, never before it.
    expect(API_SOURCE).toContain(
      `process.env?.NEXT_PUBLIC_API_BASE_URL || "${CANONICAL_API_BASE}"`
    );
  });

  test("2. the canonical malware report fetch path is the report read path", () => {
    expect(API_SOURCE).toContain("`${API_BASE}/malware/intelligence/reports/${encodeURIComponent(id)}`");
    expect(API_SOURCE).toContain("`${API_BASE}/malware/intelligence/reports`");
  });

  test("3. every deployed preview binding resolves the canonical API", () => {
    expect(WRANGLER.vars.NEXT_PUBLIC_API_BASE_URL).toBe(CANONICAL_API_BASE);
    expect(WRANGLER.env.preview.vars.NEXT_PUBLIC_API_BASE_URL).toBe(CANONICAL_API_BASE);
    // No preview binding may point at the environment-specific store any more.
    const serialized = JSON.stringify(WRANGLER);
    expect(serialized).not.toContain("zayron-x-api-preview");
    // The production binding is untouched (its own canonical zone route).
    expect(WRANGLER.env.production.vars.NEXT_PUBLIC_API_BASE_URL).toBe("https://zayron-x.co/api/v1");
  });

  test("4. local development configuration remains valid", () => {
    // The override is read from the environment, so a local run can point
    // anywhere (including a loopback API) without touching code.
    expect(API_SOURCE).toMatch(/NEXT_PUBLIC_API_BASE_URL/);
    // No loopback origin is baked in as a default.
    expect(API_SOURCE).not.toMatch(/localhost|127\.0\.0\.1/);
    expect(JSON.stringify(WRANGLER)).not.toMatch(/localhost|127\.0\.0\.1/);
    // Exactly one base selection point: no competing per-route API base.
    expect(API_SOURCE.match(/const API_BASE =/g)?.length).toBe(1);
  });
});
