'use client';

import { MobileNav } from '@/components/layout/MobileNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Globe, Menu, X } from '@/lib/icons';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Threat Intelligence', href: '/intelligence/threat-intelligence' },
  { label: 'CVE Tracker', href: '/cve' },
  { label: 'Reports', href: '/news' },
  { label: 'Attack Map', href: '/dark-web-recon' },
  { label: 'Pricing', href: '/#pricing-tiers' },
] as const;

export function Header() {
  const pathname = usePathname() ?? '/';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    }
    getSession();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.reload();
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0A0A0A]/90 backdrop-blur border-b border-[var(--color-border)] dark:border-white/10 shadow-none font-sans transition-colors duration-350">
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-6 px-6 lg:px-10">
          {/* ZAYRON-X Wordmark */}
          <div className="flex items-center shrink-0">
            <Link href="/" prefetch={true} className="flex items-center" aria-label="ZAYRON-X Home">
              <span className="text-[1.25rem] font-black uppercase select-none inline-flex items-center tracking-[-0.08em]">
                <span className="text-[var(--color-text)] dark:text-white">ZAYRON</span>
                <span className="text-[var(--color-accent-intelligence)]">-X</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-x-8 h-full" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const baseHref = link.href.split('#')[0] || link.href;
              const isActive =
                pathname === link.href || (baseHref !== '/' && pathname.startsWith(baseHref));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex items-center h-full text-[11px] uppercase tracking-[0.16em] font-semibold transition-colors duration-300 ${
                    isActive
                      ? 'text-[var(--color-accent-intelligence)]'
                      : 'text-[var(--color-text-muted)] dark:text-[#b8b3ac] hover:text-[var(--color-text)] dark:hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-accent-intelligence)] rounded-full animate-[fade-up_0.2s_ease-out]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right-side actions */}
          <div className="flex items-center gap-3.5 sm:gap-5">
            {/* About link */}
            <Link
              href="/about"
              prefetch={true}
              className="p-1.5 rounded-full text-[var(--color-text-muted)] dark:text-[#b8b3ac] hover:text-[var(--color-accent-intelligence)] dark:hover:text-[var(--color-accent-intelligence)] transition-colors"
              aria-label="About ZAYRON-X"
            >
              <Globe className="w-4 h-4" />
            </Link>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Auth / Action CTA */}
            {user ? (
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  href="/dark-web-recon"
                  className="px-4 py-2 text-[10px] uppercase font-bold tracking-wider bg-[var(--color-text)] dark:bg-white text-white dark:text-black rounded-full hover:bg-[var(--color-accent-intelligence)] dark:hover:bg-[var(--color-accent-intelligence)] hover:text-white dark:hover:text-white transition-all duration-300"
                >
                  Platform
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-4">
                <Link
                  href="/login"
                  className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-text-muted)] dark:text-[#b8b3ac] hover:text-[var(--color-text)] dark:hover:text-white transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="px-4.5 py-2 text-[10px] uppercase font-bold tracking-widest bg-[#050505] dark:bg-white text-white dark:text-black rounded-full hover:bg-[var(--color-accent-intelligence)] dark:hover:bg-[var(--color-accent-intelligence)] hover:text-white dark:hover:text-white transition-all duration-300 border border-[#050505] dark:border-white hover:border-[var(--color-accent-intelligence)] dark:hover:border-[var(--color-accent-intelligence)]"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1.5 rounded-md text-[var(--color-text-muted)] dark:text-[#b8b3ac] hover:text-[var(--color-accent-intelligence)] lg:hidden transition-colors cursor-pointer"
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
