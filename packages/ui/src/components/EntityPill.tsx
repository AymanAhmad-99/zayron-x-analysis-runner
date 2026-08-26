import React from 'react';

export type EntityType = 'actor' | 'cve' | 'malware' | 'ioc' | 'campaign' | 'vulnerability';

interface EntityPillProps {
  type: EntityType;
  value: string;
  href?: string;
  className?: string;
}

const typeConfig: Record<EntityType, { prefix: string; text: string; border: string }> = {
  cve: {
    prefix: 'CVE',
    text: 'text-[#D92D20]',
    border: 'border-[#D92D20]/30',
  },
  actor: {
    prefix: 'ACTOR',
    text: 'text-purple-700',
    border: 'border-purple-700/30',
  },
  malware: {
    prefix: 'MALWARE',
    text: 'text-amber-700',
    border: 'border-amber-700/30',
  },
  ioc: {
    prefix: 'IOC',
    text: 'text-[#111111]',
    border: 'border-[#111111]/20',
  },
  campaign: {
    prefix: 'CAMPAIGN',
    text: 'text-blue-700',
    border: 'border-blue-700/30',
  },
  vulnerability: {
    prefix: 'CVE',
    text: 'text-[#D92D20]',
    border: 'border-[#D92D20]/30',
  },
};

export const EntityPill: React.FC<EntityPillProps> = ({ type, value, href, className = '' }) => {
  const config = typeConfig[type] || typeConfig.ioc;

  const content = (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none font-sans text-xs border bg-white ${config.text} ${config.border} hover:border-current transition-colors ${className}`}
    >
      <span className="text-[10px] uppercase opacity-70 font-bold tracking-widest">{config.prefix}:</span>
      <span className="font-bold tracking-tight">{value}</span>
    </span>
  );

  if (href) {
    return (
      <a href={href} className="inline-block no-underline">
        {content}
      </a>
    );
  }

  return content;
};
