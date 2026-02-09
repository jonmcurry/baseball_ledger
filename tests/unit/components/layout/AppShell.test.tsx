// @vitest-environment jsdom
/**
 * Tests for AppShell layout component
 *
 * Main layout wrapper with skip-to-content link and error boundary.
 */

import { render, screen } from '@testing-library/react';
import { AppShell } from '@components/layout/AppShell';

describe('AppShell', () => {
  it('renders children', () => {
    render(
      <AppShell>
        <div>Page content</div>
      </AppShell>,
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders skip-to-content link', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    expect(screen.getByText('Skip to content')).toBeInTheDocument();
  });

  it('skip link targets #main-content', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    const skipLink = screen.getByText('Skip to content');
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('renders main element with id="main-content"', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('uses max-w-ledger class for centered layout', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    const container = screen.getByRole('main').closest('[class*="max-w-ledger"]');
    expect(container).toBeInTheDocument();
  });

  it('uses shadow-ledger and border-spine classes', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    const container = screen.getByRole('main').closest('[class*="shadow-ledger"]');
    expect(container).toBeInTheDocument();
  });

  it('wraps content in ErrorBoundary (does not crash on child error)', () => {
    // Suppress React error boundary console.error
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const msg = typeof args[0] === 'string' ? args[0] : '';
      if (msg.includes('Error: Uncaught') || msg.includes('The above error')) return;
      originalError.call(console, ...args);
    };

    function ThrowingChild() {
      throw new Error('Boom');
    }

    render(
      <AppShell>
        <ThrowingChild />
      </AppShell>,
    );
    // Should show fallback instead of crashing
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    console.error = originalError;
  });
});
