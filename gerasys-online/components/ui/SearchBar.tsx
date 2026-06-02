"use client";

import { Search } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";

export function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [announceCount, setAnnounceCount] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement !== inputRef.current &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative ${className}`}
      role="search"
      aria-label="Search articles"
    >
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "Enter") handleSubmit(e);
        }}
        placeholder="Search threats…"
        className="w-full pl-8 pr-3 py-1.5 text-[0.78rem] bg-transparent border-b border-black/25 dark:border-slate-600 focus:outline-none focus:border-black dark:focus:border-[#733DD9] transition-colors font-sans text-[#111111] dark:text-slate-200 placeholder:text-[#AAAAAA] dark:placeholder:text-slate-500"
        aria-label="Search articles"
        aria-describedby="search-hint"
        autoComplete="off"
        spellCheck={false}
      />
      <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#999999] dark:text-slate-500" aria-hidden="true" />
      <span id="search-hint" className="sr-only">
        Press Enter to search. Press / to focus search from anywhere.
      </span>
      {/* Screen reader announcements */}
      {announceCount && (
        <div role="status" aria-live="polite" className="sr-only">
          {announceCount}
        </div>
      )}
    </form>
  );
}
