import React from "react";

export function EvidenceBlock({ source, authority, timestamp, children }: { source: string, authority: string, timestamp: string, children: React.ReactNode }) {
  return (
    <div className="bg-[#FFFFFF] border-l-2 border-[#111111] pl-4 py-1 my-6">
      <div className="flex flex-wrap gap-3 text-[10px] font-mono uppercase tracking-wider mb-2">
        <span className="font-bold text-[#111111]">EVIDENCE SOURCE: {source}</span>
        <span className="text-[#D9DDE2]">|</span>
        <span className="text-[#56606B]">AUTHORITY: {authority}</span>
        <span className="text-[#D9DDE2]">|</span>
        <span className="text-[#7A838D]">{timestamp}</span>
      </div>
      <div className="text-sm text-[#111111] leading-relaxed">
        {children}
      </div>
    </div>
  );
}
