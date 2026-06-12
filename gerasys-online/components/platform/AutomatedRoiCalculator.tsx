'use client';

import { ShieldCheck, TrendingUp, Zap } from '@/lib/icons';
import { useState } from 'react';

export function AutomatedRoiCalculator() {
  const [employees, setEmployees] = useState(45);

  // SOC Analyst cost: $120k / year
  const socAnalystCost = 120000;

  // Determine ZAYRON-X Pricing Tier
  let tierName = 'Sentinel Plan';
  let monthlyPrice = 49;
  let description = 'Ideal for micro-businesses needing core OSINT threat mapping and light radar.';

  if (employees > 20 && employees <= 100) {
    tierName = 'Guardian Plan';
    monthlyPrice = 149;
    description =
      'Perfect for fast-growing mid-market companies needing full SaaS and DNS auto-remediation.';
  } else if (employees > 100) {
    tierName = 'Fortress Plan';
    monthlyPrice = 499;
    description =
      'Enterprise-grade autonomous CISO security designed for heavy infrastructure nodes.';
  }

  const zayronAnnualCost = monthlyPrice * 12;
  const annualSavings = socAnalystCost - zayronAnnualCost;
  const roiPercentage = (annualSavings / zayronAnnualCost) * 100;

  return (
    <section className="bg-white border-t border-neutral-100 text-[#050505] py-20 px-6 lg:px-10 relative overflow-hidden font-sans">
      {/* Visual background details */}
      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Header Block */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#733DD9]/10 text-[#733DD9] font-mono text-[10px] font-bold tracking-widest uppercase mb-4 border border-[#733DD9]/20">
            <TrendingUp className="w-3.5 h-3.5" />
            B2B Cost Efficiency Engine
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-[#050505]">
            Calculate Your Autonomous CISO ROI
          </h2>
          <p className="text-sm text-neutral-500 leading-relaxed font-sans">
            Compare the operational overhead of a traditional, full-time in-house SOC analyst
            against ZAYRON-X's 24/7/365 active threat ingestion and auto-remediation engine.
          </p>
        </div>

        {/* Dynamic Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left panel: Slider & Tier selection (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-lg p-8 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300">
            <div>
              {/* Slider header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="text-xs uppercase font-mono tracking-wider text-neutral-400 font-semibold">
                    Scale of Operation
                  </span>
                  <h3 className="text-lg font-bold text-[#050505] mt-1">Company Size</h3>
                </div>
                <div className="bg-[#733DD9]/10 border border-[#733DD9]/20 px-5 py-2.5 rounded font-mono text-center">
                  <span className="block text-[22px] font-extrabold text-[#733DD9] leading-none">
                    {employees}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold mt-1 block">
                    Employees
                  </span>
                </div>
              </div>

              {/* Slider Input */}
              <div className="relative mb-10 pt-4">
                <input
                  type="range"
                  min="1"
                  max="500"
                  value={employees}
                  onChange={(e) => setEmployees(Number.parseInt(e.target.value))}
                  className="w-full h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-[#733DD9] focus:outline-none transition-all"
                  style={{
                    background: `linear-gradient(to right, #733DD9 0%, #733DD9 ${(employees / 500) * 100}%, #E5E5E5 ${(employees / 500) * 100}%, #E5E5E5 100%)`,
                  }}
                />

                {/* Steps markers */}
                <div className="flex justify-between text-[9px] font-mono text-neutral-400 mt-3 select-none">
                  <span>1 Employee</span>
                  <span>100</span>
                  <span>200</span>
                  <span>300</span>
                  <span>400</span>
                  <span>500 Employees</span>
                </div>
              </div>
            </div>

            {/* Custom Tier Details Card */}
            <div className="bg-neutral-50 border border-neutral-200/85 rounded p-5 mt-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#733DD9]" />
                  <span className="font-mono text-xs font-bold text-[#050505] uppercase tracking-wider">
                    {tierName}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-[#733DD9] bg-[#733DD9]/10 px-2 py-0.5 rounded border border-[#733DD9]/20">
                  ${monthlyPrice}/mo
                </span>
              </div>
              <p className="text-[11px] font-sans text-neutral-500 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          {/* Right panel: Live ROI Results (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-lg p-8 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300 relative overflow-hidden">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-neutral-400 font-semibold">
                Comparative Analysis
              </span>
              <h3 className="text-lg font-bold text-[#050505] mt-1 mb-8">
                Annual Budget Comparison
              </h3>

              {/* Stat 1: Traditional SOC */}
              <div className="flex justify-between items-center py-3 border-b border-neutral-100 font-mono text-xs">
                <span className="text-neutral-400">1x Dedicated SOC Analyst:</span>
                <span className="text-[#050505] font-bold">
                  ${socAnalystCost.toLocaleString()}/yr
                </span>
              </div>

              {/* Stat 2: ZAYRON-X Cost */}
              <div className="flex justify-between items-center py-3 border-b border-neutral-100 font-mono text-xs">
                <span className="text-neutral-400">ZAYRON-X Active Subscription:</span>
                <span className="text-[#050505] font-bold">
                  ${zayronAnnualCost.toLocaleString()}/yr
                </span>
              </div>

              {/* Stat 3: Total ROI */}
              <div className="flex justify-between items-center py-3 font-mono text-xs mb-6">
                <span className="text-neutral-400">Net Efficiency Rate (ROI):</span>
                <span className="text-[#733DD9] font-extrabold">
                  +{roiPercentage.toLocaleString(undefined, { maximumFractionDigits: 0 })}%
                </span>
              </div>
            </div>

            {/* Savings Display Card */}
            <div className="bg-[#733DD9]/5 border border-[#733DD9]/20 rounded p-6 text-center select-none my-4">
              <span className="text-[10px] uppercase font-mono tracking-[0.15em] text-[#733DD9] font-bold block mb-1">
                Net Annual Financial Savings
              </span>
              <span className="text-3xl md:text-4xl font-extrabold text-[#733DD9] font-mono tracking-tight leading-none block">
                ${annualSavings.toLocaleString()}
              </span>
              <p className="text-[9px] font-mono text-neutral-400 mt-2.5 leading-normal uppercase">
                Direct B2B budget preservation with active 24/7 protection.
              </p>
            </div>

            {/* Direct signup action */}
            <a
              href="/contact"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded bg-[#733DD9] hover:bg-[#5B21B6] text-white border border-transparent font-mono font-bold text-xs tracking-wider transition-colors shadow-sm cursor-pointer text-center"
            >
              <ShieldCheck className="w-4 h-4" />
              START 14-DAY FREE RISK ASSESSMENT
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
