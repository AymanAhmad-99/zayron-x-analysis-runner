import { getArticleCount } from '@/lib/supabase/queries/articles';
import { getCVECount } from '@/lib/supabase/queries/cves';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const [articleCount, cveCount] = await Promise.all([getArticleCount(), getCVECount()]);
    const timestamp = new Date().toISOString();
    const hasValidStatusSecret =
      !!process.env.STATUS_SECRET &&
      request.headers.get('X-Status-Secret') === process.env.STATUS_SECRET;

    if (!hasValidStatusSecret) {
      return NextResponse.json(
        {
          connected: true,
          timestamp,
        },
        {
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    return NextResponse.json(
      {
        connected: true,
        timestamp,
        articleCount,
        cveCount,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch {
    return NextResponse.json(
      {
        connected: false,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
