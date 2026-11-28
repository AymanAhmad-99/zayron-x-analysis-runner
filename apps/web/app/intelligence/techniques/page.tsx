import type { Metadata } from "next";
import { RouteShell } from "../../components/RouteShell";
import { getTechniques, tacticLabel, techniqueHref } from "../../lib/techniques";
import { getSiteUrl, isPreviewDeployment } from "../../lib/siteConfig";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../../lib/seo";

/**
 * PHASE 11-SEO-RECOVERY — paginated MITRE ATT&CK technique hub (`<= 50` per page).
 */

export const revalidate = 300;
const PAGE_SIZE = 50;

const DESCRIPTION =
  "The MITRE ATT&CK technique backbone of the ZAYRON-X connected threat graph: every documented technique, its tactic, and the number of threat actors, campaigns and malware families that reference it.";

type Props = { searchParams?: Promise<{ page?: string }> };

function parsePage(raw?: string): number {
  const n = Math.floor(Number(raw ?? "1"));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function techniquePageUrl(page: number): string {
  return page <= 1 ? "/intelligence/techniques" : `/intelligence/techniques?page=${page}`;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = searchParams ? await searchParams : {};
  const page = parsePage(params.page);
  const canonical = techniquePageUrl(page);
  const title = page > 1 ? `MITRE ATT&CK Technique Index — Page ${page}` : "MITRE ATT&CK Technique Index";
  return {
    title,
    description: DESCRIPTION,
    alternates: { canonical },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: buildOpenGraph({
      title: `${title} | ZAYRON-X`,
      description: DESCRIPTION,
      path: canonical,
      type: "website",
    }),
    twitter: { card: "summary_large_image", title: `${title} | ZAYRON-X`, description: DESCRIPTION },
  };
}

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export default async function TechniquesPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const result = await getTechniques({ limit: 250 });
  const allItems = result.state === "success" ? result.data?.items ?? [] : [];
  const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const page = Math.min(parsePage(params.page), totalPages);
  const items = allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const site = getSiteUrl();
  const canonical = techniquePageUrl(page);

  const jsonLd = buildLinkedJsonLdGraph({
    siteUrl: site,
    path: canonical,
    primary: {
      "@type": "CollectionPage",
      name: page > 1 ? `MITRE ATT&CK Technique Index — Page ${page}` : "MITRE ATT&CK Technique Index",
      description: DESCRIPTION,
      isAccessibleForFree: true,
      mainEntity: {
        "@type": "Dataset",
        name: "ZAYRON-X ATT&CK technique backbone",
        description:
          "One row per documented MITRE ATT&CK technique with the stored counts of threat actors, campaigns and malware families that reference it.",
        size: allItems.length,
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
      {page > 1 ? <link rel="prev" href={`${site}${techniquePageUrl(page - 1)}`} /> : null}
      {page < totalPages ? <link rel="next" href={`${site}${techniquePageUrl(page + 1)}`} /> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      {result.state === "error" ? (
        <div className="workspace-state">
          <strong>TECHNIQUE INDEX TEMPORARILY UNAVAILABLE</strong>
          <span>The stored ATT&CK backbone could not be read. This is a transient failure, not an empty catalog.</span>
        </div>
      ) : allItems.length === 0 ? (
        <div className="workspace-state">
          <strong>NO TECHNIQUE EDGES</strong>
          <span>The backbone has not been seeded yet. No technique is listed, and no technique is invented.</span>
        </div>
      ) : (
        <section className="ioc-table-section" aria-label="MITRE ATT&CK techniques">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">
              Techniques · Page {page} of {totalPages}
            </h2>
            <span className="ioc-note">{allItems.length} documented technique(s)</span>
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
          {totalPages > 1 ? (
            <nav className="vulnerability-pagination" aria-label="Technique index pages" style={{ marginTop: 16 }}>
              <span>PAGE {page} OF {totalPages}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {page > 1 ? (
                  <a className="ioc-cta" href={techniquePageUrl(page - 1)} rel="prev">
                    ← PREVIOUS
                  </a>
                ) : null}
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((num) => (
                  <a
                    key={num}
                    className={num === page ? "ioc-cta" : "ioc-note"}
                    href={techniquePageUrl(num)}
                    aria-current={num === page ? "page" : undefined}
                    style={{ padding: "4px 9px", textDecoration: "none" }}
                  >
                    {num}
                  </a>
                ))}
                {page < totalPages ? (
                  <a className="ioc-cta" href={techniquePageUrl(page + 1)} rel="next">
                    NEXT →
                  </a>
                ) : null}
              </div>
            </nav>
          ) : null}
        </section>
      )}
    </RouteShell>
  );
}
