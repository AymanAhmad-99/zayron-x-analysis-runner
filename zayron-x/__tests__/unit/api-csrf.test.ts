import middleware from '@/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock updateSession helper
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn().mockImplementation((req) => NextResponse.next({ request: req })),
}));

// Mock ratelimit helper
vi.mock('@/lib/cache/ratelimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5 }),
  loginLimiter: {},
  registerLimiter: {},
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

// Mock supabase ssr client
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}));

describe('CSRF Middleware Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow safe method GET requests and set csrf-token cookie if missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/articles', {
      method: 'GET',
    });

    const res = await middleware(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(200);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('csrf-token=');
    expect(setCookie?.toLowerCase()).toContain('samesite=lax');
  });

  it('should not generate a new csrf-token cookie on GET requests if one already exists', async () => {
    const req = new NextRequest('http://localhost:3000/api/articles', {
      method: 'GET',
      headers: {
        cookie: 'csrf-token=existing_token_value',
      },
    });

    const res = await middleware(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    // Since cookie was already present, set-cookie for csrf-token should not be added again
    if (setCookie) {
      expect(setCookie).not.toContain('csrf-token=');
    }
  });

  it('should block POST requests with origin mismatch', async () => {
    const req = new NextRequest('http://localhost:3000/api/some-ordinary-endpoint', {
      method: 'POST',
      headers: {
        origin: 'http://malicious-domain.com',
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Request origin does not match target origin');
  });

  it('should block POST requests on admin routes if Origin/Referer header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/sync-knowledge', {
      method: 'POST',
    });

    const res = await middleware(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Origin or Referer header is required');
  });

  it('should block POST requests on authenticated routes if CSRF token is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/some-ordinary-endpoint', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        cookie: 'sb-access-token=some-token',
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Invalid or missing CSRF token');
  });

  it('should block POST requests on authenticated routes if CSRF cookie matches but header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/some-ordinary-endpoint', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        cookie: 'sb-access-token=some-token; csrf-token=my-csrf-token',
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Invalid or missing CSRF token');
  });

  it('should block POST requests on authenticated routes if CSRF token and header mismatch', async () => {
    const req = new NextRequest('http://localhost:3000/api/some-ordinary-endpoint', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        cookie: 'sb-access-token=some-token; csrf-token=my-csrf-token',
        'x-csrf-token': 'wrong-csrf-token',
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Invalid or missing CSRF token');
  });

  it('should allow POST requests on authenticated routes if origin matches and CSRF token double-submits correctly', async () => {
    const req = new NextRequest('http://localhost:3000/api/some-ordinary-endpoint', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        cookie: 'sb-access-token=some-token; csrf-token=token123',
        'x-csrf-token': 'token123',
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('should bypass checks on webhook paths', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        origin: 'https://stripe.com',
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('should bypass checks on revalidate path', async () => {
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: {
        origin: 'https://some-cms.com',
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
  });
});
