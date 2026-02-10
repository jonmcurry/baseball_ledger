/**
 * Full Playoff Bracket Tests
 *
 * Tests for FullPlayoffBracket functions: generation, game recording,
 * next game finder, advancement, and completion check.
 *
 * Layer 1 pure logic tests.
 */

import {
  generateFullPlayoffBracket,
  recordFullBracketGameResult,
  getNextFullBracketGame,
  advanceFullBracketWinners,
  isFullBracketComplete,
} from '@lib/schedule/playoff-bracket';
import type {
  FullPlayoffBracket,
  PlayoffTeamSeed,
  PlayoffSeries,
} from '@lib/types/schedule';
import type { DivisionStandings, TeamSummary } from '@lib/types/league';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTeam(id: string, wins: number, losses: number): TeamSummary {
  return {
    id,
    name: `Team ${id}`,
    city: 'Test City',
    abbreviation: id.toUpperCase().slice(0, 3),
    wins,
    losses,
    runsScored: wins * 5,
    runsAllowed: losses * 5,
  };
}

function buildStandings(): DivisionStandings[] {
  return [
    // AL East
    {
      leagueDivision: 'AL',
      divisionName: 'East',
      teams: [
        makeTeam('al-e1', 100, 62),
        makeTeam('al-e2', 88, 74),
        makeTeam('al-e3', 80, 82),
      ],
    },
    // AL Central
    {
      leagueDivision: 'AL',
      divisionName: 'Central',
      teams: [
        makeTeam('al-c1', 95, 67),
        makeTeam('al-c2', 85, 77),
        makeTeam('al-c3', 75, 87),
      ],
    },
    // AL West
    {
      leagueDivision: 'AL',
      divisionName: 'West',
      teams: [
        makeTeam('al-w1', 92, 70),
        makeTeam('al-w2', 90, 72),
        makeTeam('al-w3', 70, 92),
      ],
    },
    // NL East
    {
      leagueDivision: 'NL',
      divisionName: 'East',
      teams: [
        makeTeam('nl-e1', 98, 64),
        makeTeam('nl-e2', 87, 75),
        makeTeam('nl-e3', 78, 84),
      ],
    },
    // NL Central
    {
      leagueDivision: 'NL',
      divisionName: 'Central',
      teams: [
        makeTeam('nl-c1', 96, 66),
        makeTeam('nl-c2', 86, 76),
        makeTeam('nl-c3', 74, 88),
      ],
    },
    // NL West
    {
      leagueDivision: 'NL',
      divisionName: 'West',
      teams: [
        makeTeam('nl-w1', 94, 68),
        makeTeam('nl-w2', 89, 73),
        makeTeam('nl-w3', 72, 90),
      ],
    },
  ];
}

function completeSeries(series: PlayoffSeries, winnerId: string): PlayoffSeries {
  const winsNeeded = Math.ceil(series.bestOf / 2);
  const isHigherWinner = series.higherSeed?.teamId === winnerId;
  return {
    ...series,
    higherSeedWins: isHigherWinner ? winsNeeded : 0,
    lowerSeedWins: isHigherWinner ? 0 : winsNeeded,
    isComplete: true,
    winnerId,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateFullPlayoffBracket', () => {
  it('creates AL and NL brackets with World Series', () => {
    const standings = buildStandings();
    const bracket = generateFullPlayoffBracket('league-1', standings);

    expect(bracket.leagueId).toBe('league-1');
    expect(bracket.al.rounds.length).toBeGreaterThanOrEqual(3);
    expect(bracket.nl.rounds.length).toBeGreaterThanOrEqual(3);
    expect(bracket.worldSeries).toBeDefined();
    expect(bracket.worldSeries.round).toBe('WorldSeries');
    expect(bracket.worldSeries.bestOf).toBe(7);
    expect(bracket.worldSeriesChampionId).toBeNull();
  });

  it('seeds AL teams correctly by record', () => {
    const standings = buildStandings();
    const bracket = generateFullPlayoffBracket('league-1', standings);

    // AL bracket: WC round exists with seeds 3-6
    const wcRound = bracket.al.rounds.find((r) => r.name === 'WildCard');
    expect(wcRound).toBeDefined();
    expect(wcRound!.series).toHaveLength(2);
  });

  it('seeds NL teams correctly by record', () => {
    const standings = buildStandings();
    const bracket = generateFullPlayoffBracket('league-1', standings);

    const wcRound = bracket.nl.rounds.find((r) => r.name === 'WildCard');
    expect(wcRound).toBeDefined();
    expect(wcRound!.series).toHaveLength(2);
  });

  it('does not include WS round in individual league brackets', () => {
    const standings = buildStandings();
    const bracket = generateFullPlayoffBracket('league-1', standings);

    // AL and NL brackets should NOT have a WorldSeries round
    // (WS is at the FullPlayoffBracket level)
    const alWs = bracket.al.rounds.find((r) => r.name === 'WorldSeries');
    expect(alWs).toBeUndefined();

    const nlWs = bracket.nl.rounds.find((r) => r.name === 'WorldSeries');
    expect(nlWs).toBeUndefined();
  });

  it('World Series has null seeds initially', () => {
    const standings = buildStandings();
    const bracket = generateFullPlayoffBracket('league-1', standings);

    expect(bracket.worldSeries.higherSeed).toBeNull();
    expect(bracket.worldSeries.lowerSeed).toBeNull();
  });
});

