/**
 * Mock League Fixtures
 *
 * Factory functions for creating mock league, team, and standings data.
 */

import type { LeagueSummary, TeamSummary, DivisionStandings } from '@lib/types/league';
import type { ScheduleDay, ScheduleGameSummary, FullPlayoffBracket } from '@lib/types/schedule';

export function createMockLeague(overrides?: Partial<LeagueSummary>): LeagueSummary {
  return {
    id: 'league-1',
    name: 'Test League',
    commissionerId: 'user-1',
    inviteKey: 'INV-TEST-123',
    teamCount: 8,
    yearRangeStart: 1990,
    yearRangeEnd: 1995,
    injuriesEnabled: true,
    status: 'regular_season',
    currentDay: 42,
    playoffBracket: null,
    ...overrides,
  };
}

export function createMockTeam(overrides?: Partial<TeamSummary>): TeamSummary {
  return {
    id: 'team-1',
    name: 'Mockingbirds',
    city: 'Mock City',
    ownerId: 'user-1',
    managerProfile: 'balanced',
    leagueDivision: 'AL',
    division: 'East',
    wins: 50,
    losses: 40,
    runsScored: 420,
    runsAllowed: 380,
    ...overrides,
  };
}

export function createMockTeams(): TeamSummary[] {
  return [
    createMockTeam({ id: 'al-e1', name: 'Eagles', city: 'Eastern', leagueDivision: 'AL', division: 'East', wins: 55, losses: 35, ownerId: 'user-1' }),
    createMockTeam({ id: 'al-e2', name: 'Hawks', city: 'Harbor', leagueDivision: 'AL', division: 'East', wins: 48, losses: 42, ownerId: null }),
    createMockTeam({ id: 'al-w1', name: 'Wolves', city: 'Western', leagueDivision: 'AL', division: 'West', wins: 52, losses: 38, ownerId: null }),
    createMockTeam({ id: 'al-w2', name: 'Bears', city: 'Mountain', leagueDivision: 'AL', division: 'West', wins: 44, losses: 46, ownerId: null }),
    createMockTeam({ id: 'nl-e1', name: 'Tigers', city: 'Northern', leagueDivision: 'NL', division: 'East', wins: 58, losses: 32, ownerId: null }),
    createMockTeam({ id: 'nl-e2', name: 'Lions', city: 'Central', leagueDivision: 'NL', division: 'East', wins: 45, losses: 45, ownerId: null }),
    createMockTeam({ id: 'nl-w1', name: 'Panthers', city: 'Southern', leagueDivision: 'NL', division: 'West', wins: 50, losses: 40, ownerId: null }),
    createMockTeam({ id: 'nl-w2', name: 'Jaguars', city: 'Coastal', leagueDivision: 'NL', division: 'West', wins: 40, losses: 50, ownerId: null }),
  ];
}

export function createMockStandings(): DivisionStandings[] {
  const teams = createMockTeams();
  return [
    {
      leagueDivision: 'AL',
      division: 'East',
      teams: teams.filter((t) => t.leagueDivision === 'AL' && t.division === 'East')
        .sort((a, b) => b.wins - a.wins),
    },
    {
      leagueDivision: 'AL',
      division: 'West',
      teams: teams.filter((t) => t.leagueDivision === 'AL' && t.division === 'West')
        .sort((a, b) => b.wins - a.wins),
    },
    {
      leagueDivision: 'NL',
      division: 'East',
      teams: teams.filter((t) => t.leagueDivision === 'NL' && t.division === 'East')
        .sort((a, b) => b.wins - a.wins),
    },
    {
      leagueDivision: 'NL',
      division: 'West',
      teams: teams.filter((t) => t.leagueDivision === 'NL' && t.division === 'West')
        .sort((a, b) => b.wins - a.wins),
    },
  ];
}

export function createMockGame(overrides?: Partial<ScheduleGameSummary>): ScheduleGameSummary {
  return {
    id: 'game-1',
    homeTeamId: 'al-e1',
    awayTeamId: 'al-e2',
    homeScore: null,
    awayScore: null,
    isComplete: false,
    gameLogId: null,
    ...overrides,
  };
}

export function createMockScheduleDay(
  dayNumber: number,
  games?: ScheduleGameSummary[],
): ScheduleDay {
  return {
    dayNumber,
    games: games ?? [
      createMockGame({ id: `g-${dayNumber}-0`, homeTeamId: 'al-e1', awayTeamId: 'al-e2' }),
      createMockGame({ id: `g-${dayNumber}-1`, homeTeamId: 'al-w1', awayTeamId: 'al-w2' }),
      createMockGame({ id: `g-${dayNumber}-2`, homeTeamId: 'nl-e1', awayTeamId: 'nl-e2' }),
      createMockGame({ id: `g-${dayNumber}-3`, homeTeamId: 'nl-w1', awayTeamId: 'nl-w2' }),
    ],
  };
}

export function createMockPlayoffBracket(): FullPlayoffBracket {
  return {
    leagueId: 'league-1',
    al: {
      leagueId: 'league-1',
      rounds: [{
        name: 'ChampionshipSeries',
        bestOf: 7,
        series: [{
          id: 'alcs-1',
          round: 'ChampionshipSeries',
          leagueDivision: 'AL',
          higherSeed: { teamId: 'al-e1', seed: 1, record: { wins: 55, losses: 35 } },
          lowerSeed: { teamId: 'al-w1', seed: 2, record: { wins: 52, losses: 38 } },
          bestOf: 7,
          games: [
            { gameNumber: 1, homeTeamId: 'al-e1', awayTeamId: 'al-w1', homeScore: 5, awayScore: 3, isComplete: true },
            { gameNumber: 2, homeTeamId: 'al-e1', awayTeamId: 'al-w1', homeScore: 4, awayScore: 2, isComplete: true },
          ],
          higherSeedWins: 2,
          lowerSeedWins: 0,
          isComplete: false,
          winnerId: null,
        }],
      }],
      championId: null,
    },
    nl: {
      leagueId: 'league-1',
      rounds: [{
        name: 'ChampionshipSeries',
        bestOf: 7,
        series: [{
          id: 'nlcs-1',
          round: 'ChampionshipSeries',
          leagueDivision: 'NL',
          higherSeed: { teamId: 'nl-e1', seed: 1, record: { wins: 58, losses: 32 } },
          lowerSeed: { teamId: 'nl-w1', seed: 2, record: { wins: 50, losses: 40 } },
          bestOf: 7,
          games: [],
          higherSeedWins: 0,
          lowerSeedWins: 0,
          isComplete: false,
          winnerId: null,
        }],
      }],
      championId: null,
    },
    worldSeries: {
      id: 'ws-1',
      round: 'WorldSeries',
      leagueDivision: 'MLB',
      higherSeed: null,
      lowerSeed: null,
      bestOf: 7,
      games: [],
      higherSeedWins: 0,
      lowerSeedWins: 0,
      isComplete: false,
      winnerId: null,
    },
    worldSeriesChampionId: null,
  };
}
