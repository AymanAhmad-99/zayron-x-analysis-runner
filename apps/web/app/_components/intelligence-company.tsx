import React from "react";
import Link from "next/link";

const values = [
  {
    label: "RESEARCH-DRIVEN",
    body: "Every intelligence report begins with deep, hands-on research — not automated scraping or unverified rumor.",
  },
  {
    label: "EVIDENCE-LED",
    body: "We source from real indicators: technical IOCs, malware samples, network telemetry and dark-web signals.",
  },
  {
    label: "SECURITY-FOCUSED",
    body: "Intelligence is worthless without defensive context. We translate data into actionable security decisions.",
  },
];

const trustPillars = [
  { label: "TRANSPARENT", sub: "Sourcing disclosed" },
  { label: "CONTINUOUS",  sub: "24/7 ingestion" },
  { label: "VERIFIABLE",  sub: "Evidence-first" },
];

export function IntelligenceCompany() {
  return (
    <section className="w-full bg-[#F6F4EE] border-t border-black/[0.08] py-20">
      <div className="max-w-[1380px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

        {/* LEFT — Company positioning */}
        <div className="lg:col-span-6 flex flex-col">
          <h2
            className="uppercase text-[30px] lg:text-[36px] font-extrabold text-[#0A0A0A] leading-[1.08] tracking-[-0.03em] mb-6"
            style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
          >
            BUILT AS AN INTELLIGENCE COMPANY.
          </h2>
          <p
            className="text-[14px] leading-[1.7] text-[#52525B] max-w-[480px] mb-10"
            style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
          >
            Confirmed research, intelligence and evidence for analysts who act under pressure — intelligence and analysis for professionals who know that false positives cost more than no alert at all.
          </p>

          {/* Value cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {values.map((v) => (
              <div key={v.label} className="border border-black/[0.09] bg-white p-5 rounded-[2px]">
                <span
                  className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#FF5500] block mb-3"
                  style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                >
                  {v.label}
                </span>
                <p
                  className="text-[12px] leading-[1.6] text-[#52525B]"
                  style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                >
                  {v.body}
                </p>
              </div>
            ))}
          </div>

          {/* Social Proof Pillar */}
          <div className="border-t border-black/[0.08] pt-6">
            <span
              className="text-[9px] uppercase tracking-[0.16em] text-zinc-400 font-bold block mb-4"
              style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
            >
              SOCIAL PROOF
            </span>
            <div className="flex flex-wrap gap-4">
              {trustPillars.map((p) => (
                <div key={p.label} className="flex flex-col">
                  <span
                    className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#0A0A0A]"
                    style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                  >
                    {p.label}
                  </span>
                  <span
                    className="text-[10px] text-zinc-500 mt-0.5"
                    style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                  >
                    {p.sub}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Dark CTA block */}
        <div className="lg:col-span-6">
          <div className="bg-[#0A0A0A] rounded-[2px] p-10 lg:p-12 h-full flex flex-col justify-between">
            <div>
              <span
                className="text-[9.5px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-4"
                style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
              >
                ZAYRON-X PLATFORM
              </span>
              <h3
                className="uppercase text-[26px] lg:text-[32px] font-extrabold text-white tracking-tight leading-[1.06] mb-6"
                style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
              >
                SEE WHAT MATTERS. UNDERSTAND WHY IT MATTERS.
              </h3>
              <p
                className="text-[13.5px] leading-[1.7] text-zinc-400 mb-10"
                style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
              >
                Accelerate your threat investigation with evidence-based intelligence feeds. Designed for analysts who work at speed and require precision.
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center bg-[#FF5500] text-white px-6 py-3 rounded-[2px] uppercase text-[10.5px] font-bold tracking-[0.12em] hover:bg-[#E04B00] transition-colors"
                style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
              >
                GET STARTED TODAY →
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center bg-transparent border border-white/20 text-white px-6 py-3 rounded-[2px] uppercase text-[10.5px] font-bold tracking-[0.12em] hover:bg-white/10 transition-colors"
                style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
              >
                CONTACT SALES →
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
