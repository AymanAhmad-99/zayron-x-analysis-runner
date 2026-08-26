import React from "react";

export function SourceIndicator({ source, trustScore }: { source: string, trustScore?: number }) {
  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 bg-[#FFFFFF] border border-[#D9DDE2] text-[10px] font-mono text-[#56606B] uppercase tracking-wider">
      <span className="w-1.5 h-1.5 bg-[#111111] rounded-full"></span>
      <span className="font-bold text-[#111111]">{source}</span>
      {trustScore && (
        <>
          <span className="text-[#D9DDE2]">|</span>
          <span>TRUST: {trustScore}%</span>
        </>
      )}
    </div>
  );
}
