export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getArticleBySlug } from "@/lib/supabase/queries/articles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return NextResponse.json(article, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error("API /articles/[slug] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}
