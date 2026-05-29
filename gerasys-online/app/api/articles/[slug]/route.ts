import { NextResponse } from "next/server";
import { getArticleBySlug } from "@/lib/db/queries/articles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(article);
  } catch (error) {
    console.error("API /articles/[slug] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}
