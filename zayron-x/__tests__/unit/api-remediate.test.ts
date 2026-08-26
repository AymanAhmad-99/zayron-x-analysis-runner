import { POST } from '@/app/api/remediate/route';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase Server client functions
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

describe('API Endpoint: /api/remediate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ZONE_ID;
  });

  it('should reject requests without threatId', async () => {
    const req = new NextRequest('http://localhost:3000/api/remediate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
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

    const req = new NextRequest('http://localhost:3000/api/remediate', {
      method: 'POST',
      body: JSON.stringify({ threatId: '11111111-1111-1111-1111-111111111111' }),
    });

    const res = await POST(req);
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

    const req = new NextRequest('http://localhost:3000/api/remediate', {
      method: 'POST',
      body: JSON.stringify({ threatId: '11111111-1111-1111-1111-111111111111' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('should successfully extract threat IPs and return local dry-run results when credentials are not set', async () => {
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
                raw_iocs: 'IPs: 185.220.101.44, 45.227.254.12\nSome domains...',
              },
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/remediate', {
      method: 'POST',
      body: JSON.stringify({ threatId: '11111111-1111-1111-1111-111111111111' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.telemetry.threatTitle).toBe('APT29 Attack');
    expect(body.telemetry.nodesPatched).toBe(2 * 62);
    expect(body.telemetry.blastRadiusMitigatedUSD).toBe(4200000.0);
    expect(body.telemetry.cloudflareResults).toHaveLength(2);
    expect(body.telemetry.cloudflareResults[0].simulated).toBe(true);
  });
});
