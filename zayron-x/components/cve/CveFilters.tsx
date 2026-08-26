'use client';

import { Search } from '@/lib/icons';
import { type FormEvent, useState } from 'react';

interface CveFiltersProps {
  onSearch: (query: string) => void;
  onSeverityChange: (severity: string) => void;
}

const severities = ['All', 'Critical', 'High', 'Medium', 'Low'];

export function CveFilters({ onSearch, onSeverityChange }: CveFiltersProps) {
  const [query, setQuery] = useState('');
  const [activeSeverity, setActiveSeverity] = useState('All');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSearch(query.trim());
  }

  function handleSeverity(severity: string) {
    setActiveSeverity(severity);
    onSeverityChange(severity === 'All' ? '' : severity);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-8">
      <form onSubmit={handleSubmit} className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search CVEs by ID, product, vendor..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D2B48C] focus:border-transparent transition-all font-ui text-[#0F172A] placeholder:text-[#94A3B8]"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
      </form>
      <div className="flex gap-2 flex-wrap">
        {severities.map((s) => (
          <button
            key={s}
            onClick={() => handleSeverity(s)}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all font-ui ${
              activeSeverity === s
                ? 'bg-[#D2B48C] text-white shadow-sm'
                : 'bg-white border border-[#E2E8F0] text-[#475569] hover:border-[#D2B48C] hover:text-[#D2B48C]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
