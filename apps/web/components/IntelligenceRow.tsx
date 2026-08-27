import React from "react";
import Link from "next/link";
import { SeverityBadge } from "./SeverityBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";

export function IntelligenceRow({ event }: { event: Record<string, unknown> }) {
  const title = (event.title as string) || (event.raw_title as string) || "Emerging Threat Signal Event";
  const slug = (event.slug as string) || (event.id as string) || "telemetry";
  const source = (event.source_channel as string) || "VERIFIED TELEMETRY";
  const timestamp = event.published_at
    ? new Date(event.published_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "LIVE";

  return (
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F5F4F0] transition-colors">
      <div className="flex items-start sm:items-center gap-4">
        <SeverityBadge severity={event.severity} />
        <div>
          <Link href={`/threats/${slug}`} className="text-sm font-bold text-[#111214] hover:text-[#D9531E] transition-colors block leading-snug">
            {title}
          </Link>
          <div className="text-[11px] text-[#8C8F98] flex flex-wrap items-center gap-2.5 mt-1 font-mono">
            <span>{timestamp}</span>
            <span className="text-[#E1DFD7]">|</span>
            <span>SRC: {source}</span>
            <span className="text-[#E1DFD7]">|</span>
            <ConfidenceBadge confidence={event.confidence || 0.9} />
          </div>
        </div>
      </div>
      <Link href={`/threats/${slug}`} className="text-xs font-bold uppercase tracking-wider text-[#5A5D65] hover:text-[#111214] shrink-0">
        Inspect &rarr;
      </Link>
    </div>
  );
}
