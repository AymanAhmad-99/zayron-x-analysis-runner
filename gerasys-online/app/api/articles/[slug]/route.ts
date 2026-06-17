export const dynamic = 'force-dynamic';

import { getArticleBySlug } from '@/lib/supabase/queries/articles';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

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

    const responseArticle = isSubscriber
      ? article
      : {
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

    return NextResponse.json(responseArticle, {
      headers: isSubscriber
        ? {
            'Cache-Control': 'private, no-store',
          }
        : {
            'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
            'CDN-Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
          },
    });
  } catch (error) {
    console.error('API /articles/[slug] error:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}
