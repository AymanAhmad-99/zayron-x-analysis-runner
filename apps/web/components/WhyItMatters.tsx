import React from "react";
import { CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";

export function WhyItMatters({ confirmed, defensive, unknown }: { confirmed: React.ReactNode, defensive: React.ReactNode, unknown: React.ReactNode }) {
  return (
    <section className="w-full my-12">
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#FF6A00] mb-2 block">
          Signature Intelligence Framework
        </span>
        <h2 className="text-2xl font-bold text-[#111111]">WHY IT MATTERS</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-6">
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#111111] uppercase tracking-wider mb-3">
            <CheckCircle className="w-4 h-4 text-[#16A34A]" />
            <span>What Is Confirmed</span>
          </div>
          <div className="text-sm text-[#56606B] leading-relaxed">
            {confirmed}
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-6">
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#111111] uppercase tracking-wider mb-3">
            <AlertTriangle className="w-4 h-4 text-[#FF6A00]" />
            <span>Defensive Priority</span>
          </div>
          <div className="text-sm text-[#56606B] leading-relaxed">
            {defensive}
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-6">
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#111111] uppercase tracking-wider mb-3">
            <HelpCircle className="w-4 h-4 text-[#7A838D]" />
            <span>What Remains Unknown</span>
          </div>
          <div className="text-sm text-[#56606B] leading-relaxed">
            {unknown}
          </div>
        </div>
      </div>
    </section>
  );
}
