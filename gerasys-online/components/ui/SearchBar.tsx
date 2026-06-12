'use client';

import { Search, X } from '@/lib/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

interface ArticleSuggestion {
  id: string;
  title: string;
  slug: string;
  category: string;
}

// Local useDebounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function SearchBar({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (
        e.key === '/' &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement !== inputRef.current &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch search results dynamically when debounced query updates
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    let active = true;
    async function fetchSuggestions() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&type=articles`);
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setSuggestions(data.articles || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch search suggestions:', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    fetchSuggestions();

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      setShowDropdown(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative" role="search" aria-label="Search articles">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === 'Enter') handleSubmit(e);
            if (e.key === 'Escape') setShowDropdown(false);
          }}
          placeholder="Search threats…"
          className="w-full pl-8 pr-3 py-1.5 text-[0.78rem] bg-transparent border-b border-black/25 dark:border-slate-600 focus:outline-none focus:border-black dark:focus:border-[#733DD9] transition-colors font-sans text-[#111111] dark:text-slate-200 placeholder:text-[#AAAAAA] dark:placeholder:text-slate-500"
          aria-label="Search articles"
          aria-describedby="search-hint"
          autoComplete="off"
          spellCheck={false}
        />
        <Search
          className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#999999] dark:text-slate-500"
          aria-hidden="true"
        />
        <span id="search-hint" className="sr-only">
          Press Enter to search. Press / to focus search from anywhere.
        </span>
      </form>

      {/* Dynamic Auto-complete Suggestions Dropdown */}
      {showDropdown && query.trim() !== '' && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-black border border-neutral-200 dark:border-slate-800 shadow-xl z-50 max-h-80 overflow-y-auto font-sans">
          {isLoading && (
            <div className="px-4 py-3 text-xs text-neutral-400 dark:text-slate-500 font-mono animate-pulse">
              [SCANNING DATABASE...]
            </div>
          )}
          {!isLoading && suggestions.length === 0 && (
            <div className="px-4 py-3 text-xs text-neutral-400 dark:text-slate-500 font-mono">
              [NO INTELLIGENCE FOUND]
            </div>
          )}
          {!isLoading && suggestions.length > 0 && (
            <div className="divide-y divide-neutral-100 dark:divide-slate-900">
              {suggestions.slice(0, 5).map((article) => {
                const categoryPath = (article.category ?? 'intelligence')
                  .toLowerCase()
                  .replace(/\s+/g, '-');
                const href = `/intelligence/${categoryPath}/${article.slug}`;
                return (
                  <Link
                    key={article.id}
                    href={href}
                    onClick={() => {
                      setQuery('');
                      setShowDropdown(false);
                    }}
                    className="block px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <span className="block text-[8px] font-mono font-bold uppercase tracking-wider text-[#733DD9] mb-0.5">
                      {article.category}
                    </span>
                    <span className="block text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {article.title}
                    </span>
                  </Link>
                );
              })}
              {suggestions.length > 5 && (
                <button
                  onClick={handleSubmit}
                  className="w-full text-left px-4 py-2 text-[10px] font-mono font-bold text-[#733DD9] hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors uppercase tracking-wider block"
                >
                  View all {suggestions.length} results ──▶
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
