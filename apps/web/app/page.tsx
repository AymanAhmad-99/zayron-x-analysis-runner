import { Navbar } from "./components/Navbar";
import { Hero } from "./components/HeroPrecision";
import { TrustStrip } from "./components/TrustStrip";
import { IntelligenceFoundry } from "./components/intelligence-foundry/IntelligenceFoundry";
import { LatestIntelligence } from "./components/LatestIntelligence";
import { EnterpriseInquiry } from "./components/EnterpriseInquiry";
import { SiteFooter } from "./components/SiteFooter";
import { getSiteUrl, getTurnstileSiteKey } from "./lib/siteConfig";
import { buildWebPageJsonLd } from "./lib/seo";

/**
 * PHASE 9C — the homepage now carries its own `WebPage` node.
 *
 * The layout already publishes the site-wide `#organization` / `#website` graph,
 * but the homepage itself had no primary node, so an answer engine received a
 * site graph describing no document. The node links back by `@id`; no duplicate
 * Organization is emitted.
 */
const HOME_DESCRIPTION =
  "Source-verified vulnerability, malware, exploit, actor and campaign intelligence with explicit provenance, confidence and decay.";

export default function Home() {
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
