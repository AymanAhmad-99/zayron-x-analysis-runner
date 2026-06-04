import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

declare global {
  var sessionRefreshQueue: Map<string, { cookies: any[]; expiry: number }> | undefined;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Apply queued session refresh if exists from failed RSC cookie writes
  const allReqCookies = request.cookies.getAll();
  const reqRefreshToken = allReqCookies.find(c => c.name.endsWith('-refresh-token'))?.value;
  if (reqRefreshToken && (globalThis as any).sessionRefreshQueue) {
    const queued = (globalThis as any).sessionRefreshQueue.get(reqRefreshToken);
    if (queued) {
      if (Date.now() < queued.expiry) {
        for (const { name, value } of queued.cookies) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of queued.cookies) {
          supabaseResponse.cookies.set(name, value, options);
        }
        console.warn(JSON.stringify({ event: "QUEUED_SESSION_REFRESH_APPLIED", token: reqRefreshToken }));
      }
      (globalThis as any).sessionRefreshQueue.delete(reqRefreshToken);
    }
  }

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
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect /admin/* routes
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged-in users away from auth pages
  if (user && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
