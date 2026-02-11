// @vitest-environment jsdom
/**
 * Tests for useDraftTimer hook (REQ-DFT-004)
 */

import { renderHook, act } from '@testing-library/react';
import { useDraftTimer } from '@features/draft/hooks/useDraftTimer';

function makeOptions(overrides: Partial<Parameters<typeof useDraftTimer>[0]> = {}) {
  return {
    isActive: false,
    currentTeamId: 'team-1',
    pickTimerSeconds: 60,
    tickTimer: vi.fn(),
    resetTimer: vi.fn(),
    onExpire: vi.fn(),
    ...overrides,
  };
}

describe('useDraftTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets timer when currentTeamId changes', () => {
    const opts = makeOptions({ currentTeamId: 'team-a' });
    const { rerender } = renderHook(
      ({ options }) => useDraftTimer(options),
      { initialProps: { options: opts } },
    );

    expect(opts.resetTimer).toHaveBeenCalledWith(60);
    opts.resetTimer.mockClear();

    rerender({ options: { ...opts, currentTeamId: 'team-b' } });
    expect(opts.resetTimer).toHaveBeenCalledWith(60);
  });

  it('calls tickTimer every second when isActive', () => {
    const opts = makeOptions({ isActive: true });
    renderHook(() => useDraftTimer(opts));

    act(() => { vi.advanceTimersByTime(3000); });

    expect(opts.tickTimer).toHaveBeenCalledTimes(3);
  });

  it('stops ticking when isActive becomes false', () => {
    const opts = makeOptions({ isActive: true });
    const { rerender } = renderHook(
      ({ options }) => useDraftTimer(options),
      { initialProps: { options: opts } },
    );

    act(() => { vi.advanceTimersByTime(2000); });
    expect(opts.tickTimer).toHaveBeenCalledTimes(2);

    rerender({ options: { ...opts, isActive: false } });
    opts.tickTimer.mockClear();

    act(() => { vi.advanceTimersByTime(3000); });
    expect(opts.tickTimer).not.toHaveBeenCalled();
  });

  it('calls onExpire exactly once when timer hits 0', () => {
    const opts = makeOptions({ isActive: true, pickTimerSeconds: 0 });
    const { rerender } = renderHook(
      ({ options }) => useDraftTimer(options),
      { initialProps: { options: opts } },
    );

    expect(opts.onExpire).toHaveBeenCalledTimes(1);

    // Re-render with same 0 -- should not call again
    rerender({ options: { ...opts, pickTimerSeconds: 0 } });
    expect(opts.onExpire).toHaveBeenCalledTimes(1);
  });

  it('does not call onExpire when not active', () => {
    const opts = makeOptions({ isActive: false, pickTimerSeconds: 0 });
    renderHook(() => useDraftTimer(opts));

    expect(opts.onExpire).not.toHaveBeenCalled();
  });

  it('cleans up interval on unmount', () => {
    const opts = makeOptions({ isActive: true });
    const { unmount } = renderHook(() => useDraftTimer(opts));

    act(() => { vi.advanceTimersByTime(2000); });
    expect(opts.tickTimer).toHaveBeenCalledTimes(2);

    unmount();
    opts.tickTimer.mockClear();

    act(() => { vi.advanceTimersByTime(3000); });
    expect(opts.tickTimer).not.toHaveBeenCalled();
  });
});
