import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function LatestResearch() {
  const articles = [
    {
      category: "THREAT ANALYSIS",
      title: "The Evolution of Banking Trojans in 2024",
      desc: "Deep analysis of new techniques used by banking malware and their evolution.",
      meta: "15 min read • 2 hours ago",
      href: "/reports/banking-trojans",
      visualType: "matrix",
    },
    {
      category: "MALWARE RESEARCH",
      title: "AsyncRAT: Technical Deep Dive",
      desc: "Technical analysis of AsyncRAT malware family and its capabilities.",
      meta: "20 min read • 5 hours ago",
      href: "/reports/asyncrat-deep-dive",
      visualType: "lens",
    },
    {
      category: "THREAT INTELLIGENCE",
      title: "Q4 2024 Threat Landscape Report",
      desc: "Comprehensive overview of threats and trends in Q4 2024.",
      meta: "25 min read • 1 day ago",
      href: "/reports/q4-landscape",
      visualType: "map",
    },
  ];

  return (
    <section className="w-full border-b border-[#E8E6DF] bg-[#FFFFFF] py-16 lg:py-20 text-[#111111]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#111111] sm:text-4xl">
              Latest Research<span className="text-[#FF6B00]">.</span>
            </h2>
            <p className="mt-2 max-w-xl text-xs sm:text-sm text-[#555555]">
              In-depth analysis and research from our security experts.
            </p>
          </div>

          <Link
            href="/reports"
            className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-[#FF6B00] hover:text-[#E56000] transition-colors self-start sm:self-auto"
          >
            <span>View all research</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 3 Research Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((art) => (
            <Link
              key={art.title}
              href={art.href}
              className="group flex flex-col justify-between overflow-hidden rounded-xl border border-[#E2E0D8] bg-[#FDFDFD] transition-all hover:border-[#FF6B00]/40 hover:shadow-lg"
            >
              {/* Card Thumbnail Visual */}
              <div className="relative h-44 w-full overflow-hidden bg-[#0A0D10]">
                {art.visualType === "matrix" && (
                  <svg className="h-full w-full opacity-80" viewBox="0 0 300 160">
                    <defs>
                      <linearGradient id="matrixGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#0E1726" />
                        <stop offset="100%" stopColor="#05080C" />
                      </linearGradient>
                    </defs>
                    <rect width="300" height="160" fill="url(#matrixGrad)" />
                    {/* Server Rack LED Grid */}
                    {Array.from({ length: 12 }).map((_, r) => (
                      <g key={r}>
                        <rect x="20" y={15 + r * 11} width="260" height="7" rx="1" fill="#151D28" />
                        <circle cx="35" cy={18.5 + r * 11} r="1.5" fill="#FF6B00" />
                        <circle cx="45" cy={18.5 + r * 11} r="1.5" fill="#00A8FF" />
                        <circle cx="55" cy={18.5 + r * 11} r="1.5" fill="#10B981" />
                      </g>
                    ))}
                  </svg>
                )}

                {art.visualType === "lens" && (
                  <svg className="h-full w-full opacity-85" viewBox="0 0 300 160">
                    <rect width="300" height="160" fill="#0A0606" />
                    <circle cx="150" cy="80" r="50" stroke="#FF4400" strokeWidth="1.5" fill="none" opacity="0.8" />
                    <circle cx="150" cy="80" r="35" stroke="#FF6B00" strokeWidth="1" strokeDasharray="4 2" fill="none" />
                    <circle cx="150" cy="80" r="20" fill="#FF2200" opacity="0.3" />
                    <circle cx="150" cy="80" r="6" fill="#FF6B00" />
                    <line x1="80" y1="80" x2="220" y2="80" stroke="#FF4400" strokeWidth="0.8" strokeDasharray="3 3" />
                    <line x1="150" y1="20" x2="150" y2="140" stroke="#FF4400" strokeWidth="0.8" strokeDasharray="3 3" />
                  </svg>
                )}

                {art.visualType === "map" && (
                  <svg className="h-full w-full opacity-80" viewBox="0 0 300 160">
                    <rect width="300" height="160" fill="#070A0E" />
                    <ellipse cx="150" cy="80" rx="120" ry="60" stroke="#1F2937" strokeWidth="0.8" fill="none" />
                    <ellipse cx="150" cy="80" rx="80" ry="60" stroke="#1F2937" strokeWidth="0.6" fill="none" />
                    <path d="M70,70 Q110,50 160,70 T230,100" stroke="#00A8FF" strokeWidth="1" strokeDasharray="3 2" fill="none" />
                    <circle cx="70" cy="70" r="3" fill="#00A8FF" />
                    <circle cx="160" cy="70" r="3.5" fill="#FF6B00" />
                    <circle cx="230" cy="100" r="3" fill="#10B981" />
                  </svg>
                )}
              </div>

              {/* Card Body */}
              <div className="flex flex-col justify-between flex-1 p-5">
                <div>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#FF6B00]">
                    {art.category}
                  </span>

                  <h3 className="mt-1.5 font-serif text-lg font-bold leading-snug text-[#111111] group-hover:text-[#FF6B00] transition-colors">
                    {art.title}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-[#555555]">
                    {art.desc}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#F0EFEA] font-mono text-[10px] text-[#888888]">
                  {art.meta}
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
