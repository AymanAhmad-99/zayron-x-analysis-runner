'use client';

import { Linkedin, X as XIcon } from '@/lib/icons';
import Link from 'next/link';

const currentYear = new Date().getFullYear();

const FOOTER_LINKS = [
  { label: 'Docs', href: '/developers' },
  { label: 'Pricing', href: '/register' },
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
] as const;

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-8 w-8 shrink-0">
        <div className="absolute inset-y-0 left-[28%] w-[8px] -skew-x-12 rounded-full bg-black" />
        <div className="absolute inset-y-0 right-[28%] w-[8px] skew-x-12 rounded-full bg-black" />
        <div className="absolute left-[2%] top-[18%] h-[8px] w-[26px] -skew-x-[42deg] rounded-full bg-[var(--color-accent-intelligence)]" />
        <div className="absolute bottom-[18%] left-[2%] h-[8px] w-[26px] skew-x-[42deg] rounded-full bg-[var(--color-accent-intelligence)]" />
      </div>
      <span className="text-[1.05rem] font-black tracking-[-0.07em] text-[var(--color-text)]">
        ZAYRON-X
      </span>
    </div>
  );
}

export function Footer() {
  return (
    <footer
      className="border-t border-[var(--color-border)] bg-white py-8 font-sans"
      aria-label="Site footer"
    >
      <div className="mx-auto flex max-w-[1480px] flex-col gap-5 px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="flex flex-col items-center gap-3 text-center lg:flex-row lg:gap-5 lg:text-left">
          <Link href="/" aria-label="ZAYRON-X Home">
            <BrandMark />
          </Link>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            &copy; {currentYear} ZAYRON-X. All rights reserved.
          </span>
        </div>

        <nav
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          aria-label="Footer links"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-intelligence)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-center gap-2">
          <Link
            href="https://www.linkedin.com"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-intelligence)]"
            aria-label="LinkedIn"
          >
            <Linkedin className="h-4 w-4" />
          </Link>
          <Link
            href="https://x.com"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-intelligence)]"
            aria-label="X"
          >
            <XIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
