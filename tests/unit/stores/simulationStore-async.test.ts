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
    let resolveStart!: (value: { simulationId: string }) => void;
    vi.mocked(simulationService.startSimulation).mockReturnValue(
      new Promise((resolve) => { resolveStart = resolve; }),
    );

    const promise = useSimulationStore.getState().runSimulation('league-1', 7);
    expect(useSimulationStore.getState().status).toBe('running');

    resolveStart({ simulationId: 'sim-1' });
    await promise;
  });

  it('runSimulation with days=1 sets status to complete on success (sync)', async () => {
    vi.mocked(simulationService.startSimulation).mockResolvedValue({
      result: { dayNumber: 42, games: [] },
    });

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
