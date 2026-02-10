/**
 * Page Object: Dashboard Page
 *
 * Encapsulates selectors and actions for the league dashboard.
 */

import type { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly simulateButton: Locator;
  readonly standingsSection: Locator;
  readonly scheduleSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /dashboard/i });
    this.simulateButton = page.getByRole('button', { name: /simulate/i });
    this.standingsSection = page.getByText(/standings/i);
    this.scheduleSection = page.getByText(/schedule/i);
  }

  async goto(leagueId: string) {
    await this.page.goto(`/leagues/${leagueId}/dashboard`);
  }
}
