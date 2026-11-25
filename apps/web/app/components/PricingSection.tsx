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
  ctaHref: string;
  /** Paid tiers are waitlist-only until commercial billing opens. */
  waitlist?: boolean;
  featured?: boolean;
};

const tiers: Tier[] = [
  {
    label: "OPEN",
    name: "Public Intelligence",
    price: "$0",
    cadence: "open access",
    description:
      "Source-verified CVE advisories and static malware dossiers, published without an account.",
    features: [
      "Verified CVE advisories with NVD, CISA KEV and FIRST EPSS context",
      "Static malware dossiers and indicator sets",
      "Exploitation and prioritization records",
      "Public intelligence wire",
      "Unified intelligence search",
    ],
    footerNote: "No account and no payment method required. Public records remain openly accessible.",
    cta: "Open Public Intelligence",
    ctaHref: "/intelligence",
  },
  {
    label: "ANALYST",
    name: "Analyst",
    price: "$19",
    cadence: "per month",
    description:
      "Full-record access and correlation for the individual practitioner running an investigation.",
    featuresIntro: "Everything in Public Intelligence, plus:",
    features: [
      "Full intelligence record access",
      "Cross-entity investigation and pivoting",
      "Complete evidence matrix and source lineage",
      "MITRE ATT&CK technique mapping",
      "Expanded search and IOC lookup limits",
      "Full research and advisory archive",
    ],
    builtFor: "SOC analysts · vulnerability analysts · independent researchers",
    cta: "Request Analyst access",
    ctaHref: "/company/contact",
    waitlist: true,
    featured: true,
  },
  {
    label: "TEAM",
    name: "SOC & Vulnerability Teams",
    price: "$39",
    cadence: "per seat / month",
    description:
      "Shared triage surfaces and remediation tracking for the team that owns the patch queue.",
    featuresIntro: "Everything in Analyst, plus:",
    features: [
      "Shared team workspace and saved investigations",
      "Vulnerability queue with remediation windows",
      "Signal Index tiering across the estate",
      "Higher-volume search and export",
      "Priority access to newly verified records",
      "Named technical contact",
    ],
    builtFor: "SOC shift teams · vulnerability management · incident response",
    cta: "Request team access",
    ctaHref: "/company/contact",
    waitlist: true,
  },
  {
    label: "ENTERPRISE",
    name: "Enterprise & Custom Feeds",
    price: "Custom",
    cadence: "annual agreement",
    description:
      "Machine-readable delivery, procurement review and contractual assurance for the enterprise.",
    featuresIntro: "Everything in Team, plus:",
    features: [
      "API and structured feed delivery",
      "Custom ingestion and field mapping",
      "Security questionnaire and DPA support",
      "Defined service levels and escalation path",
      "Editorial and methodology briefing",
    ],
    builtFor: "Enterprise security · government-adjacent programs · MSSPs",
    cta: "Contact institutional sales",
    ctaHref: "mailto:contact@zayron-x.co",
  },
];

type Cell = string | boolean;
const table: Array<[string, Cell, Cell, Cell, Cell]> = [
  ["Verified CVE advisories", true, true, true, true],
  ["Static malware dossiers", true, true, true, true],
  ["Public intelligence wire", true, true, true, true],
  ["Full evidence matrix", "Public records", true, true, true],
  ["Source provenance", true, true, true, true],
  ["Cross-entity investigation", false, true, true, true],
  ["MITRE ATT&CK mapping", false, true, true, true],
  ["Remediation queue", false, false, true, true],
  ["Signal Index estate view", false, false, true, true],
  ["API / structured feed", false, false, false, true],
  ["Custom field mapping", false, false, false, true],
  ["DPA and security questionnaire", false, false, false, true],
  ["Named technical contact", false, false, true, true],
  ["Service levels", "Best effort", "Best effort", "Business hours", "Contractual"],
];

function CellValue({ value }: { value: Cell }) {
  if (value === true) return <span className="pricing-check" aria-label="Included">Included</span>;
  if (value === false) return <span className="pricing-dash" aria-label="Not included">—</span>;
  return <span className="pricing-cell-text">{value}</span>;
}

