import React from "react";
import Link from "next/link";

export function RegulationCard({ regulation }: { regulation: Record<string, unknown> }) {
  return (
    <div className="bg-[#F7F7F5] border border-[#D9DDE2] p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-[#2F6BFF]"></span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#2F6BFF]">
          {regulation.jurisdiction || 'GLOBAL'}
        </span>
      </div>
      <h4 className="text-base font-bold text-[#111111] mb-2">
        {regulation.title}
      </h4>
      <p className="text-xs text-[#56606B] leading-relaxed mb-4 flex-grow">
        <span className="font-bold text-[#111111]">Obligation:</span> {regulation.obligation}
      </p>
      <div className="pt-4 border-t border-[#D9DDE2] flex items-center justify-between text-[11px] font-mono">
        <span className="text-[#7A838D]">AUTHORITY: {regulation.authority}</span>
        <Link href={`/regulations/${regulation.id}`} className="text-[#2F6BFF] font-bold hover:underline">
          View Detail &rarr;
        </Link>
      </div>
    </div>
  );
}
