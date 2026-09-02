import React from "react";
import Link from "next/link";

export function PlatformPreview() {
  const researchDossiers = [
    {
      type: "RESEARCH DOSSIER // 15 MIN READ",
      title: "The Evolution of Modern Banking Trojans",
      desc: "Technical analysis of stealth evasion mechanisms, process injection, and modular C2 protocols.",
      meta: "PUBLISHED: 28 AUG 2026 // ANALYST DESK",
      href: "/reports/banking-trojans",
    },
    {
      type: "MALWARE ANALYSIS // 20 MIN READ",
      title: "AsyncRAT: Technical Decompilation & Infrastructure",
      desc: "Full disassembly of obfuscated payloads, scheduled task persistence, and encrypted staging hosts.",
      meta: "PUBLISHED: 22 AUG 2026 // MALWARE LAB",
      href: "/reports/asyncrat-deep-dive",
    },
  ];

  return (
    <section
      style={{
        backgroundColor: "var(--bg-page)",
        borderBottom: "1px solid var(--border-light)",
        paddingTop: "var(--space-7)",
        paddingBottom: "var(--space-7)",
      }}
      className="w-full"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Dark Platform Preview Workspace Panel (6 cols) */}
          <div className="lg:col-span-6">
            <div
              style={{
                backgroundColor: "var(--bg-panel-dark)",
                border: "1px solid var(--border-dark)",
                borderRadius: "var(--radius-card)",
                padding: "var(--space-3)",
              }}
              className="w-full flex flex-col"
            >
              {/* Panel Top Title Bar */}
              <div
                style={{
                  borderBottom: "1px solid var(--border-dark)",
                  paddingBottom: "var(--space-2)",
                  marginBottom: "var(--space-3)",
                }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <span style={{ height: "6px", width: "6px", borderRadius: "50%", backgroundColor: "var(--border-dark)" }} />
                  <span style={{ height: "6px", width: "6px", borderRadius: "50%", backgroundColor: "var(--border-dark)" }} />
                  <span style={{ height: "6px", width: "6px", borderRadius: "50%", backgroundColor: "var(--border-dark)" }} />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "var(--text-muted-dark)",
                      marginLeft: "var(--space-1)",
                      textTransform: "uppercase",
                    }}
                  >
                    ZAYRON-X INTELLIGENCE PLATFORM
                  </span>
                </div>

                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--accent)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  [SAMPLE DATA]
                </span>
              </div>

              {/* Workspace Inner Card */}
              <div
                style={{
                  backgroundColor: "var(--bg-card-dark)",
                  border: "1px solid var(--border-dark)",
                  borderRadius: "var(--radius-card)",
                  padding: "var(--space-3)",
                  marginBottom: "var(--space-3)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-label)",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      color: "var(--accent)",
                      textTransform: "uppercase",
                    }}
                  >
                    THREAT DOSSIER // ADVANCED ADVERSARY
                  </span>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "var(--radius-badge)",
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-label)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      backgroundColor: "rgba(217, 83, 30, 0.12)",
                      color: "var(--severity-critical)",
                      border: "1px solid rgba(217, 83, 30, 0.3)",
                    }}
                  >
                    CRITICAL
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-h4)",
                    lineHeight: 1.3,
                    fontWeight: 600,
                    color: "var(--text-primary-dark)",
                    marginBottom: "16px",
                  }}
                >
                  APT29 Operational Infrastructure &amp; Phishing Vector
                </h3>

                {/* Structured Technical Telemetry */}
                <div
                  style={{
                    borderTop: "1px solid var(--border-dark)",
                    paddingTop: "var(--space-2)",
                    gap: "8px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-mono)",
                  }}
                  className="flex flex-col"
                >
                  <div className="flex items-center justify-between">
                    <span style={{ color: "var(--text-muted-dark)" }}>CONFIDENCE SCORE [SAMPLE DATA]:</span>
                    <span style={{ color: "var(--text-primary-dark)", fontWeight: 600 }}>0.96 (HIGH // DUAL WITNESS)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: "var(--text-muted-dark)" }}>OBSERVED HOSTS [SAMPLE DATA]:</span>
                    <span style={{ color: "var(--text-primary-dark)" }}>14 RECONNAISSANCE NODES</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: "var(--text-muted-dark)" }}>ATTRIBUTION [SAMPLE DATA]:</span>
                    <span style={{ color: "var(--accent)" }}>NOBELIUM // COZY BEAR</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: "var(--text-muted-dark)" }}>TARGETED SECTOR [SAMPLE DATA]:</span>
                    <span style={{ color: "var(--text-primary-dark)" }}>CRITICAL INFRASTRUCTURE</span>
                  </div>
                </div>
              </div>

              {/* 6-Stage Continuous Pipeline Stepper */}
              <div
                style={{
                  borderTop: "1px solid var(--border-dark)",
                  paddingTop: "var(--space-2)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--text-muted-dark)",
                }}
                className="flex flex-wrap items-center justify-between gap-1"
              >
                <span>DISCOVER ↓</span>
                <span>VERIFY ↓</span>
                <span>CORRELATE ↓</span>
                <span>ANALYZE ↓</span>
                <span>UNDERSTAND ↓</span>
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>ACT</span>
              </div>

            </div>
          </div>

          {/* Right Column: Deeper Analysis Content & Dossier Cards (6 cols) */}
          <div className="lg:col-span-6 flex flex-col">
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-label)",
                lineHeight: "1.4",
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: "var(--accent)",
                marginBottom: "var(--space-2)",
              }}
              className="uppercase block"
            >
              ZAYRON-X RESEARCH &amp; ANALYSIS
            </span>

            {/* H2 — Section Headline */}
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-h2)",
                lineHeight: 1.15,
                fontWeight: 400,
                color: "var(--text-primary-light)",
                marginBottom: "var(--space-2)",
              }}
            >
              DEEPER ANALYSIS. CLEARER INTELLIGENCE.
            </h2>

            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body)",
                lineHeight: 1.6,
                fontWeight: 400,
                color: "var(--text-secondary-light)",
                marginBottom: "var(--space-4)",
              }}
            >
              We move beyond raw IOC feeds to deliver deeply investigated threat dossiers, reverse-engineered malware breakdowns, and actionable mitigation playbooks.
            </p>

            {/* Research Cards List */}
            <div
              style={{
                gap: "var(--space-2)",
              }}
              className="flex flex-col"
            >
              {researchDossiers.map((dossier) => (
                <Link
                  key={dossier.title}
                  href={dossier.href}
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-light)",
                    borderRadius: "var(--radius-card)",
                    padding: "var(--space-3)",
                  }}
                  className="block transition-colors hover:bg-[var(--bg-hover)]"
                >
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
                    {dossier.type}
                  </span>

                  <h3
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-h4)",
                      lineHeight: 1.3,
                      fontWeight: 600,
                      color: "var(--text-primary-light)",
                      marginTop: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    {dossier.title}
                  </h3>

                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-small)",
                      lineHeight: 1.5,
                      fontWeight: 400,
                      color: "var(--text-secondary-light)",
                    }}
                  >
                    {dossier.desc}
                  </p>

                  <div
                    style={{
                      borderTop: "1px solid var(--border-light)",
                      paddingTop: "var(--space-1)",
                      marginTop: "var(--space-2)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-mono)",
                      color: "var(--text-muted-light)",
                    }}
                  >
                    {dossier.meta}
                  </div>
                </Link>
              ))}
            </div>

            {/* Button.Text */}
            <div className="mt-6">
              <Link
                href="/reports"
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
                EXPLORE ALL RESEARCH ARCHIVES →
              </Link>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

