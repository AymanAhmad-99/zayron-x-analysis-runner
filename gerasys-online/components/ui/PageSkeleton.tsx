/** Shared skeleton shimmer block */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Full-page skeleton for list/grid pages */
export function PageSkeleton({ cards = 6, title = true }: { cards?: number; title?: boolean }) {
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 animate-[fade-in_0.4s_ease-out]">
      {title && (
        <div className="mb-10">
          <Skeleton className="h-3 w-32 mb-3" />
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="card-article overflow-hidden"
            style={{ animationDelay: `${i * 60}ms`, animation: "fade-up 0.5s ease-out both" }}
          >
            <Skeleton className="aspect-[16/9] w-full rounded-none" />
            <div className="p-5 space-y-2.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3 w-full mt-1" />
              <Skeleton className="h-3 w-3/4" />
              <div className="pt-3 border-t border-black/[0.05] flex gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-14 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
