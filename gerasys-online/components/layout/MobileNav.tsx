"use client";

import { X } from "@/lib/icons";
import Link from "next/link";

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
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-0 right-0 w-72 h-full bg-white shadow-2xl animate-slide-down">
        <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
          <span className="font-display font-bold text-[#0F172A]">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors"
          >
            <X size={20} className="text-[#475569]" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2.5 text-sm font-medium text-[#475569] hover:text-[#D2B48C] hover:bg-[#F1F5F9] rounded-lg transition-colors font-ui"
              onClick={onClose}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
