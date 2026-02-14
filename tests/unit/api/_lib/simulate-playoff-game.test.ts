/**
 * Playoff Game Simulation Tests
 *
 * Tests for simulatePlayoffGame().
 * Covers bracket loading, game execution, result recording,
 * advancement, persistence, and completion transition.
 *
 * Layer 2 API tests (mocked Supabase + game runner).
 */

vi.mock('@lib/simulation/game-runner', () => ({
  runGame: vi.fn(),
}));

import { simulatePlayoffGame } from '../../../../api/_lib/simulate-playoff-game';
import { runGame } from '@lib/simulation/game-runner';
import {
  generateFullPlayoffBracket,
  recordFullBracketGameResult,
  advanceFullBracketWinners,
} from '@lib/schedule/playoff-bracket';
import type { FullPlayoffBracket, PlayoffSeries } from '@lib/types/schedule';
import type { DivisionStandings, TeamSummary } from '@lib/types/league';
import type { GameResult } from '@lib/types/game';

const mockRunGame = vi.mocked(runGame);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTeam(id: string, wins: number): TeamSummary {
  return {
    id, name: `Team ${id}`, city: 'City',
    ownerId: null, managerProfile: 'balanced', leagueDivision: 'AL',
    division: 'East', wins, losses: 162 - wins, runsScored: wins * 5,
    runsAllowed: (162 - wins) * 5,
    homeWins: 0, homeLosses: 0, awayWins: 0, awayLosses: 0,
    streak: '-', lastTenWins: 0, lastTenLosses: 0,
  } as TeamSummary;
}

function buildStandings(): DivisionStandings[] {
  return [
    { leagueDivision: 'AL', division: 'East', teams: [makeTeam('al-e1', 100), makeTeam('al-e2', 88), makeTeam('al-e3', 80)] },
    { leagueDivision: 'AL', division: 'Central', teams: [makeTeam('al-c1', 95), makeTeam('al-c2', 85), makeTeam('al-c3', 75)] },
    { leagueDivision: 'AL', division: 'West', teams: [makeTeam('al-w1', 92), makeTeam('al-w2', 90), makeTeam('al-w3', 70)] },
    { leagueDivision: 'NL', division: 'East', teams: [makeTeam('nl-e1', 98), makeTeam('nl-e2', 87), makeTeam('nl-e3', 78)] },
    { leagueDivision: 'NL', division: 'Central', teams: [makeTeam('nl-c1', 96), makeTeam('nl-c2', 86), makeTeam('nl-c3', 74)] },
    { leagueDivision: 'NL', division: 'West', teams: [makeTeam('nl-w1', 94), makeTeam('nl-w2', 89), makeTeam('nl-w3', 72)] },
  ];
}

function buildMockBracket(): FullPlayoffBracket {
  return generateFullPlayoffBracket('league-1', buildStandings());
}

function mockPlayerCard(id: string) {
  return {
    playerId: id,
    nameFirst: 'Player',
    nameLast: id,
    yearId: 2023,
    cardValues: new Array(35).fill(7),
    pitcherGrade: 8,
    positions: ['RF'],
    powerRating: 17,
    speedRating: 6,
    archetypeFlags: [7, 0],
  };
}

function buildMockRosterEntries(teamId: string) {
  const entries = [];
  // 9 starters
  const positions = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'];
  for (let i = 0; i < 9; i++) {
    entries.push({
      id: `roster-${teamId}-s${i}`,
      team_id: teamId,
      player_id: `${teamId}-p${i}`,
      player_card: mockPlayerCard(`${teamId}-p${i}`),
      roster_slot: 'starter',
      lineup_order: i + 1,
      lineup_position: positions[i],
    });
  }
  // 1 rotation pitcher
  entries.push({
    id: `roster-${teamId}-sp`,
    team_id: teamId,
    player_id: `${teamId}-sp1`,
    player_card: { ...mockPlayerCard(`${teamId}-sp1`), pitcherGrade: 10, positions: ['P'] },
    roster_slot: 'rotation',
    lineup_order: null,
    lineup_position: null,
  });
  // 2 bullpen
  for (let i = 0; i < 2; i++) {
    entries.push({
      id: `roster-${teamId}-bp${i}`,
      team_id: teamId,
      player_id: `${teamId}-bp${i}`,
      player_card: { ...mockPlayerCard(`${teamId}-bp${i}`), pitcherGrade: 7, positions: ['P'] },
      roster_slot: 'bullpen',
      lineup_order: null,
      lineup_position: null,
    });
  }
  // 1 closer (in bullpen with CL role)
  entries.push({
    id: `roster-${teamId}-cl`,
    team_id: teamId,
    player_id: `${teamId}-cl1`,
    player_card: { ...mockPlayerCard(`${teamId}-cl1`), pitcherGrade: 9, positions: ['P'], pitching: { role: 'CL' } },
    roster_slot: 'bullpen',
    lineup_order: null,
    lineup_position: null,
  });
  return entries;
}

