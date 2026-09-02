import React from "react";
import { Navbar } from "./_components/navbar";
import { Hero } from "./_components/hero";
import { TrustStrip } from "./_components/trust-strip";
import { Methodology } from "./_components/methodology";
import { DualGrid } from "./_components/dual-grid";
import { EvidencePricing } from "./_components/evidence-pricing";
import { IntelligenceCompany } from "./_components/intelligence-company";
import { BannerCta } from "./_components/banner-cta";
import { Footer } from "./_components/footer";

export const revalidate = 60;

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col w-full bg-[#F6F4EE]">
      {/* 1. Global Navigation Header */}
      <Navbar />

      {/* 2. Hero — Editorial Headline + Terminal Dashboard */}
      <Hero />

      {/* 3. Trust Strip — Proof Pills */}
      <TrustStrip />

      {/* 4. Methodology — 3-Stage Intelligence Pipeline */}
      <Methodology />

      {/* 5. Dual Grid — Platform Preview + Research Articles */}
      <DualGrid />

      {/* 6. Evidence + Pricing — Side by side dark blocks */}
      <EvidencePricing />

      {/* 7. Built as an Intelligence Company — Values + CTA */}
      <IntelligenceCompany />

      {/* 8. Closing CTA Banner */}
      <BannerCta />

      {/* 9. Footer */}
      <Footer />
    </div>
  );
}
