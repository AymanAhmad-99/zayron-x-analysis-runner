import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { RADAR_ATTACK_SUMMARY } from "../../workers/ingest/src/iocIngest";

/**
 * PHASE 7.2 regressions.
 *
 * 1. `/developers` shipped a self-serve form whose Turnstile widget never
 *    rendered: the CSP blocked `challenges.cloudflare.com` (script, frame and
 *    connect), and the container div carried only `data-sitekey` while
 *    Cloudflare's implicit rendering scans for `.cf-turnstile`. Every submit
 *    therefore reached the API without a token and got 403
 *    MISSING_TURNSTILE_TOKEN.
 * 2. The Radar daily pulse used `/radar/attacks/summary/layer3`, which is not a
 *    Radar route, so `radar_pulses` stayed empty and `latest_radar_pulse` was
 *    always null.
 */

const root = join(import.meta.dir, "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const NEXT_CONFIG = read("apps/web/next.config.ts");
const PAGE = read("apps/web/app/developers/page.tsx");
const PORTAL = read("apps/web/app/components/DeveloperPortal.tsx");
const INGEST = read("workers/ingest/src/iocIngest.ts");

/** Parse the single CSP literal out of next.config.ts into directive → sources. */
function cspDirectives(): Record<string, string[]> {
  const line = NEXT_CONFIG.split(/\r?\n/).find((candidate) => candidate.includes("default-src 'self'"));
  if (!line) throw new Error("no CSP literal in next.config.ts");
  const value = line.replace(/^\s*[^"]*"/, "").replace(/",?\s*$/, "");
  const out: Record<string, string[]> = {};
  for (const directive of value.split(";")) {
    const parts = directive.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;
    out[parts[0]] = parts.slice(1);
  }
  return out;
}

describe("Turnstile is allowed by the production CSP", () => {
  const csp = cspDirectives();
  const ORIGIN = "https://challenges.cloudflare.com";

  test("script-src permits the Turnstile api.js origin", () => {
    expect(csp["script-src"]).toContain(ORIGIN);
  });

  test("frame-src permits the challenge iframe and is explicit", () => {
    expect(csp["frame-src"]).toContain(ORIGIN);
    // Without a frame-src directive the iframe falls back to default-src 'self'.
    expect(csp["frame-src"]).toContain("'self'");
  });

  test("connect-src permits the verification callback", () => {
    expect(csp["connect-src"]).toContain(ORIGIN);
  });

  test("the CSP still forbids being framed and pins base-uri", () => {
    expect(csp["frame-ancestors"]).toEqual(["'none'"]);
    expect(csp["base-uri"]).toEqual(["'self'"]);
  });
});

describe("/developers reads the site key at request time", () => {
  test("the key comes from runtime env, never from a literal", () => {
    expect(PAGE).toContain('runtimeEnv["NEXT_PUBLIC_" + "TURNSTILE_SITE_KEY"]');
    // A hardcoded site key would be a build-time constant committed to Git.
    expect(PAGE).not.toMatch(/0x4[A-Za-z0-9_-]{10,}/);
    expect(PORTAL).not.toMatch(/0x4[A-Za-z0-9_-]{10,}/);
  });

  test("an empty key degrades to no widget rather than a broken form", () => {
    expect(PAGE).toContain('?? ""');
    expect(PORTAL).toContain("{turnstileSiteKey && (");
  });
});

describe("the widget is mounted explicitly and gates the submit", () => {
  test("the script is loaded in explicit-render mode", () => {
    expect(PORTAL).toContain("turnstile/v0/api.js?render=explicit");
  });

  test("the widget is rendered into its container and the id is kept", () => {
    expect(PORTAL).toContain("api.render(container, {");
    expect(PORTAL).toContain("sitekey: turnstileSiteKey");
    expect(PORTAL).toContain("turnstileWidgetId.current = api.render");
  });

  test("a missing token blocks submit and the API call with a clear message", () => {
    expect(PORTAL).toContain("disabled={issuing || (Boolean(turnstileSiteKey) && !turnstileValue)}");
    expect(PORTAL).toContain("if (turnstileSiteKey && !turnstileValue) {");
    expect(PORTAL).toContain("Finish the bot-verification check above before generating a token.");
  });

  test("the token sent to the API is the verified one, not a re-read", () => {
    expect(PORTAL).toContain("turnstile_token: turnstileSiteKey ? turnstileValue : undefined,");
    expect(PORTAL).not.toContain("turnstileToken()");
  });

  test("the widget is collected after a submit and cleared when it expires", () => {
    expect(PORTAL).toContain('"expired-callback": () => setTurnstileValue("")');
    expect(PORTAL).toContain('"error-callback": () => {');
    expect(PORTAL).toContain("resetTurnstile();");
  });
});

describe("the Radar pulse uses a real Radar endpoint", () => {
  test("the pulse URL targets the L3 protocol summary", () => {
    expect(RADAR_ATTACK_SUMMARY).toBe(
      "https://api.cloudflare.com/client/v4/radar/attacks/layer3/summary/protocol?dateRange=1d&format=json",
    );
  });

  test("the non-existent legacy routes are gone from the ingest worker", () => {
    expect(RADAR_ATTACK_SUMMARY).not.toContain("attacks/summary/layer3");
    // The full legacy URL (a comment may still name the old route).
    expect(INGEST).not.toContain("client/v4/radar/attacks/summary/layer3");
  });

  test("a non-2xx pulse response logs its status instead of failing silently", () => {
    expect(INGEST).toContain("radar pulse request failed status=${response.status}");
  });

  test("the pulse is upserted per UTC day into radar_pulses", () => {
    expect(INGEST).toContain("INSERT INTO radar_pulses (id, pulse_date, payload_json, created_at)");
    expect(INGEST).toContain("ON CONFLICT(pulse_date) DO UPDATE SET payload_json = excluded.payload_json");
    expect(INGEST).toContain("radarPulse = 'STORED';");
  });

  test("the stats read path exposes the latest pulse date", () => {
    const api = read("workers/api/src/iocs.ts");
    expect(api).toContain("SELECT pulse_date, created_at FROM radar_pulses ORDER BY pulse_date DESC LIMIT 1");
    expect(api).toContain("latest_radar_pulse: pulseRow");
  });
});
