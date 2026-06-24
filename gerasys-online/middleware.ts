export const runtime = 'experimental-edge';

import { checkRateLimit, getClientIp, loginLimiter, registerLimiter } from '@/lib/cache/ratelimit';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/* ──────────────────────────────────────────────────────────
   CSP helper utilities.
   A nonce is still generated for future tightening work, but
   Phase 1 keeps a compatibility-focused CSP without full nonce
   enforcement or strict-dynamic rollout.
   ────────────────────────────────────────────────────────── */
function generateNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateCsrfToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function applyNonceToCsp(request: NextRequest, response: NextResponse, nonce: string): void {
  // Store nonce on request so Server Components can read it via headers()
  request.headers.set('x-csp-nonce', nonce);

  // Keep style-src compatibility and preserve the CSP emitted by next.config.ts.
  let enforcingCsp = response.headers.get('Content-Security-Policy');
  if (enforcingCsp) {
    if (!enforcingCsp.includes("'unsafe-inline'") && enforcingCsp.includes('script-src')) {
      enforcingCsp = enforcingCsp.replace('script-src', "script-src 'unsafe-inline'");
    }
    if (!enforcingCsp.includes("'unsafe-inline'") && enforcingCsp.includes('style-src')) {
      enforcingCsp = enforcingCsp.replace('style-src', "style-src 'unsafe-inline'");
    }
    response.headers.set('Content-Security-Policy', enforcingCsp);
  } else {
    enforcingCsp = `default-src 'self'; script-src 'self' *.supabase.co 'unsafe-eval' 'unsafe-inline'; style-src 'self' fonts.googleapis.com 'unsafe-inline'; img-src 'self' data: blob: images.unsplash.com *.supabase.co *.unsplash.com https://image.pollinations.ai https://images.unsplash.com https://loremflickr.com; connect-src 'self' *.supabase.co https://*.workers.dev https://unsplash.com https://*.unsplash.com; font-src 'self' fonts.gstatic.com; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`;
    response.headers.set('Content-Security-Policy', enforcingCsp);
  }

  // Keep report-only active to observe future tightening safely.
  const currentCsp = response.headers.get('Content-Security-Policy') ?? '';
  const reportOnlyCsp = `${currentCsp.replace(/\b'unsafe-inline'\b/g, '').trim()}; report-uri /api/csp-report`;
  response.headers.set('Content-Security-Policy-Report-Only', reportOnlyCsp);
}

