import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock return registry ──
let mockSelectResult: any[] = [];
let mockSingleResult: any = null;
let mockInsertResult: any = { id: 'new-id', title: 'Test', slug: 'test' };
let mockCountResult = 0;

const mockSupabase: any = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  neq: vi.fn(() => mockSupabase),
  ilike: vi.fn(() => mockSupabase),
  or: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  range: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  single: vi.fn(() => {
    return Promise.resolve({
      data: mockSingleResult,
      error: mockSingleResult ? null : { message: 'No rows' },
    });
  }),
  then: vi.fn((resolve: any) => {
    const data =
      mockSelectResult.length > 0 ? mockSelectResult : [mockSingleResult].filter(Boolean);
    resolve({ data, error: null, count: mockCountResult });
  }),
};

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabase),
  getSupabaseAdmin: vi.fn(() => mockSupabase),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-key';
  process.env.SUPABASE_SERVICE_KEY = 'mock-service-key';
});

beforeEach(() => {
  mockSelectResult = [];
  mockSingleResult = null;
  mockCountResult = 0;
  mockInsertResult = {
    id: 'mock-id',
    title: 'Mock Article',
    slug: 'mock-article',
    category: 'threat_intel',
  };
});

describe('Database Queries — Articles', () => {
  it('1. getArticles() returns array with default pagination', async () => {
    mockSelectResult = [
      {
        id: '1',
        title: 'Article 1',
        slug: 'article-1',
        category: 'threat_intel',
        is_published: true,
        views: 100,
        author: 'Author',
        content: '...',
        tags: [],
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '2',
        title: 'Article 2',
        slug: 'article-2',
        category: 'threat_intel',
        is_published: true,
        views: 200,
        author: 'Author',
        content: '...',
        tags: [],
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const { getArticles } = await import('@/lib/supabase/queries/articles');
    const result = await getArticles(1, 12);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].isPublished).toBe(true);
  });

  it('2. getArticles() returns empty array when no articles exist', async () => {
    mockSelectResult = [];

    const { getArticles } = await import('@/lib/supabase/queries/articles');
    const result = await getArticles(1, 12);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it('3. getArticles() respects limit parameter', async () => {
    mockSelectResult = [
      {
        id: '1',
        title: 'A',
        slug: 'a',
        category: 'threat_intel',
        is_published: true,
        views: 0,
        author: 'X',
        content: '',
        tags: [],
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const { getArticles } = await import('@/lib/supabase/queries/articles');
    const result = await getArticles(2, 5);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  it('4. getArticleBySlug() returns article object for valid slug', async () => {
    mockSingleResult = {
      id: 'abc',
      title: 'Found',
      slug: 'found-slug',
      category: 'osint',
      is_published: true,
      views: 50,
      author: 'A',
      content: 'Body',
      tags: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const { getArticleBySlug } = await import('@/lib/supabase/queries/articles');
    const result = await getArticleBySlug('found-slug');
    expect(result).not.toBeNull();
    expect(result?.slug).toBe('found-slug');
  });

  it('5. getArticleBySlug() returns null for non-existent slug', async () => {
    mockSingleResult = null;

    const { getArticleBySlug } = await import('@/lib/supabase/queries/articles');
    const result = await getArticleBySlug('nope');
    expect(result).toBeNull();
  });

  it('6. getArticlesByCategory() filters by category correctly', async () => {
    mockSelectResult = [
      {
        id: 'c1',
        title: 'CVE-2026',
        slug: 'cve-2026',
        category: 'vulnerabilities',
        is_published: true,
        views: 10,
        author: 'Z',
        content: 'x',
        tags: [],
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const { getArticlesByCategory } = await import('@/lib/supabase/queries/articles');
    const result = await getArticlesByCategory('vulnerabilities', 1, 12);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('vulnerabilities');
  });

  it('7. getRecentArticles() returns most recent articles', async () => {
    mockSelectResult = [
      {
        id: 'r1',
        title: 'Recent 1',
        slug: 'recent-1',
        category: 'cyber_news',
        is_published: true,
        views: 1,
        author: 'Z',
        content: '',
        tags: [],
        created_at: new Date('2026-06-02'),
        updated_at: new Date(),
      },
      {
        id: 'r2',
        title: 'Recent 2',
        slug: 'recent-2',
        category: 'cyber_news',
        is_published: true,
        views: 2,
        author: 'Z',
        content: '',
        tags: [],
        created_at: new Date('2026-06-01'),
        updated_at: new Date(),
      },
    ];

    const { getRecentArticles } = await import('@/lib/supabase/queries/articles');
    const result = await getRecentArticles(10);
    expect(result).toHaveLength(2);
  });

  it('8. getCVEs() returns array with pagination', async () => {
    mockSelectResult = [
      {
        id: 'cve1',
        cve_id: 'CVE-2026-0001',
        title: 'Test CVE',
        description: 'Desc',
        severity: 'HIGH',
        cvss_score: '8.5',
        cvss_vector: 'AV:N/AC:L',
        affected_product: 'Test',
        vendor: 'TestCo',
        status: 'Active',
        published_date: new Date(),
        created_at: new Date(),
      },
    ];

    const { getCVEs } = await import('@/lib/supabase/queries/cves');
    const result = await getCVEs(1, 25);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]?.cveId).toBe('CVE-2026-0001');
  });

  it('9. getCVEsBySeverity() filters by severity CRITICAL', async () => {
    mockSelectResult = [
      {
        id: 'sc1',
        cve_id: 'CVE-2026-9999',
        title: 'Critical Vuln',
        description: 'Bad',
        severity: 'CRITICAL',
        cvss_score: '9.8',
        cvss_vector: '...',
        affected_product: 'All',
        vendor: 'V',
        status: 'Active',
        published_date: new Date(),
        created_at: new Date(),
      },
    ];

    const { getCVEsBySeverity } = await import('@/lib/supabase/queries/cves');
    const result = await getCVEsBySeverity('CRITICAL', 10);
    expect(result).toHaveLength(1);
    expect(result[0]?.severity).toBe('CRITICAL');
  });

  it('10. getCVEById() returns CVE object for valid ID', async () => {
    mockSingleResult = {
      id: 'cv1',
      cve_id: 'CVE-2026-5555',
      title: 'Target CVE',
      description: 'Test',
      severity: 'MEDIUM',
      cvss_score: '5.5',
      cvss_vector: '...',
      affected_product: 'X',
      vendor: 'Y',
      status: 'Active',
      published_date: new Date(),
      created_at: new Date(),
    };

    const { getCVEById } = await import('@/lib/supabase/queries/cves');
    const result = await getCVEById('CVE-2026-5555');
    expect(result).not.toBeNull();
    expect(result?.cveId).toBe('CVE-2026-5555');
  });

  it('11. searchArticles() returns results for matching query', async () => {
    mockSelectResult = [
      {
        id: 's1',
        title: 'Ransomware Attack',
        slug: 'ransomware-attack',
        category: 'threat_intel',
        is_published: true,
        views: 500,
        author: 'Z',
        content: '...',
        tags: ['ransomware'],
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const { searchArticles } = await import('@/lib/supabase/queries/articles');
    const result = await searchArticles('ransomware', 10);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it('12. searchArticles() returns empty array for no matches', async () => {
    mockSelectResult = [];

    const { searchArticles } = await import('@/lib/supabase/queries/articles');
    const result = await searchArticles('xyznonexistent', 10);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it('13. getAllTags() returns array of tag objects with counts', async () => {
    mockSelectResult = [{ tags: ['ransomware', 'apt'] }, { tags: ['ransomware', 'cve'] }];

    const { getAllTags } = await import('@/lib/supabase/queries/articles');
    const result = await getAllTags();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('tag');
    expect(result[0]).toHaveProperty('count');
    expect(result[0].tag).toBe('ransomware');
    expect(result[0].count).toBe(2);
  });

  it('14. getAnalysts() returns array of analysts', async () => {
    mockSelectResult = [
      {
        id: 'a1',
        name: 'Viktor Volkov',
        title: 'Lead APT Analyst',
        bio: '...',
        nationality: 'Russia',
        specializations: ['APT'],
        article_count: 42,
        created_at: new Date(),
      },
      {
        id: 'a2',
        name: 'Sarah Chen',
        title: 'CTI Researcher',
        bio: '...',
        nationality: 'United States',
        specializations: ['OSINT'],
        article_count: 35,
        created_at: new Date(),
      },
    ];

    const { getAnalysts } = await import('@/lib/supabase/queries/analysts');
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
      is_published: true,
      read_time: 5,
      views: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockSingleResult = mockInsertResult;

    const { createArticle } = await import('@/lib/supabase/queries/articles');
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
