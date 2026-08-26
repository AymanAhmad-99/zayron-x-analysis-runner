import React from "react";

export function EntityPill({ entity, type }: { entity: string, type?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#F7F7F5] border border-[#D9DDE2] text-[11px] font-mono text-[#111111] uppercase tracking-wider">
      {type && <span className="text-[#7A838D]">{type}:</span>}
      <span className="font-bold">{entity}</span>
    </span>
  );
}
