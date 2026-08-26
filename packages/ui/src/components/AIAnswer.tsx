import React from 'react';

export type AIAnswerState = 'streaming' | 'complete' | 'error';

interface AIAnswerProps {
  query?: string;
  answer: string;
  state?: AIAnswerState;
  confidence?: number;
  citations?: Array<{ title: string; url?: string; sourceName: string }>;
  className?: string;
}

export const AIAnswer: React.FC<AIAnswerProps> = ({
  query,
  answer,
  state = 'complete',
  confidence,
  citations = [],
  className = '',
}) => {
  return (
    <div className={`p-5 rounded-lg border border-[#00A8FF]/30 bg-[#F7F7F5] dark:bg-neutral-900/90 space-y-3.5 ${className}`}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00A8FF] animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-[#00A8FF] uppercase">
            ZAYRON-X AI Copilot Brief
          </span>
        </div>
        {confidence !== undefined && (
          <span className="text-[11px] font-mono text-[#666666] dark:text-neutral-400">
            Grounding Confidence: {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </header>

      {query && (
        <div className="text-xs font-mono text-[#666666] dark:text-neutral-400 pb-1 border-b border-[#EAEAEA] dark:border-neutral-800">
          Query: "{query}"
        </div>
      )}

      <div className="text-sm font-sans text-[#111111] dark:text-neutral-100 leading-relaxed space-y-2 whitespace-pre-wrap">
        {answer}
        {state === 'streaming' && (
          <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-[#00A8FF] animate-pulse" />
        )}
      </div>

      {citations.length > 0 && (
        <footer className="pt-2 border-t border-[#EAEAEA] dark:border-neutral-800 space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] dark:text-neutral-400">
            Cited Evidence Records ({citations.length}):
          </span>
          <div className="flex flex-wrap gap-2">
            {citations.map((cit, idx) => (
              <a
                key={idx}
                href={cit.url || '#'}
                className="text-xs font-mono text-[#00A8FF] hover:underline bg-white dark:bg-neutral-800 px-2 py-0.5 rounded border border-[#EAEAEA] dark:border-neutral-700"
              >
                [{idx + 1}] {cit.sourceName}: {cit.title}
              </a>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
};
