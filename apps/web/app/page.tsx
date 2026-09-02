import React from "react";
import { Navbar } from "./_components/navbar";
import { Hero } from "./_components/hero";
import { TrustStrip } from "./_components/trust-strip";
import { Methodology } from "./_components/methodology";
import { DualGrid } from "./_components/dual-grid";
import { EvidencePricing } from "./_components/evidence-pricing";
import { BannerCta } from "./_components/banner-cta";

export const revalidate = 60;

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col w-full bg-[var(--bg-page)] text-[var(--text-primary-light)] selection:bg-[var(--accent)] selection:text-white">
      {/* 1. Global Navigation Header */}
      <Navbar />

      {/* 2. Hero Section (Editorial Headline + Dark Preview Panel) */}
      <Hero />

      {/* 3. Trusted By Security Teams Worldwide (Proof Pillars) */}
      <TrustStrip />

      {/* 4. Intelligence Without the Noise (3-Stage Pipeline Methodology) */}
      <Methodology />

      {/* 5. Dual Asymmetric Grid (Platform Preview & Deeper Analysis Split) */}
      <DualGrid />

      {/* 6. Evidence & Simple Transparent Pricing */}
      <EvidencePricing />

      {/* 7. Closing CTA Banner */}
      <BannerCta />
    </div>
  );
}

