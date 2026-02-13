/**
 * Tests for Season Stats Accumulation (REQ-STS-001)
 *
 * Verifies that batting/pitching lines from game results are correctly
 * accumulated into the season_stats table after each simulated day.
 *
 * TDD: These tests are written first, before the implementation.
 */

import type { DayResult } from '@lib/simulation/season-runner';
import type { BattingLine, PitchingLine } from '@lib/types/game';

// Mock will be resolved once the module exists
vi.mock('@lib/stats/accumulator', async () => {
  const actual = await vi.importActual('@lib/stats/accumulator');
  return actual;
});

import { accumulateSeasonStats } from '../../../../api/_lib/accumulate-season-stats';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBattingLine(overrides: Partial<BattingLine> = {}): BattingLine {
  return {
    playerId: 'batter01',
    AB: 4, R: 1, H: 2, doubles: 1, triples: 0, HR: 0,
    RBI: 1, BB: 0, SO: 1, SB: 0, CS: 0, HBP: 0, SF: 0,
    ...overrides,
  };
}

function makePitchingLine(overrides: Partial<PitchingLine> = {}): PitchingLine {
  return {
    playerId: 'pitcher01',
    IP: 6.0, H: 5, R: 2, ER: 2, BB: 2, SO: 7, HR: 1, BF: 25,
    decision: null,
    ...overrides,
  };
}

function makeDayResult(games: DayResult['games']): DayResult {
  return { dayNumber: 5, games };
}

function makeCompactGame(overrides: Partial<DayResult['games'][0]> = {}): DayResult['games'][0] {
  return {
    gameId: 'g-1',
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    homeScore: 5,
    awayScore: 3,
    innings: 9,
    winningPitcherId: 'pitcher01',
    losingPitcherId: 'pitcher02',
    savePitcherId: null,
    playerBattingLines: [
      makeBattingLine({ playerId: 'batter01', AB: 4, H: 2, HR: 1, RBI: 3 }),
      makeBattingLine({ playerId: 'batter02', AB: 3, H: 1, HR: 0, RBI: 0 }),
    ],
    playerPitchingLines: [
      makePitchingLine({ playerId: 'pitcher01', IP: 7.0, H: 5, ER: 2, SO: 8, decision: 'W' }),
      makePitchingLine({ playerId: 'pitcher02', IP: 6.0, H: 7, ER: 4, SO: 5, decision: 'L' }),
    ],
    ...overrides,
  };
}

/**
 * Create a mock Supabase client for testing accumulation.
 *
 * Options:
 * - existingStats: pre-existing season_stats rows (for accumulation into existing)
 * - rosterRows: roster rows mapping player_id -> team_id
 * - selectError: simulate a select failure
 * - upsertError: simulate an upsert failure
 */
