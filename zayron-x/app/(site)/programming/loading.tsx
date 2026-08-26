export default function ProgrammingLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 animate-[fade-in_0.3s_ease-out]">
      <div className="mb-10">
        <div className="skeleton h-3 w-32 mb-3" />
        <div className="skeleton h-8 w-64 mb-2" />
        <div className="skeleton h-4 w-80" />
      </div>
      {/* Lang grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="card-article p-5 flex flex-col items-center text-center"
            style={{ animation: `fade-up 0.4s ease-out ${i * 50}ms both` }}
          >
            <div className="skeleton w-12 h-12 rounded-xl mb-3" />
            <div className="skeleton h-4 w-20 mb-1" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
      {/* Articles */}
      <div className="skeleton h-3 w-32 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="card-article overflow-hidden"
            style={{ animation: `fade-up 0.5s ease-out ${i * 60}ms both` }}
          >
            <div className="skeleton aspect-[16/9] w-full rounded-none" />
            <div className="p-5 space-y-2">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-3 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
