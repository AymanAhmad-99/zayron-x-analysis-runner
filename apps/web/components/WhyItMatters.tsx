import React from "react";

export function WhyItMatters({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 text-amber-950 text-xs">
      <span className="font-bold uppercase tracking-wider text-[10px] block mb-1 text-amber-800">Operational Significance</span>
      <p>{text}</p>
    </div>
  );
}
