import React from "react";
import Link from "next/link";
import { SeverityBadge } from "./SeverityBadge";

export function SearchResult({ result }: { result: Record<string, unknown> }) {
  const isThreat = result.type === 'threat' || result.type === 'article';
  
  return (
    <div className="py-4 border-b border-[#D9DDE2] group">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-[10px] font-mono text-[#7A838D] uppercase tracking-wider bg-[#F7F7F5] px-2 py-0.5">
          {result.type}
        </span>
        {isThreat && result.severity && <SeverityBadge severity={result.severity} />}
      </div>
      <Link href={result.url} className="text-lg font-bold text-[#111111] group-hover:text-[#FF6A00] transition-colors leading-snug block mb-1">
        {result.title}
      </Link>
      <p className="text-sm text-[#56606B] line-clamp-2">
        {result.description}
      </p>
    </div>
  );
}
