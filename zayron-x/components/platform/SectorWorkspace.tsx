'use client';

import { FileText, ShieldAlert, Users } from '@/lib/icons';
import { type ReactNode, useState } from 'react';

type Sector = 'briefings' | 'cve' | 'analysts';

interface SectorWorkspaceProps {
  briefings: ReactNode;
  cveIndex: ReactNode;
  analysts: ReactNode;
  articleCount: number;
  cveCount: number;
  analystCount: number;
}

const SECTORS: {
  id: Sector;
  label: string;
  icon: typeof FileText;
  countKey: 'articleCount' | 'cveCount' | 'analystCount';
}[] = [
  { id: 'briefings', label: 'Briefing Coverage', icon: FileText, countKey: 'articleCount' },
  { id: 'cve', label: 'CVE Coverage', icon: ShieldAlert, countKey: 'cveCount' },
  { id: 'analysts', label: 'Analyst Coverage', icon: Users, countKey: 'analystCount' },
];

export function SectorWorkspace({
  briefings,
  cveIndex,
  analysts,
  articleCount,
  cveCount,
  analystCount,
}: SectorWorkspaceProps) {
  const [active, setActive] = useState<Sector>('briefings');

  const counts = { articleCount, cveCount, analystCount };

  return (
    <div>
      {/* Sector Tabs */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-1">
            {SECTORS.map((sector) => {
              const Icon = sector.icon;
              const isActive = active === sector.id;
              return (
                <button
                  key={sector.id}
                  onClick={() => setActive(sector.id)}
                  className={`
                    relative flex items-center gap-2 px-5 py-4 text-[0.8rem] font-medium tracking-wide
                    transition-colors duration-300 cursor-pointer
                    ${isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{sector.label}</span>
                  <span
                    className={`
                    text-[0.65rem] font-mono tabular-nums ml-1
                    ${isActive ? 'text-[var(--color-accent-intelligence)]' : 'text-[var(--color-border-strong)]'}
                  `}
                  >
                    {counts[sector.countKey].toLocaleString()}
                  </span>

                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute bottom-0 left-5 right-5 h-[2px] bg-[var(--color-accent-intelligence)] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sector Content */}
      <div className="bg-[var(--color-bg-soft)] min-h-[60vh]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
          {active === 'briefings' && briefings}
          {active === 'cve' && cveIndex}
          {active === 'analysts' && analysts}
        </div>
      </div>
    </div>
  );
}
