import React from 'react';
import { UnderstatedPricing } from '@/components/UnderstatedPricing';
import { TrustMatrix } from '@/components/TrustMatrix';

export const metadata = {
  title: 'Pricing & Institutional Access — ZAYRON-X',
  description: 'Transparent access tiers for sovereign cyber threat intelligence. Real implemented capabilities with zero enterprise friction.',
};

export default function PricingPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#F5F4F0] min-h-screen">
      <header className="bg-[#FFFFFF] border-b border-[#E1DFD7] pt-14 pb-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="max-w-4xl">
            <div className="text-[10px] font-mono font-bold text-[#D9531E] uppercase tracking-wider mb-2">
              Institutional Access
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#111214] mb-3 uppercase">
              Transparent Access Tiers
            </h1>
            <p className="text-xs sm:text-sm text-[#5A5D65] leading-relaxed">
              Intel value first. Direct access to public threat streams and expanded high-density radial entity investigation tooling.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <UnderstatedPricing />
        <TrustMatrix />
      </main>
    </div>
  );
}
