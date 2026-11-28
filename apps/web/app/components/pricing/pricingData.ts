/**
 * PHASE 13 — single source of truth for the self-serve pricing architecture.
 *
 * Three pure self-serve tiers, no enterprise or sales-assisted tier. Prices are
 * numeric so the Offer JSON-LD, the rendered cards and the annual arithmetic all
 * read the same constants: a card can never disagree with its structured data.
 */

export const PRICING_PATH = "/pricing";
export const ANNUAL_DISCOUNT_PERCENT = 20;

export type BillingCycle = "monthly" | "annual";

export interface Plan {
  id: "free" | "analyst" | "operator";
  name: string;
  /** Monthly list price in whole USD. */
  monthly: number;
  /** Effective monthly price when billed annually, in whole USD. */
  annualMonthly: number;
  persona: string;
  cta: string;
  href: string;
  /** Staircase label above the highlights for paid tiers. */
  inheritsFrom?: string;
  highlights: string[];
  recommended?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    annualMonthly: 0,
    persona: "Independent researchers exploring public threat feeds",
    cta: "Start free",
    href: "/intelligence",
    highlights: [
      "Public CVE and KEV index",
      "Threat actor and MITRE graph",
      "7 day intelligence archive",
      "Delayed Global Wire stream",
      "Web search workspace",
      "No credit card required",
    ],
  },
  {
    id: "analyst",
    name: "Analyst",
    monthly: 19,
    annualMonthly: 15,
    persona: "SOC analysts and threat hunters needing live API access",
    cta: "Start 7 day trial",
    href: "/developers#request-access",
    inheritsFrom: "Everything in Free plus",
    highlights: [
      "Full REST API across 27 endpoints",
      "10,000 monthly API requests",
      "Real time multilingual Global Wire",
      "My Tech Stack Shield up to 15 vendors",
      "90 day archive and PoC correlation",
      "JSON CSV and STIX 2.1 exports",
    ],
    recommended: true,
  },
  {
    id: "operator",
    name: "Operator",
    monthly: 39,
    annualMonthly: 31,
    persona: "Detection engineers automating defense pipelines",
    cta: "Get Operator",
    href: "/developers#request-access",
    inheritsFrom: "Everything in Analyst plus",
    highlights: [
      "100,000 monthly API requests",
      "Real time KEV and PoC webhooks",
      "My Tech Stack Shield up to 100 vendors",
      "Unlimited historical archive",
      "Firewall EDL and SIEM detection rules",
      "5 API keys with commercial SOC rights",
    ],
  },
];

export const TRUST_POINTS = [
  "Instant API key activation",
  "Zero sales calls or lock in",
  "Hard quota caps with no surprise overages",
  "Cancel anytime in two clicks",
];

/** Rendered price for a plan under the selected cycle. */
export function planPrice(plan: Plan, cycle: BillingCycle): number {
  return cycle === "annual" ? plan.annualMonthly : plan.monthly;
}

export type Cell = boolean | string;

export interface MatrixRow {
  label: string;
  /** Short technical definition shown in a hairline tooltip. */
  hint?: string;
  values: [Cell, Cell, Cell];
}

export interface MatrixGroup {
  id: string;
  title: string;
  rows: MatrixRow[];
}

/**
 * Values are ordered Free, Analyst, Operator. Quotas are literal strings so the
 * table, the copy and the tests can never drift into rounded marketing numbers.
 */
