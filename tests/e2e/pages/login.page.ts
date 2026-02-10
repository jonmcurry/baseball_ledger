/**
 * Page Object: Login Page
 *
 * Encapsulates selectors and actions for the login/auth page.
 */

import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly guestButton: Locator;
  readonly heading: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.guestButton = page.getByRole('button', { name: /play as guest/i });
    this.heading = page.getByRole('heading', { name: /sign in/i });
    this.errorMessage = page.locator('.text-red-600');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginAsGuest() {
    await this.guestButton.click();
  }
}
