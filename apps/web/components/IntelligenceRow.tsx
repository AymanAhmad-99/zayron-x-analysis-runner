import React from "react";
import Link from "next/link";
import { SeverityBadge } from "./SeverityBadge";

interface IntelligenceEventItem {
  id: string;
  slug?: string;
  title?: string;
  description?: string;
  type?: string;
  severity?: string;
  createdAt?: string;
  timestamp?: string;
}

export function IntelligenceRow({ event }: { event: IntelligenceEventItem }) {
  const dateStr = event.createdAt || event.timestamp || "";
  return (
    <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#F9F9F7] transition-colors">
      <div className="space-y-1 max-w-2xl">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={event.severity || "info"} />
          <span className="font-mono text-[10px] text-[#8C8F98] uppercase tracking-wider">{event.type || "EVENT"}</span>
          {dateStr && (
            <>
              <span className="font-mono text-[10px] text-[#8C8F98]">•</span>
              <span className="font-mono text-[10px] text-[#8C8F98]">{dateStr}</span>
            </>
          )}
        </div>
        <Link href={`/threats/${event.slug || event.id}`} className="block font-medium text-sm text-[#111214] hover:text-[#FF6B00] transition-colors">
          {event.title || event.description || "Intelligence Signal"}
        </Link>
      </div>
      <div className="font-mono text-xs text-[#8C8F98] shrink-0">
        <Link href={`/threats/${event.slug || event.id}`} className="hover:text-[#111214] inline-flex items-center gap-1">
          Inspect →
        </Link>
      </div>
    </div>
  );
}
