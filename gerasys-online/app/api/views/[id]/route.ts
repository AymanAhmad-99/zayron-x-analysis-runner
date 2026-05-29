import { NextResponse } from "next/server";
import { incrementArticleViews } from "@/lib/db/queries/articles";
import { viewsLimiter, checkRateLimit } from "@/lib/cache/ratelimit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit: 30 requests per 60s per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const { allowed } = await checkRateLimit(viewsLimiter, `views:${ip}`);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { id } = await params;
    await incrementArticleViews(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API /views/[id] error:", error);
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 });
  }
}
