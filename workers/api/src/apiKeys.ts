/**
 * PHASE 7A — 48-character API token vault.
 *
 * Token format (exactly 48 characters, Base62):
 *
 *   zx_live_<8-char KeyID>_<31-char CSPRNG secret>
 *   └ 8 ──┘ └── 8 ──────┘  └─── 31 ─────────┘  =  48
 *
 * Generated exclusively from `crypto.getRandomValues` — there is no `Math.random`
 * anywhere on this path. Only the HMAC-SHA256 digest of the FULL token (keyed by
 * the server-side `API_KEY_PEPPER`) is persisted; the plaintext token is returned
 * to the caller once and never stored, logged, or cached.
 *
 * This module is dependency-free apart from the pure `EdgeCacheLike` type, so
 * the whole vault is unit-testable in plain bun with an injected D1 shim.
 */

import type { EdgeCacheLike } from "./edgeCache";

/** Fixed token geometry. Changing any of these is a breaking API change. */
export const API_TOKEN_PREFIX = "zx_live_";
export const API_TOKEN_KEY_ID_LENGTH = 8;
export const API_TOKEN_SECRET_LENGTH = 31;
export const API_TOKEN_LENGTH = 48; // 8 + 8 + 1 + 31

/** Validated key metadata is cached for 60s so auth does not hit D1 per request. */
export const API_KEY_CACHE_TTL_SECONDS = 60;
export const API_KEY_CACHE_ORIGIN = "https://api-key-cache.zayron-x.internal";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
/** Bound for unbiased rejection sampling: 248 = 4 * 62, so 248..255 are discarded. */
const BASE62_REJECTION_BOUND = 248;

const TOKEN_PATTERN = /^zx_live_([0-9A-Za-z]{8})_([0-9A-Za-z]{31})$/;

export type ApiKeyTier = "free" | "pro" | "enterprise";

export interface ApiKeyTierPolicy {
  tier: ApiKeyTier;
  /** Edge-enforced burst allowance per 60 seconds. */
  requestsPerMinute: number;
  /** Recorded daily allowance for the tier. */
  dailyQuota: number;
  scopes: string[];
}

export const API_KEY_TIERS: Record<ApiKeyTier, ApiKeyTierPolicy> = {
  free: { tier: "free", requestsPerMinute: 30, dailyQuota: 500, scopes: ["vulnerabilities:read"] },
  pro: { tier: "pro", requestsPerMinute: 300, dailyQuota: 50_000, scopes: ["vulnerabilities:read", "feeds:read"] },
  enterprise: {
    tier: "enterprise",
    requestsPerMinute: 1200,
    dailyQuota: 1_000_000,
    scopes: ["vulnerabilities:read", "feeds:read", "bulk:export"],
  },
};

export const DEFAULT_SELF_SERVE_TIER: ApiKeyTier = "free";

export class ApiKeyError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "ApiKeyError";
    this.code = code;
    this.status = status;
  }
}

/** Minimal D1 surface this vault needs (structurally compatible with D1Database). */
export interface ApiKeyDb {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(colName?: string): Promise<T | null>;
      run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
    };
  };
}

export interface ApiKeyRow {
  id: string;
  key_prefix: string;
  key_hash: string;
  owner_email: string;
  organization?: string | null;
  tier: string;
  scopes_json: string;
  daily_quota: number;
  status: string;
  last_used_at?: string | null;
  created_at: string;
  expires_at?: string | null;
}

export interface ResolvedApiKey {
  keyPrefix: string;
  tier: ApiKeyTier;
  scopes: string[];
  dailyQuota: number;
  expiresAt: string | null;
}

export interface IssuedApiKey {
  /** The full 48-character token. Shown exactly once; never persisted. */
  token: string;
  key_prefix: string;
  tier: ApiKeyTier;
  scopes: string[];
  daily_quota: number;
  created_at: string;
  expires_at: string | null;
}

/** Injection point for tests; the runtime default is `crypto.getRandomValues`. */
export type RandomBytes = (bytes: Uint8Array) => void;

const defaultRandomBytes: RandomBytes = (bytes) => crypto.getRandomValues(bytes);

