/**
 * E2E Tests: Stats Page
 *
 * Verifies stats page structure and functionality.
 * Note: These tests run against the unauthenticated state,
 * so they verify the auth guard redirect works for protected routes.
 */

import { test, expect } from '@playwright/test';

test.describe('Stats Page (Auth Guard)', () => {
  test('stats route requires authentication', async ({ page }) => {
    await page.goto('/leagues/test-league/stats');
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('roster route requires authentication', async ({ page }) => {
    await page.goto('/leagues/test-league/roster');
    await expect(page).toHaveURL(/login/);
  });

  test('standings route requires authentication', async ({ page }) => {
    await page.goto('/leagues/test-league/standings');
    await expect(page).toHaveURL(/login/);
  });

  test('draft route requires authentication', async ({ page }) => {
    await page.goto('/leagues/test-league/draft');
    await expect(page).toHaveURL(/login/);
  });
});
