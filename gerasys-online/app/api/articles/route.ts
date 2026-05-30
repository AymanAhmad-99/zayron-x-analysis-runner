export const runtime = 'edge';
import { NextResponse } from "next/server";
import { getArticles, getArticleCount } from "@/lib/db/queries/articles";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 12;

    const [articles, total] = await Promise.all([
      getArticles(page, limit),
      getArticleCount(),
    ]);

    return NextResponse.json({
      articles,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("API /articles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}