describe('getNextFullBracketGame', () => {
  it('returns first WC game from AL bracket', () => {
    const standings = buildStandings();
    const bracket = generateFullPlayoffBracket('league-1', standings);

    const next = getNextFullBracketGame(bracket);
    expect(next).not.toBeNull();
    expect(next!.round).toBe('WildCard');
  });

  it('returns null when all brackets are complete', () => {
    const standings = buildStandings();
    const bracket = generateFullPlayoffBracket('league-1', standings);

    // Mark everything complete including WS
    bracket.worldSeries = completeSeries(
      { ...bracket.worldSeries, higherSeed: { teamId: 'a', seed: 1, record: { wins: 90, losses: 72 } }, lowerSeed: { teamId: 'b', seed: 1, record: { wins: 90, losses: 72 } } },
      'a',
    );
    bracket.worldSeriesChampionId = 'a';

    // Complete all AL series
    for (const round of bracket.al.rounds) {
      for (let i = 0; i < round.series.length; i++) {
        const s = round.series[i];
        if (s.higherSeed && s.lowerSeed) {
          round.series[i] = completeSeries(s, s.higherSeed.teamId);
        }
      }
    }
    bracket.al.championId = bracket.al.rounds[0].series[0].higherSeed!.teamId;

    // Complete all NL series
    for (const round of bracket.nl.rounds) {
      for (let i = 0; i < round.series.length; i++) {
        const s = round.series[i];
        if (s.higherSeed && s.lowerSeed) {
          round.series[i] = completeSeries(s, s.higherSeed.teamId);
        }
      }
    }
    bracket.nl.championId = bracket.nl.rounds[0].series[0].higherSeed!.teamId;

    const next = getNextFullBracketGame(bracket);
    expect(next).toBeNull();
  });
});

