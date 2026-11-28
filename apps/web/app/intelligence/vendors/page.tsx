import type { Metadata } from "next";
import { RouteShell } from "../../components/RouteShell";
import { getVendors, vendorHref } from "../../lib/hubs";
import { getSiteUrl, isPreviewDeployment } from "../../lib/siteConfig";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../../lib/seo";

/** PHASE 11-SEO-RECOVERY — paginated SSR vendor security hubs (`<= 50` per page). */

export const revalidate = 300;
const PAGE_SIZE = 50;

type Props = { searchParams?: Promise<{ page?: string }> };

function parsePage(raw?: string): number {
  const n = Math.floor(Number(raw ?? "1"));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function vendorPageUrl(page: number): string {
  return page <= 1 ? "/intelligence/vendors" : `/intelligence/vendors?page=${page}`;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = searchParams ? await searchParams : {};
  const page = parsePage(params.page);
  const canonical = vendorPageUrl(page);
  const title = page > 1 ? `Vendor Security Hubs — Page ${page}` : "Vendor Security Hubs";
  const description =
    "Vendor security hubs generated strictly from authoritative, catalog-verified CVEs: KEV status, BOD 22-01 due dates and public proof-of-concept coverage per vendor.";
  return {
    title,
    description,
    alternates: { canonical },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: buildOpenGraph({ title: `${title} | ZAYRON-X`, description, path: canonical, type: "website" }),
  };
}

export default async function VendorsPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const result = await getVendors();
  const allItems = result.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const page = Math.min(parsePage(params.page), totalPages);
  const items = allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const site = getSiteUrl();
  const canonical = vendorPageUrl(page);

  const graph = buildLinkedJsonLdGraph({
    siteUrl: site,
    path: canonical,
    primary: {
      "@type": "CollectionPage",
      name: page > 1 ? `Vendor Security Hubs — Page ${page}` : "Vendor Security Hubs",
      description: "Authoritative, catalog-verified vulnerability hubs grouped by vendor.",
      numberOfItems: allItems.length,
    },
  });

  return (
    <RouteShell
      title="Vendor Security Hubs"
      eyebrow="INTELLIGENCE / VENDORS"
      activeHref="/intelligence/vulnerabilities"
      description="Every hub below exists because at least one authoritative CVE names that vendor. Unverified legacy rows never create a hub or inflate a count."
    >
      {page > 1 ? <link rel="prev" href={`${site}${vendorPageUrl(page - 1)}`} /> : null}
      {page < totalPages ? <link rel="next" href={`${site}${vendorPageUrl(page + 1)}`} /> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />
      {result.state === "error" ? (
        <div className="workspace-state">
          <strong>VENDOR INDEX TEMPORARILY UNAVAILABLE</strong>
          <span>The hub index could not be read. This is a transient failure, not an empty catalog.</span>
        </div>
      ) : allItems.length === 0 ? (
        <div className="workspace-state">
          <strong>NO VERIFIED VENDOR HUBS</strong>
          <span>No authoritative CVE is currently published.</span>
        </div>
      ) : (
        <section className="ioc-table-section" aria-label="Vendor hubs">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">
              {allItems.length} vendor hubs · Page {page} of {totalPages}
            </h2>
            <span className="ioc-note">Authoritative CVEs only</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {items.map((vendor) => (
              <a key={vendor.slug} className="ioc-telemetry-card" href={vendorHref(vendor.slug)}>
                <span>{vendor.name}</span>
                <strong>{vendor.verified_cves}</strong>
                <small>
                  verified CVEs · {vendor.kev_count} KEV · {vendor.poc_count} PoC
                </small>
              </a>
            ))}
          </div>
          {totalPages > 1 ? (
            <nav className="vulnerability-pagination" aria-label="Vendor hub pages" style={{ marginTop: 16 }}>
              <span>PAGE {page} OF {totalPages}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {page > 1 ? (
                  <a className="ioc-cta" href={vendorPageUrl(page - 1)} rel="prev">
                    ← PREVIOUS
                  </a>
                ) : null}
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((num) => (
                  <a
                    key={num}
                    className={num === page ? "ioc-cta" : "ioc-note"}
                    href={vendorPageUrl(num)}
                    aria-current={num === page ? "page" : undefined}
                    style={{ padding: "4px 9px", textDecoration: "none" }}
                  >
                    {num}
                  </a>
                ))}
                {page < totalPages ? (
                  <a className="ioc-cta" href={vendorPageUrl(page + 1)} rel="next">
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
