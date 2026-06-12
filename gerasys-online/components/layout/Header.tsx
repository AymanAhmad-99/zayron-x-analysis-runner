'use client';

import { MobileNav } from '@/components/layout/MobileNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Menu, Search, X } from '@/lib/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Malware', href: '/intelligence/malware' },
  { label: 'Threat Actors', href: '/intelligence/threat-actors' },
  { label: 'Vulnerabilities', href: '/intelligence/vulnerabilities' },
  { label: 'Exploits', href: '/intelligence/exploits' },
  { label: 'Dark Web', href: '/intelligence/dark-web' },
  { label: 'OSINT', href: '/intelligence/osint' },
] as const;

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white dark:bg-black/80 dark:backdrop-blur border-b border-neutral-200 dark:border-slate-800 shadow-none font-mono">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-6">
          {/* Logo — Sovereign Wordmark */}
          <div className="flex items-center shrink-0">
            <Link href="/" prefetch={true} className="flex items-center" aria-label="ZAYRON-X Home">
              <span
                className="text-[1.3rem] font-black uppercase select-none inline-flex items-center tracking-tighter"
                style={{ letterSpacing: '-0.08em' }}
              >
                <span className="text-[#050505] dark:text-white">ZAYRON</span>
                <span className="text-[#733DD9]">-X</span>
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
                      ? 'text-[#733DD9] border-[#733DD9]'
                      : 'text-neutral-500 dark:text-slate-400 border-transparent hover:text-neutral-900 dark:hover:text-white hover:border-neutral-900 dark:hover:border-slate-400'
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
              className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-500 dark:text-slate-400 hover:text-[#733DD9] dark:hover:text-[#733DD9] transition-colors hidden sm:inline-flex"
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
              className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-600 dark:text-slate-400 lg:hidden transition-colors"
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
