import React from "react";
import Link from "next/link";

const articles = [
  {
    title: "THE EVOLUTION OF INITIAL ACCESS BROKERS",
    excerpt: "Deep analysis into how access brokers have professionalized operations, utilizing automated exploitation and tiered pricing models for network access.",
    bg: "#1A1A2E",
    accentColor: "#FF5500",
  },
  {
    title: "UNDERSTANDING MODERN RANSOMWARE CODE BASES",
    excerpt: "Technical breakdown of Rust-based ransomware strains, focusing on multi-threading encryption techniques and evasion methods.",
    bg: "#0F2027",
    accentColor: "#4A9EFF",
  },
  {
    title: "HOW THREAT ACTORS ADAPT TO DEFENSIVE PRESSURE",
    excerpt: "Strategic overview of shifting infrastructure and C2 mechanisms used by APT groups in response to law enforcement takedowns.",
    bg: "#1A0A0A",
    accentColor: "#FF5500",
  },
];

const tags = [
  "THREAT ACTORS", "MALWARE", "EXPLOITS", "CAMPAIGNS",
  "VULNERABILITIES", "DARK WEB INTEL", "RESEARCH", "INSIGHTS",
];

const workflowSteps = [
  { step: "DISCOVER", text: "Scan global telemetry" },
  { step: "VERIFY",   text: "Validate technical IOCs" },
  { step: "CORRELATE", text: "Link campaigns & actors" },
  { step: "ANALYZE",  text: "Assess impact & severity" },
  { step: "UNDERSTAND", text: "Contextualize motive" },
  { step: "ACT",      text: "Deploy defensive measure" },
];

// Compact SVG article thumbnail illustrations
const ArticleThumbnail = ({ bg, accent }: { bg: string; accent: string }) => (
  <svg
    viewBox="0 0 240 120"
    className="w-full h-24 rounded-[2px]"
    style={{ background: bg }}
  >
    {/* Grid lines */}
    <line x1="0" y1="30" x2="240" y2="30" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
    <line x1="0" y1="60" x2="240" y2="60" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
    <line x1="0" y1="90" x2="240" y2="90" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
    <line x1="60" y1="0" x2="60" y2="120" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
    <line x1="120" y1="0" x2="120" y2="120" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
    <line x1="180" y1="0" x2="180" y2="120" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

    {/* Waveform bars */}
    {[20, 30, 45, 38, 60, 50, 42, 68, 55, 72, 48, 36].map((h, i) => (
      <rect
        key={i}
        x={i * 18 + 14}
        y={120 - h}
        width="10"
        height={h}
        fill={i % 3 === 0 ? accent : "rgba(255,255,255,0.12)"}
        rx="1"
      />
    ))}

    {/* Accent dot */}
    <circle cx="210" cy="20" r="6" fill={accent} opacity="0.8" />
    <circle cx="210" cy="20" r="3" fill="white" />

    {/* Label line */}
    <rect x="14" y="10" width="60" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
    <rect x="14" y="18" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.08)" />
  </svg>
);

