"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  API_BASE_URL,
  API_ENDPOINT_COUNT,
  API_ENDPOINT_GROUPS,
  API_ERRORS,
  API_LIMITS,
} from "../lib/apiCatalog";

/**
 * PHASE 10A — `/developers`, rebuilt to a Google Cloud / Stripe documentation
 * standard: one calm hero, a self-serve key generator above the fold, a sticky
 * section rail, an interactive multi-language code panel and a hairline endpoint
 * matrix. Every endpoint and every number comes from `lib/apiCatalog.ts`, which
 * mirrors the real `workers/api` contract — nothing here is aspirational.
 */

interface IssuedKey {
  token: string;
  key_prefix: string;
  tier: string;
  scopes: string[];
  daily_quota: number;
  created_at: string;
}

type Language = "curl" | "typescript" | "python";

const LANGUAGES: Array<{ id: Language; label: string }> = [
  { id: "curl", label: "cURL" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
];

const RAIL = [
  { id: "overview", label: "Overview" },
  { id: "auth", label: "Authentication & quotas" },
  { id: "endpoints", label: "Core graph endpoints" },
  { id: "feeds", label: "Bulk IOC & defense feeds" },
  { id: "stix", label: "STIX 2.1 & firewall EDL" },
  { id: "examples", label: "Code examples" },
];

const TOKEN_PLACEHOLDER = "zx_live_XXXXXXXX_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
}

function snippets(token: string): Record<Language, string> {
  const key = token || TOKEN_PLACEHOLDER;
  return {
    curl: `# 1 · CVE dossier — CVSS, EPSS, KEV state and graph links
curl -s "${API_BASE_URL}/vulnerabilities/CVE-2021-44228" \\
  -H "Authorization: Bearer ${key}"

# 2 · Bulk IOC enrichment — up to 50 indicators per request
curl -s -X POST "${API_BASE_URL}/iocs/bulk" \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"indicators":["45.9.168.10","hxxp://evil[.]example/payload","45.9.168.0/24"]}'

# 3 · STIX 2.1 incremental sync from a checkpoint
curl -s -D headers.txt \\
  "${API_BASE_URL}/iocs/feed?since=2026-11-01T00:00:00Z&limit=500&format=stix" \\
  -H "Authorization: Bearer ${key}" \\
  -o feed.stix.json

# 4 · Firewall EDL — one indicator per line
curl -s "${API_BASE_URL}/iocs/edl/ip" \\
  -H "Authorization: Bearer ${key}"`,
    typescript: `const BASE = "${API_BASE_URL}";
const headers = {
  Authorization: \`Bearer \${process.env.ZAYRON_API_KEY}\`,
  Accept: "application/json",
} as const;

// 1 · CVE dossier
const dossier = await fetch(\`\${BASE}/vulnerabilities/CVE-2021-44228\`, { headers })
  .then((res) => res.json());

// 2 · Bulk IOC enrichment — 50 indicators per request
const bulk = await fetch(\`\${BASE}/iocs/bulk\`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({
    indicators: ["45.9.168.10", "hxxp://evil[.]example/payload", "45.9.168.0/24"],
  }),
}).then((res) => res.json());

// 3 · STIX 2.1 incremental sync
let cursor: string | null = "";
while (cursor !== null) {
  const response = await fetch(
    \`\${BASE}/iocs/feed?since=2026-11-01T00:00:00Z&format=stix&offset=\${cursor ?? 0}\`,
    { headers },
  );
  const bundle = await response.json();
  // persist bundle.objects here
  cursor = response.headers.get("X-Zayron-Next-Cursor");
}

// 4 · Firewall EDL
const edl = await fetch(\`\${BASE}/iocs/edl/ip\`, { headers }).then((res) => res.text());`,
    python: `import os, requests

BASE = "${API_BASE_URL}"
SESSION = requests.Session()
SESSION.headers.update({
    "Authorization": f"Bearer {os.environ['ZAYRON_API_KEY']}",
    "Accept": "application/json",
})

# 1 · CVE dossier
dossier = SESSION.get(f"{BASE}/vulnerabilities/CVE-2021-44228", timeout=15).json()

# 2 · Bulk IOC enrichment — 50 indicators per request
bulk = SESSION.post(
    f"{BASE}/iocs/bulk",
    json={"indicators": ["45.9.168.10", "hxxp://evil[.]example/payload", "45.9.168.0/24"]},
    timeout=20,
).json()

# 3 · STIX 2.1 incremental sync
cursor = "0"
while cursor:
    response = SESSION.get(
        f"{BASE}/iocs/feed",
        params={"since": "2026-11-01T00:00:00Z", "limit": 500, "format": "stix", "offset": cursor},
        timeout=30,
    )
    bundle = response.json()
    # persist bundle["objects"] here
    cursor = response.headers.get("X-Zayron-Next-Cursor", "")

# 4 · Firewall EDL
edl = SESSION.get(f"{BASE}/iocs/edl/ip", timeout=15).text`,
  };
}