/* ── Admin Basic Auth ── */
function isAdminAuthenticated(request: NextRequest): boolean {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASSWORD;

  // FAIL CLOSED: if credentials are not configured, deny access.
  // Previously this returned true (dev mode), which was a security risk.
  if (!adminUser || !adminPass) return false;

  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Basic ')) return false;

  try {
    const b64 = authHeader.slice(6);
    const decoded = atob(b64);
    const [user, ...passParts] = decoded.split(':');
    const pass = passParts.join(':');
    return user === adminUser && pass === adminPass;
  } catch {
    return false;
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 1. Skip checks for webhook paths and revalidation
  const isWebhookOrRevalidate =
    pathname.startsWith('/api/webhooks') || pathname === '/api/revalidate';

  if (!isWebhookOrRevalidate) {
    const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    if (isStateChanging) {
      // Validate Origin / Referer
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');

      let requestSource: string | null = null;
      if (origin) {
        requestSource = origin;
      } else if (referer) {
        try {
          requestSource = new URL(referer).origin;
        } catch {
          // ignore invalid referer URL
        }
      }

      const targetOrigin = request.nextUrl.origin;
      const hasSupabaseCookies = request.cookies
        .getAll()
        .some(
          (c) =>
            c.name.startsWith('sb-') ||
            c.name.endsWith('-refresh-token') ||
            c.name.endsWith('-auth-token'),
        );

      // Validate Origin/Referer header
      if (requestSource) {
        if (requestSource !== targetOrigin) {
          console.error(
            `[SECURITY ALERT] CSRF: Origin mismatch. Source: ${requestSource}, Target: ${targetOrigin}`,
          );
          return NextResponse.json(
            { error: 'CSRF protection: Request origin does not match target origin.' },
            { status: 403 },
          );
        }
      } else if (
        hasSupabaseCookies ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/api/admin')
      ) {
        // Authenticated or admin requests MUST provide Origin or Referer header
        console.error(
          `[SECURITY ALERT] CSRF: Missing Origin/Referer header on authenticated/admin state-changing request to ${pathname}`,
        );
        return NextResponse.json(
          { error: 'CSRF protection: Origin or Referer header is required.' },
          { status: 403 },
        );
      }

      // Validate CSRF Double-Submit token
      if (
        hasSupabaseCookies ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/api/admin')
      ) {
        const cookieToken = request.cookies.get('csrf-token')?.value;
        const headerToken = request.headers.get('x-csrf-token');

        if (!cookieToken || !headerToken || cookieToken !== headerToken) {
          console.error(
            `[SECURITY ALERT] CSRF: Token validation failed. Cookie token: ${cookieToken ? 'present' : 'missing'}, Header token: ${headerToken ? 'present' : 'missing'}`,
          );
          return NextResponse.json(
            { error: 'CSRF protection: Invalid or missing CSRF token.' },
            { status: 403 },
          );
        }
      }
    }
  }

  // Generate/store a per-request nonce for future CSP tightening work.
  const nonce = generateNonce();
  let response = NextResponse.next({ request });

  /* ── Protect Premium CTI API routes ── */
  if (pathname.startsWith('/api/remediate') || pathname.startsWith('/api/download-sitrep')) {
    const supabase = createServerClient(
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Security clearance required. ZAYRON-X node access denied.' },
        { status: 401 },
      );
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('clearance_level, stripe_subscription_status')
      .eq('id', user.id)
      .single();

    const isSubscribed =
      profile &&
      (profile.clearance_level === 'SUBSCRIBER' ||
        profile.stripe_subscription_status === 'active' ||
        profile.stripe_subscription_status === 'trialing');

    if (error || !profile || !isSubscribed) {
      return NextResponse.json(
        { error: 'Security clearance required. ZAYRON-X node access denied.' },
        { status: 401 },
      );
    }
  }

  /* ── Protect /api/seed-analysts with admin-only access ── */
  if (pathname === '/api/seed-analysts') {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json(
        { error: 'Admin credentials required for database seeding.' },
        { status: 401 },
      );
    }
  }

  /* ── Rate limit /login (5 req/min) and /register (3 req/min) ── */
  if (pathname === '/login' || pathname === '/register') {
    const ip = getClientIp(request);
    const limiter = pathname === '/login' ? loginLimiter : registerLimiter;
    const { allowed, remaining } = await checkRateLimit(limiter, `${pathname}:${ip}`);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait and try again.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': String(remaining),
          },
        },
      );
    }
  }

  /* ── Redirect /auth/login to /login for route group compatibility ── */
  if (pathname === '/auth/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  /* ── Supabase session refresh and Admin Hardening ── */
  response = await updateSession(request);
  const supabase = createServerClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
        },
      },
    },
  );

  /* ── Protect /admin/* and /api/admin/* with Fail-Closed Access Control ── */
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAdmin = user?.app_metadata?.role === 'admin';

    if (!user || !isAdmin) {
      console.error(
        `[SECURITY ALERT] ZX-SEC-043/066: Unauthorized admin access attempt to ${pathname} from IP ${getClientIp(request)}`,
      );

      const status = user ? 403 : 401;
      return NextResponse.json(
        { error: 'Access Denied. ZAYRON-X node isolation active.' },
        { status },
      );
    }
  }

  // Generate/set CSRF token cookie on GET/HEAD if not present
  if (['GET', 'HEAD'].includes(method)) {
    const hasCsrfToken = request.cookies.has('csrf-token');
    if (!hasCsrfToken) {
      const token = generateCsrfToken();
      response.cookies.set('csrf-token', token, {
        path: '/',
        sameSite: 'lax',
        secure: true,
        httpOnly: false, // allow client JS access
      });
    }
  }

  // Apply the per-request CSP nonce
  applyNonceToCsp(request, response, nonce);

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
