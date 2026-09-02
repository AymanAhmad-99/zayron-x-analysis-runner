import React from "react";
import Link from "next/link";
import { Send, Eye, MessageSquare, Globe, ChevronRight, TrendingUp } from "lucide-react";

export function RealTimeMonitoring() {
  const monitors = [
    {
      title: "Telegram Monitoring",
      icon: Send,
      count: "5,000+",
      label: "channels monitored",
      delta: "127",
      deltaLabel: "New threats today",
      sparkline: "M0,18 Q15,22 30,12 T60,8 T90,4",
    },
    {
      title: "Dark Web Monitoring",
      icon: Eye,
      count: "2,342",
      label: "active discussions",
      delta: "89",
      deltaLabel: "High-risk mentions",
      sparkline: "M0,15 Q20,10 40,16 T70,6 T90,3",
    },
    {
      title: "Discord Monitoring",
      icon: MessageSquare,
      count: "340+",
      label: "servers monitored",
      delta: "23",
      deltaLabel: "New threats today",
      sparkline: "M0,20 Q25,18 45,10 T75,12 T90,5",
    },
    {
      title: "Open Source Intelligence",
      icon: Globe,
      count: "1,200+",
      label: "sources monitored",
      delta: "156",
      deltaLabel: "New intelligence items",
      sparkline: "M0,16 Q20,24 45,12 T70,8 T90,2",
    },
  ];

  return (
    <section className="w-full border-b border-[#E8E6DF] bg-[#F7F7F5] py-16 lg:py-20 text-[#111111]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#111111] sm:text-4xl">
              Real-Time Monitoring<span className="text-[#FF6B00]">.</span>
            </h2>
            <p className="mt-2 max-w-xl text-xs sm:text-sm text-[#555555]">
              24/7 monitoring across critical threat surfaces and underground channels.
            </p>
          </div>

          <Link
            href="/intelligence"
            className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-[#FF6B00] hover:text-[#E56000] transition-colors self-start sm:self-auto"
          >
            <span>View monitoring</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {monitors.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className="flex flex-col justify-between rounded-xl border border-[#E2E0D8] bg-[#FFFFFF] p-5 shadow-2xs transition-all hover:border-[#FF6B00]/40 hover:shadow-md"
              >
                <div>
                  {/* Card Top Title & Icon */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111111] text-[#FF6B00]">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-sans text-xs font-bold text-[#111111]">
                      {m.title}
                    </span>
                  </div>

                  {/* Main Metric & Sparkline */}
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
                        {m.count}
                      </span>
                      <span className="block font-sans text-[11px] text-[#777777] mt-0.5">
                        {m.label}
                      </span>
                    </div>

                    {/* Mini SVG Sparkline */}
                    <svg className="h-7 w-20" viewBox="0 0 90 28" fill="none">
                      <path d={m.sparkline} stroke="#FF6B00" strokeWidth="1.8" fill="none" />
                    </svg>
                  </div>
                </div>

                {/* Bottom Indicator */}
                <div className="mt-5 pt-3 border-t border-[#F0EFEA] flex items-center gap-1.5 font-sans text-xs">
                  <TrendingUp className="h-3.5 w-3.5 text-[#111111]" />
                  <span className="font-bold text-[#111111]">{m.delta}</span>
                  <span className="text-[#777777]">{m.deltaLabel}</span>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
