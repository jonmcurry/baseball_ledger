// @vitest-environment jsdom
/**
 * Tests for useSimulation hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSimulation } from '@hooks/useSimulation';
import { useSimulationStore } from '@stores/simulationStore';

describe('useSimulation', () => {
  beforeEach(() => {
    useSimulationStore.setState({
      status: 'idle',
      totalGames: 0,
      completedGames: 0,
      results: [],
      error: null,
    });
  });

  it('progressPct is 0 when idle', () => {
    const { result } = renderHook(() => useSimulation());
    expect(result.current.progressPct).toBe(0);
  });

  it('progressPct calculates correctly during simulation', () => {
    useSimulationStore.getState().startSimulation(10);
    useSimulationStore.getState().addResult({
      gameId: 'g1', homeTeamId: 'a', awayTeamId: 'b', homeScore: 3, awayScore: 1,
    });
    useSimulationStore.getState().addResult({
      gameId: 'g2', homeTeamId: 'c', awayTeamId: 'd', homeScore: 2, awayScore: 5,
    });

    const { result } = renderHook(() => useSimulation());
    expect(result.current.progressPct).toBe(20); // 2/10 * 100
  });

  it('progressPct is 100 when all games complete', () => {
    useSimulationStore.getState().startSimulation(1);
    useSimulationStore.getState().addResult({
      gameId: 'g1', homeTeamId: 'a', awayTeamId: 'b', homeScore: 1, awayScore: 0,
    });

    const { result } = renderHook(() => useSimulation());
    expect(result.current.progressPct).toBe(100);
  });

  it('exposes status from store', () => {
    useSimulationStore.getState().startSimulation(5);

    const { result } = renderHook(() => useSimulation());
    expect(result.current.status).toBe('running');
  });

  it('exposes results from store', () => {
    useSimulationStore.getState().startSimulation(5);
    useSimulationStore.getState().addResult({
      gameId: 'g1', homeTeamId: 'a', awayTeamId: 'b', homeScore: 3, awayScore: 1,
    });

    const { result } = renderHook(() => useSimulation());
    expect(result.current.results).toHaveLength(1);
  });

  it('isRunning is true when status is running', () => {
    useSimulationStore.getState().startSimulation(5);

    const { result } = renderHook(() => useSimulation());
    expect(result.current.isRunning).toBe(true);
  });

  it('isRunning is false when idle', () => {
    const { result } = renderHook(() => useSimulation());
    expect(result.current.isRunning).toBe(false);
  });
});
