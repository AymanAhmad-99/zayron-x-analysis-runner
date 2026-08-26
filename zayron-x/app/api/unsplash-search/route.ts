import { checkRateLimit, getClientIp, searchLimiter } from '@/lib/cache/ratelimit';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const rawPerPage = Number(searchParams.get('per_page'));
  const perPage =
    Number.isFinite(rawPerPage) && rawPerPage >= 1 ? Math.min(Math.floor(rawPerPage), 20) : 12;

  if (!query || query.length < 2 || query.length > 80) {
    return NextResponse.json(
      { error: 'Query must be between 2 and 80 characters.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const ip = getClientIp(request);
  const { allowed, remaining } = await checkRateLimit(searchLimiter, `unsplash:${ip}`);

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

  try {
    const res = await fetch(
      `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://unsplash.com/',
          Accept: '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    );
    if (!res.ok) {
      return NextResponse.json({ error: 'Image search failed' }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-RateLimit-Remaining': String(remaining),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Image search failed' }, { status: 500 });
  }
}
