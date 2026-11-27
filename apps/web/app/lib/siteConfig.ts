/**
 * Wave 4B — single canonical source of truth for site/API URLs.
 *
 * Two distinct consumers, two distinct correct answers:
 *
 *   - BROWSER: `NEXT_PUBLIC_API_BASE_URL` (same-origin `https://zayron-x.co/api/v1`),
 *     falling back to `${SITE_URL}/api/v1`. Same-origin keeps zero CORS preflight.
 *   - SERVER (SSR inside the web Worker): `API_BASE_URL`, which production sets to
 *     `https://api.zayron-x.co/api/v1`. The web Worker is routed on `zayron-x.co/*`
 *     and the API Worker on `zayron-x.co/api/*` in the SAME zone, so a server-side
 *     fetch to `https://zayron-x.co/api/...` is a same-zone subrequest to another
 *     Worker on the identical hostname — the Cloudflare Error 1042 trap. A
 *     dedicated API hostname is a distinct origin and resolves normally, while
 *     still hitting the API Worker's CDN cache (`s-maxage`).
 *
 * Everything is resolved by FUNCTIONS on every call. A module-level snapshot
 * would be captured once per isolate (before any request exists), so per-request
 * host/env signals would be ignored.
 */

export const PRODUCTION_SITE_URL = "https://zayron-x.co";

/** Browser default: same-origin, no preflight. */
export const PRODUCTION_API_BASE_URL = `${PRODUCTION_SITE_URL}/api/v1`;

/** Server default: dedicated hostname, distinct origin (Error 1042 fix). */
export const PRODUCTION_SERVER_API_BASE_URL = "https://api.zayron-x.co/api/v1";

/** The dedicated preview API worker. Only ever selected for a preview deployment. */
export const PREVIEW_API_BASE_URL = "https://zayron-x-api-preview.aabusabih.workers.dev/api/v1";

export interface SiteEnvVars {
  NEXT_PUBLIC_SITE_URL?: string;
  SITE_URL?: string;
  NEXT_PUBLIC_APP_ENV?: string;
  APP_ENV?: string;
  ENVIRONMENT?: string;
  NEXT_PUBLIC_API_BASE_URL?: string;
  API_BASE_URL?: string;
}

export type Runtime = "server" | "browser";

export interface SiteConfig {
  siteUrl: string;
  apiBaseUrl: string;
  isPreview: boolean;
  runtime: Runtime;
}

