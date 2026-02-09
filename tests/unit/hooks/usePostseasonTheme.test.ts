// @vitest-environment jsdom
/**
 * Tests for usePostseasonTheme hook
 */

import { renderHook } from '@testing-library/react';
import { usePostseasonTheme } from '@hooks/usePostseasonTheme';
import { useLeagueStore } from '@stores/leagueStore';

describe('usePostseasonTheme', () => {
  beforeEach(() => {
    useLeagueStore.getState().reset();
    document.documentElement.removeAttribute('data-theme');
  });

  it('sets data-theme="postseason" when league status is playoffs', () => {
    useLeagueStore.getState().setActiveLeague({ status: 'playoffs' } as any);

    renderHook(() => usePostseasonTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('postseason');
  });

  it('removes data-theme when league status is not playoffs', () => {
    useLeagueStore.getState().setActiveLeague({ status: 'regular_season' } as any);

    renderHook(() => usePostseasonTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('returns isPlayoffs boolean', () => {
    useLeagueStore.getState().setActiveLeague({ status: 'playoffs' } as any);

    const { result } = renderHook(() => usePostseasonTheme());
    expect(result.current.isPlayoffs).toBe(true);
  });
});
