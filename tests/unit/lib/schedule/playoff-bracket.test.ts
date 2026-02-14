/**
 * Tests for Playoff Bracket (REQ-LGE-008)
 *
 * 2025 MLB format: WC(BO3), DS(BO5), CS(BO7), WS(BO7).
 * Seeding, home-field advantage, series progression, bracket advancement.
 */

import type { TeamSummary, DivisionStandings } from '@lib/types/league';
import type { PlayoffBracket, PlayoffSeries } from '@lib/types/schedule';
import {
  seedPlayoffTeams,
  generatePlayoffBracket,
  getHomeFieldSchedule,
  recordPlayoffGameResult,
  getNextPlayoffGame,
} from '@lib/schedule/playoff-bracket';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTeam(
  id: string,
  league: 'AL' | 'NL',
  division: string,
  wins: number,
  losses: number,
): TeamSummary {
  return {
    id,
    name: `Team ${id}`,
    city: `City ${id}`,
    ownerId: null,
    managerProfile: 'balanced',
    leagueDivision: league,
    division,
    wins,
    losses,
    runsScored: wins * 5,
    runsAllowed: losses * 5,
    homeWins: 0,
    homeLosses: 0,
    awayWins: 0,
    awayLosses: 0,
    streak: '-',
    lastTenWins: 0,
    lastTenLosses: 0,
  };
}

