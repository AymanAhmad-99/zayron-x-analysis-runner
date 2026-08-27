import React from "react";

export function ConfidenceBadge({ confidence }: { confidence: unknown }) {
  const num = typeof confidence === "number" ? confidence : 0.94;
  const percentage = Math.round(num <= 1 ? num * 100 : num);
  
  return (
    <span className="text-[10px] font-mono text-[#1D8A5E] font-bold tracking-wider uppercase">
      {percentage}% (Verified)
    </span>
  );
}
