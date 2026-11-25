import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import {
  API_TOKEN_LENGTH,
  API_TOKEN_PREFIX,
  ApiKeyError,
  generateApiToken,
  hashApiToken,
  isValidEmail,
  issueSelfServeKey,
  parseApiToken,
  randomBase62,
  recordApiAccessLead,
  resolveApiKey,
  verifyApiTokenHash,
  type ApiKeyDb,
} from "../workers/api/src/apiKeys";
import { buildOpenApiDocument } from "../workers/api/src/openapi";
import {
  classifyEndpoint,
  RateLimiter,
  requiredTrust,
  withSecurityBoundary,
  type D1DatabaseLike,
} from "../workers/api/src/security";
import type { EdgeCacheLike } from "../workers/api/src/edgeCache";

const PEPPER = "test-pepper-value-not-a-real-secret";

/** In-memory D1 shim over bun:sqlite, with a prepare counter for cache proofs. */
function createMockD1(): ApiKeyDb & D1DatabaseLike & { rawDb: Database; prepares: () => number } {
  const sqlite = new Database(":memory:");
  let prepares = 0;

  sqlite.run(`
    CREATE TABLE api_keys (
      id TEXT PRIMARY KEY NOT NULL,
      key_prefix TEXT NOT NULL UNIQUE,
      key_hash TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      organization TEXT,
      tier TEXT NOT NULL DEFAULT 'free',
      scopes_json TEXT NOT NULL,
      daily_quota INTEGER NOT NULL DEFAULT 500,
      status TEXT NOT NULL DEFAULT 'active',
      last_used_at TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT
    )
  `);
  sqlite.run(`
    CREATE UNIQUE INDEX idx_api_keys_owner_email_live
      ON api_keys(owner_email COLLATE NOCASE) WHERE status <> 'revoked'
  `);
  sqlite.run(`
    CREATE TABLE api_access_leads (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      organization TEXT,
      use_case TEXT,
      tier_requested TEXT NOT NULL DEFAULT 'enterprise',
      source TEXT NOT NULL DEFAULT 'developers',
      created_at TEXT NOT NULL
    )
  `);

  const mock = {
    rawDb: sqlite,
    prepares: () => prepares,
    prepare(sql: string) {
      prepares++;
      return {
        bind(...values: unknown[]) {
          return {
            async first<T = unknown>(colName?: string): Promise<T | null> {
              const row = sqlite.prepare(sql).get(...values) as Record<string, unknown> | null;
              if (!row) return null;
              return (colName ? row[colName] : row) as T;
            },
            async run() {
              const result = sqlite.prepare(sql).run(...values);
              return { success: true, meta: { changes: result.changes } };
            },
            async all<T = unknown>() {
              return { results: sqlite.prepare(sql).all(...values) as T[] };
            },
          };
        },
        async first<T = unknown>() {
          return this.bind().first<T>();
        },
        async run() {
          return this.bind().run();
        },
        async all<T = unknown>() {
          return this.bind().all<T>();
        },
      };
    },
  };

  return mock as unknown as ApiKeyDb & D1DatabaseLike & { rawDb: Database; prepares: () => number };
}

/** Simple deterministic Map-backed Cache API double. */
function createMockCache(): EdgeCacheLike & { entries: () => number } {
  const store = new Map<string, Response>();
  return {
    entries: () => store.size,
    async match(request: Request) {
      const hit = store.get(request.url);
      return hit ? hit.clone() : undefined;
    },
    async put(request: Request, response: Response) {
      store.set(request.url, response.clone());
    },
  };
}

