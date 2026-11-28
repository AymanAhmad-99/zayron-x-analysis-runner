import type { Metadata } from "next";
import { Navbar } from "../components/Navbar";
import { SiteFooter } from "../components/SiteFooter";
import { ComparisonMatrix } from "../components/pricing/ComparisonMatrix";
import { PricingPlans } from "../components/pricing/PricingPlans";
import { POSITIONING, PRICING_FAQ, TRUST_POINTS, pricingJsonLd } from "../components/pricing/pricingData";
import { serializeJsonLd } from "../lib/jsonLd";
import { buildOpenGraph, resolvePageRobots } from "../lib/seo";
import { getSiteUrl, isPreviewDeployment } from "../lib/siteConfig";

export const revalidate = 300;

const TITLE = "Pricing — Self-serve threat intelligence";
const DESCRIPTION =
  "ZAYRON-X pricing: Free at $0, Analyst at $19 per month, Operator at $39 per month. Source-verified CVE intelligence, REST API access and automation without contracts or sales calls.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
  openGraph: buildOpenGraph({ title: `${TITLE} | ZAYRON-X`, description: DESCRIPTION, path: "/pricing", type: "website" }),
};

export default function PricingPage() {
  const jsonLd = pricingJsonLd(getSiteUrl());

  return (
    <main className="site-atmosphere">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <div className="page-content">
        <Navbar />

        <header className="zx-hero shell">
          <p className="zx-eyebrow">Self serve threat intelligence</p>
          <h1>Transparent pricing built for defenders</h1>
          <p className="zx-hero-sub">
            Real time threat intelligence, CVE correlation and API automation without enterprise contracts or sales
            calls.
          </p>
        </header>

        <PricingPlans />

        <section className="zx-trust shell" aria-label="Purchase terms">
          <ul>
            {TRUST_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        <ComparisonMatrix />

        <section className="zx-position shell" aria-labelledby="zx-position-heading">
          <div className="zx-section-head">
            <h2 id="zx-position-heading">Built for velocity not procurement</h2>
            <p>Two ways to buy threat intelligence. One of them requires a calendar invite.</p>
          </div>
          <div className="zx-position-grid">
            <article className="zx-position-card zx-position-card--legacy">
              <h3>{POSITIONING.legacy.title}</h3>
              <ul>
                {POSITIONING.legacy.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
            <article className="zx-position-card zx-position-card--self">
              <h3>{POSITIONING.selfServe.title}</h3>
              <ul>
                {POSITIONING.selfServe.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="zx-faq shell" aria-labelledby="zx-faq-heading">
          <div className="zx-section-head">
            <h2 id="zx-faq-heading">Buying questions</h2>
            <p>Billing, quotas and licensing answered before you create a key.</p>
          </div>
          <div className="zx-faq-list">
            {PRICING_FAQ.map((item, index) => (
              <details key={item.question} className="zx-faq-item" open={index === 0}>
                <summary>
                  <span>{item.question}</span>
                  <span className="zx-faq-mark" aria-hidden="true" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
          <p className="zx-legal-note">
            Billing and cancellation terms are set out in the <a href="/legal">Terms of Use</a> and the{" "}
            <a href="/legal/refunds">Refunds and Billing policy</a>. Tax receipts are issued per payment.
          </p>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
