import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/* ── Admin Basic Auth ── */
function isAdminAuthenticated(request: NextRequest): boolean {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASSWORD;

  // If no credentials configured, skip protection (dev mode)
  if (!adminUser || !adminPass) return true;

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ── Protect Premium CTI API routes ── */
  if (pathname.startsWith("/api/remediate") || pathname.startsWith("/api/download-sitrep")) {
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
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
