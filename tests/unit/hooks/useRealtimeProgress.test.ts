// @vitest-environment jsdom
/**
 * Tests for useRealtimeProgress hook
 */

import { renderHook } from '@testing-library/react';
import { useRealtimeProgress } from '@hooks/useRealtimeProgress';
import { useSimulationStore } from '@stores/simulationStore';

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
});
