"use client";
import { useMemo, useState } from "react";
import { RouteShell } from "./RouteShell";
import {
  type CampaignItem,
  type CampaignIndex,
  type GraphResult,
  formatGraphDate,
} from "../lib/threatGraph";

/**
 * PHASE 8C — `/intelligence/campaigns`.
 *
 * Canonical MITRE ATT&CK campaigns with bidirectional attribution. `activity_tier`
 * is inherited from observed facts: an attributed group with a live footprint, or
 * a documented CVE that is KEV-listed. Nothing is inferred from a campaign name.
 */

const FILTERS = [
  { key: "all", label: "All campaigns" },
  { key: "live", label: "Live observed" },
  { key: "attributed", label: "Attributed" },
  { key: "finance", label: "Targets: Finance" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function matches(item: CampaignItem, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "live") return item.activity_tier === "LIVE_OBSERVED";
  if (filter === "attributed") return item.actors.length > 0;
  return item.target_sectors.some((sector) => sector.toLowerCase().includes("finance"));
}

export function CampaignGraph({ initial }: { initial?: GraphResult<CampaignIndex> } = {}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const items = initial?.data?.items ?? [];
  const state = initial?.state ?? "empty";
  const error = initial?.error ?? "";
  const needle = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      items.filter((campaign) => {
        if (!matches(campaign, filter)) return false;
        if (!needle) return true;
        return `${campaign.name} ${campaign.slug} ${campaign.mitre_id ?? ""} ${campaign.software.join(" ")} ${campaign.actors
          .map((actor) => actor.name)
          .join(" ")}`
          .toLowerCase()
          .includes(needle);
      }),
    [items, filter, needle],
  );

  return (
    <RouteShell
      title="Campaign intelligence"
      eyebrow="INTELLIGENCE / CAMPAIGNS"
      activeHref="/intelligence/campaigns"
      statusLabel="LIVE INTELLIGENCE"
      description="Canonical MITRE ATT&CK campaigns, attributed bidirectionally to threat groups, documented tooling, targeted sectors and linked CVEs."
      contextNotice="Attribution is MITRE ATT&CK's, not ours. Live observation means this store holds matching telemetry today; a canonical campaign without it is not a claim of inactivity."
    >
      <div className="ioc-telemetry" aria-label="Campaign telemetry">
        <div className="ioc-telemetry-card">
          <span>DOCUMENTED CAMPAIGNS</span>
          <strong>{items.length}</strong>
          <small>MITRE ATT&amp;CK Enterprise</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>ATTRIBUTED</span>
          <strong>{items.filter((item) => item.actors.length > 0).length}</strong>
          <small>linked to a tracked group</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>LIVE OBSERVED</span>
          <strong>{items.filter((item) => item.activity_tier === "LIVE_OBSERVED").length}</strong>
          <small>live footprint in this store</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>KEV-LINKED</span>
          <strong>{items.filter((item) => item.linked_kev_count > 0).length}</strong>
          <small>documented CVE on CISA KEV</small>
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
          placeholder="Search campaign, group or tool…"
          aria-label="Search campaigns"
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
          <strong>CAMPAIGN INDEX CURRENTLY UNAVAILABLE</strong>
          <span>{error}</span>
        </div>
      ) : visible.length > 0 ? (
        <div className="vulnerability-table-wrap">
          <table className="vulnerability-table">
            <caption className="sr-only">MITRE ATT&amp;CK campaigns</caption>
            <thead>
              <tr>
                <th scope="col">CAMPAIGN</th>
                <th scope="col">ATTRIBUTED GROUP</th>
                <th scope="col">TARGETING</th>
                <th scope="col">TECHNIQUES</th>
                <th scope="col">WINDOW</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((campaign) => (
                <tr key={campaign.slug}>
                  <td>
                    <a
                      href={`/intelligence/campaigns/${encodeURIComponent(campaign.slug)}`}
                      style={{ color: "var(--color-accent)", textDecoration: "none", fontWeight: 600 }}
                    >
                      {campaign.name}
                    </a>
                    <div className="ioc-note mono">
                      {campaign.mitre_id ?? "—"}
                      {campaign.linked_kev_count > 0 ? ` · ${campaign.linked_kev_count} KEV` : ""}
                    </div>
                  </td>
                  <td>
                    {campaign.actors.length ? (
                      campaign.actors.map((actor) => (
                        <a
                          key={actor.slug}
                          href={`/intelligence/threat-actors/${encodeURIComponent(actor.slug)}`}
                          style={{ color: "var(--color-accent)", textDecoration: "none", display: "block" }}
                        >
                          {actor.name}
                        </a>
                      ))
                    ) : (
                      <span className="ioc-note">Unattributed in MITRE</span>
                    )}
                  </td>
                  <td>
                    <span className="ioc-note">
                      {[...campaign.target_sectors.slice(0, 2), ...campaign.target_regions.slice(0, 1)].join(" · ") || "—"}
                    </span>
                  </td>
                  <td className="mono">{campaign.technique_count}</td>
                  <td className="ioc-note">
                    {[formatGraphDate(campaign.first_seen), formatGraphDate(campaign.last_seen)].filter(Boolean).join(" → ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="workspace-state">
          <strong>NO CAMPAIGN MATCHES THIS FILTER</strong>
          <span>Change the filter or search term.</span>
        </div>
      )}
    </RouteShell>
  );
}