const SAMPLE_RESPONSE = `{
  "status": "SUCCESS",
  "data": {
    "cve_id": "CVE-2021-44228",
    "severity": "CRITICAL",
    "cvss_score": 10.0,
    "epss_score": 0.9723,
    "cisa_kev": true,
    "kev_due_date": "2021-12-24",
    "actors": ["…"],
    "techniques": ["T1190", "T1059"]
  }
}`;

export function DeveloperPortal({ turnstileSiteKey = "" }: { turnstileSiteKey?: string }) {
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<IssuedKey | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [turnstileValue, setTurnstileValue] = useState("");
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("curl");

  const [leadEmail, setLeadEmail] = useState("");
  const [leadOrganization, setLeadOrganization] = useState("");
  const [leadUseCase, setLeadUseCase] = useState("");
  const [leadTier, setLeadTier] = useState<"pro" | "enterprise">("enterprise");
  const [leadState, setLeadState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [leadError, setLeadError] = useState<string | null>(null);

  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Explicit render: an implicit `.cf-turnstile` div renders nothing, and the
  // submit guard needs the completion state.
  useEffect(() => {
    if (!turnstileSiteKey) return;
    let cancelled = false;

    const mount = () => {
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      const container = turnstileRef.current;
      if (cancelled || !api || !container || turnstileWidgetId.current) return;
      container.innerHTML = "";
      turnstileWidgetId.current = api.render(container, {
        sitekey: turnstileSiteKey,
        theme: "dark",
        callback: (token: string) => {
          setTurnstileValue(token);
          setTurnstileError(null);
        },
        "expired-callback": () => setTurnstileValue(""),
        "error-callback": () => {
          setTurnstileValue("");
          setTurnstileError("Bot verification could not be completed. Reload the page and try again.");
        },
      });
    };

    const existing = document.querySelector<HTMLScriptElement>("script[data-zayron-turnstile]");
    if (existing) {
      if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) mount();
      else existing.addEventListener("load", mount);
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.zayronTurnstile = "true";
    script.addEventListener("load", mount);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [turnstileSiteKey]);

  const resetTurnstile = useCallback(() => {
    setTurnstileValue("");
    const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    if (api && turnstileWidgetId.current) {
      try {
        api.reset(turnstileWidgetId.current);
      } catch {
        /* the iframe may already be gone; a page load remounts it */
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requested = new URLSearchParams(window.location.search).get("tier");
    if (requested === "pro" || requested === "enterprise") setLeadTier(requested);
    if (requested && window.location.hash === "#request-access") {
      document.getElementById("request-access")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const copy = useCallback(async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied((current) => (current === label ? null : current)), 1800);
    } catch {
      setCopied(null);
    }
  }, []);

  const issueKey = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (turnstileSiteKey && !turnstileValue) {
        setIssueError("Finish the bot-verification check above before generating a token.");
        return;
      }
      setIssuing(true);
      setIssueError(null);
      setIssued(null);
      try {
        const response = await fetch("/api/v1/keys/self-serve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            organization: organization || undefined,
            turnstile_token: turnstileSiteKey ? turnstileValue : undefined,
          }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { data?: IssuedKey; error?: { message?: string } }
          | null;
        if (!response.ok || !payload?.data) {
          setIssueError(payload?.error?.message || `Key issuance failed (HTTP ${response.status})`);
          return;
        }
        setIssued(payload.data);
      } catch {
        setIssueError("The key service is unreachable. Try again shortly.");
      } finally {
        setIssuing(false);
        resetTurnstile();
      }
    },
    [email, organization, resetTurnstile, turnstileSiteKey, turnstileValue],
  );

  const submitLead = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLeadState("sending");
      setLeadError(null);
      try {
        const response = await fetch("/api/v1/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: leadEmail,
            organization: leadOrganization || undefined,
            use_case: leadUseCase || undefined,
            tier_requested: leadTier,
            source: "developers",
          }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
          setLeadState("error");
          setLeadError(payload?.error?.message || `Request failed (HTTP ${response.status})`);
          return;
        }
        setLeadState("sent");
      } catch {
        setLeadState("error");
        setLeadError("The intake service is unreachable. Try again shortly.");
      }
    },
    [leadEmail, leadOrganization, leadUseCase, leadTier],
  );

  const activeSnippet = useMemo(() => snippets(issued?.token ?? "")[language], [issued, language]);

  return (
    <>
      <header className="dx-hero shell">
        <div className="dx-hero-copy">
          <p className="eyebrow">ZAYRON-X INTELLIGENCE API</p>
          <h1>Programmatic access to the verified threat graph.</h1>
          <p className="dx-lede">
            The same source-verified record the platform publishes — NVD facts, CISA KEV presence, FIRST EPSS
            probability and the ZAYRON-X assessment — over a versioned OpenAPI 3.1 contract. {API_ENDPOINT_COUNT}{" "}
            endpoints, one bearer token, edge-enforced limits.
          </p>
          <div className="dx-baseurl">
            <span className="dx-baseurl-label">BASE URL</span>
            <code>{API_BASE_URL}</code>
            <button type="button" className="dx-copy" onClick={() => copy("base", API_BASE_URL)}>
              {copied === "base" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="dx-hero-actions">
            <a className="button primary" href="/api/v1/openapi.json" target="_blank" rel="noreferrer">
              OpenAPI 3.1 <span aria-hidden="true">↗</span>
            </a>
            <a className="button secondary" href="#endpoints">
              Endpoint reference
            </a>
          </div>
        </div>

        <form className="dx-key" id="key" onSubmit={issueKey} aria-labelledby="dx-key-heading">
          <div className="dx-key-head">
            <h2 id="dx-key-heading">Create a free API key</h2>
            <p>One key per work email. The token is shown once and stored only as an HMAC-SHA256 digest.</p>
          </div>
          <label className="dx-field">
            <span>Work email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="analyst@your-company.com"
            />
          </label>
          <label className="dx-field">
            <span>Organization <em>optional</em></span>
            <input
              type="text"
              autoComplete="organization"
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
              placeholder="Acme Security"
            />
          </label>
          {turnstileSiteKey && (
            <div className="dx-turnstile" ref={turnstileRef} data-sitekey={turnstileSiteKey} />
          )}
          {turnstileError ? (
            <p className="dx-error" role="alert">
              {turnstileError}
            </p>
          ) : null}
          <button
            className="button primary dx-submit"
            type="submit"
            disabled={issuing || (Boolean(turnstileSiteKey) && !turnstileValue)}
          >
            {issuing ? "Issuing…" : "Generate token"}
          </button>
          {issueError ? (
            <p className="dx-error" role="alert">
              {issueError}
            </p>
          ) : null}
          {issued ? (
            <div className="dx-issued" aria-live="polite">
              <span className="dx-issued-label">TOKEN — SHOWN ONCE</span>
              <code className="dx-issued-token">{issued.token}</code>
              <div className="dx-issued-meta">
                <span>{issued.tier.toUpperCase()} tier</span>
                <span>{issued.daily_quota.toLocaleString()} records / day</span>
                <span>48 characters</span>
              </div>
              <button type="button" className="dx-copy" onClick={() => copy("token", issued.token)}>
                {copied === "token" ? "Copied" : "Copy token"}
              </button>
              <p className="dx-note">
                Store it now — it cannot be retrieved again. Replace the placeholder in the code examples below.
              </p>
            </div>
          ) : (
            <p className="dx-note">
              Free tier: 30 requests / 60 seconds, 500 records / day, 50 indicators per bulk request.
            </p>
          )}
        </form>
      </header>

      <div className="dx-layout shell">
        <nav className="dx-rail" aria-label="Developer documentation sections">
          <span className="dx-rail-label">ON THIS PAGE</span>
          {RAIL.map((item) => (
            <a key={item.id} href={`#${item.id}`}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="dx-main">
          <section className="dx-section" id="overview" aria-labelledby="dx-overview-heading">
            <h2 id="dx-overview-heading">Overview</h2>
            <p className="dx-body">
              Every response is authoritative about its own provenance. A record states the source it came from,
              when it was last verified, and which fields are catalog-verified rather than inferred. The API never
              asserts an exploitation state the catalog does not hold.
            </p>
            <div className="dx-spec-grid">
              <div>
                <span>Endpoints</span>
                <strong>{API_ENDPOINT_COUNT}</strong>
                <small>versioned REST resources</small>
              </div>
              <div>
                <span>Contract</span>
                <strong>OpenAPI 3.1</strong>
                <small>machine-readable at /api/v1/openapi.json</small>
              </div>
              <div>
                <span>Transport</span>
                <strong>HTTPS · JSON</strong>
                <small>STIX 2.1 and text EDL where the format matters</small>
              </div>
              <div>
                <span>Edge cache</span>
                <strong>300 s</strong>
                <small>anonymous reads only; keyed reads are never shared</small>
              </div>
            </div>
          </section>

          <section className="dx-section" id="auth" aria-labelledby="dx-auth-heading">
            <h2 id="dx-auth-heading">Authentication &amp; quotas</h2>
            <p className="dx-body">
              Send the token in the <code>Authorization</code> header on every request. Limits are enforced before
              the database is touched and reported on each response through <code>X-RateLimit-Limit</code>,{" "}
              <code>X-Zayron-Tier</code> and <code>X-Request-Id</code>.
            </p>
            <div className="dx-code">
              <div className="dx-code-head">
                <span>Header</span>
                <button type="button" onClick={() => copy("header", `Authorization: Bearer ${issued?.token ?? TOKEN_PLACEHOLDER}`)}>
                  {copied === "header" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre>
                <code>{`Authorization: Bearer ${issued?.token ?? TOKEN_PLACEHOLDER}`}</code>
              </pre>
            </div>
            <div className="dx-table-wrap">
              <table className="dx-table">
                <thead>
                  <tr>
                    <th scope="col">Spec</th>
                    <th scope="col">Value</th>
                    <th scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {API_LIMITS.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td className="dx-mono">{row.value}</td>
                      <td>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="dx-table-wrap">
              <table className="dx-table">
                <thead>
                  <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Code</th>
                    <th scope="col">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {API_ERRORS.map((row) => (
                    <tr key={row.status}>
                      <td className="dx-mono dx-status">{row.status}</td>
                      <td className="dx-mono">{row.code}</td>
                      <td>{row.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {API_ENDPOINT_GROUPS.map((group) => (
            <section
              className="dx-section"
              id={group.id === "graph" ? "endpoints" : group.id === "iocs" ? "feeds" : group.id}
              key={group.id}
              aria-labelledby={`dx-${group.id}-heading`}
            >
              <h2 id={`dx-${group.id}-heading`}>{group.title}</h2>
              <p className="dx-body">{group.description}</p>
              <div className="dx-endpoints">
                <div className="dx-endpoints-head">
                  <span>Method</span>
                  <span>Path</span>
                  <span>Purpose</span>
                  <span>Output</span>
                </div>
                {group.endpoints.map((endpoint) => (
                  <div className="dx-endpoint" key={`${endpoint.method}:${endpoint.path}`}>
                    <span className={`dx-method${endpoint.method === "POST" ? " post" : ""}`}>{endpoint.method}</span>
                    <code className="dx-path">{endpoint.path}</code>
                    <span className="dx-purpose">{endpoint.purpose}</span>
                    <span className="dx-output">{endpoint.output}</span>
                  </div>
                ))}
              </div>
              {group.id === "graph" ? (
                <details className="dx-details">
                  <summary>Response preview — GET /vulnerabilities/{"{cveId}"}</summary>
                  <pre>
                    <code>{SAMPLE_RESPONSE}</code>
                  </pre>
                </details>
              ) : null}
            </section>
          ))}

          <section className="dx-section" id="stix" aria-labelledby="dx-stix-heading">
            <h2 id="dx-stix-heading">STIX 2.1 &amp; firewall EDL</h2>
            <p className="dx-body">
              Two machine-to-machine formats. <code>?format=stix</code> on the IOC feed returns a STIX 2.1 bundle
              you can page with <code>?since=</code> and <code>X-Zayron-Next-Cursor</code>. The EDL endpoints return
              one indicator per line, ready for a perimeter block list.
            </p>
            <div className="dx-table-wrap">
              <table className="dx-table">
                <thead>
                  <tr>
                    <th scope="col">Surface</th>
                    <th scope="col">Request</th>
                    <th scope="col">Format</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">STIX 2.1 bundling</th>
                    <td className="dx-mono">GET /iocs/feed?format=stix&amp;since=…</td>
                    <td>STIX 2.1 bundle</td>
                  </tr>
                  <tr>
                    <th scope="row">Cursor paging</th>
                    <td className="dx-mono">X-Zayron-Next-Cursor</td>
                    <td>response header</td>
                  </tr>
                  <tr>
                    <th scope="row">Firewall EDL</th>
                    <td className="dx-mono">GET /iocs/edl/ip · domain · url · cidr</td>
                    <td>text/plain</td>
                  </tr>
                  <tr>
                    <th scope="row">EDL preview</th>
                    <td className="dx-mono">GET /iocs/edl/ip?preview=1</td>
                    <td>capped sample, no token</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="dx-section" id="examples" aria-labelledby="dx-examples-heading">
            <h2 id="dx-examples-heading">Code examples</h2>
            <p className="dx-body">
              Four real calls: a CVE dossier, a 50-indicator bulk enrichment, an incremental STIX sync and a firewall
              EDL pull. The token you generated above is substituted automatically.
            </p>
            <div className="dx-tabs" role="tablist" aria-label="Code language">
              {LANGUAGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`dx-tab-${item.id}`}
                  aria-selected={language === item.id}
                  aria-controls="dx-snippet"
                  className={language === item.id ? "active" : ""}
                  onClick={() => setLanguage(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="dx-code" id="dx-snippet" role="tabpanel" aria-labelledby={`dx-tab-${language}`}>
              <div className="dx-code-head">
                <span>{LANGUAGES.find((item) => item.id === language)?.label}</span>
                <button type="button" onClick={() => copy("snippet", activeSnippet)}>
                  {copied === "snippet" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre>
                <code>{activeSnippet}</code>
              </pre>
            </div>
          </section>

          <section className="dx-section" id="request-access" aria-labelledby="dx-lead-heading">
            <h2 id="dx-lead-heading">Procurement</h2>
            <p className="dx-body">
              Higher concurrency, bulk feed pulls and contractual quotas are handled through the intake API below.
            </p>
            {leadState === "sent" ? (
              <div className="dx-issued" role="status">
                <strong>Request received.</strong>
                <p className="dx-note">
                  We respond to institutional access requests from intel@zayron-x.co, usually within two business
                  days.
                </p>
              </div>
            ) : (
              <form className="dx-form" onSubmit={submitLead}>
                <label className="dx-field">
                  <span>Work email</span>
                  <input
                    type="email"
                    required
                    value={leadEmail}
                    onChange={(event) => setLeadEmail(event.target.value)}
                    placeholder="security-lead@your-company.com"
                  />
                </label>
                <label className="dx-field">
                  <span>Organization</span>
                  <input
                    type="text"
                    value={leadOrganization}
                    onChange={(event) => setLeadOrganization(event.target.value)}
                    placeholder="Acme Security"
                  />
                </label>
                <label className="dx-field">
                  <span>Tier</span>
                  <select value={leadTier} onChange={(event) => setLeadTier(event.target.value as "pro" | "enterprise")}>
                    <option value="pro">SOC Team (Pro)</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </label>
                <label className="dx-field dx-field-wide">
                  <span>Intended use</span>
                  <textarea
                    rows={4}
                    value={leadUseCase}
                    onChange={(event) => setLeadUseCase(event.target.value)}
                    placeholder="Feed enrichment for our vulnerability management programme…"
                  />
                </label>
                <button className="button primary dx-submit" type="submit" disabled={leadState === "sending"}>
                  {leadState === "sending" ? "Submitting…" : "Request access"}
                </button>
                {leadError ? (
                  <p className="dx-error" role="alert">
                    {leadError}
                  </p>
                ) : null}
              </form>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
