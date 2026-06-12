import { POST as checkoutPOST } from '@/app/api/billing/checkout/route';
import { POST as portalPOST } from '@/app/api/billing/portal/route';
import { POST as webhookPOST } from '@/app/api/webhooks/stripe/route';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateSession = vi.fn();
const mockCreateCustomer = vi.fn();
const mockConstructEvent = vi.fn();

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: {
        create: mockCreateCustomer,
        retrieve: vi.fn().mockResolvedValue({ id: 'cus_123', email: 'test@corporate.com' }),
      },
      checkout: {
        sessions: {
          create: mockCreateSession,
        },
      },
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    })),
  };
});

// Mock Supabase Server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

describe('API Billing Endpoint: /api/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SUBSCRIBER_PRICE_ID;
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

  it('should create a stripe checkout session and return the URL', async () => {
    process.env.STRIPE_SUBSCRIBER_PRICE_ID = 'price_premium';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';

    mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test_123' });

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
    expect(body.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
  });
});

describe('API Webhook Simulation: /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('should successfully handle customer.subscription.created and sync to Supabase', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';

    const mockEvent = {
      type: 'customer.subscription.created',
      data: {
        object: {
          customer: 'cus_123',
          id: 'sub_123',
          status: 'active',
          items: {
            data: [{ price: { id: 'price_123' } }],
          },
        },
      },
    };
    mockConstructEvent.mockReturnValue(mockEvent);

    const { createAdminClient } = await import('@/lib/supabase/server');
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    (createAdminClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'user-123' } }),
          }),
        }),
        update: mockUpdate,
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'sig_123',
      },
      body: JSON.stringify(mockEvent),
    });

    const res = await webhookPOST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      stripe_subscription_id: 'sub_123',
      stripe_price_id: 'price_123',
      stripe_subscription_status: 'active',
      clearance_level: 'SUBSCRIBER',
      tier_id: 'TACTICAL_OBSERVER',
    });
  });

  it('should successfully handle customer.subscription.deleted and revert status to FREE', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';

    const mockEvent = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          customer: 'cus_123',
        },
      },
    };
    mockConstructEvent.mockReturnValue(mockEvent);

    const { createAdminClient } = await import('@/lib/supabase/server');
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    (createAdminClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'user-123' } }),
          }),
        }),
        update: mockUpdate,
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'sig_123',
      },
      body: JSON.stringify(mockEvent),
    });

    const res = await webhookPOST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      stripe_subscription_status: 'canceled',
      clearance_level: 'FREE',
    });
  });
});
