import React from "react";
import Link from "next/link";

const sections = [
  {
    title: "INTELLIGENCE",
    links: [
      { label: "Threats", href: "/threats" },
      { label: "Malware", href: "/malware" },
      { label: "Vulnerabilities", href: "/vulnerabilities" },
      { label: "Actors", href: "/actors" },
      { label: "Campaigns", href: "/campaigns" },
      { label: "IOCs", href: "/iocs" },
    ],
  },
  {
    title: "MONITORING",
    links: [
      { label: "Telegram Streams", href: "/intelligence" },
      { label: "Dark Web Ingestion", href: "/intelligence" },
      { label: "Discord Telemetry", href: "/intelligence" },
      { label: "Open Sources & OSINT", href: "/sources" },
      { label: "Threat Feeds", href: "/sources" },
    ],
  },
  {
    title: "RESEARCH",
    links: [
      { label: "Research Reports", href: "/reports" },
      { label: "Malware Analysis", href: "/reports" },
      { label: "Publications Desk", href: "/reports" },
      { label: "Methodology", href: "/methodology" },
      { label: "Pipeline", href: "/methodology" },
    ],
  },
  {
    title: "ORGANIZATION",
    links: [
      { label: "About ZAYRON-X", href: "/about" },
      { label: "Careers & Mission", href: "/about" },
      { label: "Research Blog", href: "/reports" },
      { label: "Contact Intelligence Desk", href: "/contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="w-full bg-[#0A0A0A] border-t border-white/[0.06] pt-16 pb-10">
      <div className="max-w-[1380px] mx-auto px-8">

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-10 mb-14">

          {/* Brand column */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <span
              className="text-white font-bold text-[15px] tracking-[-0.01em] uppercase"
              style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
            >
              ZAYRON-X
            </span>
            <p
              className="text-[12.5px] leading-[1.65] text-zinc-500"
              style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
            >
              Evidence-driven cyber threat intelligence analyzing vulnerabilities, adversaries, malware, and infrastructure.
            </p>
          </div>

          {/* Nav columns */}
          <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {sections.map((sec) => (
              <div key={sec.title}>
                <span
                  className="text-[#FF5500] text-[9.5px] font-bold uppercase tracking-[0.14em] block mb-4"
                  style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                >
                  {sec.title}
                </span>
                <ul className="space-y-2.5">
                  {sec.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-zinc-500 text-[12.5px] hover:text-white transition-colors"
                        style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span
            className="text-[10.5px] text-zinc-600 uppercase tracking-[0.1em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            © 2024-2026 ZAYRON-X // EVIDENCE-DRIVEN THREAT INTELLIGENCE
          </span>
          <span
            className="text-[10.5px] text-zinc-600 uppercase tracking-[0.1em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            BUILT FOR SECURITY PROFESSIONALS WORLDWIDE
          </span>
        </div>

      </div>
    </footer>
  );
}
