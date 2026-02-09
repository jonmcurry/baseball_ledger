/**
 * E2E Tests: Navigation
 *
 * Verifies that unauthenticated users are redirected to login,
 * and that the 404 page works correctly.
 */

import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('unauthenticated user accessing /leagues redirects to login', async ({ page }) => {
    await page.goto('/leagues/test-league/dashboard');
    // Should redirect to login since user is not authenticated
    await expect(page).toHaveURL(/login/);
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Page not found')).toBeVisible();
  });

  test('404 page has return home link', async ({ page }) => {
    await page.goto('/unknown-route');
    const homeLink = page.getByRole('link', { name: /return home/i });
    await expect(homeLink).toBeVisible();
  });

  test('return home link navigates to splash', async ({ page }) => {
    await page.goto('/unknown-route');
    const homeLink = page.getByRole('link', { name: /return home/i });
    await homeLink.click();
    await expect(page).toHaveURL('/');
  });
});