function createMockSupabase(options: {
  existingStats?: Array<{
    player_id: string;
    batting_stats: Record<string, number> | null;
    pitching_stats: Record<string, number> | null;
  }>;
  rosterRows?: Array<{ player_id: string; team_id: string }>;
  selectError?: { message: string } | null;
  upsertError?: { message: string } | null;
} = {}) {
  const existingStats = options.existingStats ?? [];
  const rosterRows = options.rosterRows ?? [
    { player_id: 'batter01', team_id: 'team-a' },
    { player_id: 'batter02', team_id: 'team-b' },
    { player_id: 'pitcher01', team_id: 'team-a' },
    { player_id: 'pitcher02', team_id: 'team-b' },
  ];

  const upsertFn = vi.fn().mockReturnValue({
    error: options.upsertError ?? null,
  });

  // Build the chainable query mock for select
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((resolve: (value: unknown) => void) => {
      resolve({
        data: existingStats,
        error: options.selectError ?? null,
      });
    }),
  };

  // Track which table was queried
  const fromFn = vi.fn().mockImplementation((table: string) => {
    if (table === 'season_stats') {
      return {
        select: vi.fn().mockReturnValue(selectChain),
        upsert: upsertFn,
      };
    }
    if (table === 'rosters') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: rosterRows,
              error: null,
            }),
          }),
        }),
      };
    }
    return { select: vi.fn() };
  });

  return {
    client: { from: fromFn } as any,
    fromFn,
    upsertFn,
    selectChain,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('accumulateSeasonStats', () => {
  it('upserts season_stats rows for all players in the day result', async () => {
    const game = makeCompactGame();
    const dayResult = makeDayResult([game]);
    const starterIds = new Set(['pitcher01', 'pitcher02']);
    const { client, upsertFn } = createMockSupabase();

    await accumulateSeasonStats(client, 'league-1', 2020, dayResult, starterIds);

    // Should upsert stats for all 4 players (2 batters + 2 pitchers)
    expect(upsertFn).toHaveBeenCalled();
    const upsertedRows = upsertFn.mock.calls[0][0] as Array<Record<string, unknown>>;
    const playerIds = upsertedRows.map((r) => r.player_id);
    expect(playerIds).toContain('batter01');
    expect(playerIds).toContain('batter02');
    expect(playerIds).toContain('pitcher01');
    expect(playerIds).toContain('pitcher02');
  });

  it('correctly accumulates batting stats for a new player', async () => {
    const game = makeCompactGame({
      playerBattingLines: [
        makeBattingLine({ playerId: 'batter01', AB: 4, H: 2, HR: 1, RBI: 3, BB: 1 }),
      ],
      playerPitchingLines: [],
    });
    const dayResult = makeDayResult([game]);
    const { client, upsertFn } = createMockSupabase();

    await accumulateSeasonStats(client, 'league-1', 2020, dayResult, new Set());

    const upsertedRows = upsertFn.mock.calls[0][0] as Array<Record<string, unknown>>;
    const batter = upsertedRows.find((r) => r.player_id === 'batter01');
    expect(batter).toBeDefined();

    const battingStats = batter!.batting_stats as Record<string, number>;
    expect(battingStats.G).toBe(1);
    expect(battingStats.AB).toBe(4);
    expect(battingStats.H).toBe(2);
    expect(battingStats.HR).toBe(1);
    expect(battingStats.RBI).toBe(3);
    expect(battingStats.BB).toBe(1);
    expect(battingStats.BA).toBeCloseTo(0.5, 3);
  });

  it('correctly accumulates pitching stats with GS for starters', async () => {
    const game = makeCompactGame({
      playerBattingLines: [],
      playerPitchingLines: [
        makePitchingLine({ playerId: 'pitcher01', IP: 7.0, ER: 2, SO: 8, decision: 'W' }),
        makePitchingLine({ playerId: 'pitcher02', IP: 2.0, ER: 0, SO: 3, decision: 'SV' }),
      ],
    });
    const dayResult = makeDayResult([game]);
    // Only pitcher01 is a starter
    const starterIds = new Set(['pitcher01']);
    const { client, upsertFn } = createMockSupabase();

    await accumulateSeasonStats(client, 'league-1', 2020, dayResult, starterIds);

    const upsertedRows = upsertFn.mock.calls[0][0] as Array<Record<string, unknown>>;

    const starter = upsertedRows.find((r) => r.player_id === 'pitcher01');
    const pitchingStats1 = starter!.pitching_stats as Record<string, number>;
    expect(pitchingStats1.G).toBe(1);
    expect(pitchingStats1.GS).toBe(1);
    expect(pitchingStats1.W).toBe(1);

    const reliever = upsertedRows.find((r) => r.player_id === 'pitcher02');
    const pitchingStats2 = reliever!.pitching_stats as Record<string, number>;
    expect(pitchingStats2.G).toBe(1);
    expect(pitchingStats2.GS).toBe(0);
    expect(pitchingStats2.SV).toBe(1);
  });

  it('accumulates into existing season stats', async () => {
    // Simulate a player who already has stats from a previous day
    const existingBatting = {
      G: 10, AB: 40, R: 5, H: 12, doubles: 2, triples: 0, HR: 2,
      RBI: 8, SB: 1, CS: 0, BB: 3, SO: 8, IBB: 0, HBP: 0, SH: 0, SF: 0, GIDP: 0,
      BA: 0.300, OBP: 0.349, SLG: 0.475, OPS: 0.824,
    };

    const game = makeCompactGame({
      playerBattingLines: [
        makeBattingLine({ playerId: 'batter01', AB: 4, H: 2, HR: 1, RBI: 3 }),
      ],
      playerPitchingLines: [],
    });
    const dayResult = makeDayResult([game]);
    const { client, upsertFn } = createMockSupabase({
      existingStats: [
        { player_id: 'batter01', batting_stats: existingBatting, pitching_stats: null },
      ],
    });

    await accumulateSeasonStats(client, 'league-1', 2020, dayResult, new Set());

    const upsertedRows = upsertFn.mock.calls[0][0] as Array<Record<string, unknown>>;
    const batter = upsertedRows.find((r) => r.player_id === 'batter01');
    const battingStats = batter!.batting_stats as Record<string, number>;

    // Should be accumulated: 10+1=11 games, 40+4=44 AB, 12+2=14 H, 2+1=3 HR
    expect(battingStats.G).toBe(11);
    expect(battingStats.AB).toBe(44);
    expect(battingStats.H).toBe(14);
    expect(battingStats.HR).toBe(3);
    expect(battingStats.RBI).toBe(11);
  });

  it('sets correct league_id, season_year, and team_id on upserted rows', async () => {
    const game = makeCompactGame({
      playerBattingLines: [
        makeBattingLine({ playerId: 'batter01' }),
      ],
      playerPitchingLines: [],
    });
    const dayResult = makeDayResult([game]);
    const { client, upsertFn } = createMockSupabase({
      rosterRows: [{ player_id: 'batter01', team_id: 'team-a' }],
    });

    await accumulateSeasonStats(client, 'league-1', 2020, dayResult, new Set());

    const upsertedRows = upsertFn.mock.calls[0][0] as Array<Record<string, unknown>>;
    const batter = upsertedRows.find((r) => r.player_id === 'batter01');
    expect(batter!.league_id).toBe('league-1');
    expect(batter!.season_year).toBe(2020);
    expect(batter!.team_id).toBe('team-a');
  });

  it('handles multiple games in a single day', async () => {
    const game1 = makeCompactGame({
      gameId: 'g-1',
      homeTeamId: 'team-a',
      awayTeamId: 'team-b',
      playerBattingLines: [
        makeBattingLine({ playerId: 'batter01', AB: 4, H: 2 }),
      ],
      playerPitchingLines: [],
    });
    const game2 = makeCompactGame({
      gameId: 'g-2',
      homeTeamId: 'team-c',
      awayTeamId: 'team-d',
      playerBattingLines: [
        makeBattingLine({ playerId: 'batter03', AB: 3, H: 1 }),
      ],
      playerPitchingLines: [],
    });
    const dayResult = makeDayResult([game1, game2]);
    const { client, upsertFn } = createMockSupabase({
      rosterRows: [
        { player_id: 'batter01', team_id: 'team-a' },
        { player_id: 'batter03', team_id: 'team-c' },
      ],
    });

    await accumulateSeasonStats(client, 'league-1', 2020, dayResult, new Set());

    const upsertedRows = upsertFn.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(upsertedRows.length).toBe(2);
    expect(upsertedRows.map((r) => r.player_id)).toContain('batter01');
    expect(upsertedRows.map((r) => r.player_id)).toContain('batter03');
  });

  it('uses onConflict for league_id+player_id upsert', async () => {
    const game = makeCompactGame({
      playerBattingLines: [makeBattingLine({ playerId: 'batter01' })],
      playerPitchingLines: [],
    });
    const dayResult = makeDayResult([game]);
    const { client, upsertFn } = createMockSupabase();

    await accumulateSeasonStats(client, 'league-1', 2020, dayResult, new Set());

    // The upsert should specify onConflict for the unique constraint
    expect(upsertFn).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ onConflict: 'league_id,player_id' }),
    );
  });

  it('throws on upsert error', async () => {
    const game = makeCompactGame({
      playerBattingLines: [makeBattingLine({ playerId: 'batter01' })],
      playerPitchingLines: [],
    });
    const dayResult = makeDayResult([game]);
    const { client } = createMockSupabase({
      upsertError: { message: 'DB write failed' },
    });

    await expect(
      accumulateSeasonStats(client, 'league-1', 2020, dayResult, new Set()),
    ).rejects.toEqual(
      expect.objectContaining({
        category: 'EXTERNAL',
        code: 'STATS_ACCUMULATION_FAILED',
      }),
    );
  });

  it('skips accumulation when day has no games', async () => {
    const dayResult = makeDayResult([]);
    const { client, upsertFn } = createMockSupabase();

    await accumulateSeasonStats(client, 'league-1', 2020, dayResult, new Set());

    expect(upsertFn).not.toHaveBeenCalled();
  });
});