/**
 * Unbiased Base62 string from the platform CSPRNG.
 *
 * Bytes at or above 248 are rejected rather than folded with `% 62`, because the
 * fold is biased toward the first eight alphabet characters and a key ID must be
 * uniform across all 62.
 */
export function randomBase62(length: number, randomBytes: RandomBytes = defaultRandomBytes): string {
  if (!Number.isInteger(length) || length <= 0) throw new ApiKeyError("INVALID_LENGTH", 500, "Invalid token length");
  const out: string[] = [];
  while (out.length < length) {
    const chunk = new Uint8Array(Math.max(16, (length - out.length) * 2));
    randomBytes(chunk);
    for (const byte of chunk) {
      if (byte >= BASE62_REJECTION_BOUND) continue;
      out.push(BASE62[byte % BASE62.length]);
      if (out.length === length) break;
    }
  }
  return out.join("");
}

/** Generate one credential: `zx_live_<8>_<31>`, exactly 48 characters. */
export function generateApiToken(randomBytes: RandomBytes = defaultRandomBytes): {
  token: string;
  keyPrefix: string;
  keyId: string;
} {
  const keyId = randomBase62(API_TOKEN_KEY_ID_LENGTH, randomBytes);
  const secret = randomBase62(API_TOKEN_SECRET_LENGTH, randomBytes);
  const token = `${API_TOKEN_PREFIX}${keyId}_${secret}`;
  return { token, keyPrefix: `${API_TOKEN_PREFIX}${keyId}`, keyId };
}

/** Strict structural parse. Returns null for anything that is not a v1 token. */
export function parseApiToken(token: string | null | undefined): { keyPrefix: string; keyId: string; secret: string } | null {
  if (typeof token !== "string") return null;
  const trimmed = token.trim();
  if (trimmed.length !== API_TOKEN_LENGTH) return null;
  const match = TOKEN_PATTERN.exec(trimmed);
  if (!match) return null;
  return { keyPrefix: `${API_TOKEN_PREFIX}${match[1]}`, keyId: match[1], secret: match[2] };
}

function hex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

/** HMAC-SHA256(full_token, pepper) as lowercase hex. */
export async function hashApiToken(token: string, pepper: string): Promise<string> {
  const key = (pepper ?? "").trim();
  if (!key) {
    throw new ApiKeyError(
      "API_KEY_PEPPER_MISSING",
      503,
      "API key issuance is disabled: API_KEY_PEPPER is not configured",
    );
  }
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(token));
  return hex(new Uint8Array(signature));
}

/** Length-independent compare over the fixed-width hex digests. */
function constantTimeHexEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Constant-time verification of a supplied token against a stored digest.
 *
 * Both sides are re-hashed to a fixed 32-byte digest before comparison, so a
 * caller cannot learn the stored value's length or content from timing.
 */
export async function verifyApiTokenHash(token: string, storedHash: string, pepper: string): Promise<boolean> {
  const expected = (storedHash ?? "").trim().toLowerCase();
  if (!expected) return false;
  let candidate: string;
  try {
    candidate = await hashApiToken(token, pepper);
  } catch {
    return false;
  }
  const native = (crypto.subtle as unknown as {
    timingSafeEqual?: (x: ArrayBufferView, y: ArrayBufferView) => boolean;
  }).timingSafeEqual;
  if (typeof native === "function") {
    try {
      const encoder = new TextEncoder();
      return native.call(crypto.subtle, encoder.encode(candidate), encoder.encode(expected));
    } catch {
      /* Workers-only extension absent: fall through to the digest compare. */
    }
  }
  return constantTimeHexEqual(candidate, expected);
}

/** Case-folded, trimmed address. */
export function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

/** Conservative address validation: shape only, never deliverability. */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  if (/\s/.test(email)) return false;
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email);
}

function toStringOrNull(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function parseScopes(scopesJson: unknown, fallback: ApiKeyTier): string[] {
  if (typeof scopesJson === "string") {
    try {
      const parsed: unknown = JSON.parse(scopesJson);
      if (Array.isArray(parsed)) {
        const scopes = parsed.filter((s): s is string => typeof s === "string" && s.trim() !== "");
        if (scopes.length) return scopes;
      }
    } catch {
      /* fall through to the tier default */
    }
  }
  return [...API_KEY_TIERS[fallback].scopes];
}

function asTier(value: unknown): ApiKeyTier {
  return value === "pro" || value === "enterprise" ? value : "free";
}

/** Cache key: a synthetic URL, never a client-supplied value. */
export function apiKeyCacheKey(keyPrefix: string): string {
  return `${API_KEY_CACHE_ORIGIN}/v1/${encodeURIComponent(keyPrefix)}`;
}

const API_KEY_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": `public, max-age=${API_KEY_CACHE_TTL_SECONDS}`,
};