export function DualGrid() {
  return (
    <section className="w-full bg-[#F6F4EE]">
      <div className="max-w-[1380px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Dark Intelligence Platform ── */}
        <div className="bg-[#050505] rounded-[2px] flex flex-col">
          <div className="p-10 lg:p-12 flex flex-col flex-1">
            {/* Label */}
            <span className="uppercase text-[9.5px] tracking-[0.18em] text-zinc-500 font-bold mb-3">
              INTELLIGENCE PLATFORM
            </span>
            {/* Title */}
            <h2
              className="uppercase text-[22px] lg:text-[25px] font-extrabold text-white tracking-tight text-center mb-8"
              style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
            >
              ZAYRON-X INTELLIGENCE PLATFORM
            </h2>

            {/* Terminal Mockup */}
            <div className="w-full bg-[#0C0C0E] border border-white/[0.08] rounded-[3px] overflow-hidden flex-1">
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]" />
                <span
                  className="text-[8.5px] text-zinc-500 uppercase tracking-[0.18em]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ZAYRON OS // Threat Intelligence Engine
                </span>
              </div>

              {/* 3-col data grid */}
              <div className="p-4 grid grid-cols-3 gap-3">
                {/* CRITICAL col */}
                <div className="flex flex-col gap-2">
                  {[
                    { id: "CVE-2026-X1", w: 85 },
                    { id: "CVE-2026-X2", w: 93 },
                  ].map((item) => (
                    <div key={item.id} className="bg-white/[0.04] border border-white/[0.08] p-2.5 rounded-[2px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[#FF5500] text-[7.5px] font-bold uppercase tracking-widest">CRITICAL</span>
                        <span
                          className="text-[7px] text-zinc-600"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {item.id}
                        </span>
                      </div>
                      <div className="w-full h-[3px] bg-white/[0.08] rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-[#FF5500] rounded-full" style={{ width: `${item.w}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* HIGH col */}
                <div className="flex flex-col gap-2">
                  {[
                    { id: "CVE-2026-X3", w: 68 },
                    { id: "CVE-2026-X5", w: 74 },
                  ].map((item) => (
                    <div key={item.id} className="bg-white/[0.04] border border-white/[0.08] p-2.5 rounded-[2px]">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300 text-[7.5px] font-bold uppercase tracking-widest">HIGH</span>
                        <span
                          className="text-[7px] text-zinc-600"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {item.id}
                        </span>
                      </div>
                      <div className="w-full h-[3px] bg-white/[0.08] rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-zinc-400 rounded-full" style={{ width: `${item.w}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ELEVATED col */}
                <div className="flex flex-col gap-2">
                  {[
                    { id: "CVE-2026-X4", w: 44 },
                    { id: "CVE-2026-X6", w: 52 },
                  ].map((item) => (
                    <div key={item.id} className="bg-white/[0.04] border border-white/[0.08] p-2.5 rounded-[2px]">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 text-[7.5px] font-bold uppercase tracking-widest">ELEVATED</span>
                        <span
                          className="text-[7px] text-zinc-600"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {item.id}
                        </span>
                      </div>
                      <div className="w-full h-[3px] bg-white/[0.08] rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-zinc-600 rounded-full" style={{ width: `${item.w}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Bar */}
          <div className="border-t border-white/[0.07] px-10 lg:px-12 py-6">
            <div className="grid grid-cols-6 gap-2">
              {workflowSteps.map((item, i) => (
                <div key={item.step} className="flex flex-col items-center relative">
                  {/* connector line */}
                  {i < workflowSteps.length - 1 && (
                    <div className="absolute right-0 top-[7px] w-1/2 h-[1px] bg-white/[0.1] hidden md:block translate-x-full" />
                  )}
                  <span
                    className="uppercase text-[9.5px] font-bold text-zinc-300 text-center tracking-wider block leading-tight"
                    style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                  >
                    {item.step}
                  </span>
                  <span
                    className="text-[8px] text-zinc-600 leading-tight text-center mt-1.5 max-w-[60px]"
                    style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Research Grid + Coverage ── */}
        <div className="flex flex-col gap-6">

          {/* Research Header + Articles */}
          <div className="flex flex-col flex-1">
            {/* Header row */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="text-[#FF5500] text-[10px] font-bold tracking-[0.14em] uppercase block mb-2">
                  ZAYRON RESEARCH
                </span>
                <h2
                  className="uppercase text-[24px] lg:text-[28px] font-extrabold text-[#0A0A0A] leading-[1.08] tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
                >
                  DEEPER ANALYSIS.<br />CLEARER INTELLIGENCE.
                </h2>
              </div>
              {/* Flask icon box */}
              <div className="w-[68px] h-[58px] bg-[#111111] rounded-[2px] flex items-center justify-center shrink-0">
                <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            </div>

            {/* 3-article cards */}
            <div className="grid grid-cols-3 gap-4">
              {articles.map((article) => (
                <Link key={article.title} href="/reports" className="flex flex-col group cursor-pointer">
                  {/* Thumbnail */}
                  <div className="overflow-hidden rounded-[2px] mb-3">
                    <ArticleThumbnail bg={article.bg} accent={article.accentColor} />
                  </div>
                  <h3
                    className="uppercase text-[10.5px] font-bold leading-snug text-[#0A0A0A] mb-2 group-hover:text-[#FF5500] transition-colors"
                    style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                  >
                    {article.title}
                  </h3>
                  <p
                    className="text-[10px] text-zinc-500 line-clamp-3 leading-relaxed"
                    style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                  >
                    {article.excerpt}
                  </p>
                  <div className="border-t border-black/[0.07] mt-3 pt-2">
                    <span
                      className="text-[8px] text-zinc-400 uppercase tracking-wider"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      READ TIME : 7 MIN | AUG 2026
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Threat Intelligence Coverage tag strip */}
          <div className="bg-[#0A0A0A] px-6 py-5 rounded-[2px]">
            <h3
              className="uppercase text-[11px] font-bold text-white tracking-[0.16em] text-center mb-4"
              style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
            >
              THREAT INTELLIGENCE COVERAGE
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-white/[0.18] text-white text-[9px] font-semibold px-3 py-[5px] rounded-full uppercase tracking-[0.1em]"
                  style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
