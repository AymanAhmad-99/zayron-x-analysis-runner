import { routes } from "../lib/routes";

/**
 * Verified public channels. X is intentionally absent: no verified X profile
 * exists, and a placeholder link is never rendered as a live channel.
 */
const social = [
  { label: "ZAYRON-X on Telegram", href: "https://t.me/zayronxai", icon: "telegram" as const },
  { label: "ZAYRON-X on LinkedIn", href: "https://www.linkedin.com/company/zayron-x", icon: "linkedin" as const },
];

const columns: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Intelligence",
    links: [
      { label: "Vulnerabilities", href: "/intelligence/vulnerabilities" },
      { label: "Malware Dossiers", href: "/malware" },
      { label: "Signal Index", href: "/signal-index" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Live Wire", href: "https://t.me/zayronxai" },
      { label: "Methodology & Governance", href: "/methodology" },
      { label: "Malware Handling", href: "/malware-handling" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About ZAYRON-X", href: "/about" },
      { label: "Security & VDP", href: "/security" },
      { label: "Contact", href: "mailto:contact@zayron-x.co" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Terms & Disclaimer", href: "/legal" },
    ],
  },
];

function SocialIcon({ icon }: { icon: "telegram" | "linkedin" }) {
  if (icon === "telegram") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.6 3.6L2.9 10.8c-.9.35-.88 1.62.03 1.94l4.6 1.6 1.77 5.3c.24.72 1.16.9 1.65.32l2.5-2.9 4.6 3.4c.6.44 1.46.1 1.6-.63l3.1-14.5c.15-.73-.55-1.34-1.25-1.05zM9.5 13.9l9.07-6.5-7.32 7.4-.3 3.06-1.45-3.96z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM3 9.5h4v11H3v-11zM10 9.5h3.83v1.5h.05a4.2 4.2 0 013.77-2.07c4.03 0 4.77 2.65 4.77 6.1v5.47h-4v-4.85c0-1.16-.02-2.65-1.62-2.65-1.62 0-1.87 1.26-1.87 2.57v4.93H10v-11z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer-card shell" aria-label="Site footer">
      <div className="footer-card-top">
        <div className="footer-brand-block">
          <a className="footer-wordmark" href={routes.home.href} aria-label="ZAYRON-X home">
            ZAYRON-<b>X</b>
          </a>
          <p className="footer-motto">Truth Is the Perimeter.</p>
          <div className="footer-social">
            {social.map((item) => (
              <a
                key={item.icon}
                href={item.href}
                aria-label={item.label}
                rel="noopener noreferrer"
                target="_blank"
              >
                <SocialIcon icon={item.icon} />
              </a>
            ))}
          </div>
        </div>
        <nav className="footer-columns" aria-label="Footer">
          {columns.map((col) => (
            <div className="footer-col" key={col.title}>
              <h3>{col.title}</h3>
              {col.links.map((link) => (
                <a key={link.label} href={link.href}>
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
          <a href="/privacy">Privacy</a>
          <a href="/legal">Terms</a>
          <a href="/security">Security</a>
          <small className="footer-entity">
            ZAYRON-X · United States (Montana) · Global Coverage · contact@zayron-x.co
          </small>
        </div>
      </div>
    </footer>
  );
}
