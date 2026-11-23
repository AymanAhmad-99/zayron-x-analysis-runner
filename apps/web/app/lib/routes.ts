export const routes = {
  home: { label: "Home", href: "/" },
  intelligence: { label: "Intelligence", href: "/intelligence" },
  vulnerabilities: { label: "Vulnerabilities", href: "/intelligence/vulnerabilities" },
  malware: { label: "Malware", href: "/intelligence/malware" },
  exploits: { label: "Exploits", href: "/intelligence/exploits" },
  actors: { label: "Threat Actors", href: "/intelligence/actors" },
  campaigns: { label: "Campaigns", href: "/intelligence/campaigns" },
  iocs: { label: "IOCs", href: "/intelligence/iocs" },
  graph: { label: "Graph", href: "/intelligence/graph" },
  search: { label: "Search", href: "/search" },
  news: { label: "News", href: "/news" },
  research: { label: "Research", href: "/research" },
  pricing: { label: "Pricing", href: "/#access" },
} as const;

/** Wave 4B — launch navigation: placeholder surfaces are not advertised. */
export const intelligenceRoutes = [routes.vulnerabilities, routes.malware, routes.exploits, routes.actors, routes.campaigns, routes.iocs];

/** Legal policy links — canonical routes under /legal. */
export const legalRoutes: Array<{ label: string; href: string }> = [
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Acceptable Use", href: "/legal/acceptable-use" },
  { label: "Cookies", href: "/legal/cookies" },
  { label: "Security", href: "/legal/security" },
  { label: "Vulnerability Disclosure", href: "/legal/vulnerability-disclosure" },
  { label: "Copyright & IP", href: "/legal/copyright" },
  { label: "Export Controls", href: "/legal/export-controls" },
  { label: "AI Policy", href: "/legal/ai" },
  { label: "Malware Research", href: "/legal/malware-research" },
  { label: "DPA", href: "/legal/dpa" },
  { label: "Subprocessors", href: "/legal/subprocessors" },
  { label: "Refunds & Billing", href: "/legal/refunds" },
  { label: "Intelligence Disclaimer", href: "/legal/intelligence-disclaimer" },
  { label: "Legal Notices", href: "/legal/legal-notices" },
  { label: "Accessibility", href: "/legal/accessibility" },
];

/** Company pages. */
export const companyRoutes: Array<{ label: string; href: string }> = [
  { label: "About", href: "/company/about" },
  { label: "Trust Center", href: "/company/trust" },
  { label: "Contact", href: "/company/contact" },
  { label: "Careers", href: "/company/careers" },
];
