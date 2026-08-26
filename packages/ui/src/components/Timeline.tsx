import React from 'react';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description?: string;
  isHighlighted?: boolean;
  type?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ events, className = '' }) => {
  return (
    <div className={`relative pl-6 space-y-6 border-l border-[#111111]/20 ${className}`}>
      {events.map((evt) => (
        <div key={evt.id} className="relative group">
          <span
            className={`absolute -left-[28px] top-1 w-2.5 h-2.5 rounded-none border border-white ${
              evt.isHighlighted ? 'bg-[#FF6B00]' : 'bg-[#111111]'
            }`}
          />
          <time className="block text-[10px] font-mono font-bold tracking-widest uppercase text-[#2D2D2D]">
            {new Date(evt.timestamp).toLocaleString(undefined, { dateStyle: 'medium' })}
          </time>
          <h4 className="text-sm font-sans font-bold text-[#111111] mt-0.5 group-hover:text-[#FF6B00] transition-colors">
            {evt.title}
          </h4>
          {evt.description && (
            <p className="text-sm font-sans text-[#2D2D2D] mt-1 leading-relaxed">
              {evt.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
