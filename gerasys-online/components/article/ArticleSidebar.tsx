import { type Article } from "@/lib/types";
import Link from "next/link";
import { TrendingWidget } from "@/components/homepage/TrendingWidget";

interface ArticleSidebarProps {
  trending: Article[];
}

export function ArticleSidebar({ trending }: ArticleSidebarProps) {
  return (
    <aside className="space-y-0">
      {/* Intel Briefing CTA */}
      <div className="bg-white border border-[#222222] p-5 text-center">
        <h3 className="font-display font-black text-black text-lg">
          Intelligence Briefing
        </h3>
        <p className="text-xs text-[#444444] mt-2 font-ui leading-relaxed">
          Daily threat intelligence delivered to your inbox. No noise.
        </p>
        <Link
          href="#newsletter"
          className="mt-3 inline-block text-sm font-bold bg-black text-white px-5 py-2.5 hover:bg-[#222222] transition-colors font-ui"
        >
          Subscribe Free
        </Link>
      </div>

      {/* Trending */}
      <TrendingWidget articles={trending} />

      {/* TLP Notice */}
      <div className="border border-[#222222] p-4 text-center bg-white">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-[#666666]">
          TLP:AMBER
        </span>
        <p className="text-[10px] text-[#666666] mt-1 font-mono">
          Limited distribution. Not for public release.
        </p>
      </div>
    </aside>
  );
}
