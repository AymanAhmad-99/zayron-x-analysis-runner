export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getArticleBySlug } from "@/lib/db/queries/articles";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let article: Awaited<ReturnType<typeof getArticleBySlug>> = null;
  try {
    article = await getArticleBySlug(slug);
  } catch {}
  if (!article) return { title: "Report Not Found" };

  return {
    title: article.title,
    description: article.excerpt ?? article.content.substring(0, 160),
  };
}

export default async function ArticleRedirectPage({ params }: Props) {
  const { slug } = await params;
  let article: Awaited<ReturnType<typeof getArticleBySlug>> = null;
  try {
    article = await getArticleBySlug(slug);
  } catch {}
  if (!article) notFound();

  // Redirect old /article/[slug] to /intelligence/[category]/[slug]
  const category = (article.category ?? "intelligence").toLowerCase().replace(/\s+/g, "-");
  redirect(`/intelligence/${category}/${article.slug}`);
}
