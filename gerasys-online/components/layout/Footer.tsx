'use client';

import Link from 'next/link';

const currentYear = new Date().getFullYear();

const FOOTER_LINKS = [
  { label: 'Docs', href: '/developers' },
  { label: 'Pricing', href: '/#pricing-tiers' },
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
] as const;

export function Footer() {
  return (
    <footer
      className="bg-white dark:bg-[#0A0A0A] border-t border-[var(--color-border)] dark:border-white/10 py-10 font-sans transition-colors duration-350"
      aria-label="Site footer"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand and Copyright */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
          <Link href="/" aria-label="ZAYRON-X Home">
            <span className="text-[1.1rem] font-black uppercase select-none inline-flex items-center tracking-[-0.08em]">
              <span className="text-[var(--color-text)] dark:text-white">ZAYRON</span>
              <span className="text-[var(--color-accent-intelligence)]">-X</span>
            </span>
          </Link>
          <span className="text-[11px] text-[var(--color-text-muted)] dark:text-[#b8b3ac]/60">
            &copy; {currentYear} ZAYRON-X. All rights reserved.
          </span>
        </div>

        {/* Links row */}
        <nav
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs"
          aria-label="Footer links"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[11px] text-[var(--color-text-muted)] dark:text-[#b8b3ac] hover:text-[var(--color-accent-intelligence)] dark:hover:text-[var(--color-accent-intelligence)] transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
