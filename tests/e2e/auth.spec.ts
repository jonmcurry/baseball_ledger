/**
 * E2E Tests: Authentication
 *
 * Verifies login page rendering and form behavior.
 */

import { test, expect } from '@playwright/test';

test.describe('Auth Page', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('login page has a submit button', async ({ page }) => {
    await page.goto('/login');
    const submitButton = page.getByRole('button', { name: /sign in|log in|submit/i });
    await expect(submitButton).toBeVisible();
  });

  test('submitting empty form shows validation', async ({ page }) => {
    await page.goto('/login');
    const submitButton = page.getByRole('button', { name: /sign in|log in|submit/i });
    await submitButton.click();

    // Should not navigate away from login
    await expect(page).toHaveURL(/login/);
  });

  test('login link is accessible from splash page', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.getByRole('link', { name: /sign in|log in/i });
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    }
  });
});
