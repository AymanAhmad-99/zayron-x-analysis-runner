import { NextResponse } from "next/server";
import { getCVEs, getCVECount, getCVEsBySeverity } from "@/lib/db/queries/cves";
import { getCachedOrFetch } from "@/lib/cache/redis-client";

// Enforce execution on the high-performance Vercel/Cloudflare Edge Runtime
export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 25;
    const severity = searchParams.get("severity");

    // Establish a structured, parameterized cache key for the external feed request
    const cacheKey = `cves:feed:p_${page}:l_${limit}:s_${severity || "all"}`;

    // TTL matches the Edge s-maxage threshold (60 seconds)
    const CACHE_TTL_SECONDS = 60;

    // Layer 3 integration: Execute with a resilient circuit breaker cached wrapper.
    // If Redis is active, it serves the feed instantly (TTFB < 50ms).
    // If Redis times out/fails, it gracefully falls back to direct Postgres query without user failure.
    const result = await getCachedOrFetch<{ cves: any[]; total: number }>(
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

        return {
          cves: cvesList,
          total: totalCount,
        };
      },
      CACHE_TTL_SECONDS
    );

    // Return the response structured with high-velocity Edge HTTP Caching headers
    // public: cache can be stored by any cache (browsers, CDNs)
    // s-maxage=60: cache at the edge CDN for 60 seconds
    // stale-while-revalidate=120: serve stale cache up to 120 seconds while fetching fresh in background
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
          "Vercel-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error: any) {
    console.error("[CVE FEED API FAILURE] Fatal routing incident:", error);
    
    return NextResponse.json(
      { 
        error: "System Integrity Alert: Failed to process external CTI threat feed request.",
        code: "INTERNAL_SERVER_ERROR",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
