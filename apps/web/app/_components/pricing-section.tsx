import React from "react";
import Link from "next/link";

export function PricingSection() {
  const plans = [
    {
      tier: "TIER // FREE",
      title: "Community Analyst",
      price: "$0",
      cadence: "/ month",
      desc: "Essential threat intelligence for individual researchers and community security analysts.",
      features: [
        "Basic Threat Intelligence & IOC Feeds",
        "Community Dossier & CVE Coverage",
        "Standard Search & Filtering",
      ],
      meta: "ACTIVE USERS: 1,450 COMMUNITY ANALYSTS [SAMPLE DATA]",
      cta: "GET STARTED FREE",
      href: "/login",
      primary: false,
    },
    {
      tier: "TIER // PRO — MOST POPULAR",
      title: "Security Operations",
      price: "$20",
      cadence: "/ month",
      desc: "Advanced evidence-based threat intelligence built for active SOC teams and incident responders.",
      features: [
        "Advanced Real-Time Telemetry Feeds",
        "Deep Threat Actor & Malware Mapping",
        "Automated Telegram & OSINT Monitoring",
        "Priority Support & Incident Alerting",
      ],
      meta: "ACTIVE TEAMS: 320 SOC ORGANIZATIONS [SAMPLE DATA]",
      cta: "START PRO TRIAL",
      href: "/pricing",
      primary: true,
    },
    {
      tier: "TIER // RESEARCHER",
      title: "Full Research Suite",
      price: "$50",
      cadence: "/ month",
      desc: "Complete intelligence platform access with historical archives, API bindings, and raw telemetry export.",
      features: [
        "Full Threat Intelligence & Binary Archive",
        "Historical Telemetry & YARA Engine",
        "REST API & Worker Service Bindings",
        "Dedicated Analyst Desk Support",
      ],
      meta: "RESEARCHERS: 85 INSTITUTIONAL SUBSCRIBERS [SAMPLE DATA]",
      cta: "START RESEARCHER TRIAL",
      href: "/pricing",
      primary: false,
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
            TRANSPARENT PRICING
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
            ACCESSIBLE THREAT INTELLIGENCE FOR EVERY TEAM.
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
            Choose the plan that fits your operational needs — from community threat feeds to full researcher API access.
          </p>
        </div>

        {/* 3 Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.title}
              style={{
                backgroundColor: "var(--bg-card-dark)",
                border: p.primary ? "1px solid var(--accent)" : "1px solid var(--border-dark)",
                borderRadius: "var(--radius-card)",
                padding: "var(--space-3)",
              }}
              className="flex flex-col justify-between"
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
                  {p.tier}
                </span>

                <h3
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-h4)",
                    lineHeight: 1.3,
                    fontWeight: 600,
                    color: "var(--text-primary-dark)",
                    marginTop: "8px",
                    marginBottom: "12px",
                  }}
                >
                  {p.title}
                </h3>

                <div className="flex items-baseline gap-1.5 mb-3">
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "48px",
                      lineHeight: 1.05,
                      fontWeight: 400,
                      color: "var(--text-primary-dark)",
                    }}
                  >
                    {p.price}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-mono)",
                      color: "var(--text-muted-dark)",
                    }}
                  >
                    {p.cadence}
                  </span>
                </div>

                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-small)",
                    lineHeight: 1.5,
                    fontWeight: 400,
                    color: "var(--text-secondary-dark)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  {p.desc}
                </p>

                <div
                  style={{
                    borderTop: "1px solid var(--border-dark)",
                    paddingTop: "var(--space-3)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  <ul className="space-y-2.5">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2">
                        <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: "14px" }}>✓</span>
                        <span
                          style={{
                            fontFamily: "var(--font-body)",
                            fontSize: "var(--text-small)",
                            color: "var(--text-secondary-dark)",
                          }}
                        >
                          {feat}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <div
                  style={{
                    borderTop: "1px solid var(--border-dark)",
                    paddingTop: "var(--space-1)",
                    marginBottom: "var(--space-3)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-mono)",
                    color: "var(--text-muted-dark)",
                  }}
                >
                  {p.meta}
                </div>

                <Link
                  href={p.href}
                  style={
                    p.primary
                      ? {
                          backgroundColor: "var(--accent)",
                          color: "#FFFFFF",
                          padding: "14px 24px",
                          fontFamily: "var(--font-body)",
                          fontSize: "14px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          borderRadius: "var(--radius-button)",
                        }
                      : {
                          backgroundColor: "transparent",
                          border: "1px solid var(--border-dark)",
                          color: "var(--text-primary-dark)",
                          padding: "14px 24px",
                          fontFamily: "var(--font-body)",
                          fontSize: "14px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          borderRadius: "var(--radius-button)",
                        }
                  }
                  className={`block text-center transition-colors ${
                    p.primary ? "hover:bg-[var(--accent-hover)]" : "hover:bg-[var(--bg-card-dark)]"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

