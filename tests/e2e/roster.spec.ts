/**
 * E2E Tests: Roster Management
 *
 * Verifies roster page structure -- diamond, bench, rotation, player cards.
 */

import { expect } from '@playwright/test';
import { test } from './fixtures/auth';

test.describe('Roster Page', () => {
  const LEAGUE_ID = 'test-league-id';

  test.beforeEach(async ({ authedPage }) => {
    await authedPage.goto(`/leagues/${LEAGUE_ID}/roster`);
  });

  test('renders roster heading', async ({ authedPage }) => {
    const heading = authedPage.getByRole('heading', { name: /roster/i });
    await expect(heading).toBeVisible();
  });

  test('renders field diamond or lineup section', async ({ authedPage }) => {
    // Roster page should show a diamond/lineup visualization
    const lineup = authedPage.getByText(/lineup|diamond|field/i).first();
    await expect(lineup).toBeVisible();
  });

  test('renders bench section', async ({ authedPage }) => {
    const bench = authedPage.getByText(/bench/i).first();
    await expect(bench).toBeVisible();
  });

  test('renders pitching rotation section', async ({ authedPage }) => {
    const rotation = authedPage.getByText(/rotation|pitching/i).first();
    await expect(rotation).toBeVisible();
  });
});