/** Case-folded, whitespace-trimmed env read; an empty value is absent. */
function read(env: SiteEnvVars, ...names: Array<keyof SiteEnvVars>): string {
  for (const name of names) {
    const value = env[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

const PREVIEW_URL_PATTERN = /preview|workers\.dev|localhost|127\.0\.0\.1/i;
const PREVIEW_HOST_PATTERN = /(^|\.)workers\.dev$|^localhost$|^127\.0\.0\.1$|(^|\.)preview\./i;

export function detectRuntime(): Runtime {
  return typeof window === "undefined" ? "server" : "browser";
}

/**
 * Pure resolution.
 *
 * `runtime` defaults to the real one; tests pass it explicitly so both branches
 * are provable in one process.
 */
export function resolveSiteConfig(
  env: SiteEnvVars = {},
  hostname?: string,
  runtime: Runtime = detectRuntime(),
): SiteConfig {
  const configuredSiteUrl = read(env, "NEXT_PUBLIC_SITE_URL", "SITE_URL");
  const siteUrl = (configuredSiteUrl || PRODUCTION_SITE_URL).replace(/\/+$/, "");

  const appEnv = read(env, "NEXT_PUBLIC_APP_ENV", "APP_ENV", "ENVIRONMENT").toLowerCase();
  const host = (hostname ?? "").trim().toLowerCase();

  const isPreview =
    appEnv === "preview" ||
    PREVIEW_URL_PATTERN.test(siteUrl) ||
    (host !== "" && PREVIEW_HOST_PATTERN.test(host));

  const serverApiBase = read(env, "API_BASE_URL");
  const publicApiBase = read(env, "NEXT_PUBLIC_API_BASE_URL");

  const apiBaseUrl =
    runtime === "browser"
      ? // Same-origin always: never a cross-origin browser call, never a preflight.
        publicApiBase || `${siteUrl}/api/v1`
      : // Server-side: the dedicated API origin wins, so the web Worker never
        // fetches its own hostname (Error 1042).
        serverApiBase || publicApiBase || (isPreview ? PREVIEW_API_BASE_URL : PRODUCTION_SERVER_API_BASE_URL);

  return { siteUrl, apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""), isPreview, runtime };
}

/** `process.env` when it exists (server / build), else `{}` (browser bundle). */
function processEnv(): SiteEnvVars {
  if (typeof process === "undefined" || !process.env) return {};
  return process.env as unknown as SiteEnvVars;
}

/** Current host, or undefined during SSR/build. */
function currentHostname(): string | undefined {
  if (typeof window === "undefined" || !window.location) return undefined;
  return window.location.hostname;
}

/** Resolved fresh on EVERY call — never a module-import-time snapshot. */
export function getSiteConfig(): SiteConfig {
  return resolveSiteConfig(processEnv(), currentHostname(), detectRuntime());
}

export function getSiteUrl(): string {
  return getSiteConfig().siteUrl;
}

export function isPreviewDeployment(): boolean {
  return getSiteConfig().isPreview;
}

export function getApiBaseUrl(): string {
  return getSiteConfig().apiBaseUrl;
}

/**
 * Gate 3A.2 — Service Binding transport for server-side API calls.
 *
 * A Worker that `fetch()`es another Worker's `*.workers.dev` hostname in the SAME
 * zone fails with Cloudflare Error 1042 (that is why the preview web Worker could
 * not read the preview API at all). The binding is a direct Worker-to-Worker call:
 * no DNS, no TLS, no zone routing, no WAF, and no public hop.
 *
 * `API_BASE_URL` stays the fallback for local `vinext dev`, browser bundles and
 * any runtime without bindings, so nothing else changes.
 */
interface ApiServiceBinding {
  fetch(request: Request): Promise<Response>;
}

interface CloudflareWorkersModule {
  env?: { API?: ApiServiceBinding };
}

/** Internal origin used to shape a Request for the binding (never resolved). */
const INTERNAL_API_ORIGIN = "https://api.internal";

let apiBindingPromise: Promise<ApiServiceBinding | null> | null = null;

/** The `API` service binding when running inside the Worker, else null. */
function resolveApiServiceBinding(): Promise<ApiServiceBinding | null> {
  if (detectRuntime() === "browser") return Promise.resolve(null);
  if (!apiBindingPromise) {
    apiBindingPromise = (async () => {
      try {
        // Non-literal specifier: the bundler never tries to resolve a runtime-only module.
        const specifier = "cloudflare:workers";
        const mod = (await import(/* @vite-ignore */ specifier)) as unknown as CloudflareWorkersModule;
        return mod.env?.API ?? null;
      } catch {
        return null;
      }
    })();
  }
  return apiBindingPromise;
}

/**
 * Server-side API fetch: the Service Binding when present, plain HTTP otherwise.
 * `input` may be a full `${getApiBaseUrl()}/...` URL or a `/path` relative to it.
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const binding = await resolveApiServiceBinding();
  if (!binding) return fetch(input, init);

  const apiBase = getApiBaseUrl();
  let path = input;
  if (input.startsWith(apiBase)) path = input.slice(apiBase.length);
  else if (/^https?:/i.test(input)) path = new URL(input).pathname.replace(/^\/api\/v1/, "");
  if (!path.startsWith("/")) path = `/${path}`;

  return binding.fetch(new Request(`${INTERNAL_API_ORIGIN}/api/v1${path}`, init));
}

/**
 * Wave 4C — graduated sitemap rollout cap (Free-Tier Survival Mode).
 *
 * A full sitemap enumeration is the single most expensive thing a search
 * crawler can trigger against the API: every shard is a D1 page read. While the
 * site runs on the $0 tier, `SITEMAP_MAX_SHARDS` caps how many shards per kind
 * (vulnerabilities, malware) the sitemap index advertises and how many the shard
 * handler will serve.
 *
 *   SITEMAP_MAX_SHARDS="1"   → static + shard 1 (first 2,000 CVEs) + malware shard 1
 *   unset / "" / "0" / junk  → uncapped (every existing shard)
 *
 * Detail pages are NOT capped: a visitor (or a crawler following an internal
 * link) can still open any CVE or report; only the sitemap inventory is bounded.
 */
export function resolveSitemapMaxShards(raw: string | undefined): number | null {
  const value = (raw ?? "").trim();
  if (!/^\d+$/.test(value)) return null;
  const max = Number(value);
  if (!Number.isSafeInteger(max) || max <= 0) return null;
  return max;
}

/** Resolved fresh on EVERY call from the runtime env (never a module snapshot). */
export function getSitemapMaxShards(): number | null {
  if (typeof process === "undefined" || !process.env) return null;
  return resolveSitemapMaxShards(process.env.SITEMAP_MAX_SHARDS);
}

/** Absolute URL for a site-relative path (never double-slashes). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getSiteUrl()}/${path.replace(/^\/+/, "")}`;
}

/** Runtime Turnstile site key (dynamic property read prevents build-time inlining). */
export function getTurnstileSiteKey(): string {
  if (typeof process === "undefined" || !process.env) return "";
  const runtimeEnv = process.env as Record<string, string | undefined>;
  return (runtimeEnv["NEXT_PUBLIC_" + "TURNSTILE_SITE_KEY"] ?? "").trim();
}
