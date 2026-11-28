import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RouteShell } from "../../../components/RouteShell";
import { getVendor } from "../../../lib/hubs";
import { formatNewsDate, newsHref } from "../../../lib/news";
import { getSiteUrl, isPreviewDeployment } from "../../../lib/siteConfig";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../../../lib/seo";

/** PHASE 9B — one vendor hub: verified CVEs, KEV due dates, PoC coverage, briefings. */

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getVendor(decodeURIComponent(slug));
  if (result.state !== "ok" || !result.data) {
    return {
      title: "Vendor hub not found",
      robots: { index: false, follow: false },
      alternates: { canonical: `/intelligence/vendors/${encodeURIComponent(slug)}` },
    };
  }
  const vendor = result.data;
  const description = `${vendor.verified_cves} authoritative ${vendor.name} CVEs with CISA KEV status, BOD 22-01 due dates and ${vendor.poc_count} indexed public proof(s) of concept.`;
  return {
    title: `${vendor.name} Vulnerability & Exploitation Hub`,
    description,
    alternates: { canonical: `/intelligence/vendors/${vendor.slug}` },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: buildOpenGraph({
      title: `${vendor.name} Security Hub | ZAYRON-X`,
      description,
      path: `/intelligence/vendors/${vendor.slug}`,
      type: "website",
    }),
  };
}

export default async function VendorPage({ params }: Props) {
  const { slug } = await params;
  const result = await getVendor(decodeURIComponent(slug));
  if (result.state === "not_found") notFound();
  if (result.state === "error" || !result.data) throw new Error("Vendor hub temporarily unavailable");
  const vendor = result.data;
  const site = getSiteUrl();
  const graph = buildLinkedJsonLdGraph({
    siteUrl: site,
    path: `/intelligence/vendors/${vendor.slug}`,
    primary: {
      "@type": "CollectionPage",
      name: `${vendor.name} Security Hub`,
      description: `Authoritative vulnerability intelligence for ${vendor.name}.`,
      numberOfItems: vendor.verified_cves,
      about: { "@type": "Organization", name: vendor.name },
    },
  });

  return (
    <RouteShell
      title={`${vendor.name} Security Hub`}
      eyebrow="INTELLIGENCE / VENDORS"
      activeHref="/intelligence/vulnerabilities"
      description={`${vendor.verified_cves} authoritative CVE(s), ${vendor.kev_count} on the CISA KEV catalog and ${vendor.poc_count} public proof(s) of concept.`}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />

      <div className="ioc-telemetry">
        <div className="ioc-telemetry-card">
          <span>VERIFIED CVEs</span>
          <strong>{vendor.verified_cves}</strong>
          <small>authoritative rows</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>CISA KEV</span>
          <strong>{vendor.kev_count}</strong>
          <small>exploited in the wild</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>PUBLIC PoC</span>
          <strong>{vendor.poc_count}</strong>
          <small>indexed repositories</small>
        </div>
      </div>

      <section className="ioc-table-section" aria-label="Verified CVEs">
        <div className="ioc-table-head">
          <h2 className="ioc-section-title">Verified CVEs</h2>
          <span className="ioc-note">Ordered by KEV, then CVSS</span>
        </div>
        <div className="ioc-table-scroll">
          <table className="ioc-table">
            <thead>
              <tr>
                <th>CVE</th>
                <th>Product</th>
                <th>CVSS</th>
                <th>KEV</th>
                <th>PoC</th>
                <th>Published</th>
              </tr>
            </thead>
            <tbody>
              {vendor.cves.map((cve) => (
                <tr key={cve.cve_id}>
                  <td>
                    <a href={`/intelligence/vulnerabilities/${encodeURIComponent(cve.cve_id)}`}>{cve.cve_id}</a>
                  </td>
                  <td>{cve.affected_product ?? "—"}</td>
                  <td>{cve.cvss_score !== null ? Number(cve.cvss_score).toFixed(1) : "—"}</td>
                  <td>{cve.kev ? cve.kev_due_date ?? "LISTED" : "NO"}</td>
                  <td>{cve.poc_count}</td>
                  <td>{cve.published_at ? formatNewsDate(cve.published_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {vendor.related_news.length > 0 ? (
        <section className="ioc-table-section" aria-label="Related intelligence briefings">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">Related intelligence briefings</h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {vendor.related_news.map((briefing) => (
              <a key={briefing.slug} className="ioc-cta" href={newsHref(briefing.slug)}>
                {briefing.title}
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </RouteShell>
  );
}
