'use client';

import { Monitor, Moon, Sun, X } from '@/lib/icons';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const links = [
  { label: 'Home', href: '/' },
  { label: 'Threat Intelligence', href: '/intelligence/threat-intelligence' },
  { label: 'CVE Tracker', href: '/cve' },
  { label: 'Reports', href: '/news' },
  { label: 'Attack Map', href: '/dark-web-recon' },
  { label: 'Dashboard', href: '/login' },
  { label: 'Pricing', href: '/register' },
];

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const cycleTheme = () => {
    if (!mounted) return;
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const ThemeIcon = !mounted
    ? Monitor
    : theme === 'dark'
      ? Moon
      : theme === 'light'
        ? Sun
        : Monitor;

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      id="mobile-menu"
    >
      <div
        className="absolute inset-0 bg-[rgba(17,17,17,0.28)] dark:bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute top-0 right-0 flex h-full w-72 flex-col border-l border-[var(--color-border)] bg-[linear-gradient(180deg,#fff_0%,#faf7f1_100%)] shadow-2xl dark:border-white/10 dark:bg-[var(--color-section-royal)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4 dark:border-white/10">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text)] dark:text-white">
            ZAYRON-X Menu
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-soft)] dark:hover:bg-white/5 transition-colors text-[var(--color-text-muted)] dark:text-[#b8b3ac] hover:text-[var(--color-accent-intelligence)] dark:hover:text-[var(--color-accent-intelligence)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              className="block rounded-lg px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-accent-intelligence)] dark:text-[#b8b3ac] dark:hover:bg-white/5 dark:hover:text-[var(--color-accent-intelligence)]"
              onClick={onClose}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Bottom controls */}
        <div className="p-4 border-t border-[var(--color-border)] dark:border-white/10 flex items-center gap-2">
          <button
            type="button"
            onClick={cycleTheme}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] dark:text-[#b8b3ac] hover:text-[var(--color-accent-intelligence)] dark:hover:text-[var(--color-accent-intelligence)] rounded-lg hover:bg-[var(--color-bg-soft)] dark:hover:bg-white/5 transition-colors flex-1"
            aria-label="Toggle theme"
          >
            <ThemeIcon className="w-4 h-4" />
            <span>
              {!mounted
                ? 'Theme'
                : theme === 'dark'
                  ? 'Dark'
                  : theme === 'light'
                    ? 'Light'
                    : 'System'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
