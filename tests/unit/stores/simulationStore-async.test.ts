/**
 * Tests for Simulation Store -- async actions
 *
 * Covers runSimulation, subscribeToSimProgress, unsubscribeFromSimProgress.
 * REQ-STATE-012 through REQ-STATE-014.
 */

vi.mock('@services/simulation-service', () => ({
  startSimulation: vi.fn(),
  subscribeToProgress: vi.fn(),
  unsubscribeFromProgress: vi.fn(),
}));

import { useSimulationStore } from '../../../src/stores/simulationStore';
import * as simulationService from '@services/simulation-service';

describe('simulationStore async actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSimulationStore.getState().reset();
  });

  // -----------------------------------------------------------------------
  // runSimulation
  // -----------------------------------------------------------------------

  it('runSimulation sets status to running', async () => {
    let resolveStart!: (value: { dayNumber: number; games: unknown[] }) => void;
    vi.mocked(simulationService.startSimulation).mockReturnValue(
      new Promise((resolve) => { resolveStart = resolve; }),
    );

    const promise = useSimulationStore.getState().runSimulation('league-1', 7);
    expect(useSimulationStore.getState().status).toBe('running');

    resolveStart({ dayNumber: 1, games: [] });
    await promise;
  });

  it('runSimulation with days=1 sets status to complete on success (sync)', async () => {
    vi.mocked(simulationService.startSimulation).mockResolvedValue(
      { dayNumber: 42, games: [] },
    );

    await useSimulationStore.getState().runSimulation('league-1', 1);

    expect(useSimulationStore.getState().status).toBe('complete');
  });

  it('runSimulation sets status to error on failure', async () => {
    vi.mocked(simulationService.startSimulation).mockRejectedValue(new Error('Sim crashed'));

    await useSimulationStore.getState().runSimulation('league-1', 1);

    expect(useSimulationStore.getState().status).toBe('error');
  });

  it('runSimulation preserves error message', async () => {
    vi.mocked(simulationService.startSimulation).mockRejectedValue(
      new Error('Server timeout during simulation'),
    );

    await useSimulationStore.getState().runSimulation('league-1', 7);

    expect(useSimulationStore.getState().error).toBe('Server timeout during simulation');
  });

  // -----------------------------------------------------------------------
  // runSimulation -- multi-day loop (REQ-NFR-021 chunked simulation)
  // -----------------------------------------------------------------------

  it('runSimulation with days=7 calls startSimulation 7 times', async () => {
    vi.mocked(simulationService.startSimulation).mockResolvedValue(
      { dayNumber: 1, games: [{ id: 'g1' }] },
    );

    await useSimulationStore.getState().runSimulation('league-1', 7);

    expect(simulationService.startSimulation).toHaveBeenCalledTimes(7);
    // Every call passes only leagueId (days=1 is internal to the service)
    for (const call of vi.mocked(simulationService.startSimulation).mock.calls) {
      expect(call).toEqual(['league-1']);
    }
  });

  it('runSimulation updates currentDay after each iteration', async () => {
    const dayStates: number[] = [];
    vi.mocked(simulationService.startSimulation).mockImplementation(async () => {
      // Capture currentDay from within the loop (after the previous iteration's set)
      dayStates.push(useSimulationStore.getState().currentDay);
      return { dayNumber: 1, games: [{ id: 'g1' }] };
    });

    await useSimulationStore.getState().runSimulation('league-1', 3);

    const state = useSimulationStore.getState();
    expect(state.currentDay).toBe(3);
    expect(state.status).toBe('complete');
  });

  it('runSimulation breaks early when no games returned', async () => {
    let callCount = 0;
    vi.mocked(simulationService.startSimulation).mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) {
        return { dayNumber: callCount, games: [{ id: `g${callCount}` }] };
      }
      return { dayNumber: callCount, games: [] };
    });

    await useSimulationStore.getState().runSimulation('league-1', 7);

    // Should stop after 3 calls (2 with games + 1 empty)
    expect(simulationService.startSimulation).toHaveBeenCalledTimes(3);
    const state = useSimulationStore.getState();
    expect(state.status).toBe('complete');
    expect(state.currentDay).toBe(3);
    expect(state.totalDays).toBe(3);
  });

  it('runSimulation with days=season loops until no games', async () => {
    let callCount = 0;
    vi.mocked(simulationService.startSimulation).mockImplementation(async () => {
      callCount++;
      if (callCount <= 5) {
        return { dayNumber: callCount, games: [{ id: `g${callCount}` }] };
      }
      return { dayNumber: callCount, games: [] };
    });

    await useSimulationStore.getState().runSimulation('league-1', 'season');

    expect(simulationService.startSimulation).toHaveBeenCalledTimes(6);
    const state = useSimulationStore.getState();
    expect(state.status).toBe('complete');
    expect(state.totalDays).toBe(6);
  });

  it('runSimulation sets error on mid-loop failure', async () => {
    let callCount = 0;
    vi.mocked(simulationService.startSimulation).mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) {
        return { dayNumber: callCount, games: [{ id: `g${callCount}` }] };
      }
      throw new Error('Day 3 server error');
    });

    await useSimulationStore.getState().runSimulation('league-1', 7);

    const state = useSimulationStore.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe('Day 3 server error');
    // Progress should reflect the 2 successful days
    expect(state.currentDay).toBe(2);
  });

  it('runSimulation sets totalDays and currentDay in initial state', async () => {
    vi.mocked(simulationService.startSimulation).mockResolvedValue(
      { dayNumber: 1, games: [{ id: 'g1' }] },
    );

    await useSimulationStore.getState().runSimulation('league-1', 30);

    const state = useSimulationStore.getState();
    expect(state.status).toBe('complete');
    expect(state.currentDay).toBe(30);
    expect(state.totalDays).toBe(30);
  });

  // -----------------------------------------------------------------------
  // subscribeToSimProgress
  // -----------------------------------------------------------------------

  it('subscribeToSimProgress calls simulationService.subscribeToProgress', () => {
    vi.mocked(simulationService.subscribeToProgress).mockImplementation(() => {});

    useSimulationStore.getState().subscribeToSimProgress('league-1');

    expect(simulationService.subscribeToProgress).toHaveBeenCalledWith(
      'league-1',
      expect.any(Function),
    );
  });

  it('subscribeToSimProgress updates store when callback fires', () => {
    let capturedCallback!: (progress: {
      totalGames: number;
      completedGames: number;
      status: string;
      errorMessage?: string;
    }) => void;

    vi.mocked(simulationService.subscribeToProgress).mockImplementation(
      (_leagueId, callback) => {
        capturedCallback = callback as typeof capturedCallback;
      },
    );

    useSimulationStore.getState().subscribeToSimProgress('league-1');

    // Simulate a progress update from the channel
    capturedCallback({
      totalGames: 20,
      completedGames: 10,
      status: 'running',
    });

    const state = useSimulationStore.getState();
    expect(state.totalGames).toBe(20);
    expect(state.completedGames).toBe(10);
    expect(state.status).toBe('running');
    expect(state.error).toBeNull();
  });

  // -----------------------------------------------------------------------
  // unsubscribeFromSimProgress
  // -----------------------------------------------------------------------

  it('unsubscribeFromSimProgress calls simulationService.unsubscribeFromProgress', () => {
    vi.mocked(simulationService.unsubscribeFromProgress).mockImplementation(() => {});

    useSimulationStore.getState().unsubscribeFromSimProgress();

    expect(simulationService.unsubscribeFromProgress).toHaveBeenCalled();
  });
});
