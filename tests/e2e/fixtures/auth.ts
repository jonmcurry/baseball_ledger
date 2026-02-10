/**
 * Auth Fixture: Mock Supabase Auth
 *
 * Intercepts Supabase auth API calls to simulate authenticated sessions
 * without requiring a running Supabase instance.
 */

import { test as base, type Page } from '@playwright/test';

const MOCK_USER = {
  id: 'e2e-user-0001-0000-0000-000000000001',
  email: 'e2e@test.com',
  role: 'authenticated',
  aud: 'authenticated',
  app_metadata: { provider: 'email' },
  user_metadata: { displayName: 'E2E Tester' },
  created_at: '2026-01-01T00:00:00Z',
};

const MOCK_SESSION = {
  access_token: 'e2e-mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'e2e-mock-refresh-token',
  user: MOCK_USER,
};

/**
 * Intercept Supabase auth endpoints to return mock session data.
 * Call this before navigating to any authenticated route.
 */
export async function mockSupabaseAuth(page: Page) {
  // Intercept token endpoint (sign in / refresh)
  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SESSION),
    });
  });

  // Intercept user endpoint (session check)
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
    });
  });

  // Intercept anonymous sign-in
  await page.route('**/auth/v1/signup*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SESSION),
    });
  });
}

/**
 * Intercept Supabase REST API calls to return empty results.
 * Prevents errors when authenticated pages try to fetch data.
 */
export async function mockSupabaseData(page: Page) {
  await page.route('**/rest/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

/** Extended test fixture with auth helpers */
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await mockSupabaseAuth(page);
    await mockSupabaseData(page);
    await use(page);
  },
});
