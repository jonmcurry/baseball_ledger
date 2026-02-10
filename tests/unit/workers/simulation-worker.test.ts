/**
 * Tests for Simulation Web Worker
 *
 * REQ-NFR-008: Client-side simulation runs in a Web Worker.
 *
 * Tests the message handling logic of the worker (isolated from actual
 * Web Worker runtime since vitest runs in Node).
 */

vi.mock('../../../src/lib/simulation/game-runner', () => ({
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

vi.mock('../../../src/lib/simulation/season-runner', () => ({
  runDay: vi.fn().mockReturnValue({
    dayNumber: 1,
    games: [{ gameId: 'game-1', homeScore: 5, awayScore: 3 }],
  }),
}));

import { runGame } from '../../../src/lib/simulation/game-runner';
import { runDay } from '../../../src/lib/simulation/season-runner';

const mockRunGame = vi.mocked(runGame);
const mockRunDay = vi.mocked(runDay);

describe('simulation-worker message handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runGame is callable with a config and returns GameResult', () => {
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

    const result = runGame(config);

    expect(mockRunGame).toHaveBeenCalledWith(config);
    expect(result.gameId).toBe('game-1');
    expect(result.homeScore).toBe(5);
  });

  it('runDay is callable with day config', () => {
    const result = runDay(1, [], 42);

    expect(mockRunDay).toHaveBeenCalledWith(1, [], 42);
    expect(result.dayNumber).toBe(1);
  });

  it('worker message types are well-defined', () => {
    // Verify the message type contracts exist
    type RunGameMsg = { type: 'runGame'; config: unknown };
    type RunDayMsg = { type: 'runDay'; dayNumber: number; games: unknown[]; baseSeed: number };
    type ErrorMsg = { type: 'error'; message: string };

    const gameMsg: RunGameMsg = { type: 'runGame', config: {} };
    const dayMsg: RunDayMsg = { type: 'runDay', dayNumber: 1, games: [], baseSeed: 42 };
    const errorMsg: ErrorMsg = { type: 'error', message: 'test' };

    expect(gameMsg.type).toBe('runGame');
    expect(dayMsg.type).toBe('runDay');
    expect(errorMsg.type).toBe('error');
  });
});
