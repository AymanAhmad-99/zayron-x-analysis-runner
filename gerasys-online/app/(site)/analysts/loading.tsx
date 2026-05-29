export default function AnalystsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 animate-[fade-in_0.3s_ease-out]">
      <div className="mb-10">
        <div className="skeleton h-3 w-20 mb-3" />
        <div className="skeleton h-8 w-64 mb-2" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-article p-6" style={{ animation: `fade-up 0.5s ease-out ${i * 60}ms both` }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="skeleton w-14 h-14 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-3 w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-5/6" />
              <div className="skeleton h-3 w-4/6" />
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-black/[0.05]">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
