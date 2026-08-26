import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      connected: false,
      status: 'legacy-deprecated',
      message: 'Database status endpoint is pending Cloudflare-native migration.',
      timestamp: new Date().toISOString(),
    },
    {
      status: 501,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
