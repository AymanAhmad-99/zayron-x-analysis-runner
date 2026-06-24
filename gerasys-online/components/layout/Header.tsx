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
  { label: 'Dashboard', href: '/login' },
  { label: 'Pricing', href: '/register' },
] as const;

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11 shrink-0">
        <div className="absolute inset-y-0 left-[28%] w-[11px] -skew-x-12 rounded-full bg-black" />
        <div className="absolute inset-y-0 right-[28%] w-[11px] skew-x-12 rounded-full bg-black" />
        <div className="absolute left-[2%] top-[18%] h-[10px] w-[36px] -skew-x-[42deg] rounded-full bg-[var(--color-accent-intelligence)]" />
        <div className="absolute bottom-[18%] left-[2%] h-[10px] w-[36px] skew-x-[42deg] rounded-full bg-[var(--color-accent-intelligence)]" />
      </div>
      <div className="leading-none">
        <div className="text-[1.8rem] font-black tracking-[-0.07em] text-[var(--color-text)]">
          ZAYRON-X
        </div>
        <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Cyber Threat Intelligence
        </div>
      </div>
    </div>
  );
}

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
      <header className="sticky top-0 z-50 border-b border-[rgba(17,17,17,0.08)] bg-white/94 font-sans backdrop-blur-xl">
        <div className="mx-auto flex h-[78px] max-w-[1480px] items-center justify-between gap-6 px-6 lg:px-10">
          <Link href="/" prefetch={true} className="shrink-0" aria-label="ZAYRON-X Home">
            <BrandMark />
          </Link>

          <nav className="hidden h-full items-center gap-x-8 lg:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname === link.href || pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex h-full items-center text-[12px] font-semibold transition-colors ${
                    isActive
                      ? 'text-[var(--color-text)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[var(--color-accent-intelligence)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/about"
              prefetch={true}
              className="hidden rounded-full p-2 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-intelligence)] sm:inline-flex"
              aria-label="About ZAYRON-X"
            >
              <Globe className="h-4 w-4" />
            </Link>

            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {user ? (
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  href="/dark-web-recon"
                  className="inline-flex min-h-11 items-center rounded-[0.95rem] bg-[#050505] px-4 text-[11px] font-bold text-white transition-colors hover:bg-[var(--color-accent-intelligence)]"
                >
                  Platform
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-[11px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-intelligence)]"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden min-h-11 items-center rounded-[0.95rem] bg-[#050505] px-5 text-[11px] font-bold text-white shadow-[0_12px_25px_rgba(17,17,17,0.08)] transition-colors hover:bg-[var(--color-accent-intelligence)] sm:inline-flex"
              >
                Login
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-intelligence)] lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
