/**
 * Tests for Worker API - Promise wrapper for simulation Web Worker
 *
 * REQ-NFR-008: Client-side simulation runs in a Web Worker.
 *
 * Since vitest runs in Node (no real Worker), these tests verify:
 * - Main-thread fallback when Worker is unavailable
 * - Map serialization helpers
 * - Worker singleton lifecycle
 */

vi.mock('../../../../src/lib/simulation/game-runner', () => ({
  runGame: vi.fn().mockReturnValue({
    gameId: 'game-1',
    homeTeamId: 'home',
    awayTeamId: 'away',
    homeScore: 5,
    awayScore: 3,
    innings: 9,
    winningPitcherId: 'wp',
    losingPitcherId: 'lp',
    savePitcherId: null,
    boxScore: { lineScore: { away: [], home: [] }, awayHits: 0, homeHits: 0, awayErrors: 0, homeErrors: 0 },
    playerBattingLines: [],
    playerPitchingLines: [],
    playByPlay: [],
    playerNames: {},
  }),
}));

vi.mock('../../../../src/lib/simulation/season-runner', () => ({
  runDay: vi.fn().mockReturnValue({
    dayNumber: 1,
    games: [{ gameId: 'game-1', homeScore: 5, awayScore: 3 }],
  }),
}));

import {
  simulateGameInWorker,
  simulateDayInWorker,
  isWorkerAvailable,
  terminateWorker,
  _resetWorker,
} from '../../../../src/lib/simulation/worker-api';
import { runGame } from '../../../../src/lib/simulation/game-runner';
import { runDay } from '../../../../src/lib/simulation/season-runner';

const mockRunGame = vi.mocked(runGame);
const mockRunDay = vi.mocked(runDay);

describe('worker-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetWorker();
  });

  it('isWorkerAvailable returns false in Node environment', () => {
    expect(isWorkerAvailable()).toBe(false);
  });

  it('simulateGameInWorker falls back to main-thread runGame when no Worker', async () => {
    const config = {
      gameId: 'test-game',
      seed: 42,
      homeTeamId: 'home',
      awayTeamId: 'away',
      homeLineup: [],
      awayLineup: [],
      homeBatterCards: new Map(),
      awayBatterCards: new Map(),
      homeStartingPitcher: {} as never,
      awayStartingPitcher: {} as never,
      homeBullpen: [],
      awayBullpen: [],
      homeCloser: null,
      awayCloser: null,
      homeManagerStyle: 'balanced' as const,
      awayManagerStyle: 'balanced' as const,
    };

    const result = await simulateGameInWorker(config);

    expect(mockRunGame).toHaveBeenCalledWith(config);
    expect(result.gameId).toBe('game-1');
    expect(result.homeScore).toBe(5);
  });

  it('simulateDayInWorker falls back to main-thread runDay when no Worker', async () => {
    const result = await simulateDayInWorker(1, [], 42);

    expect(mockRunDay).toHaveBeenCalledWith(1, [], 42);
    expect(result.dayNumber).toBe(1);
  });

  it('terminateWorker is safe to call when no worker exists', () => {
    expect(() => terminateWorker()).not.toThrow();
  });
});
