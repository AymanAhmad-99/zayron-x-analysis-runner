import { checkRateLimit, getClientIp, searchLimiter } from '@/lib/cache/ratelimit';
import { NextResponse } from 'next/server';

const MAX_CSP_REPORT_BODY_BYTES = 16 * 1024;

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed, remaining } = await checkRateLimit(searchLimiter, `csp-report:${ip}`);

    if (!allowed) {
      return NextResponse.json(
        { ok: false },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': '60',
            'X-RateLimit-Remaining': String(remaining),
          },
        },
      );
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_CSP_REPORT_BODY_BYTES) {
      return NextResponse.json(
        { ok: false },
        { status: 413, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_CSP_REPORT_BODY_BYTES) {
      return NextResponse.json(
        { ok: false },
        { status: 413, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const parsedBody = JSON.parse(rawBody);
    const report = parsedBody?.['csp-report'] ?? parsedBody;

    console.warn(
      JSON.stringify({
        event: 'CSP_VIOLATION_REPORTED',
        report: {
          'document-uri': report?.['document-uri'] ?? null,
          'violated-directive': report?.['violated-directive'] ?? null,
          'blocked-uri': report?.['blocked-uri'] ?? null,
          'source-file': report?.['source-file'] ?? null,
          'line-number': report?.['line-number'] ?? null,
        },
      }),
    );
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
