/**
 * E2E Tests: Simulation
 *
 * Verifies the simulation controls on the dashboard page.
 */

import { expect } from '@playwright/test';
import { test } from './fixtures/auth';
import { DashboardPage } from './pages/dashboard.page';

test.describe('Simulation Controls', () => {
  const LEAGUE_ID = 'test-league-id';

  test('dashboard renders with heading', async ({ authedPage }) => {
    const dashboard = new DashboardPage(authedPage);
    await dashboard.goto(LEAGUE_ID);
    await expect(dashboard.heading).toBeVisible();
  });

  test('simulate button is present on dashboard', async ({ authedPage }) => {
    const dashboard = new DashboardPage(authedPage);
    await dashboard.goto(LEAGUE_ID);
    await expect(dashboard.simulateButton).toBeVisible();
  });

  test('standings section is visible', async ({ authedPage }) => {
    const dashboard = new DashboardPage(authedPage);
    await dashboard.goto(LEAGUE_ID);
    await expect(dashboard.standingsSection).toBeVisible();
  });

  test('schedule section is visible', async ({ authedPage }) => {
    const dashboard = new DashboardPage(authedPage);
    await dashboard.goto(LEAGUE_ID);
    await expect(dashboard.scheduleSection).toBeVisible();
  });
});