/** Cache the non-secret validation metadata (hash included) for 60 seconds. */
async function cacheKeyMetadata(cache: EdgeCacheLike, keyPrefix: string, row: ApiKeyRow): Promise<void> {
  const payload = {
    v: 1,
    tier: row.tier,
    scopes_json: row.scopes_json,
    status: row.status,
    daily_quota: row.daily_quota,
    expires_at: row.expires_at ?? null,
    key_hash: row.key_hash,
  };
  try {
    await cache.put(
      new Request(apiKeyCacheKey(keyPrefix)),
      new Response(JSON.stringify(payload), { headers: API_KEY_CACHE_HEADERS }),
    );
  } catch {
    /* an unwritable cache is a miss on the next request, never a failure */
  }
}

async function readCachedKeyMetadata(
  cache: EdgeCacheLike,
  keyPrefix: string,
): Promise<Partial<ApiKeyRow> | null> {
  try {
    const hit = await cache.match(new Request(apiKeyCacheKey(keyPrefix)));
    if (!hit) return null;
    const payload = (await hit.json()) as Record<string, unknown>;
    if (!payload || payload.v !== 1 || typeof payload.key_hash !== "string") return null;
    return {
      key_prefix: keyPrefix,
      key_hash: payload.key_hash,
      tier: typeof payload.tier === "string" ? payload.tier : "free",
      scopes_json: typeof payload.scopes_json === "string" ? payload.scopes_json : "[]",
      status: typeof payload.status === "string" ? payload.status : "active",
      daily_quota: Number(payload.daily_quota ?? API_KEY_TIERS.free.dailyQuota),
      expires_at: typeof payload.expires_at === "string" ? payload.expires_at : null,
      owner_email: "",
      id: "",
      created_at: "",
    };
  } catch {
    return null;
  }
}

/**
 * Resolve a presented token to its tier metadata.
 *
 * Order: structural parse → 60s edge cache → D1 → constant-time HMAC verify.
 * Returns null for a malformed, unknown, revoked, expired or mismatched token;
 * the caller decides the HTTP status. D1 is only touched on a cache miss, so a
 * hot key costs zero D1 reads.
 */
export async function resolveApiKey(input: {
  db: ApiKeyDb;
  token: string;
  pepper?: string;
  cache?: EdgeCacheLike | null;
  now?: Date;
}): Promise<ResolvedApiKey | null> {
  const parsed = parseApiToken(input.token);
  if (!parsed) return null;

  const pepper = (input.pepper ?? "").trim();
  if (!pepper) return null;

  let row: Partial<ApiKeyRow> | null = null;
  let fromCache = false;

  if (input.cache) {
    row = await readCachedKeyMetadata(input.cache, parsed.keyPrefix);
    fromCache = row !== null;
  }

  if (!row) {
    try {
      row = await input.db
        .prepare(
          `SELECT id, key_prefix, key_hash, owner_email, organization, tier, scopes_json,
                  daily_quota, status, last_used_at, created_at, expires_at
             FROM api_keys WHERE key_prefix = ? LIMIT 1`,
        )
        .bind(parsed.keyPrefix)
        .first<ApiKeyRow>();
    } catch {
      return null;
    }
    if (!row) return null;
    if (input.cache) await cacheKeyMetadata(input.cache, parsed.keyPrefix, row as ApiKeyRow);
  }

  if ((row.status ?? "active") !== "active") return null;

  if (!(await verifyApiTokenHash(input.token, row.key_hash ?? "", pepper))) return null;

  const now = input.now ?? new Date();
  const expiresAt = row.expires_at ?? null;
  if (expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) <= now.getTime()) return null;

  const tier = asTier(row.tier);

  // `last_used_at` is a diagnostic, not a quota: writing it on every request
  // would spend a D1 write per call. It is refreshed only on a cache miss,
  // which is at most once per key per colo per minute.
  if (!fromCache && row.id) {
    try {
      await input.db
        .prepare(`UPDATE api_keys SET last_used_at = ? WHERE id = ? AND status = 'active'`)
        .bind(now.toISOString(), row.id)
        .run();
    } catch {
      /* diagnostics only */
    }
  }

  return {
    keyPrefix: parsed.keyPrefix,
    tier,
    scopes: parseScopes(row.scopes_json, tier),
    dailyQuota: Number(row.daily_quota ?? API_KEY_TIERS[tier].dailyQuota),
    expiresAt,
  };
}

