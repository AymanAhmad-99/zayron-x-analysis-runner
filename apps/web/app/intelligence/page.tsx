import type { Metadata } from "next";
import { RouteShell } from "../components/RouteShell";
import { getExploitRadar, getSupplyChainDossiers, getVulnerabilities } from "../lib/api";
import { getThreatActors } from "../lib/threatGraph";
import { getNewsIndex, formatNewsDate, newsHref } from "../lib/news";
import { getVendors, vendorHref } from "../lib/hubs";
import { getTechniques, tacticLabel, techniqueHref } from "../lib/techniques";
import { buildOpenGraph, buildWebPageJsonLd, formatAdvisoryTitle, resolvePageRobots } from "../lib/seo";
import { getSiteUrl, isPreviewDeployment } from "../lib/siteConfig";

export const revalidate = 300;

const DESCRIPTION =
  "Evidence-grounded vulnerability advisories, CISA KEV tracking, MITRE ATT&CK threat actors, malware dossiers, and verified security briefings with explicit provenance.";

export const metadata: Metadata = {
  title: "Threat intelligence",
  description: DESCRIPTION,
  alternates: { canonical: "/intelligence" },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
  openGraph: buildOpenGraph({
    title: "Threat intelligence | ZAYRON-X",
    description: DESCRIPTION,
    path: "/intelligence",
    type: "website",
  }),
};

