import React from "react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="w-full bg-[#F6F4EE] pt-14 pb-0 border-b border-black/[0.08]">
      <div className="max-w-[1380px] mx-auto px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">

          {/* Left Column — Headline + Actions */}
          <div className="lg:col-span-6 pb-16 flex flex-col">
            <h1
              className="font-extrabold tracking-[-0.04em] text-[48px] lg:text-[60px] leading-[1.02] text-[#0A0A0A] uppercase"
              style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
            >
              <span className="block">SEE THE THREAT.</span>
              <span className="block">UNDERSTAND THE</span>
              <span className="block">EVIDENCE. ACT WITH</span>
              <span className="block text-[#FF5500]">CONFIDENCE.</span>
            </h1>

            <p
              className="mt-5 max-w-[480px] text-[14px] leading-[1.7] text-[#52525B]"
              style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
            >
              ZAYRON-X delivers evidence-driven cyber threat intelligence that helps
              security teams understand emerging threats, vulnerabilities, threat
              actors, malware and campaigns with greater clarity.
            </p>

            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <Link
                href="/intelligence"
                className="inline-flex items-center justify-center bg-[#0A0A0A] text-white px-5 py-[11px] rounded-[2px] uppercase text-[10.5px] font-bold tracking-[0.12em] hover:bg-black/85 transition-colors"
              >
                EXPLORE INTELLIGENCE
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center justify-center bg-transparent border border-[#0A0A0A]/25 text-[#0A0A0A] px-5 py-[11px] rounded-[2px] uppercase text-[10.5px] font-bold tracking-[0.12em] hover:bg-black/5 transition-colors"
              >
                VIEW RESEARCH
              </Link>
            </div>
          </div>

          {/* Right Column — Terminal Dashboard Mockup */}
          <div className="lg:col-span-6 self-end">
            <div className="w-full bg-[#FFFFFF] rounded-t-[4px] border border-black/[0.08] border-b-0 shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.07)] overflow-hidden flex flex-col">

              {/* Window chrome bar */}
              <div className="bg-[#111111] h-8 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white/15" />
                  <span className="w-2 h-2 rounded-full bg-white/15" />
                  <span className="w-2 h-2 rounded-full bg-white/15" />
                </div>
                <span className="text-[8.5px] text-white/40 uppercase tracking-[0.18em] font-mono">
                  TERMINAL / ANALYTICS
                </span>
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col gap-5">
                {/* Sub-header */}
                <div className="text-[10.5px] font-bold text-zinc-700 uppercase tracking-[0.1em] border-b border-zinc-100 pb-3">
                  PRIMARY INTELLIGENCE DASHBOARD: EXPOSURE AND ANALYTICS
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-zinc-100">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8.5px] font-bold text-zinc-400 uppercase tracking-[0.14em]">
                      THREAT INDEX
                    </span>
                    <span
                      className="text-[26px] font-bold text-zinc-900 tracking-tight leading-none"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      7<span className="text-[13px] text-zinc-400 font-normal">/10</span>
                    </span>
                    {/* Sparkline */}
                    <div className="w-full h-4 flex items-end gap-[3px] mt-1">
                      {[30, 42, 58, 48, 78, 65].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-[1px]"
                          style={{
                            height: `${h}%`,
                            backgroundColor: i === 4 ? "#FF5500" : "#E4E4E7",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 border-l border-zinc-100 pl-4">
                    <span className="text-[8.5px] font-bold text-zinc-400 uppercase tracking-[0.14em]">
                      ACTIVE SIGNALS
                    </span>
                    <span
                      className="text-[26px] font-bold text-zinc-900 tracking-tight leading-none"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      24.8k
                    </span>
                    <div className="w-full h-4 flex items-end gap-[3px] mt-1">
                      {[58, 68, 88, 82, 60, 44].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-[1px]"
                          style={{
                            height: `${h}%`,
                            backgroundColor: i === 2 || i === 3 ? "#FF5500" : "#E4E4E7",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Intel report rows */}
                <div className="flex flex-col gap-0">
                  <div className="flex justify-between items-center text-[8.5px] font-bold text-zinc-400 uppercase tracking-[0.13em] pb-2">
                    <span>LATEST INTELLIGENCE REPORTS</span>
                    <span>CONFIDENCE</span>
                  </div>
                  {[
                    { dot: "#FF5500", label: "Ransomware Campaign Target: Logistics", pct: "98%" },
                    { dot: "#D4D4D8", label: "Zero-Day Exploitation in VPN Appliance", pct: "92%" },
                    { dot: "#FF5500", label: "New Threat Actor Group: UNC4899", pct: "87%" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between items-center text-[11px] text-zinc-800 py-2 border-b border-zinc-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: row.dot }}
                        />
                        <span className="font-medium">{row.label}</span>
                      </div>
                      <span
                        className="font-mono text-zinc-400 text-[10px] shrink-0 ml-3"
                      >
                        {row.pct}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
