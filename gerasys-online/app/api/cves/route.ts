import { checkRateLimit, cvesLimiter, getClientIp } from '@/lib/cache/ratelimit';
import { getCachedOrFetch } from '@/lib/cache/redis';
import { getCVECount, getCVEs, getCVEsBySeverity } from '@/lib/supabase/queries/cves';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Rate limit: 120 requests per 60s per IP
    const ip = getClientIp(request);
    const { allowed, remaining } = await checkRateLimit(cvesLimiter, `cves:${ip}`);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': String(remaining),
          },
        },
      );
    }

    const { searchParams } = new URL(request.url);
    const rawPage = Number(searchParams.get('page'));
    const rawLimit = Number(searchParams.get('limit'));
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(Math.floor(rawLimit), 50) : 20;
    const severity = searchParams.get('severity');

    const cacheKey = `cves:feed:p_${page}:l_${limit}:s_${severity || 'all'}`;
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
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'X-RateLimit-Remaining': String(remaining),
        },
      },
    );
  } catch (error) {
    console.error('[CVE FEED API FAILURE] Fatal routing incident:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch CVEs',
      },
      { status: 500 },
    );
  }
}
