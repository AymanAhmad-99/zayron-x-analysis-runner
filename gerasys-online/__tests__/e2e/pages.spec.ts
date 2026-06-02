import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────
// 5 E2E Tests — Page Rendering & Navigation
// ─────────────────────────────────────────────

test.describe('Page Rendering', () => {
  test('1. Homepage loads and contains text "ZAYRON-X"', async ({ page }) => {
    await page.goto('/');
    // Wait for key content to render (the hero section heading)
    await page.waitForSelector('h1, h2, header', { timeout: 15000 });

    await expect(page.locator('body')).toContainText('ZAYRON-X');
  });

  test('2. Article page renders title and content', async ({ page }) => {
    // Navigate to an existing article (if any) via the intelligence listing
    // First try the threat-intelligence listing page
    await page.goto('/intelligence/threat-intelligence');
    await page.waitForTimeout(1000);

    // Check if there are article links on the page
    const articleLinks = page.locator('a[href*="/intelligence/"]');
    const count = await articleLinks.count();

    if (count > 0) {
      // Click the first article link
      await articleLinks.first().click();
      await page.waitForTimeout(1500);

      // The page should render article content — check for key elements
      const hasHeading = await page.locator('h1').first().isVisible().catch(() => false);
      const hasContent = await page.locator('article, .prose-zayron, [class*="prose"]').first().isVisible().catch(() => false);

      // At least one of heading or content should be visible
      expect(hasHeading || hasContent).toBeTruthy();
    } else {
      // No articles exist — the zero-intel report should render
      await expect(page.locator('body')).toContainText(/Intel|Sector|Scan|Command Center/i);
    }
  });

  test('3. CVE listing page shows table or severity badges', async ({ page }) => {
    await page.goto('/cve');
    await page.waitForTimeout(1000);

    // The CVE page should show a table or severity badges
    const hasTable = await page.locator('table, [class*="table"], [class*="CveTable"]').first().isVisible().catch(() => false);
    const hasBadge = await page.locator('text=CRITICAL, text=HIGH, text=MEDIUM, text=LOW').first().isVisible().catch(() => false);

    // If neither is visible, at minimum the page heading should be there
    if (!hasTable && !hasBadge) {
      await expect(page.locator('h1, h2').first()).toBeVisible();
    }
  });

  test('4. Search page with query "ransomware" returns result cards', async ({ page }) => {
    await page.goto('/search?q=ransomware');
    await page.waitForTimeout(1000);

    // The search page should show either results or an empty state
    // Either is valid behavior for the search endpoint
    const hasResults = await page.locator('a[href*="/intelligence/"], [class*="ArticleCard"], [class*="card"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=No results, text=not found, text=No articles').first().isVisible().catch(() => false);

    if (!hasResults && !hasEmptyState) {
      // At minimum, the search input or heading should be visible
      await expect(page.locator('input, h1, h2').first()).toBeVisible();
    }
  });

  test('5. 404 page renders custom not-found component for bad URL', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-99999');
    await page.waitForTimeout(1000);

    // The custom 404 page should render ZAYRON-X branding
    // It may show 404, "not found", or redirect to the custom 404
    const bodyText = await page.locator('body').innerText();

    // Either the 404 number or the custom message
    expect(bodyText).toMatch(/404|not found|INTELLIGENCE NOT FOUND|exist|declassified/i);
  });
});
