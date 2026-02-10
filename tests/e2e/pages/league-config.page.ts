/**
 * Page Object: League Config Page
 *
 * Encapsulates selectors and actions for creating/editing a league.
 */

import type { Page, Locator } from '@playwright/test';

export class LeagueConfigPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly leagueNameInput: Locator;
  readonly teamCountSelect: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /create|league/i });
    this.leagueNameInput = page.getByLabel(/league name/i);
    this.teamCountSelect = page.getByLabel(/teams|team count/i);
    this.submitButton = page.getByRole('button', { name: /create|save/i });
    this.errorMessage = page.locator('[role="alert"]');
  }

  async goto() {
    await this.page.goto('/leagues/new');
  }
}
