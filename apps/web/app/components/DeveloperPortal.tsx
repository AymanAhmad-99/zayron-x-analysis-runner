"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

/**
 * PHASE 7A — /developers portal.
 *
 * Everything here talks to the same-origin v1 API (`/api/v1/*`), which the
 * Cloudflare route table sends to `zayron-x-api`, so there is no CORS preflight
 * and no key ever leaves the browser except in the request that issues it.
 */

interface IssuedKey {
  token: string;
  key_prefix: string;
  tier: string;
  scopes: string[];
  daily_quota: number;
  created_at: string;
}

type TabId = "curl" | "python" | "splunk" | "edl";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "curl", label: "cURL" },
  { id: "python", label: "Python" },
  { id: "splunk", label: "Splunk / SIEM" },
  { id: "edl", label: "Palo Alto EDL" },
];

const TOKEN_PLACEHOLDER = "zx_live_XXXXXXXX_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

/** The subset of the Turnstile browser API this form drives (explicit render). */
interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
}

const SNIPPETS: Record<TabId, string> = {
  curl: `curl -s "https://zayron-x.co/api/v1/vulnerabilities?priority=P0,P1&kev=true&limit=50" \\
  -H "Authorization: Bearer ${TOKEN_PLACEHOLDER}" \\
  -H "Accept: application/json"`,
  python: `import requests

response = requests.get(
    "https://zayron-x.co/api/v1/vulnerabilities",
    params={"priority": "P0,P1", "kev": "true", "min_epss": 0.5, "limit": 50},
    headers={"Authorization": "Bearer ${TOKEN_PLACEHOLDER}", "Accept": "application/json"},
    timeout=15,
)
response.raise_for_status()

for record in response.json()["data"]:
    print(record["cve_id"], record["severity"], record["epss_score"])`,
  splunk: `# Splunk scripted input: bin/zayron_feed.py
import json, requests

feed = requests.get(
    "https://zayron-x.co/api/v1/vulnerabilities",
    params={"min_epss": 0.5, "limit": 100},
    headers={"Authorization": "Bearer ${TOKEN_PLACEHOLDER}"},
    timeout=20,
).json()

for record in feed["data"]:
    print(json.dumps({"cve_id": record["cve_id"], "severity": record["severity"]}))`,
  edl: `# Palo Alto Networks EDL relay — one CVE identifier per line
curl -s "https://zayron-x.co/api/v1/vulnerabilities?kev=true&limit=100" \\
  -H "Authorization: Bearer ${TOKEN_PLACEHOLDER}" \\
| python3 -c "import json,sys; [print(r['cve_id']) for r in json.load(sys.stdin)['data']]"`,
};

const TIERS: Array<{ name: string; badge: string; limit: string; quota: string; note: string }> = [
  {
    name: "Developer",
    badge: "FREE",
    limit: "30 req / 60 s",
    quota: "500 records / day",
    note: "Self-serve, one key per email, anonymous reads of every published record.",
  },
  {
    name: "SOC Team",
    badge: "PRO",
    limit: "300 req / 60 s",
    quota: "50,000 records / day",
    note: "Bulk feed pulls and higher concurrency for shared SOC tooling.",
  },
  {
    name: "Enterprise",
    badge: "ENTERPRISE",
    limit: "1,200 req / 60 s",
    quota: "Contractual",
    note: "Custom field mapping, dedicated delivery, DPA and named escalation path.",
  },
];

function snippetFor(tab: TabId, token: string): string {
  return SNIPPETS[tab].replace(TOKEN_PLACEHOLDER, token || TOKEN_PLACEHOLDER);
}

