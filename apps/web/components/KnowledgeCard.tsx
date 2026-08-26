import React from "react";
import Link from "next/link";

export function KnowledgeCard({ framework }: { framework: Record<string, unknown> }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-6 flex flex-col justify-between hover:border-[#111111] transition-colors">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#7A838D] border border-[#D9DDE2] px-2 py-0.5">
            {framework.document_type || 'STANDARD'}
          </span>
          <span className="text-[10px] font-mono text-[#56606B]">TIER {framework.authority_tier || 1}</span>
        </div>
        <h4 className="text-base font-bold text-[#111111] mb-2 leading-snug">
          {framework.title}
        </h4>
        <p className="text-xs text-[#56606B] leading-relaxed line-clamp-3 mb-4">
          {framework.summary || framework.description}
        </p>
      </div>
      <div className="pt-4 border-t border-[#D9DDE2]">
        <Link href={`/knowledge/${framework.id}`} className="text-[11px] font-bold uppercase tracking-wider text-[#111111] hover:text-[#FF6A00] transition-colors">
          Inspect Framework &rarr;
        </Link>
      </div>
    </div>
  );
}
