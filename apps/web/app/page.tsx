import type { Metadata } from "next";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/HeroPrecision";
import { TrustStrip } from "./components/TrustStrip";
import { IntelligenceFoundry } from "./components/intelligence-foundry/IntelligenceFoundry";
import { LatestIntelligence } from "./components/LatestIntelligence";
import { EnterpriseInquiry } from "./components/EnterpriseInquiry";
import { SiteFooter } from "./components/SiteFooter";
import { getSiteUrl, getTurnstileSiteKey, isPreviewDeployment } from "./lib/siteConfig";
import { buildOpenGraph, buildWebPageJsonLd, resolvePageRobots } from "./lib/seo";

/**
 * PHASE 12-EXECUTE — SSR Homepage with explicit self-referencing canonical `/`,
 * 300s revalidation, and Depth-0 live intelligence links.
 */
export const revalidate = 300;

const HOME_DESCRIPTION =
  "Source-verified vulnerability, malware, exploit, actor and campaign intelligence with explicit provenance, confidence and decay.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: { canonical: "/" },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: buildOpenGraph({
      title: "ZAYRON-X — Truth Is the Perimeter",
      description: HOME_DESCRIPTION,
      path: "/",
      type: "website",
    }),
  };
}

export default async function Home() {
  const site = getSiteUrl();
  const jsonLd = buildWebPageJsonLd({
    siteUrl: site,
    path: "/",
    name: "ZAYRON-X — Truth Is the Perimeter",
    description: HOME_DESCRIPTION,
  });

  return (
    <main className="site-atmosphere">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="page-content">
        <Navbar />
        <Hero />
        <TrustStrip />
        <IntelligenceFoundry />
        <LatestIntelligence />
        {/* PHASE 10A — the homepage closes on a real enterprise intake form,
            not an email strip. The briefing subscribe strip stays on /news. */}
        <EnterpriseInquiry turnstileSiteKey={getTurnstileSiteKey()} />
        <SiteFooter />
      </div>
    </main>
  );
}
