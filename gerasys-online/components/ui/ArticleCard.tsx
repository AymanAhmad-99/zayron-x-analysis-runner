import type { Article } from "@/lib/db/schema";
import Link from "next/link";
import { formatDate } from "@/lib/utils/formatDate";
import { getSmartFallbackImage } from "@/lib/utils/fallbackImages";
import { formatCategoryLabel } from "@/lib/utils/slugify";

interface ArticleCardProps {
  article: Article;
  variant?: "default" | "hero" | "compact" | "list";
}

export function ArticleCard({ article, variant = "default" }: ArticleCardProps) {
  const href = `/intelligence/${(article.category ?? "intelligence").toLowerCase().replace(/\s+/g, "-")}/${article.slug}`;

  /* ── Hero — full editorial spread (large, 2-col featured) ── */
  if (variant === "hero") {
    return (
      <Link href={href} className="group block">
        {/* Image — full bleed, no rounded corners */}
        <div className="w-full overflow-hidden mb-5" style={{ aspectRatio: "21/9" }}>
          <img
            src={getSmartFallbackImage(article)}
            alt={article.title}
            className="w-full h-full object-cover grayscale-[8%] transition-all duration-200 ease-in-out"
          />
        </div>

        <span className="eyebrow text-[0.62rem] mb-2 block">{formatCategoryLabel(article.category)}</span>

        <h2
          className="headline text-balance group-hover:italic transition-all duration-200"
          style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.8rem)" }}
        >
          {article.title}
        </h2>

        <p className="text-[#444444] mt-3 leading-[1.75] line-clamp-3 font-sans text-[0.9rem] max-w-[60ch]">
          {article.excerpt ?? article.content.substring(0, 200)}
        </p>

        <div className="flex items-center gap-3 mt-4">
          <span className="meta">By {article.author}</span>
          <span className="meta text-[#CCCCCC]">·</span>
          <span className="meta">{article.readTime} min read</span>
          <span className="meta text-[#CCCCCC]">·</span>
          <span className="meta">{formatDate(article.createdAt!)}</span>
        </div>
      </Link>
    );
  }

  /* ── Compact — horizontal thumbnail + title ── */
  if (variant === "compact") {
    return (
      <Link href={href} className="group flex items-start gap-3 py-4 border-b border-black/10 last:border-b-0">
        <div className="w-16 h-16 overflow-hidden shrink-0 bg-[#E8E8E8]">
          <img
            src={getSmartFallbackImage(article)}
            alt=""
            className="w-full h-full object-cover grayscale-[8%] transition-all duration-200 ease-in-out"
            loading="lazy"
          />
        </div>
        <div className="min-w-0 flex-1">
          <span className="eyebrow text-[0.58rem] mb-1 block">{formatCategoryLabel(article.category)}</span>
          <h3 className="headline text-base leading-snug group-hover:italic transition-all line-clamp-2">
            {article.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="meta text-[0.6rem]">{article.author}</span>
            <span className="meta text-[0.6rem] text-[#CCC]">·</span>
            <span className="meta text-[0.6rem]">{formatDate(article.createdAt!)}</span>
          </div>
        </div>
      </Link>
    );
  }

  /* ── List — numbered headline-only row ── */
  if (variant === "list") {
    return (
      <Link href={href} className="group block py-4 border-b border-black/10 last:border-b-0">
        <span className="eyebrow text-[0.58rem] mb-1 block">{formatCategoryLabel(article.category)}</span>
        <h3 className="headline text-lg leading-snug group-hover:italic transition-all line-clamp-2">
          {article.title}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="meta text-[0.6rem]">{article.author}</span>
          <span className="meta text-[0.6rem] text-[#CCC]">·</span>
          <span className="meta text-[0.6rem]">{formatDate(article.createdAt!)}</span>
        </div>
      </Link>
    );
  }

  /* ── Default — pure editorial column entry ──
     No card borders, no backgrounds, no shadows.
     Image → category → headline → excerpt → byline.
  ── */
  return (
    <Link href={href} className="group block">
      {/* Image — 16:9, slight grayscale toning */}
      <div className="w-full overflow-hidden mb-4" style={{ aspectRatio: "16/9" }}>
        <img
          src={getSmartFallbackImage(article)}
          alt={article.title}
          className="w-full h-full object-cover grayscale-[8%] transition-all duration-200 ease-in-out"
          loading="lazy"
        />
      </div>

      {/* Category eyebrow */}
      <span className="eyebrow text-[0.62rem] mb-2 block">{formatCategoryLabel(article.category)}</span>

      {/* Headline — serif, hover → italic */}
      <h3
        className="headline leading-snug text-balance group-hover:italic transition-all duration-200"
        style={{ fontSize: "clamp(1rem, 1.6vw, 1.3rem)" }}
      >
        {article.title}
      </h3>

      {/* Excerpt */}
      <p className="text-[#555555] mt-2 text-[0.85rem] leading-[1.7] line-clamp-3 font-sans">
        {article.excerpt ?? article.content.substring(0, 120) + "…"}
      </p>

      {/* Byline */}
      <div className="flex items-center gap-2 mt-3">
        <span className="meta text-[0.62rem]">{article.author}</span>
        <span className="meta text-[0.62rem] text-[#CCCCCC]">·</span>
        <span className="meta text-[0.62rem]">{article.readTime} min</span>
        <span className="meta text-[0.62rem] text-[#CCCCCC]">·</span>
        <span className="meta text-[0.62rem]">{formatDate(article.createdAt!)}</span>
      </div>
    </Link>
  );
}
