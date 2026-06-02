import { test, expect } from '@playwright/test';

test('homepage renders ZAYRON-X branding', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toContainText('ZAYRON-X');
});
