/**
 * E2E Tests: League Creation
 *
 * Verifies the league creation flow for authenticated users.
 */

import { expect } from '@playwright/test';
import { test } from './fixtures/auth';
import { LeagueConfigPage } from './pages/league-config.page';

test.describe('League Creation', () => {
  test('navigates to create league page', async ({ authedPage }) => {
    await authedPage.goto('/leagues/new');
    await expect(authedPage).toHaveURL(/leagues\/new/);
  });

  test('renders league name input field', async ({ authedPage }) => {
    const configPage = new LeagueConfigPage(authedPage);
    await configPage.goto();
    await expect(configPage.leagueNameInput).toBeVisible();
  });

  test('renders team count selection', async ({ authedPage }) => {
    const configPage = new LeagueConfigPage(authedPage);
    await configPage.goto();
    await expect(configPage.teamCountSelect).toBeVisible();
  });

  test('renders create/save button', async ({ authedPage }) => {
    const configPage = new LeagueConfigPage(authedPage);
    await configPage.goto();
    await expect(configPage.submitButton).toBeVisible();
  });

  test('page is accessible with proper heading', async ({ authedPage }) => {
    const configPage = new LeagueConfigPage(authedPage);
    await configPage.goto();
    await expect(configPage.heading).toBeVisible();
  });
});
