import React from "react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="w-full bg-[#F6F4EE] pt-16 lg:pt-20 pb-20 border-b border-black/[0.09]">
      <div className="max-w-[1380px] mx-auto px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Editorial Headline & Actions (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            {/* H1 — Exactly once per page */}
            <h1
              className="text-left font-extrabold tracking-[-0.035em] text-[42px] lg:text-[54px] leading-[1.06] text-[#0A0A0A]"
              style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
            >
              <span className="block">SEE THE THREAT.</span>
              <span className="block">UNDERSTAND THE</span>
              <span className="block">EVIDENCE. ACT WITH</span>
              <span className="block text-[#FF5500]">CONFIDENCE.</span>
            </h1>

            <p
              className="mt-6 max-w-[500px] text-[14.5px] leading-[1.65] text-[#52525B]"
              style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
            >
              ZAYRON-X delivers evidence-driven cyber threat intelligence that helps security teams understand emerging threats, vulnerabilities, threat actors, malware and campaigns with greater clarity.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/intelligence"
                className="inline-flex items-center justify-center bg-[#0A0A0A] text-[#FFFFFF] px-5 py-3 rounded-[2px] uppercase text-[11px] font-bold tracking-widest hover:bg-black/85 transition-colors"
              >
                EXPLORE INTELLIGENCE
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center justify-center bg-transparent border border-black/25 text-[#0A0A0A] px-5 py-3 rounded-[2px] uppercase text-[11px] font-bold tracking-widest hover:bg-black/5 transition-colors"
              >
                VIEW RESEARCH
              </Link>
            </div>
          </div>

          {/* Right Column: Live Platform Preview Mockup (5 cols) */}
          <div className="lg:col-span-5">
            <div className="w-full bg-[#FFFFFF] rounded-[6px] border border-black/[0.09] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
              
              {/* Mockup Header Bar */}
              <div className="bg-[#111111] h-7 px-3 flex items-center justify-between border-b border-black/[0.09]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white/20" />
                  <span className="w-2 h-2 rounded-full bg-white/20" />
                  <span className="w-2 h-2 rounded-full bg-white/20" />
                </div>
                <div className="flex items-center">
                  <span className="text-[9px] text-white/50 uppercase tracking-widest font-mono">
                    TERMINAL / ANALYTICS
                  </span>
                </div>
              </div>

              {/* Mockup Body Content - LIGHT THEME */}
              <div className="p-4 flex flex-col gap-4">
                {/* Console Sub-header */}
                <div className="text-[11px] font-semibold text-zinc-800 uppercase tracking-wide border-b border-zinc-100 pb-2">
                  Primary Intelligence Dashboard: Exposure and Analytics
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-zinc-100">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest">
                      THREAT INDEX
                    </span>
                    <span className="text-2xl font-bold text-zinc-900 tracking-tight font-mono">
                      7<span className="text-sm text-zinc-400">/10</span>
                    </span>
                    {/* Sparkline 1 */}
                    <div className="w-full h-4 flex items-end gap-0.5 mt-1">
                      <div className="w-1/6 h-[30%] bg-zinc-200 rounded-sm"></div>
                      <div className="w-1/6 h-[40%] bg-zinc-200 rounded-sm"></div>
                      <div className="w-1/6 h-[60%] bg-zinc-200 rounded-sm"></div>
                      <div className="w-1/6 h-[50%] bg-zinc-200 rounded-sm"></div>
                      <div className="w-1/6 h-[80%] bg-[#FF5500] rounded-sm shadow-[0_0_8px_rgba(255,85,0,0.4)]"></div>
                      <div className="w-1/6 h-[70%] bg-zinc-200 rounded-sm"></div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 border-l border-zinc-100 pl-3">
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest">
                      ACTIVE SIGNALS
                    </span>
                    <span className="text-2xl font-bold text-zinc-900 tracking-tight font-mono">
                      24.8k
                    </span>
                    {/* Sparkline 2 */}
                    <div className="w-full h-4 flex items-end gap-0.5 mt-1">
                      <div className="w-1/6 h-[60%] bg-zinc-200 rounded-sm"></div>
                      <div className="w-1/6 h-[70%] bg-zinc-200 rounded-sm"></div>
                      <div className="w-1/6 h-[90%] bg-[#FF5500] rounded-sm shadow-[0_0_8px_rgba(255,85,0,0.4)]"></div>
                      <div className="w-1/6 h-[85%] bg-[#FF5500] rounded-sm shadow-[0_0_8px_rgba(255,85,0,0.4)]"></div>
                      <div className="w-1/6 h-[60%] bg-zinc-200 rounded-sm"></div>
                      <div className="w-1/6 h-[40%] bg-zinc-200 rounded-sm"></div>
                    </div>
                  </div>
                </div>

                {/* Structured Data Table */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[9px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">
                    <span>LATEST INTELLIGENCE REPORTS</span>
                    <span>CONFIDENCE</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-[11px] text-zinc-800 py-1.5 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500]"></span>
                      <span className="font-medium">Ransomware Campaign Target: Logistics</span>
                    </div>
                    <span className="font-mono text-zinc-500">98%</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-[11px] text-zinc-800 py-1.5 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                      <span className="font-medium">Zero-Day Exploitation in VPN Appliance</span>
                    </div>
                    <span className="font-mono text-zinc-500">92%</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-zinc-800 py-1.5 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500]"></span>
                      <span className="font-medium">New Threat Actor Group: <span className="font-mono text-[10px]">UNC4899</span></span>
                    </div>
                    <span className="font-mono text-zinc-500">87%</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
