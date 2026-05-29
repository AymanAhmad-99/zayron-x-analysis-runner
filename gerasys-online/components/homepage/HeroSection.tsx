import { type Article } from "@/lib/db/schema";
import Link from "next/link";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { formatDate } from "@/lib/utils/formatDate";
import { getSmartFallbackImage } from "@/lib/utils/fallbackImages";
import { ArrowRight } from "@/lib/icons";

interface HeroSectionProps {
  primary: Article | null;
  secondary: Article[];
}

export function HeroSection({ primary, secondary }: HeroSectionProps) {
  return (
    <section className="max-w-7xl mx-auto px-6 pt-10 pb-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Primary — spans 2 columns */}
        {primary && (
          <Link
            href={`/intelligence/${(primary.category ?? "intelligence").toLowerCase().replace(/\s+/g, "-")}/${primary.slug}`}
            className="lg:col-span-2 group card-article flex flex-col border-r-0 lg:border-r"
          >
            <div className="img-intel">
              <img
                src={getSmartFallbackImage(primary)}
                alt={primary.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 lg:p-10 flex flex-col flex-1">
              <CategoryBadge category={primary.category} className="mb-4" />
              <h1 className="font-display text-3xl lg:text-hero font-black text-black leading-[1.05] text-balance">
                {primary.title}
              </h1>
              <p className="text-[#444444] mt-4 line-clamp-2 font-body text-base leading-relaxed">
                {primary.excerpt ?? primary.content.substring(0, 240)}
              </p>

              <div className="flex items-center gap-3 mt-auto pt-6 text-xs text-[#666666] font-mono uppercase tracking-wider">
                <span className="text-black font-bold">{primary.author}</span>
                <span>//</span>
                <span>{formatDate(primary.createdAt!)}</span>
                <span>//</span>
                <span>{primary.readTime} min read</span>
                <span className="ml-auto flex items-center gap-1 text-black opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                  Read <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Secondary stack — 1 column, separated by 1px borders */}
        <aside className="flex flex-col">
          {secondary.slice(0, 3).map((article, i) => (
            <Link
              key={article.id}
              href={`/intelligence/${(article.category ?? "intelligence").toLowerCase().replace(/\s+/g, "-")}/${article.slug}`}
              className={`card-article p-5 flex gap-4 items-start group ${
                i < 2 ? "border-b-0" : ""
              }`}
            >
              <div className="w-20 h-20 shrink-0 overflow-hidden">
                <img
                  src={getSmartFallbackImage(article)}
                  alt=""
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  loading="lazy"
                />
              </div>
              <div className="min-w-0 flex-1">
                <CategoryBadge category={article.category} className="mb-2" />
                <h3 className="text-sm font-bold text-black line-clamp-2 group-hover:underline transition-all leading-snug font-display">
                  {article.title}
                </h3>
                <span className="text-[10px] text-[#666666] mt-2 block font-mono uppercase tracking-wider">
                  {article.author} // {formatDate(article.createdAt!)}
                </span>
              </div>
            </Link>
          ))}
        </aside>
      </div>
    </section>
  );
}
