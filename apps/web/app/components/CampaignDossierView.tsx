"use client";
import { useState } from "react";
import { IntelligenceShellFrame } from "./IntelligenceShellFrame";
import { type CampaignDossier, formatGraphDate, tacticLabel } from "../lib/threatGraph";

/**
 * PHASE 8C — campaign dossier. Attribution links back to every actor dossier;
 * the Navigator layer is generated server-side and downloaded from memory.
 */

export function CampaignDossierView({ dossier }: { dossier: CampaignDossier }) {
  const { campaign, hunting } = dossier;
  const [copied, setCopied] = useState(false);

  const downloadNavigator = () => {
    try {
      const blob = new Blob([JSON.stringify(dossier.navigator, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${campaign.slug}-attack-navigator.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* blocked download: the API endpoint remains available */
    }
  };

  const copyBrief = async () => {
    const brief = [
      `${campaign.name}${campaign.mitre_id ? ` (${campaign.mitre_id})` : ""}`,
      campaign.actors.length ? `Attributed to: ${campaign.actors.map((actor) => actor.name).join(", ")}` : "Unattributed in MITRE ATT&CK",
      `Documented techniques: ${campaign.technique_count}`,
      campaign.target_sectors.length ? `Targeted sectors: ${campaign.target_sectors.join(", ")}` : null,
      campaign.software.length ? `Tooling: ${campaign.software.slice(0, 10).join(", ")}` : null,
      campaign.cves.length ? `Documented CVEs: ${campaign.cves.join(", ")}` : null,
      campaign.summary,
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

  return (
    <IntelligenceShellFrame
      eyebrow="INTELLIGENCE / CAMPAIGNS"
      activeHref="/intelligence/campaigns"
      statusLabel="LIVE INTELLIGENCE"
      headingId="campaign-heading"
    >
      <div className="workspace-heading">
        <div>
          <p className="workspace-eyebrow">CAMPAIGN DOSSIER · {campaign.mitre_id ?? "MITRE ATT&CK"}</p>
          <h1 id="campaign-heading" className="workspace-title">
            {campaign.name}
          </h1>
          <p className="workspace-lede">{campaign.summary || "Canonical MITRE ATT&CK campaign."}</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="ioc-cta" onClick={copyBrief}>
            {copied ? "Copied" : "Copy brief"}
          </button>
          <button type="button" className="ioc-cta" onClick={downloadNavigator}>
            Download ATT&amp;CK Navigator (.json)
          </button>
        </div>
      </div>

      <div className="ioc-telemetry" aria-label="Campaign facts">
        <div className="ioc-telemetry-card">
          <span>ACTIVITY</span>
          <strong style={{ fontSize: "1rem" }}>
            {campaign.activity_tier === "LIVE_OBSERVED" ? "LIVE OBSERVED" : "CANONICAL PROFILE"}
          </strong>
          <small>{campaign.linked_kev_count} KEV-linked CVE(s)</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>TIMELINE</span>
          <strong style={{ fontSize: "1rem" }}>
            {[formatGraphDate(campaign.first_seen), formatGraphDate(campaign.last_seen)].filter(Boolean).join(" → ") || "Not documented"}
          </strong>
          <small>MITRE created → modified</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>TECHNIQUES</span>
          <strong>{campaign.technique_count}</strong>
          <small>documented ATT&amp;CK techniques</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>TARGETING</span>
          <strong style={{ fontSize: "1rem" }}>
            {[...campaign.target_sectors, ...campaign.target_regions].slice(0, 2).join(" · ") || "Not documented"}
          </strong>
          <small>{campaign.target_regions.slice(0, 2).join(" · ") || "no documented region"}</small>
        </div>
      </div>

      <h2 className="workspace-subhead">Attribution</h2>
      {campaign.actors.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {campaign.actors.map((actor) => (
            <a
              key={actor.slug}
              href={`/intelligence/threat-actors/${encodeURIComponent(actor.slug)}`}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.16)",
                color: "var(--color-accent)",
                textDecoration: "none",
              }}
            >
              {actor.name}
              <span className="ioc-note" style={{ display: "block" }}>
                {actor.mitre_id ?? "—"} · {actor.activity_tier === "LIVE_OBSERVED" ? "live observed" : "canonical profile"}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className="ioc-note">MITRE ATT&amp;CK records no group attribution for this campaign.</p>
      )}

      {campaign.software.length || campaign.cves.length ? (
        <>
          <h2 className="workspace-subhead">Documented tooling &amp; CVEs</h2>
          <p className="ioc-note">
            {campaign.software.length ? `Tooling: ${campaign.software.slice(0, 16).join(", ")}` : "No documented software."}
          </p>
          {campaign.cves.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {campaign.cves.map((cve) => (
                <a
                  key={cve}
                  href={`/intelligence/vulnerabilities/${encodeURIComponent(cve)}`}
                  className="ioc-note mono"
                  style={{ padding: "3px 9px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.18)", textDecoration: "none" }}
                >
                  {cve}
                </a>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

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
                    href={`https://attack.mitre.org/techniques/${technique.id.replace(".", "/")}`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="ioc-note"
                    style={{ padding: "3px 9px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.18)", textDecoration: "none" }}
                  >
                    <span className="mono">{technique.id}</span> {technique.name}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="ioc-note">MITRE ATT&amp;CK maps no technique to this campaign.</p>
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
    </IntelligenceShellFrame>
  );
}
