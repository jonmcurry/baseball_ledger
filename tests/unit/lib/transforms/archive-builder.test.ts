/**
 * Tests for buildArchiveData
 *
 * REQ-SCH-009: Archive enrichment with champion, playoff results, league leaders.
 */

import { buildArchiveData } from '../../../../src/lib/transforms/archive-builder';
import type { FullPlayoffBracket } from '../../../../src/lib/types/schedule';
import type { BattingStats, PitchingStats } from '../../../../src/lib/types/stats';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBattingStats(overrides: Partial<BattingStats> = {}): BattingStats {
  return {
    G: 100, AB: 400, R: 60, H: 120, doubles: 25, triples: 3,
    HR: 20, RBI: 70, SB: 10, CS: 3, BB: 50, SO: 80,
    IBB: 2, HBP: 5, SH: 1, SF: 4, GIDP: 8,
    BA: 0.300, OBP: 0.380, SLG: 0.500, OPS: 0.880,
    ...overrides,
  };
}

function makePitchingStats(overrides: Partial<PitchingStats> = {}): PitchingStats {
  return {
    G: 30, GS: 30, W: 12, L: 8, SV: 0, IP: 180,
    H: 160, R: 70, ER: 65, HR: 18, BB: 50, SO: 150,
    HBP: 5, BF: 750, WP: 4, BK: 1, CG: 2, SHO: 1,
    HLD: 0, BS: 0, ERA: 3.25, WHIP: 1.17, FIP: 3.50,
    ...overrides,
  };
}

function makeTeams() {
  return [
    { id: 'team-1', name: 'Yankees', city: 'New York', wins: 95, losses: 67, league_division: 'AL', division: 'East' },
    { id: 'team-2', name: 'Dodgers', city: 'Los Angeles', wins: 90, losses: 72, league_division: 'NL', division: 'West' },
    { id: 'team-3', name: 'Red Sox', city: 'Boston', wins: 85, losses: 77, league_division: 'AL', division: 'East' },
  ];
}

function makePlayoffBracket(championTeamId: string | null): FullPlayoffBracket {
  return {
    leagueId: 'league-1',
    al: { leagueId: 'league-1', rounds: [], championId: 'team-1' },
    nl: { leagueId: 'league-1', rounds: [], championId: 'team-2' },
    worldSeries: {
      id: 'ws-1',
      round: 'WorldSeries',
      leagueDivision: 'MLB',
      higherSeed: { teamId: 'team-1', seed: 1, record: { wins: 95, losses: 67 } },
      lowerSeed: { teamId: 'team-2', seed: 2, record: { wins: 90, losses: 72 } },
      bestOf: 7,
      games: [],
      higherSeedWins: 4,
      lowerSeedWins: 2,
      isComplete: true,
      winnerId: championTeamId,
    },
    worldSeriesChampionId: championTeamId,
  };
}

