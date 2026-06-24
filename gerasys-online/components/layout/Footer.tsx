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
      className="border-t border-[var(--color-border)] bg-[linear-gradient(180deg,#fff_0%,#faf7f1_100%)] py-10 font-sans transition-colors duration-350 dark:border-white/10 dark:bg-[#0A0A0A]"
      aria-label="Site footer"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 px-6 lg:px-10 md:flex-row">
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
