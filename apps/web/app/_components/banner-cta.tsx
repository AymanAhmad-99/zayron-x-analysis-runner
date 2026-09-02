import React from "react";
import Link from "next/link";

export function BannerCta() {
  return (
    <section className="w-full bg-[#FF5500] py-16 lg:py-20">
      <div className="max-w-[1380px] mx-auto px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-10">

        {/* Left */}
        <div className="max-w-xl">
          <span
            className="uppercase text-[9.5px] font-bold tracking-[0.16em] text-white/80 block mb-3"
            style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
          >
            READY TO STRENGTHEN YOUR SECURITY POSTURE?
          </span>
          <h2
            className="text-[28px] lg:text-[32px] font-extrabold text-white leading-[1.1] tracking-tight uppercase mb-5"
            style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
          >
            SEE WHAT MATTERS. UNDERSTAND WHY IT MATTERS.
          </h2>
          <p
            className="text-[14px] leading-[1.65] text-white/80"
            style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
          >
            Accelerate your threat investigation with evidence-based intelligence feeds.
            Join thousands of security analysts who rely on ZAYRON-X daily.
          </p>
        </div>

        {/* Right — actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center bg-white text-[#FF5500] px-6 py-3 rounded-[2px] uppercase text-[10.5px] font-bold tracking-[0.12em] hover:bg-white/90 transition-colors"
            style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
          >
            GET STARTED TODAY →
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center bg-transparent border border-white text-white px-6 py-3 rounded-[2px] uppercase text-[10.5px] font-bold tracking-[0.12em] hover:bg-white/10 transition-colors"
            style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
          >
            CONTACT SALES →
          </Link>
        </div>

      </div>
    </section>
  );
}
