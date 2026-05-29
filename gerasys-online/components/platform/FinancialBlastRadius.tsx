"use client";

import { useState } from "react";
import { BarChart3, ChevronDown, ChevronRight } from "@/lib/icons";
import { SovereignFinancialImpact } from "./SovereignFinancialImpact";

interface BlastRadiusProps {
  financialExposure?: string | null;
  regulatoryRisk?: string | null;
  mitigationImpact?: string | null;
}

export function FinancialBlastRadius({
  financialExposure,
  regulatoryRisk,
  mitigationImpact,
}: BlastRadiusProps) {
  const [showCalculator, setShowCalculator] = useState(false);
  const exposure = financialExposure || "$4.2M – $8.5M";
  const risk = regulatoryRisk || "CRITICAL";
  const impact = mitigationImpact || "HIGH YIELD";

  return (
    <div className="space-y-4">
      {/* 3-Pillar Exposure Summary Card */}
      <div className="bg-white border border-neutral-100 rounded-lg p-5 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_25px_60px_-15px_rgba(115,61,217,0.06)] hover:-translate-y-1 transition-all duration-500 transform">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-3.5 h-3.5 text-[#733DD9]" />
          <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-[#733DD9] font-mono">
            Simulated Blast Radius
          </span>
        </div>

        {/* 3-Pillar Vertical Stack for compact Left Sidebar integration */}
        <div className="space-y-4 text-left">
          {/* Pillar 1 — Global Exposure */}
          <div className="pb-3 border-b border-neutral-100">
            <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
              Breach Cost Exposure
            </p>
            <p className="text-[#050505] font-mono text-xl font-bold tracking-tight mt-0.5">
              {exposure}
            </p>
          </div>

          {/* Pillar 2 — Regulatory Impact */}
          <div className="pb-3 border-b border-neutral-100">
            <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
              Regulatory Fine Risk
            </p>
            <p className="text-[#733DD9] font-mono text-xl font-black tracking-tight mt-0.5">
              {risk}
            </p>
          </div>

          {/* Pillar 3 — Remediation ROI */}
          <div>
            <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
              Mitigation Target
            </p>
            <p className="text-[#050505] font-mono text-xl font-bold tracking-tight mt-0.5">
              {impact}
            </p>
          </div>
        </div>

        {/* Interactive Calculator Toggle button */}
        <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-center">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#733DD9] text-white border border-transparent hover:bg-[#5B21B6] font-mono text-[9px] font-bold tracking-wide rounded transition-colors duration-300 shadow-sm cursor-pointer"
          >
            {showCalculator ? (
              <>
                <ChevronDown className="w-3 h-3" />
                HIDE CALCULATOR
              </>
            ) : (
              <>
                <ChevronRight className="w-3 h-3" />
                SIMULATE SOVEREIGN IMPACT
              </>
            )}
          </button>
        </div>
      </div>

      {/* Conditionally rendered Interactive Engine */}
      {showCalculator && (
        <div className="animate-fadeIn mt-4">
          <SovereignFinancialImpact />
        </div>
      )}
    </div>
  );
}
