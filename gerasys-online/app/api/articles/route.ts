import { articlesLimiter, checkRateLimit, getClientIp } from '@/lib/cache/ratelimit';
import {
  getArticleCount,
  getArticles,
  getArticlesByCategory,
  getArticlesCountByCategory,
} from '@/lib/supabase/queries/articles';
import { createClient } from '@/lib/supabase/server';
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
    const rawPage = Number(searchParams.get('page'));
    const rawLimit = Number(searchParams.get('limit'));
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(Math.floor(rawLimit), 50) : 12;
    const category = searchParams.get('category');
    const secret = searchParams.get('secret') || request.headers.get('x-revalidate-secret');

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

      // Perform cache invalidation ONLY if a valid secret is provided
      if (secret && secret === process.env.REVALIDATION_SECRET) {
        const formattedCategory = category.toLowerCase().replace(/\s+/g, '-');
        revalidatePath(`/intelligence/${formattedCategory}`);
      }
    }

    // 1. Establish server-side security boundary check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let isSubscriber = false;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('clearance_level, stripe_subscription_status, tier_id')
        .eq('id', user.id)
        .single();

      isSubscriber = !!(
        profile &&
        (profile.clearance_level === 'SUBSCRIBER' ||
          profile.stripe_subscription_status === 'active' ||
          profile.stripe_subscription_status === 'trialing' ||
          profile.tier_id === 'TACTICAL_OBSERVER' ||
          profile.tier_id === 'SOVEREIGN_COMMAND')
      );
    }

    const [articles, total] = await Promise.all([
      dbCategory ? getArticlesByCategory(dbCategory, page, limit) : getArticles(page, limit),
      dbCategory ? getArticlesCountByCategory(dbCategory) : getArticleCount(),
    ]);

    // 2. Redact premium fields for unauthenticated/unsubscribed requests
    const processedArticles = isSubscriber
      ? articles
      : articles.map((art) => ({
          ...art,
          yaraRule: null,
          iocsJson: null,
          mitreTtps: null,
          fbrScore: null,
          cvssV4Score: null,
          financialExposure: null,
          regulatoryRisk: null,
          mitigationImpact: null,
        }));

    return NextResponse.json(
      {
        articles: processedArticles,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      {
        headers: isSubscriber
          ? {
              'Cache-Control': 'private, no-store',
              'X-RateLimit-Remaining': String(remaining),
            }
          : {
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

// POST endpoint for targeted revalidation from omni_crew.py / external triggers
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const secret = request.headers.get('x-revalidate-secret') || body.secret;

    if (!secret || secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized revalidation' }, { status: 401 });
    }

    const { category, path } = body;

    if (category) {
      const formattedCategory = category.toLowerCase().replace(/\s+/g, '-');
      revalidatePath(`/intelligence/${formattedCategory}`);
    }

    if (path) {
      revalidatePath(path);
    }

    // Always invalidate home page to ensure consistency
    revalidatePath('/');

    return NextResponse.json({ success: true, message: 'Invalidation triggered' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Invalidation failed' }, { status: 500 });
  }
}
