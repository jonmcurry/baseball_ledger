// @vitest-environment jsdom
/**
 * Tests for useSimulation hook
 */

import { renderHook } from '@testing-library/react';
import { useSimulation } from '@hooks/useSimulation';
import { useSimulationStore } from '@stores/simulationStore';

describe('useSimulation', () => {
  beforeEach(() => {
    useSimulationStore.setState({
      status: 'idle',
      totalGames: 0,
      completedGames: 0,
      totalDays: 0,
      currentDay: 0,
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

  it('exposes runSimulation action from store', () => {
    const { result } = renderHook(() => useSimulation());
    expect(typeof result.current.runSimulation).toBe('function');
  });

  it('progressPct uses day-based calculation when totalDays > 0', () => {
    useSimulationStore.setState({
      status: 'running',
      totalDays: 7,
      currentDay: 3,
      totalGames: 0,
      completedGames: 0,
    });

    const { result } = renderHook(() => useSimulation());
    expect(result.current.progressPct).toBe(43); // Math.round(3/7*100)
  });

  it('progressPct falls back to game-based when totalDays is 0', () => {
    useSimulationStore.setState({
      status: 'running',
      totalDays: 0,
      currentDay: 0,
      totalGames: 10,
      completedGames: 5,
    });

    const { result } = renderHook(() => useSimulation());
    expect(result.current.progressPct).toBe(50); // 5/10*100
  });

  it('exposes currentDay and totalDays from store', () => {
    useSimulationStore.setState({
      status: 'running',
      totalDays: 30,
      currentDay: 15,
    });

    const { result } = renderHook(() => useSimulation());
    expect(result.current.currentDay).toBe(15);
    expect(result.current.totalDays).toBe(30);
  });
});