export const MATRIX: MatrixGroup[] = [
  {
    id: "intelligence",
    title: "Threat Intelligence and Global Wire",
    rows: [
      { label: "CVE and KEV enrichment", values: [true, true, true] },
      {
        label: "Global Wire latency",
        hint: "Multilingual OSINT stream normalized, defanged and cross-checked before publication.",
        values: ["Delayed", "Real time", "Real time"],
      },
      { label: "Threat actor and campaign graph", values: ["Public graph", "Full graph", "Full graph"] },
      { label: "Malware and supply chain advisories", values: [true, true, true] },
      { label: "Historical archive", values: ["7 days", "90 days", "Unlimited"] },
    ],
  },
  {
    id: "api",
    title: "API and Automation",
    rows: [
      { label: "REST endpoints", values: ["Public read", "27 endpoints", "27 endpoints"] },
      { label: "Monthly API requests", values: ["No API key", "10,000", "100,000"] },
      {
        label: "Burst rate limit",
        hint: "Requests per minute ceiling. Excess requests return HTTP 429 with Retry-After.",
        values: ["No API key", "60 req/min", "300 req/min"],
      },
      { label: "Active API keys", values: ["No API key", "1 key", "5 keys"] },
      {
        label: "HMAC webhooks",
        hint: "Signed delivery with an HMAC-SHA256 header and an enforced replay window.",
        values: [false, false, true],
      },
      { label: "OpenAPI 3.1 specification", values: [true, true, true] },
    ],
  },
  {
    id: "detection",
    title: "Monitoring Detection and Exports",
    rows: [
      {
        label: "My Tech Stack Shield",
        hint: "Tenant-scoped vendor watchlist that alerts on new verified advisories for tracked products.",
        values: [false, "15 vendors", "100 vendors"],
      },
      { label: "Alert channels", values: ["Web dashboard", "Email alerts", "Email and webhooks"] },
      {
        label: "PoC Radar",
        hint: "Tracks public proof of concept references linked to a CVE record.",
        values: [false, "Correlated", "Correlated and pushed"],
      },
      { label: "Export formats", values: ["Web view", "JSON CSV STIX 2.1", "JSON CSV STIX 2.1"] },
      {
        label: "Firewall EDL feeds",
        hint: "Plain text indicator list imported by a firewall or proxy over HTTPS.",
        values: [false, false, true],
      },
      { label: "KQL Sigma YARA library", values: [false, false, true] },
    ],
  },
  {
    id: "governance",
    title: "Governance and Support",
    rows: [
      { label: "Usage rights", values: ["Public research", "Internal SOC use", "Commercial SOC use"] },
      {
        label: "Overage protection",
        hint: "Hard quota cap. Requests stop at the limit with HTTP 429 instead of billing an overage.",
        values: ["Hard cap", "Hard cap", "Hard cap"],
      },
      { label: "Support channel", values: ["Documentation", "Email support", "Priority email support"] },
    ],
  },
];

export const POSITIONING = {
  legacy: {
    title: "Legacy CTI platforms",
    points: ["Five figure annual contracts", "Gated demos and slow onboarding", "Per seat licensing friction"],
  },
  selfServe: {
    title: "ZAYRON-X self serve",
    points: [
      "Flat $19 or $39 monthly tiers",
      "Live API access in under two minutes",
      "Predictable quotas with transparent docs",
    ],
  },
};

export const PRICING_FAQ: Array<{ question: string; answer: string }> = [
  {
    question: "What happens when an API quota is exhausted?",
    answer:
      "Requests stop at the hard cap and return HTTP 429 with a Retry-After header. Nothing is billed beyond the plan price and no overage is charged mid-cycle.",
  },
  {
    question: "Does Free or the trial require a payment card?",
    answer:
      "No. Free is open without an account and the Analyst trial starts without a payment method. Paid plans are activated manually during early access, so no charge is taken until billing is enabled.",
  },
  {
    question: "How does annual billing work?",
    answer:
      "Annual billing is charged once for twelve months at the discounted monthly rate of $15 for Analyst or $31 for Operator. Monthly plans can be cancelled from the account page and stop at the end of the billed period.",
  },
  {
    question: "Can Operator be used for client SOC work?",
    answer:
      "Operator includes commercial SOC rights for internal and client-facing detection work. Redistribution of raw records as a competing data feed is excluded.",
  },
  {
    question: "Do the firewall EDL and SIEM rules work with existing tooling?",
    answer:
      "EDL feeds are plain text over HTTPS and import into pfSense, Palo Alto, Fortinet and any proxy that accepts a remote list. Detection content ships as KQL, Sigma and YARA.",
  },
  {
    question: "Are tax and expense receipts available?",
    answer:
      "Every payment produces a receipt with the registered entity name, tax identifier and billing period. Receipts are available from the account page and by email.",
  },
];

/**
 * SoftwareApplication node with one Offer per self-serve tier. Prices come from
 * PLANS, so the structured data always matches the rendered card.
 */
export function pricingJsonLd(siteUrl: string, path = PRICING_PATH): Record<string, unknown> {
  const site = siteUrl.replace(/\/+$/, "");
  const url = `${site}${path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${url}#software`,
        name: "ZAYRON-X Threat Intelligence",
        applicationCategory: "SecurityApplication",
        operatingSystem: "Web",
        url,
        description:
          "Source-verified CVE, KEV, exploitation and malware intelligence with a REST API, webhooks and firewall EDL delivery.",
        publisher: { "@id": `${site}/#organization` },
        isPartOf: { "@id": `${site}/#website` },
        offers: PLANS.map((plan) => ({
          "@type": "Offer",
          name: plan.name,
          price: plan.monthly.toFixed(0),
          priceCurrency: "USD",
          url,
          description: plan.persona,
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${site}/` },
          { "@type": "ListItem", position: 2, name: "Pricing", item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: PRICING_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}
