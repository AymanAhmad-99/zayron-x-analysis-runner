export default function ToolsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 animate-[fade-in_0.3s_ease-out]">
      <div className="mb-10">
        <div className="skeleton h-3 w-24 mb-3" />
        <div className="skeleton h-8 w-52 mb-2" />
        <div className="skeleton h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="card-article p-5" style={{ animation: `fade-up 0.5s ease-out ${i * 50}ms both` }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="skeleton w-10 h-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-3 w-20" />
              </div>
              <div className="skeleton h-5 w-12 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-4/5" />
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-black/[0.05]">
              <div className="skeleton h-6 w-20 rounded" />
              <div className="skeleton h-6 w-16 rounded ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
