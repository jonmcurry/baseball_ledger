/**
 * Tests for Server-Side Day Simulation
 *
 * REQ-NFR-014: PostgreSQL transactions for post-simulation writes.
 * REQ-NFR-016: Denormalized standings atomic update.
 *
 * Mocks the simulation engine and Supabase client to verify:
 * - runDay is called with correct params
 * - Game logs are built and committed via RPC
 * - Standings deltas are computed correctly
 * - League day is advanced after commit
 * - Errors from RPC are propagated
 */

vi.mock('@lib/simulation/season-runner', () => ({
  runDay: vi.fn(),
}));

import { simulateDayOnServer } from '../../../../api/_lib/simulate-day';
import { runDay } from '@lib/simulation/season-runner';

const mockRunDay = vi.mocked(runDay);

function createMockSupabase(options: {
  rpcError?: { message: string } | null;
  updateError?: { message: string } | null;
} = {}) {
  const rpcFn = vi.fn().mockResolvedValue({ error: options.rpcError ?? null });
  const updateBuilder = {
    eq: vi.fn().mockResolvedValue({ error: options.updateError ?? null }),
  };
  const fromFn = vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue(updateBuilder),
  });

  return {
    client: { rpc: rpcFn, from: fromFn } as any,
    rpcFn,
    fromFn,
    updateBuilder,
  };
}

const mockBoxScore = {
  lineScore: { away: [0, 0, 1, 0, 0, 2, 0, 0, 0], home: [1, 0, 0, 3, 0, 0, 2, 1, 0] },
  awayHits: 6,
  homeHits: 10,
  awayErrors: 1,
  homeErrors: 0,
};

const mockPlayByPlay = [
  {
    inning: 1, halfInning: 'top', outs: 0, batterId: 'b1', pitcherId: 'p1',
    cardPosition: 7, cardValue: 15, outcomeTableRow: 2, outcome: 15,
    description: 'Single to left', basesAfter: { first: 'b1', second: null, third: null },
    scoreAfter: { home: 0, away: 0 },
  },
];

const mockDayResult = {
  dayNumber: 5,
  games: [
    {
      gameId: 'g-1',
      homeTeamId: 'team-a',
      awayTeamId: 'team-b',
      homeScore: 7,
      awayScore: 3,
      innings: 9,
      winningPitcherId: 'p-1',
      losingPitcherId: 'p-2',
      savePitcherId: null,
      playerBattingLines: [],
      playerPitchingLines: [],
      boxScore: mockBoxScore,
      playByPlay: mockPlayByPlay,
    },
    {
      gameId: 'g-2',
      homeTeamId: 'team-c',
      awayTeamId: 'team-d',
      homeScore: 2,
      awayScore: 4,
      innings: 9,
      winningPitcherId: 'p-3',
      losingPitcherId: 'p-4',
      savePitcherId: 'p-5',
      playerBattingLines: [],
      playerPitchingLines: [],
      boxScore: mockBoxScore,
      playByPlay: [],
    },
  ],
};

