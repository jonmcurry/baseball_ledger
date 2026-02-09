/**
 * Tests for Simulation Store
 */

import { useSimulationStore } from '@stores/simulationStore';

describe('simulationStore', () => {
  beforeEach(() => {
    useSimulationStore.getState().reset();
  });

  it('starts idle with zero counts', () => {
    const state = useSimulationStore.getState();
    expect(state.status).toBe('idle');
    expect(state.totalGames).toBe(0);
    expect(state.completedGames).toBe(0);
    expect(state.results).toHaveLength(0);
    expect(state.error).toBeNull();
  });

  it('startSimulation sets status to running and total games', () => {
    useSimulationStore.getState().startSimulation(10);

    const state = useSimulationStore.getState();
    expect(state.status).toBe('running');
    expect(state.totalGames).toBe(10);
    expect(state.completedGames).toBe(0);
    expect(state.results).toHaveLength(0);
  });

  it('startSimulation clears previous results', () => {
    const store = useSimulationStore.getState();
    store.startSimulation(5);
    store.addResult({ gameId: 'g1', homeTeamId: 'a', awayTeamId: 'b', homeScore: 3, awayScore: 1 });
    store.startSimulation(10);

    expect(useSimulationStore.getState().results).toHaveLength(0);
    expect(useSimulationStore.getState().completedGames).toBe(0);
  });

  it('addResult increments completed and adds to results', () => {
    useSimulationStore.getState().startSimulation(5);
    useSimulationStore.getState().addResult({
      gameId: 'g1', homeTeamId: 'a', awayTeamId: 'b', homeScore: 4, awayScore: 2,
    });

    const state = useSimulationStore.getState();
    expect(state.completedGames).toBe(1);
    expect(state.results).toHaveLength(1);
    expect(state.results[0].homeScore).toBe(4);
  });

  it('completeSimulation sets status to complete', () => {
    useSimulationStore.getState().startSimulation(1);
    useSimulationStore.getState().addResult({
      gameId: 'g1', homeTeamId: 'a', awayTeamId: 'b', homeScore: 1, awayScore: 0,
    });
    useSimulationStore.getState().completeSimulation();

    expect(useSimulationStore.getState().status).toBe('complete');
  });

  it('setError sets status to error and message', () => {
    useSimulationStore.getState().startSimulation(5);
    useSimulationStore.getState().setError('Simulation failed');

    const state = useSimulationStore.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe('Simulation failed');
  });

  it('reset returns to initial state', () => {
    const store = useSimulationStore.getState();
    store.startSimulation(10);
    store.addResult({ gameId: 'g1', homeTeamId: 'a', awayTeamId: 'b', homeScore: 5, awayScore: 3 });
    store.reset();

    const state = useSimulationStore.getState();
    expect(state.status).toBe('idle');
    expect(state.totalGames).toBe(0);
    expect(state.results).toHaveLength(0);
  });
});
