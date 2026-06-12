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
  { label: 'Malware', href: '/intelligence/malware' },
  { label: 'Threat Actors', href: '/intelligence/threat-actors' },
  { label: 'Vulnerabilities', href: '/intelligence/vulnerabilities' },
  { label: 'Exploits', href: '/intelligence/exploits' },
  { label: 'Dark Web', href: '/intelligence/dark-web' },
  { label: 'OSINT', href: '/intelligence/osint' },
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
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute top-0 right-0 w-72 h-full bg-white dark:bg-black shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0] dark:border-slate-800">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#0F172A] dark:text-white">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-neutral-900 transition-colors text-[#475569] dark:text-slate-400"
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
              className="block px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#475569] dark:text-slate-400 hover:text-[#733DD9] dark:hover:text-[#733DD9] hover:bg-[#F1F5F9] dark:hover:bg-neutral-900/50 rounded-lg transition-colors"
              onClick={onClose}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Bottom controls */}
        <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={cycleTheme}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#475569] dark:text-slate-400 hover:text-[#733DD9] dark:hover:text-[#733DD9] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-neutral-900 transition-colors flex-1"
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
