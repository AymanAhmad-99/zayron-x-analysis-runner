import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'CVE API is pending Cloudflare-native data layer migration.',
      status: 'legacy-deprecated',
    },
    {
      status: 501,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
