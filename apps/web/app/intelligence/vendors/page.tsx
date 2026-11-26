import type { Metadata } from "next";
import { RouteShell } from "../../components/RouteShell";
import { getVendors, vendorHref } from "../../lib/hubs";
import { getSiteUrl, isPreviewDeployment } from "../../lib/siteConfig";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../../lib/seo";

/** PHASE 9B — vendor security hub index, authoritative rows only. */

export const revalidate = 300;

export function generateMetadata(): Metadata {
  const description =
    "Vendor security hubs generated strictly from authoritative, catalog-verified CVEs: KEV status, BOD 22-01 due dates and public proof-of-concept coverage per vendor.";
  return {
    title: "Vendor Security Hubs | ZAYRON-X",
    description,
    alternates: { canonical: "/intelligence/vendors" },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: buildOpenGraph({ title: "Vendor Security Hubs | ZAYRON-X", description, path: "/intelligence/vendors", type: "website" }),
  };
}

export default async function VendorsPage() {
  const result = await getVendors();
  const items = result.data?.items ?? [];
  const site = getSiteUrl();
  const graph = buildLinkedJsonLdGraph({
    siteUrl: site,
    path: "/intelligence/vendors",
    primary: {
      "@type": "CollectionPage",
      name: "Vendor Security Hubs",
      description: "Authoritative, catalog-verified vulnerability hubs grouped by vendor.",
      numberOfItems: items.length,
    },
  });

  return (
    <RouteShell
      title="Vendor Security Hubs"
      eyebrow="INTELLIGENCE / VENDORS"
      activeHref="/intelligence/vulnerabilities"
      description="Every hub below exists because at least one authoritative CVE names that vendor. Unverified legacy rows never create a hub or inflate a count."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />
      {result.state === "error" ? (
        <div className="workspace-state">
          <strong>VENDOR INDEX TEMPORARILY UNAVAILABLE</strong>
          <span>The hub index could not be read. This is a transient failure, not an empty catalog.</span>
        </div>
      ) : items.length === 0 ? (
        <div className="workspace-state">
          <strong>NO VERIFIED VENDOR HUBS</strong>
          <span>No authoritative CVE is currently published.</span>
        </div>
      ) : (
        <section className="ioc-table-section" aria-label="Vendor hubs">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">{items.length} vendor hubs</h2>
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
        </section>
      )}
    </RouteShell>
  );
}