const procurementFaq: Array<{ q: string; a: string }> = [
  {
    q: "Is API access included?",
    a: "API and structured feed delivery are part of Enterprise & Custom Feeds. Analyst and Team access are delivered through the platform interface. Public records are readable without machine access.",
  },
  {
    q: "What service levels are offered?",
    a: "Public and self-serve tiers are provided on a best-effort basis. Enterprise agreements define availability, maintenance windows and an escalation path in contract.",
  },
  {
    q: "How is data provenance assured?",
    a: "Every published fact retains its source, identifier and observation time. The verification rules are published in Methodology & Governance and are enforced by the pipeline, not by editorial discretion.",
  },
  {
    q: "How is intelligence licensed?",
    a: "Published records may be cited and quoted with attribution and a link to the source record. Systematic republication, redistribution, resale or model training requires written permission.",
  },
  {
    q: "Can commercial terms be reviewed by procurement?",
    a: "Yes. Enterprise engagements include a data processing addendum, a security questionnaire response, and review of contractual terms by both parties before signature.",
  },
  {
    q: "How is billing handled?",
    a: "Self-serve tiers are pre-registration only until commercial billing opens; no charge is taken today. Enterprise agreements are invoiced under contract.",
  },
];

export function PricingSection() {
  return (
    <section className="pricing-section shell pricing-institutional" id="access" aria-labelledby="access-heading">
      <div className="pricing-intro">
        <div>
          <p className="pricing-motto">Truth Is the Perimeter.</p>
          <h2 id="access-heading">ACCESS TIERS</h2>
        </div>
        <p>
          Access is scoped by operational need, not by withholding evidence. The underlying facts remain public at every
          tier; paid tiers add volume, correlation and delivery.
        </p>
      </div>

      <div className="pricing-grid pricing-grid-4">
        {tiers.map((tier) => (
          <article className={`pricing-card${tier.featured ? " pricing-card-featured" : ""}`} key={tier.label}>
            {tier.featured && <span className="pricing-recommended-badge">MOST REQUESTED</span>}
            <div className="pricing-card-header">
              <span className={`pricing-label${tier.featured || tier.label === "ENTERPRISE" ? " accent" : ""}`}>
                {tier.label}
              </span>
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
                {tier.features.map((feature) => (
                  <li key={feature}>
                    <span aria-hidden="true">+</span>
                    {feature}
                  </li>
                ))}
              </ul>
              {tier.builtFor && <p className="pricing-built-for">{tier.builtFor}</p>}
              {tier.footerNote && <p className="pricing-footer-note">{tier.footerNote}</p>}
            </div>
            <a
              className={`button ${tier.waitlist ? "secondary" : "primary"} pricing-cta-btn`}
              href={tier.ctaHref}
              aria-label={`${tier.name}: ${tier.cta}`}
            >
              {tier.cta} <span aria-hidden="true">↗</span>
            </a>
            {tier.waitlist && (
              <p className="pricing-footer-note">
                Pre-registration. No checkout and no charge today; commercial billing opens with the operating entity.
              </p>
            )}
          </article>
        ))}
      </div>

      <div className="pricing-compare" aria-labelledby="pricing-compare-label">
        <p className="pricing-compare-label" id="pricing-compare-label">
          CAPABILITY COMPARISON
        </p>
        <div className="pricing-table-wrap" tabIndex={0} role="region" aria-label="Tier capability comparison">
          <table className="pricing-table">
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">Public</th>
                <th scope="col">Analyst</th>
                <th scope="col">Team</th>
                <th scope="col">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {table.map(([capability, open, analyst, team, enterprise], i) => (
                <tr key={capability} className={i % 2 === 1 ? "striped" : ""}>
                  <th scope="row">{capability}</th>
                  <td><CellValue value={open} /></td>
                  <td><CellValue value={analyst} /></td>
                  <td><CellValue value={team} /></td>
                  <td><CellValue value={enterprise} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pricing-summary">
        <strong>One evidence standard. Four access scopes.</strong>
        <p>
          Public for verification. Analyst for investigation. Team for remediation. Enterprise for machine delivery under
          contract.
        </p>
      </div>

      <div className="procurement-faq" aria-labelledby="procurement-faq-heading">
        <h2 id="procurement-faq-heading" className="sr-only">
          Procurement and access questions
        </h2>
        {procurementFaq.map((item) => (
          <div key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </div>
        ))}
      </div>

      <p className="pricing-footer-note" role="note">
        Billing and cancellation terms are set out in the <a href="/legal">Terms of Use</a>. Enterprise pricing is quoted
        per agreement; institutional enquiries go to <a href="mailto:contact@zayron-x.co">contact@zayron-x.co</a>.
      </p>
    </section>
  );
}
