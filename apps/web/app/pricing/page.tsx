import type { Metadata } from "next";
import { Navbar } from "../components/Navbar";
import { PricingSection } from "../components/PricingSection";
import { SiteFooter } from "../components/SiteFooter";
import { isPreviewDeployment } from "../lib/siteConfig";
import { resolvePageRobots } from "../lib/seo";

export const metadata: Metadata = {
  title: "Pricing — Access Tiers",
  description:
    "ZAYRON-X access tiers: Public Intelligence, Analyst, SOC & Vulnerability Teams, and Enterprise & Custom Feeds. Capability comparison, API access, service levels, licensing and procurement terms.",
  alternates: { canonical: "/pricing" },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
  openGraph: { title: "Pricing | ZAYRON-X", url: "/pricing" },
};

export default function PricingPage() {
  return (
    <main className="site-atmosphere">
      <div className="page-content">
        <Navbar />
        <header className="pricing-page-head shell">
          <p className="doc-badge">ACCESS</p>
          <h1>Intelligence access, scoped to the work.</h1>
          <p>
            Every tier reads the same verified records. The difference is investigation depth, remediation workflow and
            delivery format — not the evidence itself.
          </p>
        </header>
        <PricingSection />
        <SiteFooter />
      </div>
    </main>
  );
}
