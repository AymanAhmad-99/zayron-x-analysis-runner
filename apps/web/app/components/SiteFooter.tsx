import { companyRoutes, legalRoutes, routes } from "../lib/routes";

const platform = [
  { label: "Threat Intelligence", href: routes.intelligence.href },
  { label: "Malware", href: routes.malware.href },
  { label: "Vulnerabilities", href: routes.vulnerabilities.href },
];

// Wave 4B — /research and /news are placeholder surfaces; they are not linked
// from the launch footer until they serve real content.
const resources = [
  { label: "Methodology", href: "/#foundry" },
  { label: "Signal Index", href: "/#latest-intelligence" },
];

/**
 * Social links are intentionally omitted: no verified public profiles exist yet,
 * and dead links are never rendered as active channels. Add them only once the
 * account URLs are verified.
 */

export function SiteFooter() {
  const columns: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
    { title: "Platform", links: platform },
    { title: "Resources", links: resources },
    { title: "Company", links: companyRoutes },
    { title: "Legal", links: legalRoutes },
  ];

  return (
    <footer className="footer-card shell" aria-label="Site footer">
      <div className="footer-card-top">
        <div className="footer-brand-block">
          <a className="footer-wordmark" href={routes.home.href} aria-label="ZAYRON-X home">
            ZAYRON-<b>X</b>
          </a>
          <p>Evidence-driven cyber threat intelligence.</p>
        </div>
        <nav className="footer-columns" aria-label="Footer">
          {columns.map((col) => (
            <div className="footer-col" key={col.title}>
              <h3>{col.title}</h3>
              {col.links.map((link) => (
                <a href={link.href} key={link.label}>
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div className="footer-card-bottom">
        <div className="footer-legal">
          <span>© 2026 ZAYRON-X. All rights reserved.</span>
          <a href="/legal/privacy">Privacy</a>
          <a href="/legal/terms">Terms</a>
          <a href="/company/trust">Trust Center</a>
          <small>
            ZAYRON-X is a mark used by the ZAYRON-X operating entity (Montana entity formation pending). Policies are
            drafts pending legal counsel review.
          </small>
        </div>
      </div>
    </footer>
  );
}
