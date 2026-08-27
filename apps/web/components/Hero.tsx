import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero({ headline, subheadline, summary, feature }: { headline: string, subheadline: string, summary: string, feature: React.ReactNode }) {
  return (
    <section className="w-full border-b border-[#D9DDE2] bg-[#FFFFFF] py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F7F7F5] border border-[#D9DDE2] text-[#111111] text-[10px] font-bold uppercase tracking-wider mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00] animate-pulse"></span>
            <span>Evidence-Driven Cyber Intelligence</span>
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-bold tracking-tight text-[#111111] leading-[1.08] mb-6">
            {headline} <br />
            <span className="text-[#56606B]">{subheadline}</span>
          </h1>
          <p className="text-lg text-[#56606B] leading-relaxed max-w-2xl mb-8">
            Understand what changed. Know why it matters. {summary}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <Link
              href="/threats"
              className="inline-flex justify-center items-center gap-2 bg-[#111111] text-[#FFFFFF] px-7 py-3.5 text-sm font-semibold tracking-wide hover:bg-[#FF6A00] transition-colors"
            >
              Explore Intelligence <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/intelligence/today"
              className="inline-flex justify-center items-center gap-2 bg-[#FFFFFF] text-[#111111] border border-[#D9DDE2] px-7 py-3.5 text-sm font-semibold tracking-wide hover:border-[#111111] transition-colors"
            >
              Read Today&apos;s Briefing
            </Link>
          </div>
          
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-[#D9DDE2] max-w-xl text-left">
            <div>
              <div className="text-2xl font-bold text-[#111111] font-mono">25</div>
              <div className="text-[10px] uppercase tracking-wider text-[#7A838D]">Monitored Feeds</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#111111] font-mono">100%</div>
              <div className="text-[10px] uppercase tracking-wider text-[#7A838D]">Evidence Grounding</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#FF6A00] font-mono">LIVE</div>
              <div className="text-[10px] uppercase tracking-wider text-[#7A838D]">Edge Ingestion</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          {feature}
        </div>
      </div>
    </section>
  );
}
