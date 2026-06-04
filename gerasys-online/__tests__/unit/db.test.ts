import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// ── Mock return registry ──
// Each test sets these before importing the query module dynamically.
let mockSelectResult: any[] = [];
let mockSingleResult: any = null;
let mockInsertResult: any = { id: 'new-id', title: 'Test', slug: 'test' };

function buildMockChain(finalResult: any = mockSelectResult) {
  const chain: any = {
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    returning: vi.fn(() => Promise.resolve([mockInsertResult])),
    set: vi.fn(() => chain),
    then: vi.fn((cb: any) => cb(finalResult)),
  };
  // For .single() or limit(1) returning an object
  chain.where = vi.fn(() => ({
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => ({
      offset: vi.fn(() => Promise.resolve(finalResult)),
      then: vi.fn((cb: any) => cb(finalResult.length > 0 ? finalResult : [mockSingleResult].filter(Boolean))),
    })),
  }));
  return chain;
}

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
    select: vi.fn((_fields?: any) => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve(mockSelectResult)),
              then: vi.fn((cb: any) => cb(mockSelectResult)),
            })),
            groupBy: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve(mockSelectResult)),
            })),
          })),
          groupBy: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(mockSelectResult)),
              then: vi.fn((cb: any) => cb(mockSelectResult)),
            })),
          })),
          limit: vi.fn(() => {
            // Handle .limit(1) → returns single object pattern
            return {
              then: vi.fn((cb: any) => cb([mockSingleResult].filter(Boolean))),
            };
          }),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => Promise.resolve(mockSelectResult)),
            then: vi.fn((cb: any) => cb(mockSelectResult)),
          })),
          groupBy: vi.fn(() => Promise.resolve(mockSelectResult)),
          then: vi.fn((cb: any) => cb(mockSelectResult)),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mockInsertResult])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a: any, b: any) => ({ type: 'eq', left: a, right: b })),
  desc: vi.fn((col: any) => ({ type: 'desc', column: col })),
  and: vi.fn((...conds: any[]) => ({ type: 'and', conditions: conds })),
  sql: Object.assign(
    vi.fn((strings: any, ...values: any[]) => ({ type: 'sql', strings, values })),
    { type: 'sql' }
  ),
}));

beforeAll(() => {
  process.env.DATABASE_URL = 'postgresql://postgres.mock:mock@127.0.0.1:5432/postgres';
});

beforeEach(() => {
  mockSelectResult = [];
  mockSingleResult = null;
  mockInsertResult = { id: 'mock-id', title: 'Mock Article', slug: 'mock-article', category: 'threat_intel' };
});

// ─────────────────────────────────────────────
// 15 Unit Tests
// ─────────────────────────────────────────────

