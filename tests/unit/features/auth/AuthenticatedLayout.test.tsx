// @vitest-environment jsdom
/**
 * Tests for AuthenticatedLayout storage warning (REQ-STATE-010)
 *
 * Verifies that a WARN-severity ErrorBanner is shown when
 * localStorage is unavailable and the app falls back to memory storage.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthenticatedLayout } from '@features/auth/AuthenticatedLayout';
import { resetStorageState, createSafeStorage } from '@stores/storage-factory';

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/test']}>
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route path="/test" element={<div>Child Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthenticatedLayout storage warning (REQ-STATE-010)', () => {
  afterEach(() => {
    resetStorageState();
  });

  it('does not show storage warning when localStorage is available', () => {
    // Ensure createSafeStorage runs with real localStorage
    createSafeStorage();
    renderLayout();

    expect(
      screen.queryByText(/browser storage unavailable/i),
    ).not.toBeInTheDocument();
  });

  it('shows WARN-severity ErrorBanner when localStorage is unavailable', () => {
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      get() {
        throw new DOMException('Storage disabled', 'SecurityError');
      },
      configurable: true,
    });

    try {
      // Trigger fallback detection
      createSafeStorage();
      renderLayout();

      const banner = screen.getByText(
        /browser storage unavailable/i,
      );
      expect(banner).toBeInTheDocument();
      // Verify it's a warning (role="status" per ErrorBanner warning severity)
      expect(banner.closest('[role="status"]')).not.toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });
});
