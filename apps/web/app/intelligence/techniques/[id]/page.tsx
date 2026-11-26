import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RouteShell } from "../../../components/RouteShell";
import { CodeTabs } from "../../../components/CodeTabs";
import { getTechnique, tacticLabel } from "../../../lib/techniques";
import { getSiteUrl, isPreviewDeployment } from "../../../lib/siteConfig";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../../../lib/seo";
import { RelatedBriefings } from "../../../components/RelatedBriefings";

/**
 * PHASE 9A — `/intelligence/techniques/:id`.
 *
 * The internal ATT&CK backbone: every actor, campaign and malware family that
 * documents this technique, plus a deterministic hunting starter. The official
 * attack.mitre.org reference lives here, so every other surface can link here
 * instead of leaving the mesh.
 */

type Props = { params: Promise<{ id: string }> };

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getTechnique(decodeURIComponent(id));
  if (result.state !== "success" || !result.data) {
    return {
      title: "Technique not found | ZAYRON-X",
      robots: { index: false, follow: false },
      alternates: { canonical: `/intelligence/techniques/${encodeURIComponent(id)}` },
    };
  }
  const technique = result.data;
  const canonical = `/intelligence/techniques/${technique.id}`;
  const description = `${technique.id} — ${technique.name} (${tacticLabel(technique.tactic)}). ${technique.actors.length} documented threat actors and ${technique.campaigns.length} campaigns in the ZAYRON-X connected threat graph, with KQL and SPL hunting starters.`;
  return {
    title: `${technique.id} — ${technique.name} | MITRE ATT&CK | ZAYRON-X`,
    description,
    alternates: { canonical },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: buildOpenGraph({
      title: `${technique.id} — ${technique.name}`,
      description,
      path: canonical,
      type: "article",
    }),
    twitter: { card: "summary_large_image", title: `${technique.id} — ${technique.name}`, description },
  };
}

export default async function TechniquePage({ params }: Props) {
  const { id } = await params;
  const result = await getTechnique(decodeURIComponent(id));
  // PHASE 9A (F4) — only a confirmed 404 is a 404.
  if (result.state === "not_found") notFound();
  if (result.state === "error") throw new Error("Technique dossier temporarily unavailable");
  const technique = result.data;
  if (!technique) throw new Error("Technique dossier temporarily unavailable");

  const site = getSiteUrl();
  const jsonLd = buildLinkedJsonLdGraph({
    siteUrl: site,
    path: `/intelligence/techniques/${technique.id}`,
    primary: {
      "@type": "TechArticle",
      headline: `${technique.id} — ${technique.name}`,
      description: `MITRE ATT&CK technique ${technique.id} with the threat actors and campaigns that document it.`,
      isAccessibleForFree: true,
      about: [
        { "@type": "Thing", name: technique.name, sameAs: technique.mitre_url },
        ...technique.malware_families.map((family) => ({ "@type": "Thing", name: family.name })),
      ],
      keywords: ["MITRE ATT&CK", technique.id, technique.name, tacticLabel(technique.tactic)].join(", "),
    },
  });

  return (
    <RouteShell
      title={`${technique.id} — ${technique.name}`}
      eyebrow="INTELLIGENCE / ATT&CK TECHNIQUES"
      activeHref="/intelligence/threat-actors"
      description={`Documented ATT&CK technique ${technique.id}, with every threat actor, campaign and malware family in this store that references it.`}
      contextNotice="Edges are seeded from the canonical MITRE ATT&CK profiles. A technique is a documented capability, not an observation of this environment."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <div className="ioc-telemetry" aria-label="Technique facts">
        <div className="ioc-telemetry-card">
          <span>TECHNIQUE</span>
          <strong>{technique.id}</strong>
          <small>{tacticLabel(technique.tactic)}</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>THREAT ACTORS</span>
          <strong>{technique.actors.length}</strong>
          <small>documented groups</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>CAMPAIGNS</span>
          <strong>{technique.campaigns.length}</strong>
          <small>documented operations</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>MALWARE FAMILIES</span>
          <strong>{technique.malware_families.length}</strong>
          <small>live hubs</small>
        </div>
      </div>

      <section className="ioc-table-section" aria-label="Attributed threat actors">
        <div className="ioc-table-head">
          <h2 className="ioc-section-title">Threat actors using {technique.id}</h2>
          <a className="ioc-note" href={technique.mitre_url} target="_blank" rel="noopener noreferrer nofollow">
            Official ATT&amp;CK entry ↗
          </a>
        </div>
        {technique.actors.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {technique.actors.map((actor) => (
              <a key={actor.slug} className="ioc-cta" href={`/intelligence/threat-actors/${actor.slug}`}>
                {actor.name}
              </a>
            ))}
          </div>
        ) : (
          <div className="workspace-state">
            <strong>NO ACTOR LINK</strong>
            <span>No canonical MITRE group in this store documents this technique.</span>
          </div>
        )}
      </section>

      <section className="ioc-table-section" aria-label="Attributed campaigns">
        <div className="ioc-table-head">
          <h2 className="ioc-section-title">Campaigns using {technique.id}</h2>
        </div>
        {technique.campaigns.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {technique.campaigns.map((campaign) => (
              <a key={campaign.slug} className="ioc-cta" href={`/intelligence/campaigns/${campaign.slug}`}>
                {campaign.name}
              </a>
            ))}
          </div>
        ) : (
          <div className="workspace-state">
            <strong>NO CAMPAIGN LINK</strong>
            <span>No canonical MITRE campaign in this store documents this technique.</span>
          </div>
        )}
      </section>

      {technique.malware_families.length > 0 ? (
        <section className="ioc-table-section" aria-label="Malware families">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">Malware families using {technique.id}</h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {technique.malware_families.map((family) => (
              <a key={family.slug} className="ioc-cta" href={`/intelligence/malware/families/${family.slug}`}>
                {family.name}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ioc-table-section" aria-label="Hunting starters">
        <div className="ioc-table-head">
          <h2 className="ioc-section-title">Hunting starter</h2>
          <span className="ioc-note">Deterministic template — tune before alerting</span>
        </div>
        <CodeTabs
          title={`${technique.id} hunting starters`}
          note={technique.hunting.note}
          tabs={[
            { label: "Microsoft Sentinel (KQL)", code: technique.hunting.kql },
            { label: "Splunk (SPL)", code: technique.hunting.spl },
          ]}
        />
      </section>
      <RelatedBriefings items={(technique as any).related_news} />
    </RouteShell>
  );
}
