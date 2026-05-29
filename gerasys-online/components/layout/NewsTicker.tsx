import { getBreakingArticles } from "@/lib/db/queries/articles";

async function getTickerItems() {
  try {
    const breaking = await getBreakingArticles(12);
    if (breaking.length === 0) return null;
    return breaking.map((a) => ({
      id:    a.id,
      label: a.category ?? "Intelligence",
      title: a.title,
      slug:  a.slug,
    }));
  } catch {
    return null;
  }
}

export async function NewsTicker() {
  const items = await getTickerItems();

  if (!items) {
    return (
      <div className="bg-[#111111] h-7 flex items-center px-5 overflow-hidden">
        <span className="meta text-[0.58rem] text-[#FAFAFA] mr-5 shrink-0 uppercase tracking-[0.18em]">
          ● Intelligence Feed
        </span>
        <span className="meta text-[0.58rem] text-[#888888]">
          Monitoring global threat landscape…
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] h-7 overflow-hidden relative flex items-center">
      {/* Label */}
      <div className="shrink-0 z-10 flex items-center gap-2 px-5 bg-[#111111] border-r border-white/10 h-full">
        <span className="live-dot" style={{ width: "5px", height: "5px", background: "#B22222" }} />
        <span className="meta text-[0.58rem] text-[#FAFAFA] uppercase tracking-[0.2em] whitespace-nowrap">
          Live Intelligence
        </span>
      </div>

      {/* Scrolling items */}
      <div className="flex-1 overflow-hidden">
        <div className="ticker-track">
          {[...items, ...items].map((item, i) => (
            <a
              key={`${item.id}-${i}`}
              href={`/intelligence/${item.label.toLowerCase().replace(/\s+/g, "-")}/${item.slug}`}
              className="shrink-0 flex items-center gap-2.5 mr-10 text-[0.7rem] text-[#AAAAAA] hover:text-white transition-colors font-sans"
            >
              <span className="w-px h-3 bg-white/20 shrink-0" />
              <span className="meta text-[0.58rem] text-[#888] whitespace-nowrap uppercase tracking-wider">
                {item.label}
              </span>
              <span className="text-white/20 text-[0.6rem]">|</span>
              <span className="whitespace-nowrap max-w-[320px] overflow-hidden">{item.title}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
