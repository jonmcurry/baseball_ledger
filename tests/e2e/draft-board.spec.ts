/**
 * E2E Tests: Draft Board
 *
 * Verifies the draft board page structure and components.
 */

import { expect } from '@playwright/test';
import { test } from './fixtures/auth';

test.describe('Draft Board', () => {
  const LEAGUE_ID = 'test-league-id';

  test.beforeEach(async ({ authedPage }) => {
    await authedPage.goto(`/leagues/${LEAGUE_ID}/draft`);
  });

  test('renders draft board heading', async ({ authedPage }) => {
    const heading = authedPage.getByRole('heading', { name: /draft/i });
    await expect(heading).toBeVisible();
  });

  test('renders round and pick indicators', async ({ authedPage }) => {
    // The draft page should display round/pick context
    const roundText = authedPage.getByText(/round/i);
    await expect(roundText).toBeVisible();
  });

  test('renders player table or available players section', async ({ authedPage }) => {
    // Draft board should show available players
    const playerSection = authedPage.getByText(/available|players/i).first();
    await expect(playerSection).toBeVisible();
  });

  test('renders draft ticker or pick history', async ({ authedPage }) => {
    // Draft page should have some history/ticker element
    const ticker = authedPage.getByText(/pick|history|ticker/i).first();
    await expect(ticker).toBeVisible();
  });
});
