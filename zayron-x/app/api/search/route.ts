import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const type = searchParams.get('type') || 'all';
  
  if (!q) {
    return NextResponse.json({
      status: 'ok',
      query: '',
      results: [],
      meta: { count: 0, latency: 0 }
    });
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://zayron-x-api.aabusabih.workers.dev';
    const backendRes = await fetch(`${apiUrl}/api/v1/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`);
    
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: 'Backend search failed', status: backendRes.status },
        { status: 502 }
      );
    }
    
    const data = await backendRes.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
