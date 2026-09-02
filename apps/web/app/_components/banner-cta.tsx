import React from "react";
import Link from "next/link";

export function BannerCta() {
  return (
    <section
      style={{
        backgroundColor: "var(--accent)",
        paddingTop: "var(--space-7)",
        paddingBottom: "var(--space-7)",
      }}
      className="w-full text-white"
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          
          {/* Left Text */}
          <div className="max-w-2xl">
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-label)",
                lineHeight: "1.4",
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: "#FFFFFF",
                opacity: 0.9,
              }}
              className="uppercase block mb-2"
            >
              READY TO STRENGTHEN YOUR SECURITY POSTURE?
            </span>

            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-h2)",
                lineHeight: 1.15,
                fontWeight: 400,
                color: "#FFFFFF",
              }}
            >
              SEE WHAT MATTERS. UNDERSTAND WHY IT MATTERS.
            </h2>

            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body)",
                lineHeight: 1.6,
                fontWeight: 400,
                color: "#FFFFFF",
                opacity: 0.9,
                marginTop: "var(--space-2)",
              }}
            >
              Accelerate your threat investigation with evidence-based intelligence feeds. Join 2,500+ active security analysts [SAMPLE DATA].
            </p>
          </div>

          {/* Right Dual Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/pricing"
              style={{
                backgroundColor: "#FFFFFF",
                color: "var(--accent)",
                padding: "14px 24px",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                borderRadius: "var(--radius-button)",
                textTransform: "uppercase",
              }}
              className="inline-flex items-center justify-center transition-colors hover:bg-white/90"
            >
              GET STARTED TODAY →
            </Link>

            <Link
              href="/contact"
              style={{
                backgroundColor: "transparent",
                border: "1px solid #FFFFFF",
                color: "#FFFFFF",
                padding: "14px 24px",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                borderRadius: "var(--radius-button)",
                textTransform: "uppercase",
              }}
              className="inline-flex items-center justify-center transition-colors hover:bg-white/10"
            >
              CONTACT SALES →
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}

