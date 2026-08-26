import { checkRateLimit, subscribeLimiter } from '@/lib/cache/ratelimit';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Rate limit: 3 requests per 60s per IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    const { allowed, remaining } = await checkRateLimit(subscribeLimiter, `sub:${ip}`);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': String(remaining),
          },
        },
      );
    }

    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email address required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin(process.env);

    // Check existing
    const { data: existing, error: selectError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (selectError) throw selectError;

    if (existing?.[0]) {
      if (existing[0].is_active) {
        return NextResponse.json({ error: 'Email already subscribed.' }, { status: 409 });
      }
      // Re-activate
      const { error: updateError } = await supabase
        .from('subscribers')
        .update({ is_active: true })
        .eq('email', email);
      if (updateError) throw updateError;
      return NextResponse.json({ success: true, message: 'Subscription reactivated.' });
    }

    // Create
    const { error: insertError } = await supabase.from('subscribers').insert({ email });
    if (insertError) throw insertError;

    return NextResponse.json(
      { success: true, message: 'Successfully subscribed.' },
      {
        status: 201,
        headers: { 'X-RateLimit-Remaining': String(remaining) },
      },
    );
  } catch (error) {
    console.error('API /subscribe error:', error);
    return NextResponse.json({ error: 'Subscription failed. Please try again.' }, { status: 500 });
  }
}
