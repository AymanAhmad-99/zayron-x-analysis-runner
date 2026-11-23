import type { Metadata } from "next";
import { VulnerabilityList } from "../../components/VulnerabilityList";
import { getVulnerabilities } from "../../lib/api";

export const metadata: Metadata = {
  title: "Vulnerabilities",
  description:
    "Assessed vulnerabilities with CVSS, EPSS and CISA KEV truth states, severity, cited evidence and publication status.",
  alternates: { canonical: "/intelligence/vulnerabilities" },
  openGraph: { title: "Vulnerabilities | ZAYRON-X", url: "/intelligence/vulnerabilities" },
};

export default async function VulnerabilitiesPage() {
  // Wave 4B — first page is fetched in the RSC and rendered into the SSR HTML.
  const initial = await getVulnerabilities({ limit: 25, offset: 0 });
  return <VulnerabilityList initial={initial} />;
}
