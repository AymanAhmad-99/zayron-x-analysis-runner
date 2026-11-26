"use client";
import { useState } from "react";
import { IntelligenceShellFrame } from "./IntelligenceShellFrame";
import {
  type ThreatActorDossier,
  formatGraphDate,
  tacticLabel,
} from "../lib/threatGraph";

/**
 * PHASE 8C — flagship adversary dossier.
 *
 * Every number here is either a MITRE ATT&CK documented fact or an API-computed
 * live count. The ATT&CK Navigator layer is produced server-side and downloaded
 * from an in-memory Blob, so the export never depends on a second request.
 */

function downloadJson(payload: unknown, filename: string): void {
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch {
    /* a blocked download is silent; the API endpoint remains available */
  }
}

export function ThreatActorDossierView({ dossier }: { dossier: ThreatActorDossier }) {
  const { actor, diamond, hunting } = dossier;
  const [copied, setCopied] = useState(false);

  const copyBrief = async () => {
    const brief = [
      `${actor.name}${actor.mitre_id ? ` (${actor.mitre_id})` : ""} — ${actor.motivation}`,
      actor.aliases.length ? `Aliases: ${actor.aliases.join(", ")}` : null,
      `Documented techniques: ${actor.technique_count}`,
      actor.target_sectors.length ? `Targeted sectors: ${actor.target_sectors.join(", ")}` : null,
      actor.target_regions.length ? `Targeted regions: ${actor.target_regions.join(", ")}` : null,
      `Live observation: ${
        actor.activity_tier === "LIVE_OBSERVED"
          ? `${actor.live_c2_count} active indicators across ${actor.live_malware_families.length} documented families; ${actor.linked_kev_count} KEV-linked CVE(s)`
          : "no live footprint in this store today (canonical MITRE profile)"
      }`,
      actor.summary,
      "Source: MITRE ATT&CK Enterprise + ZAYRON-X live graph.",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const live = actor.activity_tier === "LIVE_OBSERVED";

  return (
    <IntelligenceShellFrame
      eyebrow="INTELLIGENCE / THREAT ACTORS"
      activeHref="/intelligence/threat-actors"
      statusLabel="LIVE INTELLIGENCE"
      headingId="actor-heading"
    >
      <div className="workspace-heading">
        <div>
          <p className="workspace-eyebrow">ADVERSARY DOSSIER · {actor.mitre_id ?? "MITRE ATT&CK"}</p>
          <h1 id="actor-heading" className="workspace-title">
            {actor.name}
          </h1>
          <p className="workspace-lede">{actor.summary || "Canonical MITRE ATT&CK profile."}</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="ioc-cta" onClick={copyBrief}>
            {copied ? "Copied" : "Copy brief"}
          </button>
          <button
            type="button"
            className="ioc-cta"
            onClick={() => downloadJson(dossier.navigator, `${actor.slug}-attack-navigator.json`)}
          >
            Download ATT&amp;CK Navigator (.json)
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "12px 0" }}>
        <span
          style={{
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: ".7rem",
            fontWeight: 700,
            letterSpacing: ".06em",
            color: live ? "#4ade80" : "#cbd5e1",
            background: live ? "rgba(34,197,94,.12)" : "rgba(148,163,184,.12)",
            border: `1px solid ${live ? "rgba(74,222,128,.4)" : "rgba(148,163,184,.32)"}`,
          }}
        >
          {live ? "LIVE OBSERVED" : "CANONICAL PROFILE"}
        </span>
        {actor.mitre_url ? (
          <a className="ioc-note" href={actor.mitre_url} target="_blank" rel="noopener noreferrer nofollow">
            MITRE ATT&amp;CK ↗
          </a>
        ) : null}
        {actor.aliases.map((alias) => (
          <span
            key={alias}
            className="ioc-note"
            style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)" }}
          >
            {alias}
          </span>
        ))}
      </div>

      <h2 className="workspace-subhead">Diamond model</h2>
      <div className="ioc-telemetry" aria-label="Diamond model snapshot">
        <div className="ioc-telemetry-card">
          <span>ADVERSARY</span>
          <strong style={{ fontSize: "1rem" }}>{diamond.adversary.motivation}</strong>
          <small>{diamond.adversary.mitre_id ?? "no MITRE id"}</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>CAPABILITIES / TOOLING</span>
          <strong>{diamond.capabilities.technique_count}</strong>
          <small>{diamond.capabilities.software.slice(0, 3).join(" · ") || "no documented software"}</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>LIVE INFRASTRUCTURE</span>
          <strong>{diamond.infrastructure.live_c2_count}</strong>
          <small>
            {diamond.infrastructure.families.length
              ? diamond.infrastructure.families.map((family) => family.family).slice(0, 3).join(" · ")
              : "no active indicators in this store"}
          </small>
        </div>
        <div className="ioc-telemetry-card">
          <span>VICTIMOLOGY</span>
          <strong style={{ fontSize: "1rem" }}>
            {[...diamond.victimology.sectors, ...diamond.victimology.regions].slice(0, 2).join(" · ") || "Not documented"}
          </strong>
          <small>{diamond.victimology.regions.slice(0, 2).join(" · ") || "no documented region"}</small>
        </div>
      </div>

      {live ? (
        <>
          <h2 className="workspace-subhead">Live correlation</h2>
          <div className="vulnerability-table-wrap">
            <table className="vulnerability-table">
              <caption className="sr-only">Live correlated malware families and CVEs</caption>
              <thead>
                <tr>
                  <th scope="col">LIVE EVIDENCE</th>
                  <th scope="col">DETAIL</th>
                  <th scope="col">COUNT</th>
                </tr>
              </thead>
              <tbody>
                {actor.live_malware_families.map((family) => (
                  <tr key={family.family}>
                    <td>
                      <a
                        href={`/intelligence/malware/families/${encodeURIComponent(family.slug)}`}
                        style={{ color: "var(--color-accent)", textDecoration: "none" }}
                      >
                        {family.family}
                      </a>
                    </td>
                    <td className="ioc-note">Active indicators matching documented tooling</td>
                    <td className="mono">{family.active_count}</td>
                  </tr>
                ))}
                {(actor.documented_cves ?? actor.linked_cves).map((cve) => (
                  <tr key={cve.cve_id}>
                    <td>
                      {cve.in_catalog ? (
                        <a
                          href={`/intelligence/vulnerabilities/${encodeURIComponent(cve.cve_id)}`}
                          style={{ color: "var(--color-accent)", textDecoration: "none" }}
                        >
                          {cve.cve_id}
                        </a>
                      ) : (
                        // PHASE 9A (F1) — no local advisory row, so no internal
                        // link. The badge stays copyable and the NVD reference is
                        // external and nofollow.
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <code className="mono">{cve.cve_id}</code>
                          <a
                            href={`https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cve.cve_id)}`}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="ioc-note"
                            style={{ textDecoration: "none" }}
                          >
                            NVD ↗
                          </a>
                        </span>
                      )}
                    </td>
                    <td className="ioc-note">
                      {cve.kev ? "CISA KEV member" : cve.in_catalog ? "Stored advisory" : "Historical MITRE reference"}
                      {cve.due_date ? ` · remediation due ${formatGraphDate(cve.due_date)}` : ""}
                    </td>
                    <td className="mono">{cve.kev ? "KEV" : cve.has_poc ? "POC" : cve.in_catalog ? "CVE" : "MITRE"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="workspace-state">
          <strong>CANONICAL PROFILE — NO LIVE FOOTPRINT IN THIS STORE</strong>
          <span>
            MITRE ATT&amp;CK documents this group, but no active indicator, KEV-listed CVE or verified public
            proof-of-concept here matches its documented tooling. That is an absence of observation, not a judgement.
          </span>
        </div>
      )}

      <h2 className="workspace-subhead">Associated campaigns</h2>
      {dossier.campaigns.length ? (
        <div className="vulnerability-table-wrap">
          <table className="vulnerability-table">
            <caption className="sr-only">Campaigns attributed to this group</caption>
            <thead>
              <tr>
                <th scope="col">CAMPAIGN</th>
                <th scope="col">MITRE</th>
                <th scope="col">TECHNIQUES</th>
                <th scope="col">WINDOW</th>
              </tr>
            </thead>
            <tbody>
              {dossier.campaigns.map((campaign) => (
                <tr key={campaign.slug}>
                  <td>
                    <a
                      href={`/intelligence/campaigns/${encodeURIComponent(campaign.slug)}`}
                      style={{ color: "var(--color-accent)", textDecoration: "none", fontWeight: 600 }}
                    >
                      {campaign.name}
                    </a>
                  </td>
                  <td className="mono">{campaign.mitre_id ?? "—"}</td>
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
        <p className="ioc-note">
          MITRE ATT&amp;CK attributes no documented campaign to this group.
        </p>
      )}

      <h2 className="workspace-subhead">ATT&amp;CK technique matrix</h2>
      {dossier.techniques_by_tactic.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {dossier.techniques_by_tactic.map((group) => (
            <div key={group.tactic}>
              <div className="workspace-eyebrow">{tacticLabel(group.tactic)}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {group.techniques.map((technique) => (
                  <a
                    key={`${technique.id}-${group.tactic}`}
                    // PHASE 9A — the technique backbone is internal now.
                    href={`/intelligence/techniques/${encodeURIComponent(technique.id)}`}
                    className="ioc-note"
                    style={{ padding: "3px 9px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.18)", textDecoration: "none" }}
                    title={technique.name}
                  >
                    <span className="mono">{technique.id}</span> {technique.name}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="ioc-note">MITRE ATT&amp;CK maps no technique to this group.</p>
      )}

      <h2 className="workspace-subhead">Detection as code</h2>
      <p className="ioc-note">{hunting.note}</p>
      <pre
        style={{
          overflowX: "auto",
          padding: 12,
          borderRadius: 8,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
          fontSize: ".78rem",
        }}
      >
        <code>{hunting.kql}</code>
      </pre>
      <pre
        style={{
          overflowX: "auto",
          padding: 12,
          borderRadius: 8,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
          fontSize: ".78rem",
        }}
      >
        <code>{hunting.spl}</code>
      </pre>
    </IntelligenceShellFrame>
  );
}
