import React from "react";
import Link from "next/link";

export function EntityPill({ type, value }: { type: string; value: string }) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent(value)}`}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-mono text-[10px] uppercase font-bold transition-colors"
    >
      <span className="text-zinc-500">{type}:</span>
      <span>{value}</span>
    </Link>
  );
}
