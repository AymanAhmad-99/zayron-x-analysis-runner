import Link from 'next/link';

const currentYear = new Date().getFullYear();

const PRODUCT_LINKS = [
  { label: 'Intelligence', href: '/intelligence/threat-intelligence' },
  { label: 'CVEs', href: '/cve' },
  { label: 'Articles', href: '/news' },
  { label: 'Analysts', href: '/analysts' },
  { label: 'Pricing', href: '/#pricing-tiers' },
  { label: 'Search', href: '/search' },
] as const;

const LEGAL_LINKS = [
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Vulnerability Disclosure', href: '/vdp' },
] as const;

export function Footer() {
  return (
    <footer
      className="bg-[var(--color-bg)] border-t border-[var(--color-border)]"
      aria-label="Site footer"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-10 lg:gap-14">
          {/* Brand column */}
          <div>
            <Link href="/" aria-label="ZAYRON-X Home">
              <span className="text-[1.15rem] font-black uppercase select-none inline-flex items-center tracking-[-0.08em]">
                <span className="text-[var(--color-text)]">ZAYRON</span>
                <span className="text-[var(--color-accent-intelligence)]">-X</span>
              </span>
            </Link>
            <p className="mt-2 text-[0.72rem] text-[var(--color-text-muted)] leading-relaxed max-w-[220px]">
              Cyber Threat Intelligence Platform
            </p>

            {/* Platform status */}
            <Link
              href="/status"
              className="inline-flex items-center gap-1.5 mt-5 text-[0.72rem] font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent-intelligence)] transition-colors duration-200"
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"
                aria-hidden="true"
              />
              Platform Status
            </Link>
          </div>

          {/* Product links */}
          <div>
            <h4
              className="text-[0.72rem] font-semibold text-[var(--color-text)] uppercase tracking-[0.12em] mb-4"
              id="footer-product"
            >
              Product
            </h4>
            <ul className="space-y-2.5" aria-labelledby="footer-product">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[0.78rem] text-[var(--color-text-muted)] hover:text-[var(--color-accent-intelligence)] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4
              className="text-[0.72rem] font-semibold text-[var(--color-text)] uppercase tracking-[0.12em] mb-4"
              id="footer-legal"
            >
              Legal
            </h4>
            <ul className="space-y-2.5" aria-labelledby="footer-legal">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[0.78rem] text-[var(--color-text-muted)] hover:text-[var(--color-accent-intelligence)] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-[0.68rem] text-[var(--color-text-muted)] font-medium tracking-wide">
            &copy; 2026–{currentYear} ZAYRON-X. All rights reserved.
          </span>
          <span className="text-[0.65rem] text-[var(--color-text-muted)] font-mono uppercase tracking-[0.1em]">
            Cyber Threat Intelligence
          </span>
        </div>
      </div>
    </footer>
  );
}
