'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

const LABELS: Record<string, string> = {
  light: 'Switch to dark mode',
  dark: 'Switch to system theme',
  system: 'Switch to light mode',
};

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span className={`p-2 rounded-md w-9 h-9 inline-block ${className}`} aria-hidden="true" />
    );
  }

  const current = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'system';
  const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
  const Icon = ICONS[current];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={`p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:text-[#733DD9] dark:hover:text-[#733DD9] transition-colors ${className}`}
      aria-label={LABELS[current]}
      title={LABELS[current]}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}
