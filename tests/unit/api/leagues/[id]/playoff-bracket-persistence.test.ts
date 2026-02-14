/**
 * Playoff Bracket Persistence Tests
 *
 * Verifies that playoff_bracket JSONB column is typed correctly
 * and that store/hook expose the bracket data.
 *
 * Layer 2/4 integration tests (mocked API).
 */

import type { LeagueRow } from '@lib/types/database';
import type { LeagueSummary } from '@lib/types/league';
import type { FullPlayoffBracket } from '@lib/types/schedule';

describe('LeagueRow playoff_bracket column', () => {
  it('accepts null for playoff_bracket', () => {
    const row: LeagueRow = {
      id: 'league-1',
      name: 'Test League',
      commissioner_id: 'user-1',
      invite_key: 'abc123',
      team_count: 8,
      year_range_start: 2023,
      year_range_end: 2023,
      injuries_enabled: false,
      playoff_rules: {},
      status: 'regular_season',
      current_day: 100,
      season_year: 2023,
      created_at: '2023-01-01T00:00:00Z',
      playoff_bracket: null,
    };

    expect(row.playoff_bracket).toBeNull();
  });

  it('accepts JSONB object for playoff_bracket', () => {
    const bracket: Record<string, unknown> = {
      leagueId: 'league-1',
      al: {},
      nl: {},
      worldSeries: {},
      worldSeriesChampionId: null,
    };

    const row: LeagueRow = {
      id: 'league-1',
      name: 'Test League',
      commissioner_id: 'user-1',
      invite_key: 'abc123',
      team_count: 8,
      year_range_start: 2023,
      year_range_end: 2023,
      injuries_enabled: false,
      playoff_rules: {},
      status: 'playoffs',
      current_day: 162,
      season_year: 2023,
      created_at: '2023-01-01T00:00:00Z',
      playoff_bracket: bracket,
    };

    expect(row.playoff_bracket).not.toBeNull();
    expect((row.playoff_bracket as Record<string, unknown>).leagueId).toBe('league-1');
  });
});

describe('LeagueSummary playoffBracket field', () => {
  it('includes playoffBracket as null by default', () => {
    const league: LeagueSummary = {
      id: 'league-1',
      name: 'Test League',
      commissionerId: 'user-1',
      inviteKey: 'abc123',
      teamCount: 8,
      yearRangeStart: 2023,
      yearRangeEnd: 2023,
      injuriesEnabled: false,
      negroLeaguesEnabled: true,
      status: 'regular_season',
      currentDay: 100,
      playoffBracket: null,
    };

    expect(league.playoffBracket).toBeNull();
  });

  it('includes playoffBracket with FullPlayoffBracket shape', () => {
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
    } satisfies FullPlayoffBracket;

    const league: LeagueSummary = {
      id: 'league-1',
      name: 'Test League',
      commissionerId: 'user-1',
      inviteKey: 'abc123',
      teamCount: 8,
      yearRangeStart: 2023,
      yearRangeEnd: 2023,
      injuriesEnabled: false,
      negroLeaguesEnabled: true,
      status: 'playoffs',
      currentDay: 162,
      playoffBracket: mockBracket,
    };

    expect(league.playoffBracket?.leagueId).toBe('league-1');
    expect(league.playoffBracket?.worldSeriesChampionId).toBeNull();
  });
});

describe('LeagueStore playoffBracket state', () => {
  it('store state type includes playoffBracket', async () => {
    const { useLeagueStore } = await import('@stores/leagueStore');
    const state = useLeagueStore.getState();

    expect(state).toHaveProperty('playoffBracket');
    expect(state.playoffBracket).toBeNull();
  });

  it('setPlayoffBracket updates the bracket', async () => {
    const { useLeagueStore } = await import('@stores/leagueStore');

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
    } satisfies FullPlayoffBracket;

    useLeagueStore.getState().setPlayoffBracket(mockBracket);

    expect(useLeagueStore.getState().playoffBracket).toEqual(mockBracket);

    // Clean up
    useLeagueStore.getState().reset();
  });
});
