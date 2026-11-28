import type { Metadata } from "next";
import { RouteShell } from "../../components/RouteShell";
import { getTechniques, tacticLabel, techniqueHref } from "../../lib/techniques";
import { getSiteUrl, isPreviewDeployment } from "../../lib/siteConfig";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../../lib/seo";

/**
 * PHASE 9C — `/intelligence/techniques`.
 *
 * The sitemap and the robots policy have advertised this URL since Phase 9A, but
 * no route existed behind it, so every crawl of `static.xml` bought a 404. The
 * page is the index over the SAME stored backbone the technique dossiers read:
 * `technique_edges`, one row per documented (technique, actor | campaign |
 * malware) edge. Nothing is inferred and nothing is counted in the browser.
 *
 * Deliberately lightweight: a single bounded API read and a flat table, so the
 * route stays far inside the Free-tier CPU ceiling.
 */

const DESCRIPTION =
  "The MITRE ATT&CK technique backbone of the ZAYRON-X connected threat graph: every documented technique, its tactic, and the number of threat actors, campaigns and malware families that reference it.";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = "/intelligence/techniques";
  return {
    title: "MITRE ATT&CK Technique Index",
    description: DESCRIPTION,
    alternates: { canonical },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: buildOpenGraph({
      title: "MITRE ATT&CK Technique Index | ZAYRON-X",
      description: DESCRIPTION,
      path: canonical,
      type: "website",
    }),
    twitter: { card: "summary_large_image", title: "MITRE ATT&CK Technique Index | ZAYRON-X", description: DESCRIPTION },
  };
}

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export default async function TechniquesPage() {
  // Bounded read: 200 techniques is the whole stored backbone, ordered by the
  // number of documenting actors so the head of the list is the useful part.
  const result = await getTechniques({ limit: 200 });
  const items = result.state === "success" ? result.data?.items ?? [] : [];
  const site = getSiteUrl();

  const jsonLd = buildLinkedJsonLdGraph({
    siteUrl: site,
    path: "/intelligence/techniques",
    primary: {
      "@type": "CollectionPage",
      name: "MITRE ATT&CK Technique Index",
      description: DESCRIPTION,
      isAccessibleForFree: true,
      mainEntity: {
        "@type": "Dataset",
        name: "ZAYRON-X ATT&CK technique backbone",
        description:
          "One row per documented MITRE ATT&CK technique with the stored counts of threat actors, campaigns and malware families that reference it.",
        size: items.length,
      },
    },
  });

  return (
    <RouteShell
      title="ATT&CK Technique Index"
      eyebrow="INTELLIGENCE / TECHNIQUES"
      activeHref="/intelligence/threat-actors"
      description="Every MITRE ATT&CK technique in this store, with the threat actors, campaigns and malware families that document it. Each row opens the internal technique hub."
      contextNotice="A technique is a documented capability. Its presence here records that a catalogued group or family references it, never that it was observed in your environment."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      {result.state === "error" ? (
        <div className="workspace-state">
          <strong>TECHNIQUE INDEX TEMPORARILY UNAVAILABLE</strong>
          <span>The stored ATT&CK backbone could not be read. This is a transient failure, not an empty catalog.</span>
        </div>
      ) : items.length === 0 ? (
        <div className="workspace-state">
          <strong>NO TECHNIQUE EDGES</strong>
          <span>The backbone has not been seeded yet. No technique is listed, and no technique is invented.</span>
        </div>
      ) : (
        <section className="ioc-table-section" aria-label="MITRE ATT&CK techniques">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">Techniques</h2>
            <span className="ioc-note">{items.length} documented technique(s)</span>
          </div>
          <div className="vulnerability-table-wrap">
            <table className="vulnerability-table">
              <caption className="sr-only">MITRE ATT&CK techniques with documented entity counts</caption>
              <thead>
                <tr>
                  <th scope="col">TECHNIQUE</th>
                  <th scope="col">NAME</th>
                  <th scope="col">TACTIC</th>
                  <th scope="col">ACTORS</th>
                  <th scope="col">CAMPAIGNS</th>
                  <th scope="col">EDGES</th>
                </tr>
              </thead>
              <tbody>
                {items.map((technique) => (
                  <tr key={technique.id}>
                    <td>
                      <a href={techniqueHref(technique.id)}>
                        <code>{technique.id}</code>
                      </a>
                    </td>
                    <td>
                      <a href={techniqueHref(technique.id)}>{technique.name}</a>
                    </td>
                    <td>{tacticLabel(technique.tactic)}</td>
                    <td>{technique.actor_count}</td>
                    <td>{technique.campaign_count}</td>
                    <td>{technique.entity_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </RouteShell>
  );
}
