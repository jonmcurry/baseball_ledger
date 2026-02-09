/**
 * E2E Tests: Splash Page
 *
 * Verifies the landing page renders correctly with navigation links.
 */

import { test, expect } from '@playwright/test';

test.describe('Splash Page', () => {
  test('loads successfully with app title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Baseball Ledger/);
  });

  test('displays "Create a League" link', async ({ page }) => {
    await page.goto('/');
    const createLink = page.getByRole('link', { name: /create/i });
    await expect(createLink).toBeVisible();
  });

  test('displays "Join a League" link', async ({ page }) => {
    await page.goto('/');
    const joinLink = page.getByRole('link', { name: /join/i });
    await expect(joinLink).toBeVisible();
  });
});
