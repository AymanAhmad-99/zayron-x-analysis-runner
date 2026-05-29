"use client";

import { Search } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
        className="w-full pl-8 pr-3 py-1.5 text-[0.78rem] bg-transparent border-b border-black/25 focus:outline-none focus:border-black transition-colors font-sans text-[#111111] placeholder:text-[#AAAAAA]"
        aria-label="Search articles"
      />
      <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#999999]" />
    </form>
  );
}
