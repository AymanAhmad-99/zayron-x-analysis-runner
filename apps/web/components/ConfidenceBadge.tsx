import React from "react";

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round((confidence || 0) * 100);
  
  return (
    <span className="text-[10px] font-mono text-[#56606B] tracking-wider uppercase">
      Confidence: {percentage}%
    </span>
  );
}
