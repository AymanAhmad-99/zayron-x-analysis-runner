import type { Article } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils/formatDate";
import { getSmartFallbackImage } from "@/lib/utils/fallbackImages";
import { formatCategoryLabel } from "@/lib/utils/slugify";

interface ArticleCardProps {
  article: Article;
  variant?: "default" | "hero" | "compact" | "list";
}

function ArticleImage({ article, className }: { article: Article; className?: string }) {
  return (
    <Image
      src={getSmartFallbackImage(article)}
      alt={article.title}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className={className}
    />
  );
}

export function ArticleCard({ article, variant = "default" }: ArticleCardProps) {
  const href = `/intelligence/${(article.category ?? "intelligence").toLowerCase().replace(/\s+/g, "-")}/${article.slug}`;
  const titleId = `article-title-${article.slug}`;

  if (variant === "hero") {
    return (
      <Link href={href} className="group block" role="article" aria-labelledby={titleId}>
        <div className="relative w-full overflow-hidden mb-5" style={{ aspectRatio: "21/9" }}>
          <ArticleImage article={article} className="object-cover grayscale-[8%] transition-all duration-200 ease-in-out" />
        </div>
        <span className="eyebrow text-[0.62rem] mb-2 block">{formatCategoryLabel(article.category)}</span>
        <h2 id={titleId} className="headline text-balance group-hover:italic transition-all duration-200" style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.8rem)" }}>
          {article.title}
        </h2>
        <p className="text-[#444444] dark:text-slate-400 mt-3 leading-[1.75] line-clamp-3 font-sans text-[0.9rem] max-w-[60ch]">
          {article.excerpt ?? article.content.substring(0, 200)}
        </p>
        <div className="flex items-center gap-3 mt-4">
          <span className="meta dark:text-slate-500">By {article.author}</span>
          <span className="meta text-[#CCCCCC] dark:text-slate-600">·</span>
          <span className="meta dark:text-slate-500">{article.readTime} min read</span>
          <span className="meta text-[#CCCCCC] dark:text-slate-600">·</span>
          <span className="meta dark:text-slate-500">{formatDate(article.createdAt!)}</span>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link href={href} className="group flex items-start gap-3 py-4 border-b border-black/10 dark:border-slate-800 last:border-b-0" role="article" aria-labelledby={titleId}>
        <div className="relative w-16 h-16 overflow-hidden shrink-0 bg-[#E8E8E8] dark:bg-slate-800">
          <Image
            src={getSmartFallbackImage(article)}
            alt=""
            fill
            sizes="64px"
            className="object-cover grayscale-[8%] transition-all duration-200 ease-in-out"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 flex-1">
          <span className="eyebrow text-[0.58rem] mb-1 block">{formatCategoryLabel(article.category)}</span>
          <h3 id={titleId} className="headline dark:text-slate-200 text-base leading-snug group-hover:italic transition-all line-clamp-2">
            {article.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="meta text-[0.6rem] dark:text-slate-500">{article.author}</span>
            <span className="meta text-[0.6rem] text-[#CCC] dark:text-slate-600">·</span>
            <span className="meta text-[0.6rem] dark:text-slate-500">{formatDate(article.createdAt!)}</span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "list") {
    return (
      <Link href={href} className="group block py-4 border-b border-black/10 dark:border-slate-800 last:border-b-0" role="article" aria-labelledby={titleId}>
        <span className="eyebrow text-[0.58rem] mb-1 block">{formatCategoryLabel(article.category)}</span>
        <h3 id={titleId} className="headline dark:text-slate-200 text-lg leading-snug group-hover:italic transition-all line-clamp-2">
          {article.title}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="meta text-[0.6rem] dark:text-slate-500">{article.author}</span>
          <span className="meta text-[0.6rem] text-[#CCC] dark:text-slate-600">·</span>
          <span className="meta text-[0.6rem] dark:text-slate-500">{formatDate(article.createdAt!)}</span>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="group block" role="article" aria-labelledby={titleId}>
      <div className="relative w-full overflow-hidden mb-4" style={{ aspectRatio: "16/9" }}>
        <ArticleImage article={article} className="object-cover grayscale-[8%] transition-all duration-200 ease-in-out" />
      </div>
      <span className="eyebrow text-[0.62rem] mb-2 block">{formatCategoryLabel(article.category)}</span>
      <h3 id={titleId} className="headline dark:text-slate-200 leading-snug text-balance group-hover:italic transition-all duration-200" style={{ fontSize: "clamp(1rem, 1.6vw, 1.3rem)" }}>
        {article.title}
      </h3>
      <p className="text-[#555555] dark:text-slate-400 mt-2 text-[0.85rem] leading-[1.7] line-clamp-3 font-sans">
        {article.excerpt ?? article.content.substring(0, 120) + "…"}
      </p>
      <div className="flex items-center gap-2 mt-3">
        <span className="meta text-[0.62rem] dark:text-slate-500">{article.author}</span>
        <span className="meta text-[0.62rem] text-[#CCCCCC] dark:text-slate-600">·</span>
        <span className="meta text-[0.62rem] dark:text-slate-500">{article.readTime} min</span>
        <span className="meta text-[0.62rem] text-[#CCCCCC] dark:text-slate-600">·</span>
        <span className="meta text-[0.62rem] dark:text-slate-500">{formatDate(article.createdAt!)}</span>
      </div>
    </Link>
  );
}
