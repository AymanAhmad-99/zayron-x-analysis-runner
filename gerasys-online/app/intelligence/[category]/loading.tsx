import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function IntelligenceLoading() {
  return (
    <div className="min-h-[80vh]">
      {/* Hero skeleton */}
      <section className="relative border-b border-[#E2E8F0]">
        <div className="relative max-w-7xl mx-auto px-8 py-20">
          <SkeletonLoader variant="text" className="h-4 w-32 mb-4" />
          <SkeletonLoader variant="text" className="h-12 w-3/4 mb-3" />
          <SkeletonLoader variant="text" className="h-6 w-1/2 mb-6" />
          <SkeletonLoader variant="text" className="h-8 w-24" />
        </div>
      </section>

      {/* Grid skeleton */}
      <section className="max-w-7xl mx-auto px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader
              key={i}
              variant="card"
              className="animate-[fade-in-up_0.6s_ease-out_both]"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
