"use client";

import { X, Moon, Sun, Monitor, Globe } from "@/lib/icons";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const links = [
  { label: "Cybersecurity", href: "/intelligence/threat-intelligence" },
  { label: "Vulnerabilities", href: "/intelligence/vulnerabilities" },
  { label: "Ransomware", href: "/intelligence/ransomware" },
  { label: "Nation State", href: "/intelligence/nation-state" },
  { label: "Programming Hub", href: "/programming" },
  { label: "Tools", href: "/tools" },
  { label: "CVE Tracker", href: "/cve" },
  { label: "Analysts", href: "/analysts" },
  { label: "Platform Status", href: "/status" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const cycleTheme = () => {
    if (!mounted) return;
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const ThemeIcon = !mounted ? Monitor : theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      id="mobile-menu"
    >
      <div
        className="absolute inset-0 bg-[#0F172A]/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute top-0 right-0 w-72 h-full bg-white dark:bg-slate-950 shadow-2xl animate-slide-down flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0] dark:border-slate-800">
          <span className="font-display font-bold text-[#0F172A] dark:text-white">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors text-[#475569] dark:text-slate-400"
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
              className="block px-3 py-2.5 text-sm font-medium text-[#475569] dark:text-slate-400 hover:text-[#733DD9] dark:hover:text-[#733DD9] hover:bg-[#F1F5F9] dark:hover:bg-slate-800/50 rounded-lg transition-colors font-ui"
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
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#475569] dark:text-slate-400 hover:text-[#733DD9] dark:hover:text-[#733DD9] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors flex-1"
            aria-label="Toggle theme"
          >
            <ThemeIcon className="w-4 h-4" />
            <span>{!mounted ? "Theme" : theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System"}</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#475569] dark:text-slate-400 hover:text-[#733DD9] dark:hover:text-[#733DD9] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors"
            aria-label="Switch language"
          >
            <Globe className="w-4 h-4" />
            <span>AR / EN</span>
          </button>
        </div>
      </div>
    </div>
  );
}
