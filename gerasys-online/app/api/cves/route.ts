import { NextResponse } from "next/server";
import { getCVEs, getCVECount, getCVEsBySeverity } from "@/lib/supabase/queries/cves";
import { getCachedOrFetch } from "@/lib/cache/redis";
import { cvesLimiter, checkRateLimit, getClientIp } from "@/lib/cache/ratelimit";

export async function GET(request: Request) {
  try {
    // Rate limit: 120 requests per 60s per IP
    const ip = getClientIp(request);
    const { allowed, remaining } = await checkRateLimit(cvesLimiter, `cves:${ip}`);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Remaining": String(remaining),
          },
        },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 25;
    const severity = searchParams.get("severity");

    const cacheKey = `cves:feed:p_${page}:l_${limit}:s_${severity || "all"}`;
    const CACHE_TTL_SECONDS = 60;

    const result = await getCachedOrFetch<{ cves: any[]; total: number }>(
      process.env,
      cacheKey,
      async () => {
        console.log(`[CACHE MISS fallback] Executing direct PostgreSQL queries for ${cacheKey}...`);

        let cvesList;
        if (severity) {
          cvesList = await getCVEsBySeverity(severity, limit);
        } else {
          cvesList = await getCVEs(page, limit);
        }

        const totalCount = await getCVECount();
        return { cves: cvesList, total: totalCount };
      },
      CACHE_TTL_SECONDS,
    );

    return NextResponse.json(
      {
        cves: result.cves,
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          'X-RateLimit-Remaining': String(remaining),
        },
      },
    );
  } catch (error: any) {
    console.error("[CVE FEED API FAILURE] Fatal routing incident:", error);

    return NextResponse.json(
      {
        error: "System Integrity Alert: Failed to process external CTI threat feed request.",
        code: "INTERNAL_SERVER_ERROR",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
