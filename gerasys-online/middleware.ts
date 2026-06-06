export const runtime = "experimental-edge";

import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit, loginLimiter, registerLimiter, getClientIp } from "@/lib/cache/ratelimit";

/* ──────────────────────────────────────────────────────────
   CSP Nonce Generator — per-request unique nonce
   Injects the nonce into both the CSP header (via request
   headers passthrough) and the response headers so that
   inline <script nonce="..."> tags are allowed.
   ────────────────────────────────────────────────────────── */
function generateNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function applyNonceToCsp(request: NextRequest, response: NextResponse, nonce: string): void {
  // Store nonce on request so Server Components can read it via headers()
  request.headers.set("x-csp-nonce", nonce);

  // Replace the static CSP placeholder with the actual nonce value
  let enforcingCsp = response.headers.get("Content-Security-Policy");
  if (enforcingCsp) {
    if (!enforcingCsp.includes("'unsafe-inline'") && enforcingCsp.includes("style-src")) {
      enforcingCsp = enforcingCsp.replace("style-src", "style-src 'unsafe-inline'");
    }
    const patched = enforcingCsp.replace(
      /'strict-dynamic'/,
      `'nonce-${nonce}' 'strict-dynamic'`,
    );
    response.headers.set("Content-Security-Policy", patched);
  } else {
    enforcingCsp = `default-src 'self'; script-src 'self' *.supabase.co 'unsafe-inline' 'unsafe-eval'; style-src 'self' fonts.googleapis.com 'unsafe-inline'; img-src 'self' data: blob: images.unsplash.com *.supabase.co *.unsplash.com https://image.pollinations.ai https://images.unsplash.com; connect-src 'self' *.supabase.co https://*.workers.dev; font-src 'self' fonts.gstatic.com; frame-src 'self'; object-src 'none'; base-uri 'self'`;
    response.headers.set("Content-Security-Policy", enforcingCsp);
  }

  // Setup CSP Report-Only alongside enforcing to monitor blocked/unsafe inline style and script attempts
  const currentCsp = response.headers.get("Content-Security-Policy") ?? "";
  const reportOnlyCsp = currentCsp
    .replace(/\b'unsafe-inline'\b/g, "")
    .trim() + "; report-uri /api/csp-report";
  response.headers.set("Content-Security-Policy-Report-Only", reportOnlyCsp);
}

/* ── Admin Basic Auth ── */
function isAdminAuthenticated(request: NextRequest): boolean {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASSWORD;

  // FAIL CLOSED: if credentials are not configured, deny access.
  // Previously this returned true (dev mode), which was a security risk.
  if (!adminUser || !adminPass) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Basic ")) return false;

  try {
    const b64 = authHeader.slice(6);
    const decoded = atob(b64);
    const [user, ...passParts] = decoded.split(":");
    const pass = passParts.join(":");
    return user === adminUser && pass === adminPass;
  } catch {
    return false;
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate per-request nonce for strict CSP
  const nonce = generateNonce();
  let response = NextResponse.next({ request });

  /* ── Protect Premium CTI API routes ── */
  if (pathname.startsWith("/api/remediate") || pathname.startsWith("/api/download-sitrep")) {
    const supabase = createServerClient(
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Security clearance required. ZAYRON-X node access denied." },
        { status: 401 }
      );
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("clearance_level")
      .eq("id", user.id)
      .single();

    if (error || !profile || profile.clearance_level !== "SUBSCRIBER") {
      return NextResponse.json(
        { error: "Security clearance required. ZAYRON-X node access denied." },
        { status: 401 }
      );
    }
  }

  /* ── Protect /api/seed-analysts with admin-only access ── */
  if (pathname === "/api/seed-analysts") {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json(
        { error: "Admin credentials required for database seeding." },
        { status: 401 }
      );
    }
  }

  /* ── Rate limit /login (5 req/min) and /register (3 req/min) ── */
  if (pathname === "/login" || pathname === "/register") {
    const ip = getClientIp(request);
    const limiter = pathname === "/login" ? loginLimiter : registerLimiter;
    const { allowed, remaining } = await checkRateLimit(limiter, `${pathname}:${ip}`);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Remaining": String(remaining),
          },
        },
      );
    }
  }

  /* ── Redirect /auth/login to /login for route group compatibility ── */
  if (pathname === "/auth/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  /* ── Protect /admin/* with HTTP Basic Auth ── */
  if (pathname.startsWith("/admin")) {
    if (!isAdminAuthenticated(request)) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="ZAYRON-X Admin", charset="UTF-8"',
          "Content-Type": "text/plain",
        },
      });
    }
  }

  /* ── Supabase session refresh for all other routes ── */
  response = await updateSession(request);

  // Apply the per-request CSP nonce
  applyNonceToCsp(request, response, nonce);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
