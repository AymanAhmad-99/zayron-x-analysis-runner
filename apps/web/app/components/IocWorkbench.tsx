"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ThreatPivots } from "./ThreatPivots";
import {
  getIocPreview,
  getIocStats,
  lookupIocValue,
  type IocFeedItem,
  type IocLookupResult,
  type IocStats,
} from "../lib/api";
import { RouteShell } from "./RouteShell";

/**
 * PHASE 7C — live IOC workbench.
 *
 * SAFE-RENDER CONTRACT (non-negotiable, enforced by the unit gate):
 *   every indicator rendered in this file comes from `defanged`, is inside a
 *   plain `<code>` element, and is NEVER wrapped in an `<a href>`. There is not a
 *   single `href` value derived from indicator data anywhere below — the only
 *   links are internal routes (`/developers`, family hubs) and they are constant.
 */

const FILTERS = [
  { id: "all", label: "All" },
  { id: "ip", label: "IPv4" },
  { id: "url", label: "URL" },
  { id: "cidr", label: "CIDR" },
  { id: "edl", label: "EDL-Ready ≥ 85" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function CopyButton({ text, label = "Copy defanged" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" className="ioc-copy" onClick={copy} title={`${label}: ${text}`}>
      {copied ? "Copied" : label}
    </button>
  );
}

function ttlLabel(expiresAt?: string | null) {
  if (!expiresAt) return "—";
  const ms = Date.parse(expiresAt) - Date.now();
  if (!Number.isFinite(ms)) return "—";
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days}d`;
  return `${Math.max(1, Math.floor(ms / 3_600_000))}h`;
}

function VerdictPill({ status }: { status: string }) {
  const normalized = String(status || "").toUpperCase();
  const tone = normalized === "ACTIVE" ? "active" : normalized === "EXPIRED" ? "expired" : "unknown";
  return <span className={`ioc-verdict ${tone}`}>{normalized === "NOT_FOUND" ? "NOT FOUND" : normalized}</span>;
}

export function IocWorkbench({ initialQuery = "" }: { initialQuery?: string }) {
  const [stats, setStats] = useState<IocStats | null>(null);
  const [statsError, setStatsError] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [rows, setRows] = useState<IocFeedItem[]>([]);
  const [rowsState, setRowsState] = useState<"loading" | "ready" | "error">("loading");
  const [rowsError, setRowsError] = useState("");
  const [query, setQuery] = useState(initialQuery);
  const [lookup, setLookup] = useState<IocLookupResult | null>(null);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getIocStats().then((result) => {
      if (cancelled) return;
      if (result.state === "error" || !result.data) {
        setStatsError(result.error || "IOC telemetry is unavailable");
        return;
      }
      setStats(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRowsState("loading");
    getIocPreview({
      type: filter === "ip" || filter === "url" || filter === "cidr" ? filter : undefined,
      minConfidence: filter === "edl" ? 85 : 70,
      limit: 100,
    }).then((result) => {
      if (cancelled) return;
      if (result.state === "error") {
        setRowsState("error");
        setRowsError(result.error || "The indicator feed is unavailable");
        return;
      }
      setRows(result.data?.items ?? []);
      setRowsState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const runLookup = useCallback(async (value: string) => {
    const target = value.trim();
    if (!target) {
      setLookup(null);
      setLookupError("");
      return;
    }
    setLooking(true);
    setLookupError("");
    const result = await lookupIocValue(target);
    setLooking(false);
    if (result.state === "error") {
      setLookup(null);
      setLookupError(result.error || "Lookup failed");
      return;
    }
    setLookup(result.data ?? null);
  }, []);

  useEffect(() => {
    if (initialQuery.trim()) void runLookup(initialQuery);
  }, [initialQuery, runLookup]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    // A transient lookup state is advertised in the URL so it can be shared, and
    // the page's metadata marks any `?q=` URL `noindex, follow`.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (value) url.searchParams.set("q", value);
      else url.searchParams.delete("q");
      window.history.replaceState(null, "", url.toString());
    }
    void runLookup(value);
  };

  const telemetry = useMemo(() => {
    const data = stats;
    return [
      { label: "ACTIVE IOCs", value: data ? String(data.active_total) : "—", note: data ? `${Object.keys(data.active_by_type).length} types` : "loading" },
      { label: "FIREWALL-READY EDL", value: data ? String(data.edl_ready) : "—", note: "confidence ≥ 85" },
      {
        label: "TOP 24H FAMILIES",
        value: data && data.top_families_24h.length > 0 ? data.top_families_24h.slice(0, 2).map((f) => f.family).join(", ") : "—",
        note: data && data.top_families_24h.length > 0 ? `${data.top_families_24h[0].count} indicators` : "no family activity",
      },
      { label: "OPENSSF PACKAGES", value: data ? String(data.openssf_dossiers) : "—", note: "MAL-* dossiers" },
      {
        label: "LAST VERIFIED INGEST",
        value: data?.last_ingest_at ? new Date(data.last_ingest_at.replace(" ", "T") + "Z").toISOString().slice(0, 16).replace("T", " ") + "Z" : "—",
        note: "UTC",
      },
      {
        label: "CLOUDFLARE RADAR",
        value: data?.latest_radar_pulse ? data.latest_radar_pulse.pulse_date : "PENDING",
        note: data?.latest_radar_pulse ? "daily pulse stored" : "token not yet on ingest",
      },
    ];
  }, [stats]);

  return (
    <RouteShell
      title="Indicators of compromise"
      eyebrow="LIVE INTELLIGENCE / IOCS"
      activeHref="/intelligence/iocs"
      description="Live bulk-feed indicators from OpenSSF/OSV, Feodo Tracker, Spamhaus DROP and OpenPhish — normalized, allowlist-filtered, decay-tracked, and published defanged."
      contextNotice="Defensive use only. Indicators are defanged in every rendered view and are never clickable. Absence of an indicator is not absence of compromise."
    >
      {/* ── LIVE TELEMETRY STRIP ── */}
      <div className="ioc-telemetry" aria-label="Live IOC telemetry">
        {telemetry.map((card) => (
          <div className="ioc-telemetry-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.note}</small>
          </div>
        ))}
      </div>
      {statsError ? <p className="ioc-note error">{statsError}</p> : null}

      {/* ── INSTANT LOOKUP ── */}
      <section className="ioc-lookup" aria-label="Indicator lookup">
        <form onSubmit={submit} className="ioc-lookup-form">
          <label htmlFor="ioc-lookup-input">LOOKUP AN INDICATOR</label>
          <div>
            <input
              id="ioc-lookup-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="45[.]9[.]168[.]10 · hxxp://evil[.]example · 45.9.168.0/24 · sha256"
              spellCheck={false}
              autoComplete="off"
            />
            <button type="submit" className="ioc-lookup-submit" disabled={looking}>
              {looking ? "Checking…" : "Check"}
            </button>
          </div>
          <p className="ioc-note">Defanged input is accepted. Lookup results are never clickable.</p>
        </form>

        {lookupError ? <p className="ioc-note error">{lookupError}</p> : null}

        {lookup ? (
          <div className="ioc-lookup-result" aria-live="polite">
            <div className="ioc-lookup-head">
              <VerdictPill status={lookup.status} />
              <code>{lookup.data ? lookup.data.defanged : lookup.query}</code>
              {lookup.data ? <CopyButton text={lookup.data.defanged} /> : null}
            </div>
            {/* PHASE 8A — safe external pivots. The anchor points ONLY at a
                vetted lookup service; the indicator itself is never a link. */}
            {lookup.data ? <ThreatPivots value={lookup.data.defanged} /> : null}
            {lookup.data ? (
              <>
                <div className="ioc-confidence">
                  <span>CONFIDENCE</span>
                  <div role="img" aria-label={`Confidence ${lookup.data.confidence} of 100`}>
                    <i style={{ width: `${Math.max(0, Math.min(100, lookup.data.confidence))}%` }} />
                  </div>
                  <strong>{lookup.data.confidence}/100</strong>
                </div>
                <dl className="ioc-lookup-facts">
                  <div><dt>TYPE</dt><dd>{lookup.data.type}</dd></div>
                  <div><dt>FAMILY</dt><dd>{lookup.data.family || "unresolved"}</dd></div>
                  <div><dt>SOURCES</dt><dd>{lookup.data.sources.length > 0 ? lookup.data.sources.join(", ") : "—"}</dd></div>
                  <div><dt>SEEN</dt><dd>{lookup.data.seen_count}×</dd></div>
                  <div><dt>ASN</dt><dd>{lookup.data.asn ? `${lookup.data.asn}${lookup.data.asn_name ? ` · ${lookup.data.asn_name}` : ""}` : "not enriched"}</dd></div>
                  <div><dt>COUNTRY</dt><dd>{lookup.data.country || "not enriched"}</dd></div>
                  <div><dt>EXPIRES</dt><dd>{lookup.data.expires_at || "—"}</dd></div>
                </dl>
              </>
            ) : (
              <p className="ioc-note">
                This value is not tracked. That is a statement about our coverage, not about the indicator.
              </p>
            )}
          </div>
        ) : null}
      </section>

      {/* ── FILTERABLE TABLE ── */}
      <section className="ioc-table-section" aria-label="Live indicator table">
        <div className="ioc-table-head">
          <div className="ioc-filters" role="group" aria-label="Indicator filters">
            {FILTERS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`ioc-filter${filter === entry.id ? " active" : ""}`}
                aria-pressed={filter === entry.id}
                onClick={() => setFilter(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <a className="ioc-cta" href="/developers">
            Automate via Firewall EDL / API →
          </a>
        </div>

        {rowsState === "ready" && rows.length > 0 ? (
          <div className="vulnerability-table-wrap">
            <table className="vulnerability-table">
              <caption className="sr-only">Defanged live indicators</caption>
              <thead>
                <tr>
                  <th scope="col">INDICATOR (DEFANGED)</th>
                  <th scope="col">TYPE</th>
                  <th scope="col">CONFIDENCE</th>
                  <th scope="col">FAMILY</th>
                  <th scope="col">TTL</th>
                  <th scope="col">SOURCES</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.type}:${row.defanged}`}>
                    <td>
                      <code className="ioc-value">{row.defanged}</code>
                      <CopyButton text={row.defanged} label="Copy" />
                    </td>
                    <td>{row.type}</td>
                    <td>{row.confidence}</td>
                    <td>{row.family || "unresolved"}</td>
                    <td>{ttlLabel(row.expires_at)}</td>
                    <td>{row.sources.length > 0 ? row.sources.join(", ") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {rowsState === "loading" ? (
          <div className="vulnerability-skeleton" aria-busy="true" aria-label="Loading indicators">
            {[1, 2, 3, 4].map((item) => (
              <div key={item}><i /><span /><b /><em /></div>
            ))}
          </div>
        ) : null}

        {rowsState === "ready" && rows.length === 0 ? (
          <div className="workspace-state">
            <strong>NO INDICATORS IN THIS VIEW</strong>
            <span>The live store holds no active indicator matching this filter.</span>
          </div>
        ) : null}

        {rowsState === "error" ? (
          <div className="workspace-state error">
            <strong>INDICATORS CURRENTLY UNAVAILABLE</strong>
            <span>{rowsError}</span>
          </div>
        ) : null}
      </section>
    </RouteShell>
  );
}
