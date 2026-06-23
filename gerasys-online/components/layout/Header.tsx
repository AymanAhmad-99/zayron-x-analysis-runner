'use client';

import { MobileNav } from '@/components/layout/MobileNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Menu, Search, X } from '@/lib/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_LINKS = [
  { label: 'Intelligence', href: '/intelligence/threat-intelligence' },
  { label: 'CVEs', href: '/cve' },
  { label: 'Articles', href: '/news' },
  { label: 'Analysts', href: '/analysts' },
  { label: 'Pricing', href: '/#pricing-tiers' },
] as const;

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[var(--color-section-royal)]/88 backdrop-blur border-b border-[var(--color-border)] dark:border-white/10 shadow-none font-mono">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-6">
          {/* ZAYRON-X Wordmark */}
          <div className="flex items-center shrink-0">
            <Link href="/" prefetch={true} className="flex items-center" aria-label="ZAYRON-X Home">
              <span
                className="text-[1.3rem] font-black uppercase select-none inline-flex items-center tracking-tighter"
                style={{ letterSpacing: '-0.08em' }}
              >
                <span className="text-[var(--color-text)] dark:text-white">ZAYRON</span>
                <span className="text-[var(--color-accent-intelligence)]">-X</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-x-6 h-full" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  aria-current={isActive ? 'page' : undefined}
                  className={`font-mono text-[10px] uppercase tracking-widest transition-colors duration-200 py-2 border-b-2 ${
                    isActive
                      ? 'text-[var(--color-accent-intelligence)] border-[var(--color-accent-intelligence)]'
                      : 'text-[var(--color-text-muted)] dark:text-[#b8b3ac] border-transparent hover:text-[var(--color-text)] dark:hover:text-white hover:border-[var(--color-border-strong)] dark:hover:border-white/30'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right-side actions */}
          <div className="flex items-center gap-2">
            {/* Search link */}
            <Link
              href="/search"
              prefetch={true}
              className="hidden sm:inline-flex p-2 rounded-md border border-transparent hover:border-[var(--color-border)] dark:hover:border-white/10 hover:bg-[var(--color-bg-soft)] dark:hover:bg-white/5 text-[var(--color-text-muted)] dark:text-[#b8b3ac] hover:text-[var(--color-accent-intelligence)] dark:hover:text-[var(--color-accent-intelligence)] transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </Link>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-md border border-transparent hover:border-[var(--color-border)] dark:hover:border-white/10 hover:bg-[var(--color-bg-soft)] dark:hover:bg-white/5 text-[var(--color-text-muted)] dark:text-[#b8b3ac] hover:text-[var(--color-accent-intelligence)] dark:hover:text-[var(--color-accent-intelligence)] lg:hidden transition-colors"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
