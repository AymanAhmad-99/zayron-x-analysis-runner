import React from "react";

export function Timeline({ events = [] }: { events?: Array<{ date: string; title: string }> }) {
  if (!events.length) return null;
  return (
    <div className="space-y-3 font-mono text-xs border-l-2 border-zinc-200 pl-4 py-2">
      {events.map((e, idx) => (
        <div key={idx} className="relative">
          <span className="block text-[10px] text-zinc-500">{e.date}</span>
          <span className="text-zinc-900 font-semibold">{e.title}</span>
        </div>
      ))}
    </div>
  );
}
