import React from "react";

export function SeverityBadge({ severity }: { severity: string }) {
  const upper = severity?.toUpperCase() || "HIGH";
  let bg = "bg-[#252B33]/5";
  let text = "text-[#56606B]";
  let border = "border-[#D9DDE2]";

  if (upper === "CRITICAL") {
    bg = "bg-red-500/10";
    text = "text-red-600";
    border = "border-red-500/20";
  } else if (upper === "HIGH") {
    bg = "bg-orange-500/10";
    text = "text-[#FF6A00]";
    border = "border-orange-500/20";
  } else if (upper === "MEDIUM") {
    bg = "bg-yellow-500/10";
    text = "text-yellow-700";
    border = "border-yellow-500/20";
  }

  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase border ${bg} ${text} ${border}`}>
      {upper}
    </span>
  );
}
