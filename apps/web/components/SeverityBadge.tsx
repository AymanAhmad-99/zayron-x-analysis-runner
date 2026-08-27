import React from "react";

export function SeverityBadge({ severity }: { severity?: unknown }) {
  const upper = typeof severity === "string" ? severity.toUpperCase() : "HIGH";
  let bg = "bg-[#2A7B62]/10";
  let text = "text-[#2A7B62]";
  let border = "border-[#2A7B62]/25";

  if (upper === "CRITICAL") {
    bg = "bg-[#C82323]/10";
    text = "text-[#C82323]";
    border = "border-[#C82323]/25";
  } else if (upper === "HIGH") {
    bg = "bg-[#D9531E]/10";
    text = "text-[#D9531E]";
    border = "border-[#D9531E]/25";
  } else if (upper === "MEDIUM") {
    bg = "bg-[#D9821E]/10";
    text = "text-[#D9821E]";
    border = "border-[#D9821E]/25";
  }

  return (
    <span className={`px-2 py-0.5 text-[9px] font-mono font-bold tracking-[0.06em] uppercase border rounded-[3px] ${bg} ${text} ${border}`}>
      {upper}
    </span>
  );
}