describe('simulateDayOnServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunDay.mockReturnValue(mockDayResult as any);
  });

  it('calls runDay with correct parameters', async () => {
    const { client } = createMockSupabase();
    const games = [{ gameId: 'g-1' }] as any[];

    await simulateDayOnServer(client, 'league-1', 5, games, 42);

    expect(mockRunDay).toHaveBeenCalledWith(5, games, 42);
  });

  it('commits game logs and standings via RPC', async () => {
    const { client, rpcFn } = createMockSupabase();

    await simulateDayOnServer(client, 'league-1', 5, [], 42);

    expect(rpcFn).toHaveBeenCalledWith('simulate_day_commit', {
      p_league_id: 'league-1',
      p_day_number: 5,
      p_game_logs: expect.arrayContaining([
        expect.objectContaining({
          league_id: 'league-1',
          game_id: 'g-1',
          home_team_id: 'team-a',
          away_team_id: 'team-b',
          home_score: 7,
          away_score: 3,
        }),
      ]),
      p_standings_deltas: expect.objectContaining({
        'team-a': expect.objectContaining({ wins: 1, losses: 0, rs: 7, ra: 3 }),
        'team-b': expect.objectContaining({ wins: 0, losses: 1, rs: 3, ra: 7 }),
      }),
    });
  });

  it('game log entries include all columns required by the RPC schema', async () => {
    const { client, rpcFn } = createMockSupabase();

    await simulateDayOnServer(client, 'league-1', 5, [], 42);

    const gameLogEntries = rpcFn.mock.calls[0][1].p_game_logs;
    const entry = gameLogEntries[0];

    // All columns that migration 00014 adds to game_logs
    expect(entry).toHaveProperty('game_id', 'g-1');
    expect(entry).toHaveProperty('innings', 9);
    expect(entry).toHaveProperty('winning_pitcher_id', 'p-1');
    expect(entry).toHaveProperty('losing_pitcher_id', 'p-2');
    expect(entry).toHaveProperty('save_pitcher_id', null);
    expect(entry).toHaveProperty('batting_lines');
    expect(entry).toHaveProperty('pitching_lines');
  });

  it('computes standings deltas correctly for multiple games', async () => {
    const { client, rpcFn } = createMockSupabase();

    await simulateDayOnServer(client, 'league-1', 5, [], 42);

    const rpcCall = rpcFn.mock.calls[0];
    const deltas = rpcCall[1].p_standings_deltas;

    // Game 1: team-a 7, team-b 3 (team-a wins)
    expect(deltas['team-a']).toEqual({ wins: 1, losses: 0, rs: 7, ra: 3 });
    expect(deltas['team-b']).toEqual({ wins: 0, losses: 1, rs: 3, ra: 7 });

    // Game 2: team-c 2, team-d 4 (team-d wins)
    expect(deltas['team-c']).toEqual({ wins: 0, losses: 1, rs: 2, ra: 4 });
    expect(deltas['team-d']).toEqual({ wins: 1, losses: 0, rs: 4, ra: 2 });
  });

  it('advances league current_day after successful commit', async () => {
    const { client, fromFn, updateBuilder } = createMockSupabase();

    await simulateDayOnServer(client, 'league-1', 5, [], 42);

    expect(fromFn).toHaveBeenCalledWith('leagues');
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'league-1');
  });

  it('includes box_score and play_by_play in game log entries', async () => {
    const { client, rpcFn } = createMockSupabase();

    await simulateDayOnServer(client, 'league-1', 5, [], 42);

    const gameLogEntries = rpcFn.mock.calls[0][1].p_game_logs;
    const entry = gameLogEntries[0];

    expect(entry).toHaveProperty('box_score');
    expect(entry).toHaveProperty('play_by_play');
    // Verify they are JSON stringified
    const boxScore = JSON.parse(entry.box_score);
    expect(boxScore).toHaveProperty('lineScore');
    expect(boxScore).toHaveProperty('awayHits', 6);
    expect(boxScore).toHaveProperty('homeHits', 10);
  });

  it('throws on RPC error', async () => {
    const { client } = createMockSupabase({ rpcError: { message: 'DB down' } });

    await expect(simulateDayOnServer(client, 'league-1', 5, [], 42))
      .rejects.toEqual(expect.objectContaining({
        category: 'EXTERNAL',
        code: 'SIMULATION_COMMIT_FAILED',
      }));
  });

  it('throws on league update error', async () => {
    const { client } = createMockSupabase({ updateError: { message: 'Update failed' } });

    await expect(simulateDayOnServer(client, 'league-1', 5, [], 42))
      .rejects.toEqual(expect.objectContaining({
        category: 'EXTERNAL',
        code: 'LEAGUE_UPDATE_FAILED',
      }));
  });

  it('returns the DayResult from runDay', async () => {
    const { client } = createMockSupabase();

    const result = await simulateDayOnServer(client, 'league-1', 5, [], 42);

    expect(result.dayNumber).toBe(5);
    expect(result.games).toHaveLength(2);
  });
});