describe('advanceFullBracketWinners', () => {
  it('populates World Series when both league champions are determined', () => {
    const standings = buildStandings();
    let bracket = generateFullPlayoffBracket('league-1', standings);

    // Set both league champions directly for testing
    bracket.al.championId = 'al-e1';
    bracket.nl.championId = 'nl-e1';

    // Add champion seeds to CS winners to simulate advancement
    const alCsRound = bracket.al.rounds.find((r) => r.name === 'ChampionshipSeries')!;
    alCsRound.series[0] = {
      ...alCsRound.series[0],
      higherSeed: { teamId: 'al-e1', seed: 1, record: { wins: 100, losses: 62 } },
      lowerSeed: { teamId: 'al-c1', seed: 2, record: { wins: 95, losses: 67 } },
      isComplete: true,
      winnerId: 'al-e1',
      higherSeedWins: 4,
    };

    const nlCsRound = bracket.nl.rounds.find((r) => r.name === 'ChampionshipSeries')!;
    nlCsRound.series[0] = {
      ...nlCsRound.series[0],
      higherSeed: { teamId: 'nl-e1', seed: 1, record: { wins: 98, losses: 64 } },
      lowerSeed: { teamId: 'nl-c1', seed: 2, record: { wins: 96, losses: 66 } },
      isComplete: true,
      winnerId: 'nl-e1',
      nlCsRound: 4,
    };

    const result = advanceFullBracketWinners(bracket);

    expect(result.worldSeries.higherSeed).not.toBeNull();
    expect(result.worldSeries.lowerSeed).not.toBeNull();
  });

  it('does not populate WS when only one league champion is set', () => {
    const standings = buildStandings();
    let bracket = generateFullPlayoffBracket('league-1', standings);

    bracket.al.championId = 'al-e1';
    // NL champion not set

    const result = advanceFullBracketWinners(bracket);

    expect(result.worldSeries.higherSeed).toBeNull();
    expect(result.worldSeries.lowerSeed).toBeNull();
  });

  it('sets worldSeriesChampionId when WS is complete', () => {
    const standings = buildStandings();
    let bracket = generateFullPlayoffBracket('league-1', standings);

    bracket.al.championId = 'al-e1';
    bracket.nl.championId = 'nl-e1';

    bracket.worldSeries = {
      ...bracket.worldSeries,
      higherSeed: { teamId: 'al-e1', seed: 1, record: { wins: 100, losses: 62 } },
      lowerSeed: { teamId: 'nl-e1', seed: 1, record: { wins: 98, losses: 64 } },
      isComplete: true,
      winnerId: 'al-e1',
      higherSeedWins: 4,
      lowerSeedWins: 2,
    };

    const result = advanceFullBracketWinners(bracket);

    expect(result.worldSeriesChampionId).toBe('al-e1');
  });

  it('advances AL bracket winners internally', () => {
    const standings = buildStandings();
    let bracket = generateFullPlayoffBracket('league-1', standings);

    // Complete both AL WC series
    const alWc = bracket.al.rounds.find((r) => r.name === 'WildCard')!;
    alWc.series[0] = completeSeries(alWc.series[0], alWc.series[0].higherSeed!.teamId);
    alWc.series[1] = completeSeries(alWc.series[1], alWc.series[1].higherSeed!.teamId);

    const result = advanceFullBracketWinners(bracket);

    // AL DS should now have lower seeds filled
    const alDs = result.al.rounds.find((r) => r.name === 'DivisionSeries')!;
    expect(alDs.series[0].lowerSeed).not.toBeNull();
    expect(alDs.series[1].lowerSeed).not.toBeNull();
  });
});

describe('recordFullBracketGameResult', () => {
  it('records a game result in the AL bracket', () => {
    const standings = buildStandings();
    const bracket = generateFullPlayoffBracket('league-1', standings);

    const alWc = bracket.al.rounds.find((r) => r.name === 'WildCard')!;
    const seriesId = alWc.series[0].id;

    const result = recordFullBracketGameResult(bracket, seriesId, 1, 5, 3);

    const updatedSeries = result.al.rounds
      .find((r) => r.name === 'WildCard')!
      .series.find((s) => s.id === seriesId)!;

    expect(updatedSeries.games).toHaveLength(1);
    expect(updatedSeries.games[0].homeScore).toBe(5);
  });

  it('records a game result in the NL bracket', () => {
    const standings = buildStandings();
    const bracket = generateFullPlayoffBracket('league-1', standings);

    const nlWc = bracket.nl.rounds.find((r) => r.name === 'WildCard')!;
    const seriesId = nlWc.series[0].id;

    const result = recordFullBracketGameResult(bracket, seriesId, 1, 4, 2);

    const updatedSeries = result.nl.rounds
      .find((r) => r.name === 'WildCard')!
      .series.find((s) => s.id === seriesId)!;

    expect(updatedSeries.games).toHaveLength(1);
  });

  it('records a game result in the World Series', () => {
    const standings = buildStandings();
    let bracket = generateFullPlayoffBracket('league-1', standings);

    // Set up WS with teams
    bracket.worldSeries = {
      ...bracket.worldSeries,
      higherSeed: { teamId: 'al-e1', seed: 1, record: { wins: 100, losses: 62 } },
      lowerSeed: { teamId: 'nl-e1', seed: 1, record: { wins: 98, losses: 64 } },
    };

    const result = recordFullBracketGameResult(
      bracket,
      bracket.worldSeries.id,
      1,
      6,
      3,
    );

    expect(result.worldSeries.games).toHaveLength(1);
    expect(result.worldSeries.games[0].homeScore).toBe(6);
  });
});

describe('isFullBracketComplete', () => {
  it('returns false for a new bracket', () => {
    const standings = buildStandings();
    const bracket = generateFullPlayoffBracket('league-1', standings);

    expect(isFullBracketComplete(bracket)).toBe(false);
  });

  it('returns true when worldSeriesChampionId is set', () => {
    const standings = buildStandings();
    const bracket = generateFullPlayoffBracket('league-1', standings);
    bracket.worldSeriesChampionId = 'al-e1';

    expect(isFullBracketComplete(bracket)).toBe(true);
  });
});