describe("48-character token geometry", () => {
  test("token is exactly 48 characters with the zx_live_<8>_<31> shape", () => {
    for (let i = 0; i < 200; i++) {
      const { token, keyPrefix, keyId } = generateApiToken();
      expect(token).toHaveLength(48);
      expect(token.length).toBe(API_TOKEN_LENGTH);
      expect(token.startsWith(API_TOKEN_PREFIX)).toBe(true);
      expect(keyId).toHaveLength(8);
      expect(keyPrefix).toBe(`${API_TOKEN_PREFIX}${keyId}`);
      expect(token).toMatch(/^zx_live_[0-9A-Za-z]{8}_[0-9A-Za-z]{31}$/);
      expect(parseApiToken(token)).not.toBeNull();
    }
  });

  test("tokens are unique across a large sample (CSPRNG, no collisions)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(generateApiToken().token);
    expect(seen.size).toBe(2000);
  });

  test("rejects malformed tokens instead of throwing", () => {
    expect(parseApiToken(null)).toBeNull();
    expect(parseApiToken("")).toBeNull();
    expect(parseApiToken("zx_live_short")).toBeNull();
    expect(parseApiToken(`${API_TOKEN_PREFIX}12345678_${"a".repeat(30)}`)).toBeNull();
    expect(parseApiToken(`${API_TOKEN_PREFIX}1234567_${"a".repeat(31)}`)).toBeNull();
    expect(parseApiToken(`ZX_LIVE_12345678_${"a".repeat(31)}`)).toBeNull();
  });

  test("Base62 generator only emits alphabet characters", () => {
    const value = randomBase62(400);
    expect(value).toHaveLength(400);
    expect(value).toMatch(/^[0-9A-Za-z]+$/);
  });
});

describe("HMAC-SHA256 vault", () => {
  test("digest is deterministic, 64 hex characters and pepper-dependent", async () => {
    const token = generateApiToken().token;
    const a = await hashApiToken(token, PEPPER);
    const b = await hashApiToken(token, PEPPER);
    const c = await hashApiToken(token, `${PEPPER}-other`);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(c).not.toBe(a);
  });

  test("verification accepts the real token and rejects a wrong one", async () => {
    const token = generateApiToken().token;
    const other = generateApiToken().token;
    const digest = await hashApiToken(token, PEPPER);
    expect(await verifyApiTokenHash(token, digest, PEPPER)).toBe(true);
    expect(await verifyApiTokenHash(other, digest, PEPPER)).toBe(false);
    expect(await verifyApiTokenHash(token, digest, "wrong-pepper")).toBe(false);
    expect(await verifyApiTokenHash(token, "", PEPPER)).toBe(false);
  });

  test("hashing without a pepper refuses rather than emitting an unverifiable digest", async () => {
    await expect(hashApiToken(generateApiToken().token, "")).rejects.toBeInstanceOf(ApiKeyError);
  });
});

describe("self-serve issuance", () => {
  test("stores only the HMAC digest — no plaintext token in any column", async () => {
    const db = createMockD1();
    const issued = await issueSelfServeKey({
      db,
      email: "Analyst@Example.COM ",
      organization: "Acme",
      pepper: PEPPER,
    });

    expect(issued.token).toHaveLength(48);
    expect(issued.tier).toBe("free");
    expect(issued.daily_quota).toBe(500);

    const row = db.rawDb.prepare("SELECT * FROM api_keys").get() as Record<string, unknown>;
    expect(row.owner_email).toBe("analyst@example.com");
    expect(row.key_prefix).toBe(issued.key_prefix);
    expect(row.key_hash).toBe(await hashApiToken(issued.token, PEPPER));
    expect(row.key_hash).not.toBe(issued.token);
    expect(JSON.stringify(row)).not.toContain(issued.token);
    // The 31-character secret is not recoverable from any stored column.
    const secret = parseApiToken(issued.token)!.secret;
    expect(JSON.stringify(row)).not.toContain(secret);
  });

  test("one live key per email, with a clean 409 for a duplicate", async () => {
    const db = createMockD1();
    await issueSelfServeKey({ db, email: "dup@example.com", pepper: PEPPER });
    await expect(issueSelfServeKey({ db, email: "DUP@example.com", pepper: PEPPER })).rejects.toMatchObject({
      code: "EMAIL_ALREADY_REGISTERED",
      status: 409,
    });
  });

  test("refuses issuance when API_KEY_PEPPER is missing", async () => {
    const db = createMockD1();
    await expect(issueSelfServeKey({ db, email: "nopepper@example.com" })).rejects.toMatchObject({
      code: "API_KEY_PEPPER_MISSING",
      status: 503,
    });
    expect((db.rawDb.prepare("SELECT COUNT(*) AS c FROM api_keys").get() as { c: number }).c).toBe(0);
  });

  test("rejects an invalid email address", async () => {
    const db = createMockD1();
    await expect(issueSelfServeKey({ db, email: "not-an-email", pepper: PEPPER })).rejects.toMatchObject({
      code: "INVALID_EMAIL",
    });
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
  });

  test("records procurement leads with a constrained tier", async () => {
    const db = createMockD1();
    const lead = await recordApiAccessLead({
      db,
      email: "buyer@example.com",
      organization: "Acme",
      useCase: "VM enrichment",
      tierRequested: "enterprise",
      source: "pricing",
    });
    expect(lead.tier_requested).toBe("enterprise");
    const row = db.rawDb.prepare("SELECT * FROM api_access_leads").get() as Record<string, unknown>;
    expect(row.email).toBe("buyer@example.com");
    expect(row.source).toBe("pricing");
  });
});

