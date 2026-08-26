import React from "react";
import Link from "next/link";
import { SeverityBadge } from "./SeverityBadge";

export function IntelligenceCard({ article }: { article: Record<string, unknown> | null | undefined }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#D9DDE2] p-5 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between mb-3">
          <SeverityBadge severity={article.severity} />
          <span className="text-[10px] font-mono text-[#7A838D] uppercase tracking-wider">{article.category || 'CTI'}</span>
        </div>
        <h4 className="text-sm font-bold text-[#111111] mb-2 leading-snug group-hover:text-[#FF6A00] transition-colors">
          <Link href={`/threats/${article.slug || article.id}`}>
            <span className="absolute inset-0" />
            {article.title}
          </Link>
        </h4>
        <p className="text-xs text-[#56606B] line-clamp-2 leading-relaxed">
          {article.excerpt || article.dek || 'Adversary telemetry indicates active operational activity.'}
        </p>
      </div>
      <div className="pt-4 mt-4 border-t border-[#D9DDE2] flex items-center justify-between text-[11px] font-mono text-[#7A838D] uppercase">
        <span>{article.published_at ? new Date(article.published_at).toISOString().split('T')[0] : 'TODAY'}</span>
        <span className="text-[#FF6A00] font-semibold tracking-wider group-hover:underline">Read &rarr;</span>
      </div>
    </div>
  );
}