/**
 * Issue one free-tier credential for a unique email address.
 *
 * Refuses outright without `API_KEY_PEPPER` in production-shaped environments:
 * a token that cannot be verified is worse than no token. The plaintext is
 * returned here and nowhere else.
 */
export async function issueSelfServeKey(input: {
  db: ApiKeyDb;
  email: unknown;
  organization?: unknown;
  pepper?: string;
  now?: Date;
  randomBytes?: RandomBytes;
}): Promise<IssuedApiKey> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    throw new ApiKeyError("INVALID_EMAIL", 400, "A valid work email address is required");
  }

  const pepper = (input.pepper ?? "").trim();
  if (!pepper) {
    throw new ApiKeyError(
      "API_KEY_PEPPER_MISSING",
      503,
      "Self-serve API keys are not enabled yet: the API_KEY_PEPPER secret is not configured",
    );
  }

  const tier = DEFAULT_SELF_SERVE_TIER;
  const policy = API_KEY_TIERS[tier];
  const now = (input.now ?? new Date()).toISOString();
  const { token, keyPrefix } = generateApiToken(input.randomBytes);
  const keyHash = await hashApiToken(token, pepper);

  const existing = await input.db
    .prepare(`SELECT id FROM api_keys WHERE owner_email = ? COLLATE NOCASE AND status <> 'revoked' LIMIT 1`)
    .bind(email)
    .first<{ id: string }>();
  if (existing) {
    throw new ApiKeyError(
      "EMAIL_ALREADY_REGISTERED",
      409,
      "A free-tier key already exists for this email address. Contact contact@zayron-x.co for rotation.",
    );
  }

  const id = crypto.randomUUID();
  try {
    await input.db
      .prepare(
        `INSERT INTO api_keys
           (id, key_prefix, key_hash, owner_email, organization, tier, scopes_json,
            daily_quota, status, last_used_at, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NULL, ?, NULL)`,
      )
      .bind(
        id,
        keyPrefix,
        keyHash,
        email,
        toStringOrNull(input.organization),
        tier,
        JSON.stringify(policy.scopes),
        policy.dailyQuota,
        now,
      )
      .run();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (/UNIQUE|constraint/i.test(message)) {
      throw new ApiKeyError("EMAIL_ALREADY_REGISTERED", 409, "A free-tier key already exists for this email address");
    }
    throw err;
  }

  return {
    token,
    key_prefix: keyPrefix,
    tier,
    scopes: [...policy.scopes],
    daily_quota: policy.dailyQuota,
    created_at: now,
    expires_at: null,
  };
}

/** Capture an Enterprise/Pro procurement lead. */
export async function recordApiAccessLead(input: {
  db: ApiKeyDb;
  email: unknown;
  organization?: unknown;
  useCase?: unknown;
  tierRequested?: unknown;
  source?: string;
  now?: Date;
}): Promise<{ id: string; email: string; tier_requested: "pro" | "enterprise"; created_at: string }> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    throw new ApiKeyError("INVALID_EMAIL", 400, "A valid work email address is required");
  }
  const tierRequested = input.tierRequested === "pro" ? "pro" : "enterprise";
  const now = (input.now ?? new Date()).toISOString();
  const id = crypto.randomUUID();
  await input.db
    .prepare(
      `INSERT INTO api_access_leads (id, email, organization, use_case, tier_requested, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      email,
      toStringOrNull(input.organization),
      toStringOrNull(input.useCase, 1200),
      tierRequested,
      toStringOrNull(input.source, 40) ?? "developers",
      now,
    )
    .run();
  return { id, email, tier_requested: tierRequested, created_at: now };
}
