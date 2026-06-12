import { GET } from '@/app/api/download-sitrep/route';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase Server client functions
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

describe('API Endpoint: /api/download-sitrep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject requests without threatId', async () => {
    const req = new NextRequest('http://localhost:3000/api/download-sitrep');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing parameter: threatId');
  });

  it('should reject unauthorized sessions', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const req = new NextRequest(
      'http://localhost:3000/api/download-sitrep?threatId=11111111-1111-1111-1111-111111111111',
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('should reject non-subscriber users', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-id' } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { clearance_level: 'FREE' } }),
          }),
        }),
      }),
    });

    const req = new NextRequest(
      'http://localhost:3000/api/download-sitrep?threatId=11111111-1111-1111-1111-111111111111',
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('should dynamically generate a PDF for a valid subscriber request', async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-id' } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { clearance_level: 'SUBSCRIBER' } }),
          }),
        }),
      }),
    });

    (createAdminClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: '11111111-1111-1111-1111-111111111111',
                title: 'APT29 Attack',
                severity: 'CRITICAL',
                cvss_score: 9.8,
                fbr_total: 4200000.0,
                sector: 'Critical Infrastructure',
                raw_iocs: 'IPs: 185.220.101.44, 45.227.254.12\nSome domains...',
                yara_rules: 'rule dummy {}',
              },
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest(
      'http://localhost:3000/api/download-sitrep?threatId=11111111-1111-1111-1111-111111111111',
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain(
      'ZAYRON-X-SITREP-11111111-1111-1111-1111-111111111111.pdf',
    );

    const body = await res.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(0);
  });
});