export function DeveloperPortal({ turnstileSiteKey = "" }: { turnstileSiteKey?: string }) {
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<IssuedKey | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [turnstileValue, setTurnstileValue] = useState("");
  const [turnstileError, setTurnstileError] = useState<string | null>(null);

  const [tab, setTab] = useState<TabId>("curl");
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<number | null>(null);
  const [testBody, setTestBody] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [leadEmail, setLeadEmail] = useState("");
  const [leadOrganization, setLeadOrganization] = useState("");
  const [leadUseCase, setLeadUseCase] = useState("");
  const [leadTier, setLeadTier] = useState<"pro" | "enterprise">("enterprise");
  const [leadState, setLeadState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [leadError, setLeadError] = useState<string | null>(null);

  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // PHASE 7.2 — the widget is mounted EXPLICITLY. Cloudflare's implicit
  // rendering only scans for `.cf-turnstile`, so a bare `data-sitekey` div
  // renders nothing and the form submits with no token (403 MISSING_TURNSTILE_TOKEN).
  // Explicit render also exposes the completion state the submit guard needs.
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
    // `render=explicit` stops Turnstile from scanning the DOM behind our back.
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

  // Tokens are single use, so every submit attempt starts from a clean widget.
  const resetTurnstile = useCallback(() => {
    setTurnstileValue("");
    const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    if (api && turnstileWidgetId.current) {
      try {
        api.reset(turnstileWidgetId.current);
      } catch {
        /* the iframe may already be gone; a fresh page load remounts it */
      }
    }
  }, []);

  // /pricing CTAs deep-link here with ?tier=... so the intake form opens
  // pre-scoped to the tier the visitor actually clicked.
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

  const runTest = useCallback(async () => {
    setTesting(true);
    setTestError(null);
    setTestBody(null);
    setTestStatus(null);
    try {
      const response = await fetch("/api/v1/vulnerabilities?limit=3", { headers: { Accept: "application/json" } });
      const payload = await response.json().catch(() => null);
      setTestStatus(response.status);
      setTestBody(JSON.stringify(payload, null, 2).slice(0, 6000));
    } catch {
      setTestError("Live endpoint unreachable from this browser.");
    } finally {
      setTesting(false);
    }
  }, []);

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

  const activeSnippet = useMemo(() => snippetFor(tab, issued?.token ?? ""), [tab, issued]);

  return (
    <>
      <header className="dev-hero shell">
        <div className="dev-hero-copy">
          <p className="eyebrow">ZAYRON-X INTELLIGENCE API</p>
          <h1>
            Truth Is the <span>Perimeter.</span>
          </h1>
          <p>
            The same source-verified advisories the platform publishes — NVD facts, CISA KEV presence, FIRST EPSS
            probability and the ZAYRON-X strategic assessment — over a versioned REST contract.
          </p>
          <div className="dev-hero-actions">
            <a className="button primary" href="/api/v1/openapi.json" target="_blank" rel="noreferrer">
              OpenAPI 3.1 <span aria-hidden="true">↗</span>
            </a>
            <a className="button secondary" href="#key">
              Get an API key
            </a>
          </div>
        </div>
        <div className="dev-hero-facts">
          <div>
            <span>LIVE STATUS</span>
            <strong>
              <i aria-hidden="true" /> API ONLINE
            </strong>
            <small>Edge rate limits · 300s CDN cache on public reads</small>
          </div>
          <div>
            <span>AUTH</span>
            <strong>48-CHAR BEARER</strong>
            <small>HMAC-SHA256 at rest · shown once</small>
          </div>
          <div>
            <span>TRANSPORT</span>
            <strong>HTTPS · JSON</strong>
            <small>Same-origin for browsers · api.zayron-x.co for servers</small>
          </div>
        </div>
      </header>

      <section className="dev-section shell" id="key" aria-labelledby="dev-key-heading">
        <div className="dev-section-head">
          <div>
            <p className="eyebrow">ACCESS</p>
            <h2 id="dev-key-heading">Self-serve key</h2>
          </div>
          <p>
            One free-tier key per work email. The token is generated in the Cloudflare edge and stored only as an
            HMAC-SHA256 digest — it is displayed exactly once.
          </p>
        </div>

        <div className="dev-key-grid">
          <form className="dev-card" onSubmit={issueKey} aria-describedby="dev-key-note">
            <label className="dev-field">
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
            <label className="dev-field">
              <span>Organization (optional)</span>
              <input
                type="text"
                autoComplete="organization"
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                placeholder="Acme Security"
              />
            </label>
            {turnstileSiteKey && (
              <div className="dev-turnstile" ref={turnstileRef} data-sitekey={turnstileSiteKey} />
            )}
            {turnstileSiteKey && !turnstileValue && (
              <p className="dev-note" role="status">
                Complete the bot-verification check above to unlock token generation.
              </p>
            )}
            {turnstileError && (
              <p className="dev-error" role="alert">
                {turnstileError}
              </p>
            )}
            <button
              className="button primary dev-submit"
              type="submit"
              disabled={issuing || (Boolean(turnstileSiteKey) && !turnstileValue)}
            >
              {issuing ? "Issuing…" : "Generate 48-character token"}
            </button>
            <p className="dev-note" id="dev-key-note">
              No plaintext credential is written to the database or to logs. Rate limited by client IP.
            </p>
            {issueError && (
              <p className="dev-error" role="alert">
                {issueError}
              </p>
            )}
          </form>

          <div className={`dev-token-card${issued ? " issued" : ""}`} aria-live="polite">
            {!issued && (
              <>
                <span className="dev-token-label">TOKEN</span>
                <code className="dev-token-value">{TOKEN_PLACEHOLDER}</code>
                <small>
                  Generated tokens are exactly 48 characters: <code>zx_live_</code> + 8-character KeyID + 31-character
                  CSPRNG secret.
                </small>
              </>
            )}
            {issued && (
              <>
                <span className="dev-token-label">TOKEN — SHOWN ONCE</span>
                <code className="dev-token-value">{issued.token}</code>
                <div className="dev-token-meta">
                  <span>48 chars</span>
                  <span>HMAC-SHA256 verified</span>
                  <span>{issued.tier.toUpperCase()} tier</span>
                  <span>{issued.daily_quota.toLocaleString()} / day</span>
                </div>
                <button
                  className="button primary dev-submit"
                  type="button"
                  onClick={() => copy("token", issued.token)}
                >
                  {copied === "token" ? "Copied" : "Copy token"}
                </button>
                <p className="dev-warning">
                  Store this now. It cannot be retrieved again — only regenerated by contacting
                  contact@zayron-x.co.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="dev-section shell" id="explorer" aria-labelledby="dev-explorer-heading">
        <div className="dev-section-head">
          <div>
            <p className="eyebrow">INTEGRATION</p>
            <h2 id="dev-explorer-heading">API explorer</h2>
          </div>
          <p>Copy-ready snippets for the tools a SOC already runs. Replace the placeholder with your token.</p>
        </div>

        <div className="dev-tabs" role="tablist" aria-label="Integration snippets">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`dev-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls="dev-snippet"
              className={tab === item.id ? "active" : ""}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="dev-code" id="dev-snippet" role="tabpanel" aria-labelledby={`dev-tab-${tab}`}>
          <div className="dev-code-head">
            <span>{TABS.find((item) => item.id === tab)?.label}</span>
            <button type="button" onClick={() => copy("snippet", activeSnippet)}>
              {copied === "snippet" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre>
            <code>{activeSnippet}</code>
          </pre>
        </div>

        <div className="dev-live">
          <div className="dev-live-head">
            <div>
              <span className="dev-token-label">LIVE TEST</span>
              <p>GET /api/v1/vulnerabilities?limit=3</p>
            </div>
            <button className="button secondary" type="button" onClick={runTest} disabled={testing}>
              {testing ? "Querying…" : "Test endpoint"}
            </button>
          </div>
          {testError && (
            <p className="dev-error" role="alert">
              {testError}
            </p>
          )}
          {testStatus !== null && (
            <p className={`dev-live-status${testStatus === 200 ? " ok" : " bad"}`}>
              HTTP {testStatus} · live edge response
            </p>
          )}
          {testBody && (
            <pre className="dev-live-body">
              <code>{testBody}</code>
            </pre>
          )}
        </div>
      </section>

      <section className="dev-section shell" id="limits" aria-labelledby="dev-limits-heading">
        <div className="dev-section-head">
          <div>
            <p className="eyebrow">EDGE ENFORCEMENT</p>
            <h2 id="dev-limits-heading">Quotas &amp; rate limits</h2>
          </div>
          <p>
            Limits are enforced before the database is touched and reported on every response through
            <code> X-RateLimit-Limit</code>, <code>X-Zayron-Tier</code> and <code>X-Request-Id</code>.
          </p>
        </div>
        <div className="dev-tier-grid">
          {TIERS.map((tier) => (
            <article className="dev-tier" key={tier.name}>
              <span className={`dev-tier-badge${tier.badge === "FREE" ? "" : " accent"}`}>{tier.badge}</span>
              <h3>{tier.name}</h3>
              <dl>
                <div>
                  <dt>Rate</dt>
                  <dd>{tier.limit}</dd>
                </div>
                <div>
                  <dt>Quota</dt>
                  <dd>{tier.quota}</dd>
                </div>
              </dl>
              <p>{tier.note}</p>
            </article>
          ))}
        </div>
        <p className="dev-note">
          Exceeding a limit returns <code>429</code> with <code>Retry-After: 60</code>. Anonymous reads are additionally
          served from the Cloudflare CDN with <code>s-maxage=300</code>, so repeat traffic costs no database reads.
        </p>
      </section>

      <section className="dev-section shell" id="request-access" aria-labelledby="dev-lead-heading">
        <div className="dev-section-head">
          <div>
            <p className="eyebrow">PROCUREMENT</p>
            <h2 id="dev-lead-heading">Request Pro or Enterprise</h2>
          </div>
          <p>Captured directly against the ZAYRON-X intake API — no mail client required.</p>
        </div>

        {leadState === "sent" ? (
          <div className="dev-card dev-lead-sent" role="status">
            <strong>Request received.</strong>
            <p>We respond to institutional access requests from contact@zayron-x.co, usually within two business days.</p>
          </div>
        ) : (
          <form className="dev-card dev-lead-form" onSubmit={submitLead}>
            <label className="dev-field">
              <span>Work email</span>
              <input
                type="email"
                required
                value={leadEmail}
                onChange={(event) => setLeadEmail(event.target.value)}
                placeholder="security-lead@your-company.com"
              />
            </label>
            <label className="dev-field">
              <span>Organization</span>
              <input
                type="text"
                value={leadOrganization}
                onChange={(event) => setLeadOrganization(event.target.value)}
                placeholder="Acme Security"
              />
            </label>
            <label className="dev-field">
              <span>Tier</span>
              <select value={leadTier} onChange={(event) => setLeadTier(event.target.value as "pro" | "enterprise")}>
                <option value="pro">SOC Team (Pro)</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label className="dev-field dev-field-wide">
              <span>Intended use</span>
              <textarea
                rows={4}
                value={leadUseCase}
                onChange={(event) => setLeadUseCase(event.target.value)}
                placeholder="Feed enrichment for our vulnerability management programme…"
              />
            </label>
            <button className="button primary dev-submit" type="submit" disabled={leadState === "sending"}>
              {leadState === "sending" ? "Submitting…" : "Request access"}
            </button>
            {leadError && (
              <p className="dev-error" role="alert">
                {leadError}
              </p>
            )}
          </form>
        )}
      </section>
    </>
  );
}
