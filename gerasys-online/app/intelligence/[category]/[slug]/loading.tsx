import { SkeletonLoader } from '@/components/ui/SkeletonLoader';

export default function IntelligenceArticleLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <section className="relative border-b border-[#E2E8F0]">
        <div className="relative max-w-4xl mx-auto px-8 py-16 lg:py-20">
          <SkeletonLoader variant="text" className="h-3 w-64 mb-6" />
          <SkeletonLoader variant="text" className="h-4 w-40 mb-5" />
          <SkeletonLoader variant="text" className="h-10 w-full mb-3" />
          <SkeletonLoader variant="text" className="h-10 w-3/4 mb-4" />
          <SkeletonLoader variant="text" className="h-6 w-2/3 mb-8" />
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-[#E2E8F0] animate-pulse" />
            <div>
              <SkeletonLoader variant="text" className="h-4 w-32 mb-1" />
              <SkeletonLoader variant="text" className="h-3 w-48" />
            </div>
          </div>
        </div>
      </section>

      {/* Image skeleton */}
      <div className="max-w-4xl mx-auto px-8 -mt-8 relative z-10">
        <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-lg shadow-black/[0.03]">
          <SkeletonLoader variant="text" className="aspect-[16/9] w-full rounded-none" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-6xl mx-auto px-8 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-14">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 lg:p-14 shadow-sm space-y-4">
            <SkeletonLoader variant="text" className="h-6 w-full" />
            <SkeletonLoader variant="text" className="h-6 w-5/6" />
            <SkeletonLoader variant="text" className="h-6 w-4/6" />
            <div className="py-2" />
            <SkeletonLoader variant="text" className="h-4 w-full" />
            <SkeletonLoader variant="text" className="h-4 w-full" />
            <SkeletonLoader variant="text" className="h-4 w-5/6" />
            <SkeletonLoader variant="text" className="h-4 w-full" />
            <SkeletonLoader variant="text" className="h-4 w-3/4" />
            <div className="py-2" />
            <SkeletonLoader variant="text" className="h-4 w-full" />
            <SkeletonLoader variant="text" className="h-4 w-full" />
            <SkeletonLoader variant="text" className="h-4 w-4/5" />
          </div>
          <div className="hidden lg:block space-y-6">
            <SkeletonLoader variant="card" />
          </div>
        </div>
      </div>
    </div>
  );
}
