import { POST as checkoutPOST } from '@/app/api/billing/checkout/route';
import { POST as portalPOST } from '@/app/api/billing/portal/route';
import { GET as webhookGET } from '@/app/api/webhooks/stripe/route';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase Server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

describe('API Billing Endpoint: /api/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = undefined;
    process.env.STRIPE_SUBSCRIBER_PRICE_ID = undefined;
  });

  it('should reject unauthenticated checkout requests', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const req = new NextRequest('http://localhost:3000/api/billing/checkout', { method: 'POST' });
    const res = await checkoutPOST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Authentication required');
  });

  it('should return price ID missing error if STRIPE_SUBSCRIBER_PRICE_ID is not set', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: 'user-id', email: 'test@corporate.com' } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'user-id' } }),
          }),
        }),
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/billing/checkout', { method: 'POST' });
    const res = await checkoutPOST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Stripe Price ID configuration missing');
  });

  it('should return a mock checkout session URL in local development mode', async () => {
    process.env.STRIPE_SUBSCRIBER_PRICE_ID = 'price_premium';
    const { createClient, createAdminClient } = await import('@/lib/supabase/server');
    (createClient as any).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: 'user-id', email: 'test@corporate.com' } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { id: 'user-id', stripe_customer_id: 'cus_123' } }),
          }),
        }),
      }),
    });

    (createAdminClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/billing/checkout', { method: 'POST' });
    const res = await checkoutPOST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.url).toContain('mock_action=checkout_success');
  });
});

describe('API Webhook Simulation: /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully handle mock success checkout and sync to Supabase', async () => {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    (createAdminClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        update: mockUpdate,
      }),
    });

    const req = new NextRequest(
      'http://localhost:3000/api/webhooks/stripe?mock_action=checkout_success&userId=user-123&customerId=cus_123&priceId=price_123',
    );
    const res = await webhookGET(req);
    expect(res.status).toBe(307); // NextResponse.redirect returns 307/308 redirect status
    expect(res.headers.get('location')).toContain('billing_success=true');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should successfully handle mock portal cancellation and revert status to FREE', async () => {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    (createAdminClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        update: mockUpdate,
      }),
    });

    const req = new NextRequest(
      'http://localhost:3000/api/webhooks/stripe?mock_action=portal_cancel&userId=user-123',
    );
    const res = await webhookGET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('billing_canceled=true');
    expect(mockUpdate).toHaveBeenCalled();
  });
});
