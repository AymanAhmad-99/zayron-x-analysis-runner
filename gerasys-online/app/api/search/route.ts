import { checkRateLimit, searchLimiter } from '@/lib/cache/ratelimit';
import { searchArticles } from '@/lib/supabase/queries/articles';
import { searchCVEs } from '@/lib/supabase/queries/cves';
import { NextResponse } from 'next/server';

function redactArticleSearchResult<T extends Record<string, unknown>>(article: T): T {
  return {
    ...article,
    yaraRule: null,
    iocsJson: null,
    mitreTtps: null,
    fbrScore: null,
    cvssV4Score: null,
    financialExposure: null,
    regulatoryRisk: null,
    mitigationImpact: null,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const type = searchParams.get('type') ?? 'all';

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Rate limit: 10 requests per 60s per IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    const { allowed, remaining } = await checkRateLimit(searchLimiter, `search:${ip}`);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many search requests. Please wait a moment.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': String(remaining),
          },
        },
      );
    }

    let articles: Awaited<ReturnType<typeof searchArticles>> = [];
    let cves: Awaited<ReturnType<typeof searchCVEs>> = [];

    if (type === 'all' || type === 'articles') {
      articles = await searchArticles(query);
    }
    if (type === 'all' || type === 'cves') {
      cves = await searchCVEs(query);
    }

    const publicArticles = articles.map(redactArticleSearchResult);

    return NextResponse.json(
      { articles: publicArticles, cves, query },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          'CDN-Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          'X-RateLimit-Remaining': String(remaining),
        },
      },
    );
  } catch (error) {
    console.error('API /search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
