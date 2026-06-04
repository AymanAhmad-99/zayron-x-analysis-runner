import { NextResponse } from "next/server";
import { incrementArticleViews } from "@/lib/db/queries/articles";
import { viewsLimiter, checkRateLimit, getClientIp } from "@/lib/cache/ratelimit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);

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
