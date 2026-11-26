"use client";
import { useMemo, useState } from "react";
import { RouteShell } from "./RouteShell";
import {
  type ActivityTier,
  type ThreatActorIndex,
  type ThreatActorItem,
  type GraphResult,
  tierLabel,
} from "../lib/threatGraph";

/**
 * PHASE 8C — `/intelligence/threat-actors`.
 *
 * The SSR payload already carries the full canonical catalog (185 groups) and the
 * live-correlation verdict per group, so filtering and alias search run locally
 * and cost no request. `LIVE_OBSERVED` is the API's stored-fact statement: at
 * least one documented software family has active indicators, or a documented CVE
 * is KEV-listed / has a verified public PoC. Everything else is honestly labelled
 * `CANONICAL PROFILE`.
 */

type FilterKey = "all" | "live" | "financial" | "espionage" | "us" | "critical";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All groups" },
  { key: "live", label: "Live observed" },
  { key: "financial", label: "Financial / Ransomware" },
  { key: "espionage", label: "Espionage" },
  { key: "us", label: "Targets: US" },
  { key: "critical", label: "Targets: Finance / Health / Energy" },
];

const CRITICAL_SECTORS = ["finance", "healthcare", "energy"];

function matchesFilter(actor: ThreatActorItem, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "live") return actor.activity_tier === "LIVE_OBSERVED";
  if (filter === "financial") return actor.motivation.toLowerCase().includes("financial");
  if (filter === "espionage") return actor.motivation.toLowerCase().includes("espionage");
  if (filter === "us") return actor.target_regions.some((region) => region.toLowerCase().includes("united states"));
  return actor.target_sectors.some((sector) =>
    CRITICAL_SECTORS.some((needle) => sector.toLowerCase().includes(needle)),
  );
}

export function TierBadge({
  tier,
  liveCount,
  kevCount,
}: {
  tier: ActivityTier;
  liveCount?: number;
  kevCount?: number;
}) {
  const live = tier === "LIVE_OBSERVED";
  const detail = live
    ? [liveCount ? `${liveCount} active indicator${liveCount === 1 ? "" : "s"}` : null, kevCount ? `${kevCount} KEV` : null]
        .filter(Boolean)
        .join(" · ")
    : null;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: ".66rem",
        letterSpacing: ".06em",
        fontWeight: 700,
        whiteSpace: "nowrap",
        color: live ? "#4ade80" : "#cbd5e1",
        background: live ? "rgba(34,197,94,.12)" : "rgba(148,163,184,.12)",
        border: `1px solid ${live ? "rgba(74,222,128,.4)" : "rgba(148,163,184,.32)"}`,
      }}
    >
      {tierLabel(tier)}
      {detail ? <span style={{ fontWeight: 500, color: "inherit", opacity: 0.85 }}> · {detail}</span> : null}
    </span>
  );
}