const nameCache: Record<string, string> = {
  'p-1': 'Aaron Judge',
  'p-2': 'Shohei Ohtani',
  'p-3': 'Mookie Betts',
  'p-4': 'Juan Soto',
  'p-5': 'Mike Trout',
  'p-6': 'Gerrit Cole',
  'p-7': 'Spencer Strider',
  'p-8': 'Corbin Burnes',
  'p-9': 'Zack Wheeler',
  'p-10': 'Framber Valdez',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildArchiveData', () => {
  it('resolves champion name from playoff bracket worldSeriesChampionId', () => {
    const result = buildArchiveData({
      teams: makeTeams(),
      playoffBracket: makePlayoffBracket('team-1'),
      seasonStats: [],
      playerNameCache: nameCache,
      totalGames: 162,
    });

    expect(result.champion).toBe('New York Yankees');
  });

  it('returns null champion when no playoff bracket', () => {
    const result = buildArchiveData({
      teams: makeTeams(),
      playoffBracket: null,
      seasonStats: [],
      playerNameCache: nameCache,
      totalGames: 162,
    });

    expect(result.champion).toBeNull();
  });

  it('computes batting leaders (top 5 HR with player names)', () => {
    const seasonStats = [
      { player_id: 'p-1', team_id: 'team-1', batting_stats: makeBattingStats({ HR: 45 }) as unknown as Record<string, unknown>, pitching_stats: null },
      { player_id: 'p-2', team_id: 'team-2', batting_stats: makeBattingStats({ HR: 40 }) as unknown as Record<string, unknown>, pitching_stats: null },
      { player_id: 'p-3', team_id: 'team-2', batting_stats: makeBattingStats({ HR: 35 }) as unknown as Record<string, unknown>, pitching_stats: null },
      { player_id: 'p-4', team_id: 'team-1', batting_stats: makeBattingStats({ HR: 30 }) as unknown as Record<string, unknown>, pitching_stats: null },
      { player_id: 'p-5', team_id: 'team-3', batting_stats: makeBattingStats({ HR: 25 }) as unknown as Record<string, unknown>, pitching_stats: null },
    ];

    const result = buildArchiveData({
      teams: makeTeams(),
      playoffBracket: null,
      seasonStats,
      playerNameCache: nameCache,
      totalGames: 162,
    });

    const hrLeaders = result.leagueLeaders.batting['HR'];
    expect(hrLeaders).toHaveLength(5);
    expect(hrLeaders[0]).toMatchObject({ playerId: 'p-1', playerName: 'Aaron Judge', value: 45, rank: 1 });
    expect(hrLeaders[1]).toMatchObject({ playerId: 'p-2', playerName: 'Shohei Ohtani', value: 40, rank: 2 });
    expect(hrLeaders[4]).toMatchObject({ playerId: 'p-5', playerName: 'Mike Trout', value: 25, rank: 5 });
  });

  it('computes pitching leaders (top 5 W with player names)', () => {
    const seasonStats = [
      { player_id: 'p-6', team_id: 'team-1', batting_stats: null, pitching_stats: makePitchingStats({ W: 18 }) as unknown as Record<string, unknown> },
      { player_id: 'p-7', team_id: 'team-2', batting_stats: null, pitching_stats: makePitchingStats({ W: 16 }) as unknown as Record<string, unknown> },
      { player_id: 'p-8', team_id: 'team-2', batting_stats: null, pitching_stats: makePitchingStats({ W: 14 }) as unknown as Record<string, unknown> },
      { player_id: 'p-9', team_id: 'team-3', batting_stats: null, pitching_stats: makePitchingStats({ W: 12 }) as unknown as Record<string, unknown> },
      { player_id: 'p-10', team_id: 'team-1', batting_stats: null, pitching_stats: makePitchingStats({ W: 10 }) as unknown as Record<string, unknown> },
    ];

    const result = buildArchiveData({
      teams: makeTeams(),
      playoffBracket: null,
      seasonStats,
      playerNameCache: nameCache,
      totalGames: 162,
    });

    const wLeaders = result.leagueLeaders.pitching['W'];
    expect(wLeaders).toHaveLength(5);
    expect(wLeaders[0]).toMatchObject({ playerId: 'p-6', playerName: 'Gerrit Cole', value: 18, rank: 1 });
    expect(wLeaders[4]).toMatchObject({ playerId: 'p-10', playerName: 'Framber Valdez', value: 10, rank: 5 });
  });

  it('stores full playoff bracket as playoffResults', () => {
    const bracket = makePlayoffBracket('team-1');
    const result = buildArchiveData({
      teams: makeTeams(),
      playoffBracket: bracket,
      seasonStats: [],
      playerNameCache: nameCache,
      totalGames: 162,
    });

    expect(result.playoffResults).toBe(bracket);
    expect(result.playoffResults?.worldSeriesChampionId).toBe('team-1');
  });
});
