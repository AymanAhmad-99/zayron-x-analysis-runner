type Tier = {
  label: string;
  name: string;
  price: string;
  cadence: string;
  description: string;
  featuresIntro?: string;
  features: string[];
  builtFor?: string;
  footerNote?: string;
  cta: string;
  featured?: boolean;
};

const tiers: Tier[] = [
  {
    label: "FREE",
    name: "Community Intelligence",
    price: "$0",
    cadence: "/ month",
    description: "For students, learners, and anyone beginning their threat intelligence journey.",
    features: [
      "Evidence-grounded public intelligence",
      "Vulnerability and CISA KEV intelligence",
      "Public threat actor and malware profiles",
      "Public campaign intelligence",
      "Public research and technical advisories",
      "Unified intelligence search",
      "5 intelligence searches per day",
      "Limited IOC lookups",
      "Evidence and source provenance on public reports",
      "Access to the public intelligence feed",
    ],
    footerNote: "Free public intelligence. No account or credit card required today.",
    cta: "Explore Free",
  },
  {
    label: "ANALYST",
    name: "Individual Threat Intelligence",
    price: "$19",
    cadence: "/ month",
    description: "For security analysts, IT professionals, advanced learners, and individuals who actively investigate threats.",
    featuresIntro: "Everything in Free, plus:",
    features: [
      "Full intelligence report access",
      "Expanded intelligence search",
      "Higher IOC lookup limits",
      "Full IOC extraction and correlation",
      "Threat actor intelligence profiles",
      "Malware and campaign correlation",
      "CVE and exploitation context",
      "MITRE ATT&CK technique mapping",
      "Full evidence matrix and source lineage",
      "Advanced filtering across intelligence entities",
      "Full research and technical advisory archive",
      "Early access to newly verified intelligence",
      "Higher investigation limits",
    ],
    builtFor: "SOC analysts · IT security · cybersecurity students · security practitioners · independent defenders",
    cta: "Contact for availability",
    featured: true,
  },
  {
    label: "RESEARCHER",
    name: "Advanced Cyber Intelligence",
    price: "$39",
    cadence: "/ month",
    description: "For independent researchers, educators, graduate-level students, threat researchers, and advanced security practitioners.",
    featuresIntro: "Everything in Analyst, plus:",
    features: [
      "Research-grade intelligence access",
      "Higher-volume investigation limits",
      "Advanced cross-entity investigation",
      "CVE → IOC → Malware → Threat Actor → Campaign pivots",
      "Deep technical intelligence dossiers",
      "Expanded historical intelligence context",
      "Advanced evidence and provenance views",
      "Research-focused analytical content",
      "Higher-volume IOC and entity investigation",
      "Priority access to new research capabilities",
      "Early access to selected experimental intelligence features",
      "Extended fair-use allowance for intensive research workflows",
    ],
    builtFor: "Independent researchers · educators · advanced students · threat intelligence researchers · security engineers",
    cta: "Contact for availability",
  },
];

type Cell = string | boolean;
const table: Array<[string, Cell, Cell, Cell]> = [
  ["Public Intelligence", true, true, true],
  ["Vulnerability Intelligence", true, true, true],
  ["CISA KEV Coverage", true, true, true],
  ["Threat Actor Intelligence", "Limited", "Full", "Full"],
  ["Malware Intelligence", "Limited", "Full", "Full"],
  ["Campaign Intelligence", "Limited", "Full", "Full"],
  ["IOC Search", "Limited", "Expanded", "High-volume"],
  ["IOC Extraction & Correlation", false, true, true],
  ["Global Intelligence Search", true, true, true],
  ["Advanced Filtering", false, true, true],
  ["MITRE ATT&CK Mapping", false, true, true],
  ["Evidence Matrix", "Public reports", "Full", "Advanced"],
  ["Source Provenance", true, true, true],
  ["Research Articles", "Public", "Full", "Full"],
  ["Technical Dossiers", "Limited", true, "Expanded"],
  ["Cross-Entity Investigation", false, true, "Advanced"],
  ["Historical Context", "Limited", "Expanded", "Deep"],
  ["Early Intelligence Access", false, true, "Priority"],
  ["Research Limits", "Low", "Medium", "High"],
  ["API / Machine Access", false, false, false],
];

function CellValue({ value }: { value: Cell }) {
  if (value === true) return <span className="pricing-check" aria-label="Included">✓</span>;
  if (value === false) return <span className="pricing-dash" aria-label="Not included">—</span>;
  return <span className="pricing-cell-text">{value}</span>;
}

export function PricingSection() {
  return (
    <section className="pricing-section shell" id="access" aria-labelledby="access-heading">
      <div className="pricing-intro">
        <div>
          <div className="eyebrow">05 / ACCESS</div>
          <h2 id="access-heading">INTELLIGENCE FOR EVERY STAGE.</h2>
        </div>
        <p>Evidence-driven cyber threat intelligence for students, security professionals, independent researchers, and analysts.</p>
      </div>

      <div className="pricing-grid">
        {tiers.map((tier) => (
          <article className={`pricing-card${tier.featured ? " pricing-card-featured" : ""}`} key={tier.label}>
            {tier.featured && <span className="pricing-recommended-badge">RECOMMENDED</span>}
            <div className="pricing-card-header">
              <span className={`pricing-label${tier.featured ? " accent" : tier.label === "RESEARCHER" ? " accent" : ""}`}>{tier.label}</span>
              <h3 className="pricing-plan-name">{tier.name}</h3>
              <div className="pricing-price">
                <strong>{tier.price}</strong>
                <span>{tier.cadence}</span>
              </div>
              <p>{tier.description}</p>
            </div>
            <div className="pricing-card-body">
              {tier.featuresIntro && <p className="pricing-features-intro">{tier.featuresIntro}</p>}
              <ul>
                {tier.features.map((feature) => <li key={feature}><span aria-hidden="true">+</span>{feature}</li>)}
              </ul>
              {tier.builtFor && <p className="pricing-built-for">{tier.builtFor}</p>}
              {tier.footerNote && <p className="pricing-footer-note">{tier.footerNote}</p>}
            </div>
            <a className="button primary pricing-cta-btn" href="#contact">{tier.cta} <span aria-hidden="true">↗</span></a>
          </article>
        ))}
      </div>

      <div className="pricing-compare" aria-labelledby="pricing-compare-label">
        <p className="pricing-compare-label" id="pricing-compare-label">COMPARE PLANS</p>
        <div className="pricing-table-wrap" tabIndex={0} role="region" aria-label="Plan comparison table">
          <table className="pricing-table">
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">Free</th>
                <th scope="col">Analyst — $19</th>
                <th scope="col">Researcher — $39</th>
              </tr>
            </thead>
            <tbody>
              {table.map(([capability, free, analyst, researcher], i) => (
                <tr key={capability} className={i % 2 === 1 ? "striped" : ""}>
                  <th scope="row">{capability}</th>
                  <td><CellValue value={free} /></td>
                  <td><CellValue value={analyst} /></td>
                  <td><CellValue value={researcher} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pricing-summary">
        <strong>One platform. Three levels of access.</strong>
        <p>Free — Discover the threat landscape. Analyst — Investigate with stronger intelligence. Researcher — Go deeper and conduct serious security research.</p>
      </div>

      <p className="pricing-footer-note" role="note">
        Indicative pricing only. ZAYRON-X does not currently offer checkout, subscriptions, or payment, and no charge is
        taken. Paid tiers are shown for planning and require confirmation of availability. See the{" "}
        <a href="/legal/refunds">Refund, Cancellation &amp; Billing Policy</a>.
      </p>
    </section>
  );
}
