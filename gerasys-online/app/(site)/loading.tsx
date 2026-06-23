export default function SiteLoading() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[var(--color-bg)]">
      {/* Wordmark */}
      <div className="mb-10 text-center">
        <span
          className="text-[2rem] font-black uppercase select-none tracking-[-0.08em] inline-flex items-center"
          aria-label="ZAYRON-X"
        >
          <span className="text-[var(--color-text)]">ZAYRON</span>
          <span className="text-[var(--color-accent-intelligence)]">-X</span>
        </span>
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)] font-mono mt-2">
          Cyber Threat Intelligence
        </p>
      </div>

      {/* Slim progress bar */}
      <div className="w-48 h-px bg-[var(--color-border)] overflow-hidden rounded-full">
        <div
          className="h-full bg-[var(--color-accent-intelligence)] rounded-full"
          style={{
            animation: 'loading-sweep 1.4s ease-in-out infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes loading-sweep {
          0%   { width: 0%; margin-left: 0%; }
          50%  { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