describe("key resolution and its 60-second edge cache", () => {
  test("valid token resolves to its tier and populates the cache", async () => {
    const db = createMockD1();
    const cache = createMockCache();
    const issued = await issueSelfServeKey({ db, email: "resolve@example.com", pepper: PEPPER });

    const resolved = await resolveApiKey({ db, token: issued.token, pepper: PEPPER, cache });
    expect(resolved).not.toBeNull();
    expect(resolved!.tier).toBe("free");
    expect(resolved!.dailyQuota).toBe(500);
    expect(resolved!.keyPrefix).toBe(issued.key_prefix);
    expect(cache.entries()).toBe(1);
  });

  test("a warm cache avoids D1 entirely on the next authentication", async () => {
    const db = createMockD1();
    const cache = createMockCache();
    const issued = await issueSelfServeKey({ db, email: "cache@example.com", pepper: PEPPER });

    await resolveApiKey({ db, token: issued.token, pepper: PEPPER, cache });
    const afterFirst = db.prepares();
    const second = await resolveApiKey({ db, token: issued.token, pepper: PEPPER, cache });
    expect(second).not.toBeNull();
    // Cache hit still pays one UPDATE for last_used_at? No: cache hits skip D1.
    expect(db.prepares()).toBe(afterFirst);
  });

  test("wrong secret, revoked key and expired key all resolve to null", async () => {
    const db = createMockD1();
    const issued = await issueSelfServeKey({ db, email: "revoke@example.com", pepper: PEPPER });
    const forged = generateApiToken();
    expect(await resolveApiKey({ db, token: `${issued.key_prefix}_${forged.token.slice(-31)}`, pepper: PEPPER })).toBeNull();

    db.rawDb.prepare("UPDATE api_keys SET status = 'revoked'").run();
    expect(await resolveApiKey({ db, token: issued.token, pepper: PEPPER })).toBeNull();

    const db2 = createMockD1();
    const issued2 = await issueSelfServeKey({ db: db2, email: "expired@example.com", pepper: PEPPER });
    db2.rawDb.prepare("UPDATE api_keys SET expires_at = '2020-01-01T00:00:00.000Z'").run();
    expect(await resolveApiKey({ db: db2, token: issued2.token, pepper: PEPPER })).toBeNull();
  });

  test("a malformed token never reaches the database", async () => {
    const db = createMockD1();
    expect(await resolveApiKey({ db, token: "nonsense", pepper: PEPPER })).toBeNull();
    expect(db.prepares()).toBe(0);
  });
});

