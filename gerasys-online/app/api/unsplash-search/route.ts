import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  
  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=15`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://unsplash.com/",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Unsplash API returned ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch Unsplash" }, { status: 500 });
  }
}
