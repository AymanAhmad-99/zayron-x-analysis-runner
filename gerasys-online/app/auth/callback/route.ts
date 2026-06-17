import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function getSafeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith('/')) return '/admin';
  if (next.startsWith('//')) return '/admin';
  if (next.includes('\\')) return '/admin';

  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = getSafeRedirectPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin));
}
