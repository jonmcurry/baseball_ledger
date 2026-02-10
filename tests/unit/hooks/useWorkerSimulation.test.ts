// @vitest-environment jsdom
/**
 * Tests for useWorkerSimulation hook
 *
 * REQ-NFR-008: Client-side simulation in Web Worker.
 */

const { mockSimulateGameInWorker, mockTerminateWorker } = vi.hoisted(() => ({
  mockSimulateGameInWorker: vi.fn(),
  mockTerminateWorker: vi.fn(),
}));

vi.mock('@lib/simulation/worker-api', () => ({
  simulateGameInWorker: mockSimulateGameInWorker,
  terminateWorker: mockTerminateWorker,
}));

import { renderHook, act } from '@testing-library/react';
import { useWorkerSimulation } from '@hooks/useWorkerSimulation';
import type { RunGameConfig } from '@lib/simulation/game-runner';
import type { GameResult } from '@lib/types/game';

const mockConfig = {} as RunGameConfig;
const mockResult: GameResult = {
  gameId: 'g-1',
  homeTeamId: 'team-1',
  awayTeamId: 'team-2',
  homeScore: 5,
  awayScore: 3,
  innings: 9,
  winningPitcherId: 'p-1',
  losingPitcherId: 'p-2',
  savePitcherId: null,
  boxScore: {
    lineScore: { away: [0, 1, 0, 2, 0, 0, 0, 0, 0], home: [1, 0, 2, 0, 0, 0, 2, 0, 0] },
    awayHits: 6,
    homeHits: 8,
    awayErrors: 1,
    homeErrors: 0,
  },
  playByPlay: [],
  playerNames: {},
};

describe('useWorkerSimulation', () => {
  beforeEach(() => {
    mockSimulateGameInWorker.mockReset();
    mockTerminateWorker.mockReset();
  });

  it('starts in idle status', () => {
    const { result } = renderHook(() => useWorkerSimulation());
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('transitions to running then complete on success', async () => {
    mockSimulateGameInWorker.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useWorkerSimulation());

    await act(async () => {
      await result.current.simulateGame(mockConfig);
    });

    expect(result.current.status).toBe('complete');
    expect(result.current.result).toEqual(mockResult);
  });

  it('sets error status on failure', async () => {
    mockSimulateGameInWorker.mockRejectedValue(new Error('Worker crashed'));

    const { result } = renderHook(() => useWorkerSimulation());

    await act(async () => {
      await result.current.simulateGame(mockConfig);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Worker crashed');
  });

  it('resets state back to idle', async () => {
    mockSimulateGameInWorker.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useWorkerSimulation());

    await act(async () => {
      await result.current.simulateGame(mockConfig);
    });

    expect(result.current.status).toBe('complete');

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('terminates worker on unmount', () => {
    const { unmount } = renderHook(() => useWorkerSimulation());
    unmount();
    expect(mockTerminateWorker).toHaveBeenCalled();
  });
});
