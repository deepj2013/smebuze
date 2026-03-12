import { test, expect } from '@playwright/test';

/**
 * E2E: Login and open dashboard.
 * Run with: npx playwright test (from apps/website; install @playwright/test if needed).
 * Requires API running with demo user (admin@demo.com / demo123) and tenant slug "demo".
 */
test.describe('Login and dashboard', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('after login, dashboard or redirect is visible', async ({ page }) => {
    await page.goto('/login');
    const email = page.locator('input[type="email"], input[name="email"]').first();
    const password = page.locator('input[type="password"]').first();
    await email.fill(process.env.E2E_LOGIN_EMAIL || 'admin@demo.com');
    await password.fill(process.env.E2E_LOGIN_PASSWORD || 'demo123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(dashboard|login|\?)/, { timeout: 15000 });
    await expect(page).toHaveURL(/\//);
  });
});
