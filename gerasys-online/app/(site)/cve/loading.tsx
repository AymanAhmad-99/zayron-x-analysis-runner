export default function CVELoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 animate-[fade-in_0.3s_ease-out]">
      <div className="mb-10">
        <div className="skeleton h-3 w-28 mb-3" />
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-80" />
      </div>
      {/* Filter bar skeleton */}
      <div className="flex gap-3 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-24 rounded-lg" />
        ))}
      </div>
      {/* CVE list skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="card-article p-4 flex items-start gap-4"
            style={{ animation: `fade-up 0.4s ease-out ${i * 40}ms both` }}
          >
            <div className="skeleton h-6 w-16 rounded shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-3/4" />
            </div>
            <div className="skeleton h-5 w-14 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
