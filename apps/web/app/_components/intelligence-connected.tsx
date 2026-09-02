import React from "react";
import Link from "next/link";

export function IntelligenceConnected() {
  const coverageDomains = [
    {
      label: "DOMAIN // 01",
      title: "Threat Actors & APTs",
      desc: "Attribution profiles, TTP mappings, and infrastructure tracking for state-sponsored and cybercrime groups.",
      meta: "SPECIMEN: APT29 / NOBELIUM [SAMPLE DATA]",
      href: "/actors",
    },
    {
      label: "DOMAIN // 02",
      title: "Malware Intelligence",
      desc: "Disassembled binaries, C2 protocol specs, and verified YARA/Sigma detection rules.",
      meta: "SPECIMEN: AsyncRAT / AgentTesla [SAMPLE DATA]",
      href: "/malware",
    },
    {
      label: "DOMAIN // 03",
      title: "CVE & Exploit Tracking",
      desc: "Real-time EPSS scores, weaponization status, and patch prioritization advisories.",
      meta: "SPECIMEN: CVE-2024-21412 [SAMPLE DATA]",
      href: "/vulnerabilities",
    },
    {
      label: "DOMAIN // 04",
      title: "Campaign Operations",
      desc: "Multi-stage attack campaign timelines, targeted industry sectors, and geopolitical vectors.",
      meta: "SPECIMEN: OP-GLOBAL-SHIELD [SAMPLE DATA]",
      href: "/campaigns",
    },
    {
      label: "DOMAIN // 05",
      title: "Indicators (IOCs)",
      desc: "Correlated IPv4 addresses, staging domains, file hashes, and SSL certificates.",
      meta: "VOLUME: 14,250 VERIFIED IOCS [SAMPLE DATA]",
      href: "/iocs",
    },
    {
      label: "DOMAIN // 06",
      title: "Technical Reports",
      desc: "In-depth research dossiers, reverse-engineering breakdowns, and analyst threat briefs.",
      meta: "ARCHIVE: 48 DOSSIERS [SAMPLE DATA]",
      href: "/reports",
    },
    {
      label: "DOMAIN // 07",
      title: "OSINT & Closed Streams",
      desc: "Continuous automated ingestion across Telegram channels, dark web forums, and code repositories.",
      meta: "SOURCES: 120 MONITORED FEEDS [SAMPLE DATA]",
      href: "/sources",
    },
    {
      label: "DOMAIN // 08",
      title: "Standards & Frameworks",
      desc: "MITRE ATT&CK enterprise matrix alignment, NIS2 regulatory evidence, and compliance mapping.",
      meta: "FRAMEWORK: v14.1 ATT&CK ALIGNED [SAMPLE DATA]",
      href: "/standards",
    },
  ];

  return (
    <section
      style={{
        backgroundColor: "var(--bg-panel-dark)",
        borderTop: "1px solid var(--border-dark)",
        borderBottom: "1px solid var(--border-dark)",
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
        {/* Section Header */}
        <div className="flex flex-col mb-12">
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-label)",
              lineHeight: "1.4",
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "var(--accent)",
            }}
            className="uppercase block mb-2"
          >
            THREAT INTELLIGENCE COVERAGE
          </span>

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-h2)",
              lineHeight: 1.15,
              fontWeight: 400,
              color: "var(--text-primary-dark)",
            }}
          >
            COMPREHENSIVE COVERAGE ACROSS ALL THREAT DOMAINS.
          </h2>

          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-body)",
              lineHeight: 1.6,
              fontWeight: 400,
              color: "var(--text-secondary-dark)",
              marginTop: "var(--space-2)",
              maxWidth: "800px",
            }}
          >
            Structured evidence, attribution telemetry, and deep threat analysis mapped directly across 8 core intelligence pillars.
          </p>
        </div>

        {/* 8 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {coverageDomains.map((domain) => (
            <Link
              key={domain.title}
              href={domain.href}
              style={{
                backgroundColor: "var(--bg-card-dark)",
                border: "1px solid var(--border-dark)",
                borderRadius: "var(--radius-card)",
                padding: "var(--space-3)",
              }}
              className="flex flex-col justify-between transition-colors hover:border-[#44474E]"
            >
              <div>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-label)",
                    lineHeight: "1.4",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    color: "var(--accent)",
                  }}
                  className="uppercase block"
                >
                  {domain.label}
                </span>

                <h3
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-h4)",
                    lineHeight: 1.3,
                    fontWeight: 600,
                    color: "var(--text-primary-dark)",
                    marginTop: "8px",
                    marginBottom: "6px",
                  }}
                >
                  {domain.title}
                </h3>

                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-small)",
                    lineHeight: 1.5,
                    fontWeight: 400,
                    color: "var(--text-secondary-dark)",
                  }}
                >
                  {domain.desc}
                </p>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--border-dark)",
                  paddingTop: "var(--space-1)",
                  marginTop: "var(--space-3)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-mono)",
                  color: "var(--text-muted-dark)",
                }}
              >
                {domain.meta}
              </div>
            </Link>
          ))}
        </div>

        {/* Text Button Link */}
        <div className="mt-10">
          <Link
            href="/intelligence"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--accent)",
            }}
            className="inline-flex items-center gap-1.5 hover:underline"
          >
            VIEW ALL COVERAGE DOMAINS →
          </Link>
        </div>

      </div>
    </section>
  );
}

