export default function SearchLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 animate-[fade-in_0.3s_ease-out]">
      <div className="skeleton h-12 w-full rounded-xl mb-8" />
      <div className="skeleton h-3 w-40 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-article p-5 flex gap-4" style={{ animation: `fade-up 0.4s ease-out ${i * 60}ms both` }}>
            <div className="skeleton w-20 h-20 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-4 w-5/6" />
              <div className="skeleton h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
