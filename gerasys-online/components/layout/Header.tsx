"use client";
 
import Link from "next/link";
import { usePathname } from "next/navigation";
 
const NAV_LINKS = [
  { label: "Overview", href: "/" },
  { label: "Dark Web Recon", href: "/dark-web-recon" },
  { label: "CVE Tracker", href: "/cve" },
  { label: "Sector Scan", href: "/intelligence/threat-intelligence" },
] as const;
 
export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-none font-sans">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
        
        {/* Logo — Sovereign Wordmark (Far Left) */}
        <div className="flex items-center shrink-0">
          <Link href="/" className="flex items-center">
            <span 
              className="text-[1.3rem] font-black uppercase select-none inline-flex items-center tracking-tighter" 
              style={{ letterSpacing: "-0.08em" }}
            >
              <span className="text-[#050505]">ZAYRON</span>
              <span className="text-[#733DD9]">-X</span>
            </span>
          </Link>
        </div>

        {/* Navigation Links (Right-Aligned for Sovereign Cleanliness) */}
        <nav className="flex items-center gap-x-8 h-full">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[0.75rem] font-bold uppercase tracking-wider transition-colors duration-200 py-2 border-b-2 ${
                  isActive 
                    ? "text-[#733DD9] border-[#733DD9]" 
                    : "text-neutral-500 border-transparent hover:text-neutral-900 hover:border-neutral-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}


