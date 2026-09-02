import React from "react";
import Link from "next/link";

export function EvidencePricing() {
  return (
    <section className="w-full bg-[#F6F4EE] pt-6 pb-6">
      <div className="max-w-[1380px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Evidence-First Block ── */}
        <div className="bg-[#0A0A0A] rounded-[2px] p-10 lg:p-12 flex flex-col">
          {/* Eyebrow */}
          <span
            className="uppercase text-[9.5px] tracking-[0.18em] text-zinc-500 font-bold mb-3"
            style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
          >
            EVIDENCE-FIRST
          </span>
          {/* Heading */}
          <h2
            className="uppercase text-[26px] lg:text-[30px] font-extrabold text-white tracking-tight leading-[1.08] mb-8 max-w-[82%]"
            style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
          >
            INTELLIGENCE YOU CAN TRACE.
          </h2>

          {/* Floating Evidence Card */}
          <div className="bg-white rounded-[3px] p-6 border border-black/[0.08] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.25)]">
            {/* Card header */}
            <div className="border-b border-zinc-100 pb-3 mb-5">
              <span
                className="text-[10.5px] font-bold tracking-[0.18em] text-[#0A0A0A] uppercase"
                style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
              >
                EVIDENCE
              </span>
            </div>

            {/* Data grid — 2 cols */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <div>
                <span className="text-[8.5px] uppercase tracking-[0.14em] text-zinc-400 font-bold block">
                  SOURCE
                </span>
                <span className="text-[12px] font-semibold text-[#0A0A0A] mt-1.5 block">
                  Security Research
                </span>
              </div>
              <div>
                <span className="text-[8.5px] uppercase tracking-[0.14em] text-zinc-400 font-bold block">
                  OBSERVED
                </span>
                <span
                  className="text-[12px] font-semibold text-[#0A0A0A] mt-1.5 block"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  24 AUG 2026
                </span>
              </div>
              <div>
                <span className="text-[8.5px] uppercase tracking-[0.14em] text-zinc-400 font-bold block">
                  CONFIDENCE
                </span>
                <span className="text-[12px] font-semibold text-[#0A0A0A] mt-1.5 block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  HIGH
                </span>
              </div>
              <div>
                <span className="text-[8.5px] uppercase tracking-[0.14em] text-zinc-400 font-bold block">
                  INDICATORS
                </span>
                <span
                  className="text-[12px] font-semibold text-[#0A0A0A] mt-1.5 block"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  7
                </span>
              </div>
              {/* Full-width row */}
              <div className="col-span-2 border-t border-zinc-100 pt-4">
                <span className="text-[8.5px] uppercase tracking-[0.14em] text-zinc-400 font-bold block">
                  TRIGGER
                </span>
                <span className="text-[12px] font-semibold text-[#0A0A0A] mt-1.5 block">
                  Threat Actor / Malware / Campaign
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Pricing Block ── */}
        <div className="bg-[#0A0A0A] rounded-[2px] p-10 lg:p-12 flex flex-col">
          {/* Eyebrow */}
          <span
            className="uppercase text-[9.5px] tracking-[0.18em] text-zinc-500 font-bold text-center mb-3"
            style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
          >
            SIMPLE, TRANSPARENT PRICING
          </span>
          {/* Heading */}
          <h2
            className="uppercase text-[22px] lg:text-[26px] font-extrabold text-white tracking-tight leading-[1.1] text-center mb-8 max-w-[85%] mx-auto"
            style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
          >
            START WITH WHAT YOU NEED. SCALE WHEN YOU'RE READY.
          </h2>

          {/* 3-Tier Cards — no translate trick, even heights */}
          <div className="grid grid-cols-3 gap-3 flex-1">

            {/* FREE */}
            <div className="bg-[#111111] border border-white/[0.1] p-5 rounded-[2px] flex flex-col">
              <div className="flex-1">
                <span
                  className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-zinc-500 block mb-3"
                  style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                >
                  FREE
                </span>
                <div
                  className="text-[22px] font-extrabold text-white leading-none mb-1"
                  style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
                >
                  $0
                </div>
                <span className="text-[10px] text-zinc-500">/ month</span>
                <ul className="mt-4 space-y-1.5">
                  {["Basic reports", "5 IOC searches/day", "Public feed"].map(f => (
                    <li key={f} className="text-[10px] text-zinc-500 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/pricing"
                className="w-full py-2.5 mt-6 text-[9.5px] font-bold tracking-[0.14em] uppercase rounded-[2px] text-center border border-white/25 text-white hover:bg-white hover:text-black transition-all block"
                style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
              >
                GET STARTED
              </Link>
            </div>

            {/* PRO — highlighted */}
            <div className="bg-[#FFFFFF] border-t-2 border-[#FF5500] p-5 rounded-[2px] flex flex-col shadow-2xl">
              <div className="flex-1">
                <span
                  className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-[#0A0A0A] block mb-3"
                  style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                >
                  PRO
                </span>
                <div
                  className="text-[22px] font-extrabold text-[#0A0A0A] leading-none mb-1"
                  style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
                >
                  $20
                </div>
                <span className="text-[10px] text-zinc-500">/ month</span>
                <ul className="mt-4 space-y-1.5">
                  {["Full intel access", "Unlimited IOC search", "Actor profiles"].map(f => (
                    <li key={f} className="text-[10px] text-zinc-700 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-[#FF5500] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/pricing"
                className="w-full py-2.5 mt-6 text-[9.5px] font-bold tracking-[0.14em] uppercase rounded-[2px] text-center bg-[#0A0A0A] text-white hover:bg-black/85 transition-all block"
                style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
              >
                UPGRADE TO PRO
              </Link>
            </div>

            {/* INTELLIGENCE */}
            <div className="bg-[#111111] border border-white/[0.1] p-5 rounded-[2px] flex flex-col">
              <div className="flex-1">
                <span
                  className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-zinc-500 block mb-3"
                  style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                >
                  INTEL
                </span>
                <div
                  className="text-[22px] font-extrabold text-white leading-none mb-1"
                  style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
                >
                  $50
                </div>
                <span className="text-[10px] text-zinc-500">/ month</span>
                <ul className="mt-4 space-y-1.5">
                  {["API access", "Raw intel feeds", "Priority support"].map(f => (
                    <li key={f} className="text-[10px] text-zinc-500 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/pricing"
                className="w-full py-2.5 mt-6 text-[9.5px] font-bold tracking-[0.14em] uppercase rounded-[2px] text-center border border-white/25 text-white hover:bg-white hover:text-black transition-all block"
                style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
              >
                UNLOCK ALL
              </Link>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
