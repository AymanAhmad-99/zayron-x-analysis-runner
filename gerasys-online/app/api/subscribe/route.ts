import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { subscribeLimiter, checkRateLimit } from "@/lib/cache/ratelimit";

export async function POST(request: Request) {
  try {
    // Rate limit: 3 requests per 60s per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const { allowed, remaining } = await checkRateLimit(subscribeLimiter, `sub:${ip}`);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Remaining": String(remaining),
          },
        }
      );
    }

    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Valid email address required." },
        { status: 400 }
      );
    }

    // Check existing
    const existing = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .limit(1);

    if (existing[0]) {
      if (existing[0].isActive) {
        return NextResponse.json(
          { error: "Email already subscribed." },
          { status: 409 }
        );
      }
      // Re-activate
      await db
        .update(subscribers)
        .set({ isActive: true })
        .where(eq(subscribers.email, email));
      return NextResponse.json({ success: true, message: "Subscription reactivated." });
    }

    // Create
    await db.insert(subscribers).values({ email });
    return NextResponse.json(
      { success: true, message: "Successfully subscribed." },
      {
        status: 201,
        headers: { "X-RateLimit-Remaining": String(remaining) },
      }
    );
  } catch (error) {
    console.error("API /subscribe error:", error);
    return NextResponse.json(
      { error: "Subscription failed. Please try again." },
      { status: 500 }
    );
  }
}
