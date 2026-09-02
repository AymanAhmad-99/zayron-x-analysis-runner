import React from "react";
import Link from "next/link";
import { SeverityBadge } from "./SeverityBadge";

export interface SearchResultItem {
  type?: string;
  url?: string;
  title?: string;
  description?: string;
  severity?: string;
  [key: string]: unknown;
}

export function SearchResult({ result }: { result: SearchResultItem }) {
  const isThreat = result.type === 'threat' || result.type === 'article';
  const targetUrl = String(result.url || '#');
  const title = String(result.title || 'Untitled Result');
  const description = String(result.description || '');
  const itemType = String(result.type || 'RESULT');

  return (
    <div className="py-4 border-b border-[#D9DDE2] group">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-[10px] font-mono text-[#7A838D] uppercase tracking-wider bg-[#F7F7F5] px-2 py-0.5">
          {itemType}
        </span>
        {isThreat && result.severity && <SeverityBadge severity={String(result.severity)} />}
      </div>
      <Link href={targetUrl} className="text-lg font-bold text-[#111111] group-hover:text-[#FF6A00] transition-colors leading-snug block mb-1">
        {title}
      </Link>
      <p className="text-sm text-[#56606B] line-clamp-2">
        {description}
      </p>
    </div>
  );
}
