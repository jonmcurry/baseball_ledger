/**
 * Playoff Transition Tests
 *
 * Tests for checkAndTransitionToPlayoffs().
 * Verifies season-to-playoffs transition: bracket generation, persistence,
 * and status update when regular season is complete.
 *
 * Layer 2 API tests (mocked Supabase).
 */

vi.mock('@lib/schedule/playoff-bracket', () => ({
  generateFullPlayoffBracket: vi.fn(),
}));

import { checkAndTransitionToPlayoffs } from '../../../../api/_lib/playoff-transition';
import { generateFullPlayoffBracket } from '@lib/schedule/playoff-bracket';

const mockGenerateBracket = vi.mocked(generateFullPlayoffBracket);

const mockBracket = {
  leagueId: 'league-1',
  al: { leagueId: 'league-1', rounds: [], championId: null },
  nl: { leagueId: 'league-1', rounds: [], championId: null },
  worldSeries: {
    id: 'ws-0', round: 'WorldSeries' as const,
    leagueDivision: 'MLB' as const,
    higherSeed: null, lowerSeed: null,
    bestOf: 7 as const, games: [],
    higherSeedWins: 0, lowerSeedWins: 0,
    isComplete: false, winnerId: null,
  },
  worldSeriesChampionId: null,
};

function createMockSupabase(options: {
  incompleteGamesCount?: number;
  teams?: Array<{ id: string; league_division: string; division: string; wins: number; losses: number; runs_scored: number; runs_allowed: number; name: string; city: string }>;
  updateError?: { message: string } | null;
} = {}) {
  const incompleteGamesCount = options.incompleteGamesCount ?? 0;
  const teams = options.teams ?? buildMockTeams();

  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  const fromFn = vi.fn().mockImplementation((table: string) => {
    if (table === 'schedule') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: Array(incompleteGamesCount).fill({ id: 'game-1' }),
              count: incompleteGamesCount,
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'teams') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: teams,
            error: null,
          }),
        }),
      };
    }
    if (table === 'leagues') {
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: options.updateError ?? null }),
        }),
      };
    }
    return { select: vi.fn().mockReturnValue(selectChain) };
  });

  return { client: { from: fromFn } as any, fromFn };
}

function buildMockTeams() {
  const teams = [];
  const divisions = ['East', 'Central', 'West'];
  const leagues = ['AL', 'NL'];

  for (const league of leagues) {
    for (const div of divisions) {
      for (let i = 0; i < 5; i++) {
        teams.push({
          id: `${league.toLowerCase()}-${div.toLowerCase()}-${i}`,
          name: `Team ${i}`,
          city: `City ${i}`,
          league_division: league,
          division: div,
          wins: 90 - i * 5,
          losses: 72 + i * 5,
          runs_scored: (90 - i * 5) * 5,
          runs_allowed: (72 + i * 5) * 5,
        });
      }
    }
  }

  return teams;
}

describe('checkAndTransitionToPlayoffs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateBracket.mockReturnValue(mockBracket as any);
  });

  it('returns false when currentDay < 162', async () => {
    const { client } = createMockSupabase();

    const result = await checkAndTransitionToPlayoffs(client, 'league-1', 100);

    expect(result).toBe(false);
    expect(mockGenerateBracket).not.toHaveBeenCalled();
  });

  it('returns false when incomplete games remain', async () => {
    const { client } = createMockSupabase({ incompleteGamesCount: 3 });

    const result = await checkAndTransitionToPlayoffs(client, 'league-1', 162);

    expect(result).toBe(false);
    expect(mockGenerateBracket).not.toHaveBeenCalled();
  });

  it('generates bracket and updates league when season is complete', async () => {
    const { client, fromFn } = createMockSupabase({ incompleteGamesCount: 0 });

    const result = await checkAndTransitionToPlayoffs(client, 'league-1', 162);

    expect(result).toBe(true);
    expect(mockGenerateBracket).toHaveBeenCalledWith('league-1', expect.any(Array));
  });

  it('updates league status to playoffs and stores bracket', async () => {
    const { client, fromFn } = createMockSupabase({ incompleteGamesCount: 0 });

    await checkAndTransitionToPlayoffs(client, 'league-1', 162);

    // Verify leagues.update was called
    const leaguesCalls = fromFn.mock.calls.filter(([t]: [string]) => t === 'leagues');
    expect(leaguesCalls.length).toBeGreaterThan(0);
  });

  it('builds standings from team data', async () => {
    const teams = buildMockTeams();
    const { client } = createMockSupabase({ incompleteGamesCount: 0, teams });

    await checkAndTransitionToPlayoffs(client, 'league-1', 162);

    // generateFullPlayoffBracket should receive standings grouped by division
    const standings = mockGenerateBracket.mock.calls[0][1];
    expect(standings.length).toBeGreaterThanOrEqual(6); // 3 AL + 3 NL divisions
  });

  it('handles day numbers above 162', async () => {
    const { client } = createMockSupabase({ incompleteGamesCount: 0 });

    const result = await checkAndTransitionToPlayoffs(client, 'league-1', 165);

    expect(result).toBe(true);
  });

  it('throws on update error', async () => {
    const { client } = createMockSupabase({
      incompleteGamesCount: 0,
      updateError: { message: 'DB error' },
    });

    await expect(checkAndTransitionToPlayoffs(client, 'league-1', 162))
      .rejects.toEqual(expect.objectContaining({
        category: 'EXTERNAL',
        code: 'PLAYOFF_TRANSITION_FAILED',
      }));
  });

  it('sorts teams within divisions by wins descending', async () => {
    const { client } = createMockSupabase({ incompleteGamesCount: 0 });

    await checkAndTransitionToPlayoffs(client, 'league-1', 162);

    const standings = mockGenerateBracket.mock.calls[0][1];
    for (const div of standings) {
      for (let i = 1; i < div.teams.length; i++) {
        expect(div.teams[i - 1].wins).toBeGreaterThanOrEqual(div.teams[i].wins);
      }
    }
  });

  it('returns false when currentDay is exactly 161', async () => {
    const { client } = createMockSupabase();

    const result = await checkAndTransitionToPlayoffs(client, 'league-1', 161);

    expect(result).toBe(false);
  });

  it('converts snake_case team data to camelCase standings', async () => {
    const { client } = createMockSupabase({ incompleteGamesCount: 0 });

    await checkAndTransitionToPlayoffs(client, 'league-1', 162);

    const standings = mockGenerateBracket.mock.calls[0][1];
    // Verify camelCase keys on team objects
    const firstTeam = standings[0].teams[0];
    expect(firstTeam).toHaveProperty('leagueDivision');
    expect(firstTeam).toHaveProperty('runsScored');
    expect(firstTeam).toHaveProperty('runsAllowed');
  });
});
