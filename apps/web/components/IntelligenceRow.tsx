import React from "react";
import Link from "next/link";
import { SeverityBadge } from "./SeverityBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";

export function IntelligenceRow({ event }: { event: Record<string, unknown> }) {
  return (
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F7F7F5] transition-colors">
      <div className="flex items-start sm:items-center gap-4">
        <SeverityBadge severity={event.severity} />
        <div>
          <Link href={`/threats/${event.id || event.slug}`} className="text-sm font-bold text-[#111111] hover:text-[#FF6A00] transition-colors block leading-snug">
            {event.title}
          </Link>
          <div className="text-[11px] text-[#7A838D] flex flex-wrap items-center gap-3 mt-1">
            <span className="font-mono">SOURCE: {event.source_channel || 'VERIFIED INGESTION'}</span>
            <span className="text-[#D9DDE2]">|</span>
            <ConfidenceBadge confidence={event.confidence || 0.9} />
            <span className="text-[#D9DDE2]">|</span>
            <span>{event.published_at ? new Date(event.published_at).toLocaleTimeString() : 'LIVE'}</span>
          </div>
        </div>
      </div>
      <Link href={`/threats/${event.id || event.slug}`} className="text-xs font-semibold text-[#56606B] hover:text-[#111111] shrink-0">
        Inspect &rarr;
      </Link>
    </div>
  );
}
