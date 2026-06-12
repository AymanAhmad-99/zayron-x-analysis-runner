'use client';

import CyberArticleImage from '@/components/ui/CyberArticleImage';
import type { Article } from '@/lib/types';

interface Article3DImageProps {
  article: Article;
}

export function Article3DImage({ article }: Article3DImageProps) {
  return (
    <CyberArticleImage
      title={article.title}
      category={article.category}
      articleId={article.id}
      featuredImage={article.image_url}
      className="w-full rounded-2xl border border-neutral-200/60 dark:border-slate-800 bg-black aspect-[21/9]"
      priority
    />
  );
}
