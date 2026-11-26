export const routes = {
  home: { label: "Home", href: "/" },
  intelligence: { label: "Intelligence", href: "/intelligence" },
  vulnerabilities: { label: "Vulnerabilities", href: "/intelligence/vulnerabilities" },
  malware: { label: "Malware", href: "/intelligence/malware" },
  exploits: { label: "Exploits", href: "/intelligence/exploits" },
  actors: { label: "Threat Actors", href: "/intelligence/threat-actors" },
  campaigns: { label: "Campaigns", href: "/intelligence/campaigns" },
  iocs: { label: "IOCs", href: "/intelligence/iocs" },
  graph: { label: "Graph", href: "/intelligence/graph" },
  search: { label: "Search", href: "/search" },
  news: { label: "News", href: "/news" },
  research: { label: "Research", href: "/research" },
  pricing: { label: "Pricing", href: "/pricing" },
  developers: { label: "API / Developers", href: "/developers" },
  methodology: { label: "Methodology & Governance", href: "/methodology" },
  about: { label: "About", href: "/about" },
  security: { label: "Security & VDP", href: "/security" },
} as const;

/** Wave 4B — launch navigation: placeholder surfaces are not advertised. */
export const intelligenceRoutes = [
  routes.vulnerabilities,
  routes.malware,
  routes.exploits,
  routes.actors,
  routes.campaigns,
  routes.iocs,
  // PHASE 9B — the neural newsroom is a live, indexable surface.
  routes.news,
];

/**
 * Legal policy links.
 *
 * The core documents are canonical top-level routes (`/privacy`, `/cookies`,
 * `/legal`); the remaining policies live under `/legal/<slug>`. Legacy paths are
 * permanently redirected in `middleware.ts`, so no indexed URL breaks.
 */
export const legalRoutes: Array<{ label: string; href: string }> = [
  { label: "Terms of Use & Disclaimer", href: "/legal" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Security & Disclosure", href: "/security" },
  { label: "Acceptable Use", href: "/legal/acceptable-use" },
  { label: "Malware Research", href: "/legal/malware-research" },
  { label: "Refunds & Billing", href: "/legal/refunds" },
  { label: "DPA", href: "/legal/dpa" },
  { label: "Subprocessors", href: "/legal/subprocessors" },
  { label: "Accessibility", href: "/legal/accessibility" },
];

/** Company pages. */
export const companyRoutes: Array<{ label: string; href: string }> = [
  { label: "About", href: "/about" },
  { label: "Trust Center", href: "/company/trust" },
  { label: "Contact", href: "/company/contact" },
  { label: "Careers", href: "/company/careers" },
];