describe("edge rate-limit contract", () => {
  test("self-serve writes are public but strictly IP-limited", () => {
    expect(requiredTrust("POST", "/api/v1/keys/self-serve")).toBe("public");
    expect(requiredTrust("POST", "/api/v1/leads")).toBe("public");
    expect(classifyEndpoint("POST", "/api/v1/keys/self-serve")).toBe("public_write");
    expect(classifyEndpoint("POST", "/api/v1/leads")).toBe("public_write");
  });

  test("16th self-serve write in a minute returns 429 with Retry-After", async () => {
    const limiter = new RateLimiter(() => 0);
    const dispatch = async () =>
      new Response(JSON.stringify({ data: {} }), { status: 200, headers: { "Content-Type": "application/json" } });
    const makeRequest = () =>
      new Request("https://api.test/api/v1/keys/self-serve", {
        method: "POST",
        headers: { "CF-Connecting-IP": "203.0.113.9", "Content-Type": "application/json" },
        body: "{}",
      });

    let response!: Response;
    for (let i = 0; i < 16; i++) {
      response = await withSecurityBoundary(makeRequest(), { ENVIRONMENT: "production" }, dispatch, limiter);
    }
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("RATE_LIMITED");
  });

  test("every v1 response carries X-Request-Id, X-RateLimit-Limit and X-Zayron-Tier", async () => {
    const dispatch = async () =>
      new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    const request = new Request("https://api.test/api/v1/vulnerabilities?limit=3", {
      headers: { "CF-Connecting-IP": "203.0.113.10" },
    });
    const response = await withSecurityBoundary(request, { ENVIRONMENT: "production" }, dispatch, new RateLimiter(() => 0));
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number(response.headers.get("X-RateLimit-Limit"))).toBeGreaterThan(0);
    expect(response.headers.get("X-Zayron-Tier")).toBe("anonymous");
  });
});

describe("OpenAPI 3.1 document", () => {
  const document = buildOpenApiDocument({ origin: "https://zayron-x.co" });

  function resolvePointer(doc: Record<string, unknown>, pointer: string): unknown {
    return pointer
      .replace(/^#\//, "")
      .split("/")
      .reduce<unknown>((node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined), doc);
  }

  test("declares OpenAPI 3.1.0 and the four documented operations", () => {
    expect(document.openapi).toBe("3.1.0");
    const paths = document.paths as Record<string, Record<string, unknown>>;
    expect(Object.keys(paths)).toEqual(
      expect.arrayContaining([
        "/openapi.json",
        "/vulnerabilities",
        "/vulnerabilities/{cveId}",
        "/keys/self-serve",
        "/leads",
      ]),
    );
    for (const path of Object.values(paths)) {
      for (const operation of Object.values(path)) {
        expect(typeof (operation as { operationId?: string }).operationId).toBe("string");
      }
    }
  });

  test("every $ref resolves to a real component", () => {
    const refs = [...JSON.stringify(document).matchAll(/"\$ref":"([^"]+)"/g)].map((match) => match[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref.startsWith("#/")).toBe(true);
      expect(resolvePointer(document, ref)).toBeDefined();
    }
  });

  test("documents the 48-character bearer scheme and the edge headers", () => {
    const components = document.components as { securitySchemes: Record<string, Record<string, unknown>> };
    const bearer = components.securitySchemes.bearerAuth;
    expect(bearer.type).toBe("http");
    expect(bearer.scheme).toBe("bearer");
    expect(String(bearer.bearerFormat)).toContain("zx_live_");

    const serialized = JSON.stringify(document);
    expect(serialized).toContain("X-RateLimit-Limit");
    expect(serialized).toContain("X-Request-Id");
    expect(serialized).toContain("48");
  });

  test("each server URL points at the /api/v1 root", () => {
    const servers = document.servers as Array<{ url: string }>;
    expect(servers.length).toBeGreaterThan(0);
    for (const server of servers) expect(server.url.endsWith("/api/v1")).toBe(true);
  });
});
