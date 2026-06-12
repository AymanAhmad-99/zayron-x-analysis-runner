import { SkeletonLoader } from '@/components/ui/SkeletonLoader';

export default function SiteLoading() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 bg-black bg-grid">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="logo-wordmark text-6xl lg:text-8xl select-none animate-[glow-pulse_3s_ease-in-out_infinite]">
          <span className="logo-zayron">ZAYRON</span>
          <span className="logo-dash">-</span>
          <span className="logo-x">X</span>
        </span>
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#555555] font-mono mt-3">
          ENTERPRISE THREAT INTELLIGENCE
        </p>
      </div>

      {/* Scanning indicator */}
      <div className="flex items-center gap-3 mb-10">
        <div className="relative w-5 h-5">
          <div className="absolute inset-0 border-2 border-[#1F1F1F]" />
          <div className="absolute inset-0 border-2 border-transparent border-t-[#E50000] animate-spin" />
        </div>
        <span className="text-sm text-[#555555] font-mono tracking-wider animate-pulse uppercase">
          Loading Intelligence...
        </span>
      </div>

      {/* Skeleton grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-[#1F1F1F] max-w-7xl w-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonLoader
            key={i}
            variant="card"
            className="animate-[fade-in-up_0.6s_ease-out_both]"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
