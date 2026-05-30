import { NextResponse } from "next/server";
import { searchArticles } from "@/lib/db/queries/articles";
import { searchCVEs } from "@/lib/db/queries/cves";
import { searchLimiter, checkRateLimit } from "@/lib/cache/ratelimit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const type = searchParams.get("type") ?? "all";

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Rate limit: 10 requests per 60s per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const { allowed, remaining } = await checkRateLimit(
      searchLimiter,
      `search:${ip}`
    );

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many search requests. Please wait a moment." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Remaining": String(remaining),
          },
        }
      );
    }

    let articles: Awaited<ReturnType<typeof searchArticles>> = [];
    let cves: Awaited<ReturnType<typeof searchCVEs>> = [];

    if (type === "all" || type === "articles") {
      articles = await searchArticles(query);
    }
    if (type === "all" || type === "cves") {
      cves = await searchCVEs(query);
    }

    return NextResponse.json(
      { articles, cves, query },
      { headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (error) {
    console.error("API /search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
