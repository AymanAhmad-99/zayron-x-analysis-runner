import React from "react";

export function Timeline({ events }: { events: { date: string, description: string, critical?: boolean }[] }) {
  return (
    <div className="my-8">
      <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider mb-6">Execution Timeline</h3>
      <div className="space-y-6 border-l-2 border-[#D9DDE2] ml-2 pl-6 relative">
        {events.map((event, idx) => (
          <div key={idx} className="relative">
            <span className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-[#F7F7F5] ${event.critical ? 'bg-[#FF6A00]' : 'bg-[#111111]'}`}></span>
            <div className="text-[11px] font-mono text-[#7A838D] uppercase tracking-wider mb-1">{event.date}</div>
            <div className={`text-sm leading-relaxed ${event.critical ? 'text-[#111111] font-bold' : 'text-[#56606B]'}`}>
              {event.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
