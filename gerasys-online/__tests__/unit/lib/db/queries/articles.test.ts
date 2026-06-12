import { beforeAll, describe, expect, it, vi } from 'vitest';

// Mock the postgres client before any imports that depend on it.
// Drizzle's postgres-js driver will throw if DATABASE_URL is unset,
// so we mock the entire module chain.
vi.mock('@neondatabase/serverless', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    query: vi.fn(),
    end: vi.fn(),
  })),
  neonConfig: {},
}));

vi.mock('drizzle-orm/neon-serverless', () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([])),
              then: vi.fn((cb: any) => cb([])),
            })),
          })),
        })),
      })),
    })),
  })),
}));

// Ensure DATABASE_URL is set before the db module initializes.
beforeAll(() => {
  process.env.DATABASE_URL = 'postgresql://postgres.mock:mock@127.0.0.1:5432/postgres';
});

describe('getArticles', () => {
  it('returns an array when the database returns an empty array', async () => {
    // Dynamic import so the mock is in place before the module evaluates.
    const { getArticles } = await import('@/lib/db/queries/articles');
    const result = await getArticles(1, 12);
    expect(Array.isArray(result)).toBe(true);
  });
});
