import { NextResponse } from "next/server";
import { getArticleCount } from "@/lib/supabase/queries/articles";
import { getCVECount } from "@/lib/supabase/queries/cves";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [articleCount, cveCount] = await Promise.all([
      getArticleCount(),
      getCVECount(),
    ]);

    return NextResponse.json(
      {
        connected: true,
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
        articleCount: 0,
        cveCount: 0,
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