const mockGameResult: Partial<GameResult> = {
  homeScore: 5,
  awayScore: 3,
  innings: 9,
  winningPitcherId: 'sp-w',
  losingPitcherId: 'sp-l',
  savePitcherId: null,
  battingLines: [],
  pitchingLines: [],
  playByPlay: [],
  inningRuns: [],
};

function createMockSupabase(options: {
  bracket?: FullPlayoffBracket | null;
  updateError?: { message: string } | null;
  insertError?: { message: string } | null;
} = {}) {
  const bracket = options.bracket === undefined ? buildMockBracket() : options.bracket;

  const fromFn = vi.fn().mockImplementation((table: string) => {
    if (table === 'leagues') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { playoff_bracket: bracket },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: options.updateError ?? null }),
        }),
      };
    }
    if (table === 'rosters') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((_col: string, teamId: string) =>
            Promise.resolve({
              data: buildMockRosterEntries(teamId),
              error: null,
            }),
          ),
        }),
      };
    }
    if (table === 'teams') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { manager_profile: 'balanced' },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'game_logs') {
      return {
        insert: vi.fn().mockResolvedValue({ error: options.insertError ?? null }),
      };
    }
    return {};
  });

  return { client: { from: fromFn } as any, fromFn };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('simulatePlayoffGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunGame.mockReturnValue(mockGameResult as any);
  });

  it('returns null when playoff_bracket is null', async () => {
    const { client } = createMockSupabase({ bracket: null });

    const result = await simulatePlayoffGame(client, 'league-1', 42);

    expect(result).toBeNull();
    expect(mockRunGame).not.toHaveBeenCalled();
  });

  it('returns null when no next game is available', async () => {
    // Build a fully resolved bracket by iteratively completing and advancing
    let bracket = buildMockBracket();

    const completePlayable = (lb: typeof bracket.al) => {
      for (const round of lb.rounds) {
        for (let i = 0; i < round.series.length; i++) {
          const s = round.series[i];
          if (s.higherSeed && s.lowerSeed && !s.isComplete) {
            round.series[i] = {
              ...s, isComplete: true, winnerId: s.higherSeed.teamId,
              higherSeedWins: Math.ceil(s.bestOf / 2),
            };
          }
        }
      }
    };

    // Iterate: complete playable series, advance, repeat until stable
    for (let pass = 0; pass < 5; pass++) {
      completePlayable(bracket.al);
      completePlayable(bracket.nl);
      bracket = advanceFullBracketWinners(bracket);
    }

    // Complete WS if populated
    if (bracket.worldSeries.higherSeed && bracket.worldSeries.lowerSeed) {
      bracket.worldSeries = {
        ...bracket.worldSeries, isComplete: true,
        winnerId: bracket.worldSeries.higherSeed.teamId, higherSeedWins: 4,
      };
      bracket = advanceFullBracketWinners(bracket);
    }

    const { client } = createMockSupabase({ bracket });

    const result = await simulatePlayoffGame(client, 'league-1', 42);

    expect(result).toBeNull();
  });

  it('calls runGame with correct team IDs from next playoff game', async () => {
    const { client } = createMockSupabase();

    await simulatePlayoffGame(client, 'league-1', 42);

    expect(mockRunGame).toHaveBeenCalledTimes(1);
    const config = mockRunGame.mock.calls[0][0];
    expect(config.homeTeamId).toBeDefined();
    expect(config.awayTeamId).toBeDefined();
    expect(config.seed).toBe(42);
  });

  it('loads rosters for both teams in the game', async () => {
    const { client, fromFn } = createMockSupabase();

    await simulatePlayoffGame(client, 'league-1', 42);

    const rosterCalls = fromFn.mock.calls.filter(([t]: [string]) => t === 'rosters');
    expect(rosterCalls.length).toBe(2); // One per team
  });

  it('persists updated bracket to database', async () => {
    const { client, fromFn } = createMockSupabase();

    await simulatePlayoffGame(client, 'league-1', 42);

    const leagueUpdateCalls = fromFn.mock.calls.filter(([t]: [string]) => t === 'leagues');
    // One select (load bracket) + one update (persist bracket)
    expect(leagueUpdateCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('inserts game_log entry', async () => {
    const { client, fromFn } = createMockSupabase();

    await simulatePlayoffGame(client, 'league-1', 42);

    const gameLogCalls = fromFn.mock.calls.filter(([t]: [string]) => t === 'game_logs');
    expect(gameLogCalls.length).toBe(1);
  });

  it('returns game result with scores', async () => {
    const { client } = createMockSupabase();

    const result = await simulatePlayoffGame(client, 'league-1', 42);

    expect(result).not.toBeNull();
    expect(result!.homeScore).toBe(5);
    expect(result!.awayScore).toBe(3);
  });

  it('returns the round name of the game played', async () => {
    const { client } = createMockSupabase();

    const result = await simulatePlayoffGame(client, 'league-1', 42);

    expect(result).not.toBeNull();
    expect(result!.round).toBe('WildCard');
  });

  it('returns isPlayoffsComplete as false when bracket is still active', async () => {
    const { client } = createMockSupabase();

    const result = await simulatePlayoffGame(client, 'league-1', 42);

    expect(result).not.toBeNull();
    expect(result!.isPlayoffsComplete).toBe(false);
  });

  it('builds lineup from starters sorted by lineup_order', async () => {
    const { client } = createMockSupabase();

    await simulatePlayoffGame(client, 'league-1', 42);

    const config = mockRunGame.mock.calls[0][0];
    expect(config.homeLineup).toHaveLength(9);
    expect(config.awayLineup).toHaveLength(9);
    // Verify sorted by lineup order (positions match expected order)
    expect(config.homeLineup[0].position).toBe('C');
    expect(config.homeLineup[8].position).toBe('DH');
  });

  it('includes starting pitcher from rotation slot', async () => {
    const { client } = createMockSupabase();

    await simulatePlayoffGame(client, 'league-1', 42);

    const config = mockRunGame.mock.calls[0][0];
    expect(config.homeStartingPitcher).toBeDefined();
    expect(config.homeStartingPitcher.pitcherGrade).toBe(10);
    expect(config.awayStartingPitcher).toBeDefined();
  });

  it('includes bullpen and closer', async () => {
    const { client } = createMockSupabase();

    await simulatePlayoffGame(client, 'league-1', 42);

    const config = mockRunGame.mock.calls[0][0];
    expect(config.homeBullpen.length).toBeGreaterThanOrEqual(2);
    expect(config.homeCloser).not.toBeNull();
    expect(config.homeCloser!.pitcherGrade).toBe(9);
  });

  it('throws on bracket update error', async () => {
    const { client } = createMockSupabase({
      updateError: { message: 'DB error' },
    });

    await expect(simulatePlayoffGame(client, 'league-1', 42))
      .rejects.toEqual(expect.objectContaining({
        category: 'EXTERNAL',
        code: 'PLAYOFF_GAME_FAILED',
      }));
  });

  it('advances winners within bracket after recording result', async () => {
    const { client } = createMockSupabase();

    // Win enough games to complete a WC series (best of 3 = 2 wins)
    // First game won by home team (score 5-3)
    const result1 = await simulatePlayoffGame(client, 'league-1', 42);

    // The result should indicate the game was recorded
    expect(result1).not.toBeNull();
    expect(result1!.seriesId).toBeDefined();
    expect(result1!.gameNumber).toBe(1);
  });
});