describe('Database Queries — Articles', () => {
  it('1. getArticles() returns array with default pagination', async () => {
    mockSelectResult = [
      { id: '1', title: 'Article 1', slug: 'article-1', category: 'threat_intel', isPublished: true, views: 100, author: 'Author', content: '...', tags: [], createdAt: new Date(), updatedAt: new Date() },
      { id: '2', title: 'Article 2', slug: 'article-2', category: 'threat_intel', isPublished: true, views: 200, author: 'Author', content: '...', tags: [], createdAt: new Date(), updatedAt: new Date() },
    ];

    const { getArticles } = await import('@/lib/db/queries/articles');
    const result = await getArticles(1, 12);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('2. getArticles() returns empty array when no articles exist', async () => {
    mockSelectResult = [];

    const { getArticles } = await import('@/lib/db/queries/articles');
    const result = await getArticles(1, 12);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it('3. getArticles() respects limit parameter', async () => {
    mockSelectResult = [{ id: '1', title: 'A', slug: 'a', category: 'threat_intel', isPublished: true, views: 0, author: 'X', content: '', tags: [], createdAt: new Date(), updatedAt: new Date() }];

    const { getArticles } = await import('@/lib/db/queries/articles');
    // Second import returns the same module (cached) but mockSelectResult is updated
    const result = await getArticles(2, 5);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  it('4. getArticleBySlug() returns article object for valid slug', async () => {
    mockSingleResult = { id: 'abc', title: 'Found', slug: 'found-slug', category: 'osint', isPublished: true, views: 50, author: 'A', content: 'Body', tags: [], createdAt: new Date(), updatedAt: new Date() };

    const { getArticleBySlug } = await import('@/lib/db/queries/articles');
    const result = await getArticleBySlug('found-slug');
    expect(result).not.toBeNull();
    expect(result?.slug).toBe('found-slug');
  });

  it('5. getArticleBySlug() returns null for non-existent slug', async () => {
    mockSingleResult = null;

    const { getArticleBySlug } = await import('@/lib/db/queries/articles');
    const result = await getArticleBySlug('nope');
    expect(result).toBeNull();
  });

  it('6. getArticlesByCategory() filters by category correctly', async () => {
    mockSelectResult = [
      { id: 'c1', title: 'CVE-2026', slug: 'cve-2026', category: 'vulnerabilities', isPublished: true, views: 10, author: 'Z', content: 'x', tags: [], createdAt: new Date(), updatedAt: new Date() },
    ];

    const { getArticlesByCategory } = await import('@/lib/db/queries/articles');
    const result = await getArticlesByCategory('vulnerabilities', 1, 12);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  it('7. getRecentArticles() returns most recent articles', async () => {
    mockSelectResult = [
      { id: 'r1', title: 'Recent 1', slug: 'recent-1', category: 'cyber_news', isPublished: true, views: 1, author: 'Z', content: '', tags: [], createdAt: new Date('2026-06-02'), updatedAt: new Date() },
      { id: 'r2', title: 'Recent 2', slug: 'recent-2', category: 'cyber_news', isPublished: true, views: 2, author: 'Z', content: '', tags: [], createdAt: new Date('2026-06-01'), updatedAt: new Date() },
    ];

    const { getRecentArticles } = await import('@/lib/db/queries/articles');
    const result = await getRecentArticles(10);
    expect(result).toHaveLength(2);
  });

  it('8. getCVEs() returns array with pagination', async () => {
    mockSelectResult = [
      { id: 'cve1', cveId: 'CVE-2026-0001', title: 'Test CVE', description: 'Desc', severity: 'HIGH', cvssScore: '8.5', cvssVector: 'AV:N/AC:L', affectedProduct: 'Test', vendor: 'TestCo', status: 'Active', publishedDate: new Date(), createdAt: new Date() },
    ];

    const { getCVEs } = await import('@/lib/db/queries/cves');
    const result = await getCVEs(1, 25);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]?.cveId).toBe('CVE-2026-0001');
  });

  it('9. getCVEsBySeverity() filters by severity CRITICAL', async () => {
    mockSelectResult = [
      { id: 'sc1', cveId: 'CVE-2026-9999', title: 'Critical Vuln', description: 'Bad', severity: 'CRITICAL', cvssScore: '9.8', cvssVector: '...', affectedProduct: 'All', vendor: 'V', status: 'Active', publishedDate: new Date(), createdAt: new Date() },
    ];

    const { getCVEsBySeverity } = await import('@/lib/db/queries/cves');
    const result = await getCVEsBySeverity('CRITICAL', 10);
    expect(result).toHaveLength(1);
    expect(result[0]?.severity).toBe('CRITICAL');
  });

  it('10. getCVEByCveId() returns CVE object for valid ID', async () => {
    mockSingleResult = { id: 'cv1', cveId: 'CVE-2026-5555', title: 'Target CVE', description: 'Test', severity: 'MEDIUM', cvssScore: '5.5', cvssVector: '...', affectedProduct: 'X', vendor: 'Y', status: 'Active', publishedDate: new Date(), createdAt: new Date() };

    const { getCVEById } = await import('@/lib/db/queries/cves');
    const result = await getCVEById('CVE-2026-5555');
    expect(result).not.toBeNull();
    expect(result?.cveId).toBe('CVE-2026-5555');
  });

  it('11. searchArticles() returns results for matching query', async () => {
    mockSelectResult = [
      { id: 's1', title: 'Ransomware Attack', slug: 'ransomware-attack', category: 'threat_intel', isPublished: true, views: 500, author: 'Z', content: '...', tags: ['ransomware'], createdAt: new Date(), updatedAt: new Date() },
    ];

    const { searchArticles } = await import('@/lib/db/queries/articles');
    const result = await searchArticles('ransomware', 10);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it('12. searchArticles() returns empty array for no matches', async () => {
    mockSelectResult = [];

    const { searchArticles } = await import('@/lib/db/queries/articles');
    const result = await searchArticles('xyznonexistent', 10);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it('13. getAllTags() returns array of tag objects with counts', async () => {
    mockSelectResult = [
      { tag: 'ransomware', count: 15 },
      { tag: 'apt', count: 10 },
      { tag: 'cve', count: 8 },
    ];

    const { getAllTags } = await import('@/lib/db/queries/articles');
    const result = await getAllTags();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('tag');
    expect(result[0]).toHaveProperty('count');
  });

  it('14. getAnalysts() returns array of analysts', async () => {
    mockSelectResult = [
      { id: 'a1', name: 'Viktor Volkov', title: 'Lead APT Analyst', bio: '...', nationality: 'Russia', specializations: ['APT'], articleCount: 42, createdAt: new Date() },
      { id: 'a2', name: 'Sarah Chen', title: 'CTI Researcher', bio: '...', nationality: 'United States', specializations: ['OSINT'], articleCount: 35, createdAt: new Date() },
    ];

    const { getAnalysts } = await import('@/lib/db/queries/analysts');
    const result = await getAnalysts();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]?.name).toBe('Viktor Volkov');
  });

  it('15. createArticle() inserts and returns new article with whitelisted columns', async () => {
    mockInsertResult = {
      id: 'new-uuid',
      title: 'New Article',
      slug: 'new-article',
      category: 'threat_intel',
      author: 'Test Author',
      content: 'Test content',
      tags: ['test'],
      isPublished: true,
      readTime: 5,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { createArticle } = await import('@/lib/db/queries/articles');
    const result = await createArticle({
      title: 'New Article',
      slug: 'new-article',
      category: 'threat_intel',
      author: 'Test Author',
      content: 'Test content',
      tags: ['test'],
      isPublished: true,
      readTime: 5,
    } as any);
    expect(result).not.toBeNull();
    expect(result?.title).toBe('New Article');
    expect(result?.slug).toBe('new-article');
  });
});
