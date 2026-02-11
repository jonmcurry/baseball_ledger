// @vitest-environment jsdom
/**
 * Tests for usePageTitle hook
 *
 * REQ-COMP-013: Page titles set via document.title on each feature page.
 */

import { renderHook } from '@testing-library/react';
import { usePageTitle } from '@hooks/usePageTitle';

describe('usePageTitle', () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
  });

  it('sets document.title with suffix on mount', () => {
    renderHook(() => usePageTitle('Dashboard'));
    expect(document.title).toBe('Dashboard | Baseball Ledger');
  });

  it('updates document.title when title changes', () => {
    const { rerender } = renderHook(
      ({ title }) => usePageTitle(title),
      { initialProps: { title: 'Dashboard' } },
    );

    expect(document.title).toBe('Dashboard | Baseball Ledger');

    rerender({ title: 'Roster' });
    expect(document.title).toBe('Roster | Baseball Ledger');
  });

  it('restores previous title on unmount', () => {
    document.title = 'Previous Title';

    const { unmount } = renderHook(() => usePageTitle('Dashboard'));
    expect(document.title).toBe('Dashboard | Baseball Ledger');

    unmount();
    expect(document.title).toBe('Previous Title');
  });
});
