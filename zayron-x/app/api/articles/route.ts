import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'Articles API is pending Cloudflare-native data layer migration.',
      status: 'legacy-deprecated',
    },
    {
      status: 501,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Articles revalidation endpoint is pending Cloudflare-native migration.',
      status: 'legacy-deprecated',
    },
    {
      status: 501,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