export function ThreatActorGraph({ initial }: { initial?: GraphResult<ThreatActorIndex> } = {}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const summary = initial?.data?.summary;
  const items = initial?.data?.items ?? [];
  const state = initial?.state ?? "empty";
  const error = initial?.error ?? "";

  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      items.filter((actor) => {
        if (!matchesFilter(actor, filter)) return false;
        if (!needle) return true;
        // Alias search is the point: "Cozy Bear" must surface APT29.
        return `${actor.name} ${actor.slug} ${actor.mitre_id ?? ""} ${actor.aliases.join(" ")} ${actor.software.join(" ")}`
          .toLowerCase()
          .includes(needle);
      }),
    [items, filter, needle],
  );

  return (
    <RouteShell
      title="Connected threat graph"
      eyebrow="INTELLIGENCE / THREAT ACTORS"
      activeHref="/intelligence/threat-actors"
      statusLabel="LIVE INTELLIGENCE"
      description="The complete MITRE ATT&CK Enterprise group catalog, correlated per read against live ZAYRON-X C2 infrastructure, CISA KEV membership and verified public proof-of-concept repositories."
      contextNotice="LIVE OBSERVED means this store holds matching telemetry today. CANONICAL PROFILE is the authoritative MITRE ATT&CK record with no live footprint here — never a claim of inactivity."
    >
      <div className="ioc-telemetry" aria-label="Threat graph telemetry">
        <div className="ioc-telemetry-card">
          <span>TRACKED GROUPS</span>
          <strong>{summary?.total_actors ?? 0}</strong>
          <small>MITRE ATT&amp;CK Enterprise</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>LIVE OBSERVED</span>
          <strong>{summary?.live_observed ?? 0}</strong>
          <small>correlated in this store</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>LINKED CAMPAIGNS</span>
          <strong>{summary?.total_campaigns ?? 0}</strong>
          <small>documented operations</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>MAPPED TECHNIQUES</span>
          <strong>{summary?.mapped_techniques ?? 0}</strong>
          <small>distinct ATT&amp;CK techniques</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>SOURCE PROVENANCE</span>
          <strong style={{ fontSize: "1.05rem" }}>MITRE + Live Graph</strong>
          <small>{summary?.live_families ?? 0} live malware families</small>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "16px 0" }}>
        {FILTERS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className="ioc-cta"
            aria-pressed={filter === entry.key}
            onClick={() => setFilter(entry.key)}
            style={{ opacity: filter === entry.key ? 1 : 0.55 }}
          >
            {entry.label}
          </button>
        ))}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search group, alias, MITRE ID or tool…"
          aria-label="Search threat actors"
          style={{
            flex: "1 1 240px",
            minWidth: 200,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.35)",
            color: "inherit",
          }}
        />
      </div>

      {state === "error" ? (
        <div className="workspace-state error">
          <strong>THREAT GRAPH CURRENTLY UNAVAILABLE</strong>
          <span>{error}</span>
        </div>
      ) : visible.length > 0 ? (
        <div className="vulnerability-table-wrap">
          <table className="vulnerability-table">
            <caption className="sr-only">MITRE ATT&amp;CK threat actor catalog with live correlation</caption>
            <thead>
              <tr>
                <th scope="col">GROUP</th>
                <th scope="col">ALIASES</th>
                <th scope="col">ACTIVITY</th>
                <th scope="col">TARGETING</th>
                <th scope="col">CAMPAIGNS</th>
                <th scope="col">TECHNIQUES</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((actor) => (
                <tr key={actor.slug}>
                  <td>
                    <a
                      href={`/intelligence/threat-actors/${encodeURIComponent(actor.slug)}`}
                      style={{ color: "var(--color-accent)", textDecoration: "none", fontWeight: 600 }}
                    >
                      {actor.name}
                    </a>
                    <div className="ioc-note mono">
                      {actor.mitre_id ?? "—"} · {actor.motivation}
                    </div>
                  </td>
                  <td>
                    <span className="ioc-note">{actor.aliases.slice(0, 4).join(" · ") || "—"}</span>
                    {actor.aliases.length > 4 ? (
                      <div className="ioc-note">+{actor.aliases.length - 4} more</div>
                    ) : null}
                  </td>
                  <td>
                    <TierBadge
                      tier={actor.activity_tier}
                      liveCount={actor.live_c2_count}
                      kevCount={actor.linked_kev_count}
                    />
                  </td>
                  <td>
                    <span className="ioc-note">
                      {[...actor.target_sectors.slice(0, 2), ...actor.target_regions.slice(0, 1)].join(" · ") || "—"}
                    </span>
                  </td>
                  <td className="mono">{actor.campaign_count}</td>
                  <td className="mono">{actor.technique_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="workspace-state">
          <strong>NO GROUP MATCHES THIS FILTER</strong>
          <span>
            Change the filter or search term. Alias search covers every documented MITRE alias — try “Cozy Bear” or
            “Lazarus”.
          </span>
        </div>
      )}
    </RouteShell>
  );
}