/** Create standings with 3 AL divisions (East/Central/West) with 5 teams each. */
function makeFullStandings(): DivisionStandings[] {
  return [
    {
      leagueDivision: 'AL',
      division: 'East',
      teams: [
        makeTeam('al-e1', 'AL', 'East', 100, 62),
        makeTeam('al-e2', 'AL', 'East', 90, 72),
        makeTeam('al-e3', 'AL', 'East', 85, 77),
        makeTeam('al-e4', 'AL', 'East', 75, 87),
        makeTeam('al-e5', 'AL', 'East', 65, 97),
      ],
    },
    {
      leagueDivision: 'AL',
      division: 'Central',
      teams: [
        makeTeam('al-c1', 'AL', 'Central', 95, 67),
        makeTeam('al-c2', 'AL', 'Central', 88, 74),
        makeTeam('al-c3', 'AL', 'Central', 80, 82),
        makeTeam('al-c4', 'AL', 'Central', 70, 92),
        makeTeam('al-c5', 'AL', 'Central', 60, 102),
      ],
    },
    {
      leagueDivision: 'AL',
      division: 'West',
      teams: [
        makeTeam('al-w1', 'AL', 'West', 92, 70),
        makeTeam('al-w2', 'AL', 'West', 87, 75),
        makeTeam('al-w3', 'AL', 'West', 78, 84),
        makeTeam('al-w4', 'AL', 'West', 68, 94),
        makeTeam('al-w5', 'AL', 'West', 58, 104),
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// seedPlayoffTeams
// ---------------------------------------------------------------------------

describe('seedPlayoffTeams', () => {
  it('seeds 6 teams: 3 division winners + 3 wild cards', () => {
    const standings = makeFullStandings();
    const seeds = seedPlayoffTeams(standings, 'AL');
    expect(seeds).toHaveLength(6);
  });

  it('division winners get seeds 1-3 sorted by record', () => {
    const standings = makeFullStandings();
    const seeds = seedPlayoffTeams(standings, 'AL');

    // Division winners: al-e1 (100W), al-c1 (95W), al-w1 (92W)
    expect(seeds[0].teamId).toBe('al-e1'); // Seed 1: best record
    expect(seeds[0].seed).toBe(1);
    expect(seeds[1].teamId).toBe('al-c1'); // Seed 2
    expect(seeds[1].seed).toBe(2);
    expect(seeds[2].teamId).toBe('al-w1'); // Seed 3
    expect(seeds[2].seed).toBe(3);
  });

  it('wild card teams get seeds 4-6 sorted by record', () => {
    const standings = makeFullStandings();
    const seeds = seedPlayoffTeams(standings, 'AL');

    // Non-winners by record: al-e2 (90W), al-c2 (88W), al-w2 (87W), al-e3 (85W)...
    expect(seeds[3].teamId).toBe('al-e2'); // Seed 4: 90W
    expect(seeds[3].seed).toBe(4);
    expect(seeds[4].teamId).toBe('al-c2'); // Seed 5: 88W
    expect(seeds[4].seed).toBe(5);
    expect(seeds[5].teamId).toBe('al-w2'); // Seed 6: 87W
    expect(seeds[5].seed).toBe(6);
  });

  it('adapts to fewer teams (4 total, 2 divisions)', () => {
    const standings: DivisionStandings[] = [
      {
        leagueDivision: 'AL',
        division: 'East',
        teams: [
          makeTeam('e1', 'AL', 'East', 95, 67),
          makeTeam('e2', 'AL', 'East', 80, 82),
        ],
      },
      {
        leagueDivision: 'AL',
        division: 'West',
        teams: [
          makeTeam('w1', 'AL', 'West', 90, 72),
          makeTeam('w2', 'AL', 'West', 75, 87),
        ],
      },
    ];
    const seeds = seedPlayoffTeams(standings, 'AL');
    // With 4 teams: 2 division winners + 2 wild cards
    expect(seeds).toHaveLength(4);
    expect(seeds[0].teamId).toBe('e1'); // Seed 1
    expect(seeds[1].teamId).toBe('w1'); // Seed 2
    expect(seeds[2].teamId).toBe('e2'); // WC 1
    expect(seeds[3].teamId).toBe('w2'); // WC 2
  });
});

// ---------------------------------------------------------------------------
// generatePlayoffBracket
// ---------------------------------------------------------------------------

describe('generatePlayoffBracket', () => {
  it('creates bracket with 4 rounds for 6-team format', () => {
    const standings = makeFullStandings();
    const bracket = generatePlayoffBracket('league-1', standings, 'AL');
    expect(bracket.rounds).toHaveLength(4);
    expect(bracket.rounds[0].name).toBe('WildCard');
    expect(bracket.rounds[1].name).toBe('DivisionSeries');
    expect(bracket.rounds[2].name).toBe('ChampionshipSeries');
    expect(bracket.rounds[3].name).toBe('WorldSeries');
  });

  it('Wild Card round: 2 series, best-of-3', () => {
    const standings = makeFullStandings();
    const bracket = generatePlayoffBracket('league-1', standings, 'AL');
    const wc = bracket.rounds[0];
    expect(wc.bestOf).toBe(3);
    expect(wc.series).toHaveLength(2);
  });

  it('WC matchups: seed 3 vs 6, seed 4 vs 5', () => {
    const standings = makeFullStandings();
    const bracket = generatePlayoffBracket('league-1', standings, 'AL');
    const wc = bracket.rounds[0];

    // Series 1: seed 3 vs seed 6
    expect(wc.series[0].higherSeed?.teamId).toBe('al-w1');  // seed 3
    expect(wc.series[0].lowerSeed?.teamId).toBe('al-w2');   // seed 6

    // Series 2: seed 4 vs seed 5
    expect(wc.series[1].higherSeed?.teamId).toBe('al-e2');  // seed 4
    expect(wc.series[1].lowerSeed?.teamId).toBe('al-c2');   // seed 5
  });

  it('Division Series: 2 series, best-of-5, seeds 1 and 2 have byes', () => {
    const standings = makeFullStandings();
    const bracket = generatePlayoffBracket('league-1', standings, 'AL');
    const ds = bracket.rounds[1];
    expect(ds.bestOf).toBe(5);
    expect(ds.series).toHaveLength(2);

    // Seeds 1 and 2 are pre-seeded as higher seeds
    const higherSeeds = ds.series.map((s) => s.higherSeed?.teamId);
    expect(higherSeeds).toContain('al-e1'); // seed 1
    expect(higherSeeds).toContain('al-c1'); // seed 2
  });

  it('CS round: 1 series, best-of-7', () => {
    const standings = makeFullStandings();
    const bracket = generatePlayoffBracket('league-1', standings, 'AL');
    const cs = bracket.rounds[2];
    expect(cs.bestOf).toBe(7);
    expect(cs.series).toHaveLength(1);
  });

  it('WS round: 1 series, best-of-7, league MLB', () => {
    const standings = makeFullStandings();
    const bracket = generatePlayoffBracket('league-1', standings, 'AL');
    const ws = bracket.rounds[3];
    expect(ws.bestOf).toBe(7);
    expect(ws.series).toHaveLength(1);
    expect(ws.series[0].leagueDivision).toBe('MLB');
  });

  it('all series start incomplete with no winner', () => {
    const standings = makeFullStandings();
    const bracket = generatePlayoffBracket('league-1', standings, 'AL');
    for (const round of bracket.rounds) {
      for (const series of round.series) {
        expect(series.isComplete).toBe(false);
        expect(series.winnerId).toBeNull();
        expect(series.higherSeedWins).toBe(0);
        expect(series.lowerSeedWins).toBe(0);
      }
    }
  });

  it('bracket starts with no champion', () => {
    const standings = makeFullStandings();
    const bracket = generatePlayoffBracket('league-1', standings, 'AL');
    expect(bracket.championId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getHomeFieldSchedule
// ---------------------------------------------------------------------------

describe('getHomeFieldSchedule', () => {
  it('BO3: H-A-H pattern', () => {
    const schedule = getHomeFieldSchedule('higher', 'lower', 3);
    expect(schedule).toEqual(['higher', 'lower', 'higher']);
  });

  it('BO5: H-A-A-H-H pattern', () => {
    const schedule = getHomeFieldSchedule('higher', 'lower', 5);
    expect(schedule).toEqual(['higher', 'lower', 'lower', 'higher', 'higher']);
  });

  it('BO7: H-A-A-H-H-A-H pattern', () => {
    const schedule = getHomeFieldSchedule('higher', 'lower', 7);
    expect(schedule).toEqual(['higher', 'lower', 'lower', 'higher', 'higher', 'lower', 'higher']);
  });
});

// ---------------------------------------------------------------------------
// recordPlayoffGameResult
// ---------------------------------------------------------------------------

describe('recordPlayoffGameResult', () => {
  function makeBracketWithWCSeries(): PlayoffBracket {
    const standings = makeFullStandings();
    return generatePlayoffBracket('league-1', standings, 'AL');
  }

  it('records a game result and updates series wins', () => {
    const bracket = makeBracketWithWCSeries();
    const seriesId = bracket.rounds[0].series[0].id;

    const updated = recordPlayoffGameResult(bracket, seriesId, 1, 5, 3);
    const series = updated.rounds[0].series[0];

    expect(series.games[0].isComplete).toBe(true);
    expect(series.games[0].homeScore).toBe(5);
    expect(series.games[0].awayScore).toBe(3);
    expect(series.higherSeedWins).toBe(1);
    expect(series.lowerSeedWins).toBe(0);
  });

  it('marks series complete when clinched', () => {
    let bracket = makeBracketWithWCSeries();
    const seriesId = bracket.rounds[0].series[0].id;

    // Higher seed wins 2 games in BO3
    bracket = recordPlayoffGameResult(bracket, seriesId, 1, 5, 3); // Higher seed home wins
    bracket = recordPlayoffGameResult(bracket, seriesId, 2, 3, 5); // Higher seed away wins (higher is visitor game 2)

    const series = bracket.rounds[0].series[0];
    expect(series.isComplete).toBe(true);
    expect(series.winnerId).toBe(series.higherSeed?.teamId);
  });

  it('lower seed can win series', () => {
    let bracket = makeBracketWithWCSeries();
    const seriesId = bracket.rounds[0].series[0].id;

    // Lower seed wins 2 games in BO3
    bracket = recordPlayoffGameResult(bracket, seriesId, 1, 2, 5); // Lower seed wins game 1
    bracket = recordPlayoffGameResult(bracket, seriesId, 2, 5, 3); // Lower seed wins game 2 (lower is home game 2)

    const series = bracket.rounds[0].series[0];
    expect(series.isComplete).toBe(true);
    expect(series.winnerId).toBe(series.lowerSeed?.teamId);
  });

  it('returns new bracket (immutable)', () => {
    const bracket = makeBracketWithWCSeries();
    const seriesId = bracket.rounds[0].series[0].id;
    const updated = recordPlayoffGameResult(bracket, seriesId, 1, 5, 3);

    expect(updated).not.toBe(bracket);
    expect(bracket.rounds[0].series[0].higherSeedWins).toBe(0); // Original unchanged
  });
});

// ---------------------------------------------------------------------------
// getNextPlayoffGame
// ---------------------------------------------------------------------------

describe('getNextPlayoffGame', () => {
  it('returns first WC game when bracket is fresh', () => {
    const standings = makeFullStandings();
    const bracket = generatePlayoffBracket('league-1', standings, 'AL');
    const next = getNextPlayoffGame(bracket);

    expect(next).not.toBeNull();
    expect(next!.round).toBe('WildCard');
    expect(next!.gameNumber).toBe(1);
  });

  it('returns null when all series are complete (simplified)', () => {
    // We'll test with a bracket where all rounds have been artificially completed
    const standings = makeFullStandings();
    const bracket = generatePlayoffBracket('league-1', standings, 'AL');

    // Mark everything complete
    for (const round of bracket.rounds) {
      for (const series of round.series) {
        series.isComplete = true;
        series.winnerId = series.higherSeed?.teamId ?? null;
      }
    }

    const next = getNextPlayoffGame(bracket);
    expect(next).toBeNull();
  });
});
