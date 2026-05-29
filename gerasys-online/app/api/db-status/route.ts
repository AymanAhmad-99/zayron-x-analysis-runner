import { NextResponse } from "next/server";
import { getArticleCount } from "@/lib/db/queries/articles";
import { getCVECount } from "@/lib/db/queries/cves";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [articleCount, cveCount] = await Promise.all([
      getArticleCount(),
      getCVECount(),
    ]);

    return NextResponse.json({
      connected: true,
      articleCount,
      cveCount,
    });
  } catch {
    return NextResponse.json({
      connected: false,
      articleCount: 0,
      cveCount: 0,
    });
  }
}
