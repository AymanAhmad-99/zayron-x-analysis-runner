import React from 'react';

export type JobStatusState = 'new' | 'featured' | 'expired' | 'verified';

export interface JobCardProps {
  id: string;
  title: string;
  companyName: string;
  locationType: 'REMOTE' | 'HYBRID' | 'ONSITE';
  locationCountry?: string;
  employmentType: string;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  isFeatured?: boolean;
  isVerified?: boolean;
  applyUrl: string;
  className?: string;
}

export const JobCard: React.FC<JobCardProps> = ({
  title,
  companyName,
  locationType,
  locationCountry,
  employmentType,
  minSalary,
  maxSalary,
  currency = 'USD',
  isFeatured = false,
  isVerified = false,
  applyUrl,
  className = '',
}) => {
  return (
    <div
      className={`p-5 bg-white dark:bg-[#101214] border rounded-lg transition-all shadow-xs space-y-3 ${
        isFeatured
          ? 'border-[#FF6B00]/40 bg-orange-50/20 dark:bg-orange-950/10'
          : 'border-[#EAEAEA] dark:border-neutral-800 hover:border-neutral-400'
      } ${className}`}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-[#666666] dark:text-neutral-400">
              {companyName}
            </span>
            {isVerified && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                VERIFIED EMPLOYER
              </span>
            )}
          </div>
          <h3 className="text-base font-sans font-bold text-[#111111] dark:text-white mt-1">
            {title}
          </h3>
        </div>

        {isFeatured && (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase bg-[#FF6B00] text-white rounded">
            FEATURED
          </span>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#666666] dark:text-neutral-400">
        <span className="px-2 py-0.5 rounded bg-[#F7F7F5] dark:bg-neutral-800 border border-[#EAEAEA] dark:border-neutral-700">
          {locationType} {locationCountry ? `(${locationCountry})` : ''}
        </span>
        <span className="px-2 py-0.5 rounded bg-[#F7F7F5] dark:bg-neutral-800 border border-[#EAEAEA] dark:border-neutral-700">
          {employmentType}
        </span>
        {minSalary && maxSalary && (
          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
            {currency} {minSalary.toLocaleString()} - {maxSalary.toLocaleString()}
          </span>
        )}
      </div>

      <footer className="pt-2 flex justify-end">
        <a
          href={applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded text-xs font-mono font-bold bg-[#111111] hover:bg-[#FF6B00] text-white transition-colors"
        >
          APPLY NOW &rarr;
        </a>
      </footer>
    </div>
  );
};