/** PHASE 11-SEO-RECOVERY — Server-rendered Threat Intelligence Hub (eliminates soft-404). */
export default async function IntelligencePage() {
  const [vulnsRes, radarRes, actorsRes, advisoriesRes, newsRes, vendorsRes, techniquesRes] = await Promise.all([
    getVulnerabilities({ limit: 12, offset: 0 }),
    getExploitRadar(),
    getThreatActors({ limit: 10 }),
    getSupplyChainDossiers(6),
    getNewsIndex({ limit: 6 }),
    getVendors(),
    getTechniques({ limit: 10 }),
  ]);

  const vulns = vulnsRes.data?.items ?? [];
  const vulnTotal = vulnsRes.data?.total ?? vulns.length;
  const radarSummary = radarRes.data?.summary;
  const actors = actorsRes.data?.items ?? [];
  const actorsTotal = actorsRes.data?.total ?? actors.length;
  const advisories = advisoriesRes.data ?? [];
  const newsItems = newsRes.data?.items ?? [];
  const vendors = vendorsRes.data?.items ?? [];
  const techniques = techniquesRes.data?.items ?? [];
  const techniquesTotal = techniquesRes.data?.total ?? techniques.length;

  const jsonLd = buildWebPageJsonLd({
    siteUrl: getSiteUrl(),
    path: "/intelligence",
    name: "Threat intelligence",
    description: DESCRIPTION,
  });

  return (
    <RouteShell
      title="Threat Intelligence Hub"
      eyebrow="INTELLIGENCE / OVERVIEW"
      activeHref="/intelligence"
      description="Authoritative CVEs reconciled across NVD, CISA KEV, FIRST EPSS, MITRE ATT&CK groups and techniques, OpenSSF/OSV malware advisories, and Neural Newsroom briefings."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="workspace-summary">
        <article>
          <small>VERIFIED CVES</small>
          <strong>{vulnTotal}</strong>
          <span>
            <a href="/intelligence/vulnerabilities" style={{ color: "inherit" }}>
              Browse catalog →
            </a>
          </span>
        </article>
        <article>
          <small>CISA KEV &amp; RADAR</small>
          <strong>{radarSummary?.active_kev ?? radarSummary?.total_tracked ?? vulns.length}</strong>
          <span>
            <a href="/intelligence/exploits" style={{ color: "inherit" }}>
              Exploit Radar →
            </a>
          </span>
        </article>
        <article>
          <small>MITRE ATT&amp;CK GRAPH</small>
          <strong>{actorsTotal} actors · {techniquesTotal} techniques</strong>
          <span>
            <a href="/intelligence/threat-actors" style={{ color: "inherit" }}>
              Connected graph →
            </a>
          </span>
        </article>
      </div>

      <section className="ioc-table-section" aria-label="Intelligence directories">
        <div className="ioc-table-head">
          <h2 className="ioc-section-title">Intelligence Directories</h2>
          <span className="ioc-note">Canonical graph entry points</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <a className="ioc-cta" href="/intelligence/vulnerabilities">Vulnerability Catalog ({vulnTotal})</a>
          <a className="ioc-cta" href="/intelligence/exploits">Exploit &amp; Weaponization Radar</a>
          <a className="ioc-cta" href="/intelligence/threat-actors">MITRE ATT&amp;CK Groups ({actorsTotal})</a>
          <a className="ioc-cta" href="/intelligence/techniques">ATT&amp;CK Techniques ({techniquesTotal})</a>
          <a className="ioc-cta" href="/intelligence/vendors">Vendor Security Hubs ({vendors.length})</a>
          <a className="ioc-cta" href="/intelligence/malware">Malware &amp; Supply-Chain Advisories</a>
          <a className="ioc-cta" href="/intelligence/campaigns">Campaign Dossiers</a>
          <a className="ioc-cta" href="/intelligence/regions">Regional Threat Posture</a>
          <a className="ioc-cta" href="/intelligence/iocs">Live IOC Workbench</a>
          <a className="ioc-cta" href="/news">Neural Newsroom Briefings</a>
        </div>
      </section>

      <section className="ioc-table-section" aria-label="High-signal CVEs and CISA KEV advisories">
        <div className="ioc-table-head">
          <h2 className="ioc-section-title">Featured KEV &amp; High-Signal Vulnerabilities</h2>
          <a className="ioc-note" href="/intelligence/vulnerabilities">All {vulnTotal} CVEs →</a>
        </div>
        <div className="vulnerability-table-wrap">
          <table className="vulnerability-table">
            <thead>
              <tr>
                <th scope="col">CVE</th>
                <th scope="col">ADVISORY</th>
                <th scope="col">SEVERITY</th>
                <th scope="col">STATE</th>
              </tr>
            </thead>
            <tbody>
              {vulns.map((v) => {
                const cveId = v.intelligence_id || v.id || "";
                const href = `/intelligence/vulnerabilities/${encodeURIComponent(cveId)}`;
                return (
                  <tr key={cveId}>
                    <td>
                      <a href={href}><strong>{cveId}</strong></a>
                    </td>
                    <td>
                      <a href={href}>{formatAdvisoryTitle(cveId, v.affected_vendor, v.affected_product)}</a>
                    </td>
                    <td>{v.severity || "—"}</td>
                    <td>{v.status || "Verified"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ioc-table-section" aria-label="Tracked MITRE ATT&CK threat actors">
        <div className="ioc-table-head">
          <h2 className="ioc-section-title">Tracked Threat Actors</h2>
          <a className="ioc-note" href="/intelligence/threat-actors">All threat actors →</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {actors.map((actor) => (
            <a
              key={actor.slug}
              className="ioc-telemetry-card"
              href={`/intelligence/threat-actors/${encodeURIComponent(actor.slug)}`}
            >
              <span>{actor.mitre_id || "ATT&CK"}</span>
              <strong>{actor.name}</strong>
              <small>{actor.cve_count} CVEs · {actor.technique_count} techniques · {actor.live_c2_count} C2</small>
            </a>
          ))}
        </div>
      </section>

      <section className="ioc-table-section" aria-label="Vendor and technique hubs">
        <div className="ioc-table-head">
          <h2 className="ioc-section-title">Top Vendor Security Hubs &amp; ATT&amp;CK Techniques</h2>
          <div style={{ display: "flex", gap: 12 }}>
            <a className="ioc-note" href="/intelligence/vendors">All Vendors ({vendors.length}) →</a>
            <a className="ioc-note" href="/intelligence/techniques">All Techniques ({techniquesTotal}) →</a>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {vendors.slice(0, 12).map((vendor) => (
            <a key={vendor.slug} className="ioc-cta" href={vendorHref(vendor.slug)}>
              {vendor.name} ({vendor.verified_cves})
            </a>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {techniques.map((tech) => (
            <a key={tech.id} className="ioc-cta" href={techniqueHref(tech.id)}>
              {tech.id} · {tech.name} ({tacticLabel(tech.tactic)})
            </a>
          ))}
        </div>
      </section>

      <section className="ioc-table-section" aria-label="Malware advisories and briefings">
        <div className="ioc-table-head">
          <h2 className="ioc-section-title">Recent Malware Advisories &amp; Briefings</h2>
          <a className="ioc-note" href="/intelligence/malware">Malware hub →</a>
        </div>
        <div className="shell-records">
          {advisories.map((dossier) => (
            <article key={dossier.report_id} className="shell-record-row">
              <span>{dossier.ecosystem.toUpperCase()} ADVISORY</span>
              <h3>
                <a href={`/intelligence/malware/advisories/${encodeURIComponent(dossier.report_id)}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {dossier.title}
                </a>
              </h3>
              <small>{dossier.report_id} · {dossier.package_name}</small>
            </article>
          ))}
          {newsItems.map((item) => (
            <article key={item.slug} className="shell-record-row">
              <span>{item.category} · {formatNewsDate(item.published_at)}</span>
              <h3>
                <a href={newsHref(item.slug)} style={{ color: "inherit", textDecoration: "none" }}>
                  {item.title}
                </a>
              </h3>
              <small>{item.source_name}</small>
            </article>
          ))}
        </div>
      </section>
    </RouteShell>
  );
}
