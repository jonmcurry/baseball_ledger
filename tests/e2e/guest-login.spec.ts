/**
 * E2E Tests: Guest Login
 *
 * Verifies the "Play as Guest" anonymous authentication flow.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { mockSupabaseAuth, mockSupabaseData } from './fixtures/auth';

test.describe('Guest Login', () => {
  test('guest button is visible on login page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(loginPage.guestButton).toBeVisible();
    await expect(loginPage.guestButton).toHaveText(/play as guest/i);
  });

  test('guest login navigates away from login page', async ({ page }) => {
    await mockSupabaseAuth(page);
    await mockSupabaseData(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAsGuest();

    // Should navigate to home after successful guest auth
    await expect(page).not.toHaveURL(/login/);
  });

  test('guest button is disabled while submitting', async ({ page }) => {
    // Delay the auth response to capture the disabled state
    await page.route('**/auth/v1/signup*', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'tok',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'ref',
          user: { id: 'guest', email: '', role: 'authenticated' },
        }),
      });
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.guestButton.click();

    // Button should become disabled during submission
    await expect(loginPage.guestButton).toBeDisabled();
  });
});
