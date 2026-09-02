import React from "react";
import Link from "next/link";

export function Footer() {
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
        { label: "Methodology Pipeline", href: "/methodology" },
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

  return (
    <footer
      style={{
        backgroundColor: "var(--bg-panel-dark)",
        borderTop: "1px solid var(--border-dark)",
        paddingTop: "var(--space-7)",
        paddingBottom: "var(--space-7)",
      }}
      className="w-full text-[#F5F4F0]"
    >
      <div
        style={{
          maxWidth: "1200px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "var(--space-3)",
          paddingRight: "var(--space-3)",
        }}
        className="mx-auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-6 gap-8 mb-12">
          
          {/* Brand Column (2 cols) */}
          <div className="md:col-span-2 flex flex-col justify-between">
            <div>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-h4)",
                  fontWeight: 600,
                  color: "var(--text-primary-dark)",
                  letterSpacing: "-0.01em",
                }}
                className="block"
              >
                ZAYRON-X
              </span>

              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-small)",
                  lineHeight: 1.5,
                  fontWeight: 400,
                  color: "var(--text-secondary-dark)",
                  marginTop: "var(--space-2)",
                }}
              >
                Evidence-driven cyber threat intelligence analyzing vulnerabilities, adversaries, malware, and infrastructure.
              </p>
            </div>

            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-mono)",
                color: "var(--text-muted-dark)",
                marginTop: "var(--space-3)",
              }}
            >
              STATUS: PLATFORM LIVE
            </div>
          </div>

          {/* 4 Navigation Columns (4 cols) */}
          <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {sections.map((sec) => (
              <div key={sec.title}>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-label)",
                    lineHeight: "1.4",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    color: "var(--accent)",
                  }}
                  className="uppercase block mb-3"
                >
                  {sec.title}
                </span>
                <ul className="space-y-2">
                  {sec.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "var(--text-small)",
                          lineHeight: 1.5,
                          color: "var(--text-secondary-dark)",
                        }}
                        className="transition-colors hover:text-[var(--text-primary-dark)]"
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

        {/* Bottom Line */}
        <div
          style={{
            borderTop: "1px solid var(--border-dark)",
            paddingTop: "var(--space-3)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-mono)",
            color: "var(--text-muted-dark)",
          }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div>
            © 2024-2026 ZAYRON-X // EVIDENCE-DRIVEN THREAT INTELLIGENCE
          </div>
          <div>
            BUILT FOR SECURITY PROFESSIONALS WORLDWIDE
          </div>
        </div>

      </div>
    </footer>
  );
}

