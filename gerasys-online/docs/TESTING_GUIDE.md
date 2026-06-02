# ZAYRON-X Testing Guide

**Date**: 2026-06-02
**Coverage Target**: 40%+

---

## Test Architecture

```
__tests__/
├── unit/
│   ├── db.test.ts              # 15 database query tests (Vitest)
│   └── lib/db/queries/
│       └── articles.test.ts    # 1 legacy unit test (Vitest)
├── integration/
│   └── api.test.ts             # 10 API route tests (Vitest + fetch)
└── e2e/
    ├── auth.spec.ts            # 5 auth flow tests (Playwright)
    ├── pages.spec.ts           # 5 page rendering tests (Playwright)
    └── homepage.spec.ts        # 1 legacy smoke test (Playwright)
```

**Total**: 35 tests (15 unit + 10 integration + 10 E2E + 1 legacy unit + 1 legacy E2E)

---

## Running Tests

### Unit Tests (Vitest — no server required)
```bash
bun run test:unit
```
Runs `__tests__/unit/**/*.test.ts`. All database queries are mocked — no real database needed.

### Integration Tests (Vitest — requires running server)
```bash
# Terminal 1: Start the dev server
bun run preview

# Terminal 2: Run integration tests
bun run test:integration
```
Runs `__tests__/integration/**/*.test.ts`. Hits `http://localhost:3000` via `fetch()`.
If no server is detected, tests are skipped automatically.

### E2E Tests (Playwright — requires running server)
```bash
# First, install Playwright browsers (once)
bunx playwright install --with-deps chromium

# Terminal 1: Start the dev server
bun run preview

# Terminal 2: Run E2E tests
bun run test:e2e
```
Runs `__tests__/e2e/**/*.spec.ts` with Chromium.

### All Tests
```bash
bun run test:all
```
Runs unit → integration → E2E sequentially.

### Watch Mode (Development)
```bash
bunx vitest --dir __tests__/unit
bunx playwright test --ui
```

---

## Test Coverage Map

| Module | Tests | File | Type |
|--------|-------|------|------|
| `lib/db/queries/articles.ts` | 9 | `__tests__/unit/db.test.ts` | Unit |
| `lib/db/queries/cves.ts` | 3 | `__tests__/unit/db.test.ts` | Unit |
| `lib/db/queries/analysts.ts` | 1 | `__tests__/unit/db.test.ts` | Unit |
| `lib/db/queries/articles.ts` (createArticle) | 1 | `__tests__/unit/db.test.ts` | Unit |
| `app/api/articles/route.ts` | 3 | `__tests__/integration/api.test.ts` | Integration |
| `app/api/cves/route.ts` | 1 | `__tests__/integration/api.test.ts` | Integration |
| `app/api/search/route.ts` | 1 | `__tests__/integration/api.test.ts` | Integration |
| `app/api/subscribe/route.ts` | 3 | `__tests__/integration/api.test.ts` | Integration |
| `app/api/rss/route.ts` | 1 | `__tests__/integration/api.test.ts` | Integration |
| `app/api/revalidate/route.ts` | 1 | `__tests__/integration/api.test.ts` | Integration |
| Auth flows (login, register) | 5 | `__tests__/e2e/auth.spec.ts` | E2E |
| Page rendering (home, article, cve, search, 404) | 5 | `__tests__/e2e/pages.spec.ts` | E2E |

---

## Writing New Tests

### Unit Test Pattern
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set mock return values BEFORE importing the module under test
let mockSelectResult: any[] = [];

vi.mock('postgres', () => ({ default: vi.fn(() => ({})) }));
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => Promise.resolve(mockSelectResult)),
          })),
        })),
      })),
    })),
  })),
}));

describe('myFeature', () => {
  beforeEach(() => { mockSelectResult = []; });

  it('does something', async () => {
    mockSelectResult = [{ id: '1' }];
    const { getArticles } = await import('@/lib/db/queries/articles');
    const result = await getArticles();
    expect(result).toHaveLength(1);
  });
});
```

### E2E Test Pattern
```typescript
import { test, expect } from '@playwright/test';

test('my page loads', async ({ page }) => {
  await page.goto('/my-page');
  await expect(page.locator('h1')).toContainText('Expected Heading');
});
```

### Integration Test Pattern
```typescript
import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('my API', () => {
  it('returns 200', async () => {
    const res = await fetch(`${BASE_URL}/api/my-endpoint`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });
});
```

---

## Interpreting Coverage

After running tests, view the Vitest coverage report:
```bash
bunx vitest run --coverage
```

Targets:
- **Statements**: 40%+
- **Branches**: 30%+
- **Functions**: 45%+
- **Lines**: 40%+

Key uncovered areas (expected):
- Python workers (`workers/`) — not tested in JS suite
- UI rendering logic — tested via E2E, not unit
- Complex async middleware chains — tested via integration

---

## CI Integration

Tests run automatically in GitHub Actions:
- Unit tests: every push/PR
- Integration tests: not in CI yet (needs DB seeding for reliable results)
- E2E tests: on PR only (needs running server)

---

## Assumptions

- Node.js environment for unit tests
- `DATABASE_URL` is mocked — no real database required for unit tests
- Integration tests require a running dev server at `localhost:3000`
- Playwright tests use Chromium in headed mode for CI
- Test users must exist in Supabase for auth E2E tests to fully pass
- Rate limiting (429) is accepted as a valid response in integration tests
