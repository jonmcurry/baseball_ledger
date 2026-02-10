// @vitest-environment jsdom
/**
 * Tests for useRealtimeProgress hook
 */

import { renderHook, act } from '@testing-library/react';
import { useRealtimeProgress } from '@hooks/useRealtimeProgress';
import { useSimulationStore } from '@stores/simulationStore';
import { useLeagueStore } from '@stores/leagueStore';

vi.mock('@services/simulation-service', () => ({
  subscribeToProgress: vi.fn(),
  unsubscribeFromProgress: vi.fn(),
  startSimulation: vi.fn(),
}));

describe('useRealtimeProgress', () => {
  beforeEach(() => {
    useSimulationStore.getState().reset();
  });

  it('returns current simulation status', () => {
    const { result } = renderHook(() => useRealtimeProgress('league-1'));
    expect(result.current.status).toBe('idle');
  });

  it('calls subscribe on mount with league ID', () => {
    const subscribeSpy = vi.fn();
    useSimulationStore.setState({ subscribeToSimProgress: subscribeSpy } as any);

    renderHook(() => useRealtimeProgress('league-1'));
    expect(subscribeSpy).toHaveBeenCalledWith('league-1');
  });

  it('does not subscribe when leagueId is null', () => {
    const subscribeSpy = vi.fn();
    useSimulationStore.setState({ subscribeToSimProgress: subscribeSpy } as any);

    renderHook(() => useRealtimeProgress(null));
    expect(subscribeSpy).not.toHaveBeenCalled();
  });

  // REQ-STATE-014: Cache invalidation on simulation completion
  it('calls fetchLeagueData when status transitions to complete', () => {
    const fetchSpy = vi.fn();
    useLeagueStore.setState({ fetchLeagueData: fetchSpy } as any);

    renderHook(() => useRealtimeProgress('league-1'));

    // Initially idle -- fetchLeagueData should not be called
    expect(fetchSpy).not.toHaveBeenCalled();

    // Transition to complete
    act(() => {
      useSimulationStore.setState({ status: 'complete' });
    });

    expect(fetchSpy).toHaveBeenCalledWith('league-1');
  });

  it('does not call fetchLeagueData when leagueId is null', () => {
    const fetchSpy = vi.fn();
    useLeagueStore.setState({ fetchLeagueData: fetchSpy } as any);

    renderHook(() => useRealtimeProgress(null));

    act(() => {
      useSimulationStore.setState({ status: 'complete' });
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
