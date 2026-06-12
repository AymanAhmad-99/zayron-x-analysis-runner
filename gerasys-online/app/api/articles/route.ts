import { articlesLimiter, checkRateLimit, getClientIp } from '@/lib/cache/ratelimit';
import {
  getArticleCount,
  getArticles,
  getArticlesByCategory,
  getArticlesCountByCategory,
} from '@/lib/supabase/queries/articles';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Rate limit: 60 requests per 60s per IP
    const ip = getClientIp(request);
    const { allowed, remaining } = await checkRateLimit(articlesLimiter, `articles:${ip}`);

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
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 12;
    const category = searchParams.get('category');

    let dbCategory: string | null = null;
    if (category) {
      const normalized = category.toLowerCase();
      const slugMap: Record<string, string> = {
        malware: 'MALWARE',
        'threat-actors': 'THREAT_ACTOR',
        'threat-actor': 'THREAT_ACTOR',
        vulnerabilities: 'VULNERABILITY',
        vulnerability: 'VULNERABILITY',
        exploits: 'EXPLOIT',
        exploit: 'EXPLOIT',
        'dark-web': 'DARK_WEB',
        dark_web: 'DARK_WEB',
        osint: 'OSINT',
        'threat-intelligence': 'threat_intel',
      };
      dbCategory = slugMap[normalized] ?? normalized.toUpperCase();

      const formattedCategory = category.toLowerCase().replace(/\s+/g, '-');
      revalidatePath(`/intelligence/${formattedCategory}`);
    }

    const [articles, total] = await Promise.all([
      dbCategory ? getArticlesByCategory(dbCategory, page, limit) : getArticles(page, limit),
      dbCategory ? getArticlesCountByCategory(dbCategory) : getArticleCount(),
    ]);

    return NextResponse.json(
      {
        articles,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'X-RateLimit-Remaining': String(remaining),
        },
      },
    );
  } catch (error) {
    console.error('API /articles error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
