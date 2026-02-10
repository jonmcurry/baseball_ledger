/**
 * Playoff Advancement Tests
 *
 * Tests for advanceWinners() and isBracketComplete() functions.
 * TDD: Tests written first, then implementation in playoff-bracket.ts.
 *
 * Layer 1 pure logic tests.
 */

import { advanceWinners, isBracketComplete } from '@lib/schedule/playoff-bracket';
import type {
  PlayoffBracket,
  PlayoffSeries,
  PlayoffTeamSeed,
  PlayoffRoundName,
} from '@lib/types/schedule';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSeed(teamId: string, seed: number): PlayoffTeamSeed {
  return { teamId, seed, record: { wins: 90 + (10 - seed), losses: 72 - (10 - seed) } };
}

function makeSeries(
  id: string,
  round: PlayoffRoundName,
  league: 'AL' | 'NL' | 'MLB',
  bestOf: 3 | 5 | 7,
  higherSeed: PlayoffTeamSeed | null,
  lowerSeed: PlayoffTeamSeed | null,
): PlayoffSeries {
  return {
    id,
    round,
    leagueDivision: league,
    higherSeed,
    lowerSeed,
    bestOf,
    games: [],
    higherSeedWins: 0,
    lowerSeedWins: 0,
    isComplete: false,
    winnerId: null,
  };
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

/**
 * Build a full 6-team bracket (WC -> DS -> CS -> WS).
 * DS lower seeds are null (TBD from WC winners).
 */
function buildFullBracket(): PlayoffBracket {
  return {
    leagueId: 'league-1',
    rounds: [
      {
        name: 'WildCard',
        bestOf: 3,
        series: [
          makeSeries('wc-0', 'WildCard', 'AL', 3, makeSeed('team-3', 3), makeSeed('team-6', 6)),
          makeSeries('wc-1', 'WildCard', 'AL', 3, makeSeed('team-4', 4), makeSeed('team-5', 5)),
        ],
      },
      {
        name: 'DivisionSeries',
        bestOf: 5,
        series: [
          makeSeries('ds-0', 'DivisionSeries', 'AL', 5, makeSeed('team-1', 1), null),
          makeSeries('ds-1', 'DivisionSeries', 'AL', 5, makeSeed('team-2', 2), null),
        ],
      },
      {
        name: 'ChampionshipSeries',
        bestOf: 7,
        series: [
          makeSeries('cs-0', 'ChampionshipSeries', 'AL', 7, null, null),
        ],
      },
      {
        name: 'WorldSeries',
        bestOf: 7,
        series: [
          makeSeries('ws-0', 'WorldSeries', 'MLB', 7, null, null),
        ],
      },
    ],
    championId: null,
  };
}

/**
 * Build a 4-team bracket (DS -> CS -> WS). No WC round.
 */
function build4TeamBracket(): PlayoffBracket {
  return {
    leagueId: 'league-1',
    rounds: [
      {
        name: 'DivisionSeries',
        bestOf: 5,
        series: [
          makeSeries('ds-0', 'DivisionSeries', 'AL', 5, makeSeed('team-1', 1), makeSeed('team-4', 4)),
          makeSeries('ds-1', 'DivisionSeries', 'AL', 5, makeSeed('team-2', 2), makeSeed('team-3', 3)),
        ],
      },
      {
        name: 'ChampionshipSeries',
        bestOf: 7,
        series: [
          makeSeries('cs-0', 'ChampionshipSeries', 'AL', 7, null, null),
        ],
      },
      {
        name: 'WorldSeries',
        bestOf: 7,
        series: [
          makeSeries('ws-0', 'WorldSeries', 'MLB', 7, null, null),
        ],
      },
    ],
    championId: null,
  };
}

/**
 * Build a 2-team bracket (CS -> WS). Minimal playoff.
 */
function build2TeamBracket(): PlayoffBracket {
  return {
    leagueId: 'league-1',
    rounds: [
      {
        name: 'ChampionshipSeries',
        bestOf: 7,
        series: [
          makeSeries('cs-0', 'ChampionshipSeries', 'AL', 7, makeSeed('team-1', 1), makeSeed('team-2', 2)),
        ],
      },
      {
        name: 'WorldSeries',
        bestOf: 7,
        series: [
          makeSeries('ws-0', 'WorldSeries', 'MLB', 7, null, null),
        ],
      },
    ],
    championId: null,
  };
}

// ---------------------------------------------------------------------------
// advanceWinners
// ---------------------------------------------------------------------------

describe('advanceWinners', () => {
  describe('WC -> DS advancement', () => {
    it('advances both WC winners to DS when both series complete', () => {
      const bracket = buildFullBracket();
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-3');
      bracket.rounds[0].series[1] = completeSeries(bracket.rounds[0].series[1], 'team-4');

      const result = advanceWinners(bracket);

      // Team 4 (seed 4) has higher seed number -> DS[0] (faces seed 1)
      expect(result.rounds[1].series[0].lowerSeed?.teamId).toBe('team-4');
      // Team 3 (seed 3) has lower seed number -> DS[1] (faces seed 2)
      expect(result.rounds[1].series[1].lowerSeed?.teamId).toBe('team-3');
    });

    it('assigns highest-seeded WC winner (worst record) to face seed 1', () => {
      const bracket = buildFullBracket();
      // Upsets: team 6 beats team 3, team 5 beats team 4
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-6');
      bracket.rounds[0].series[1] = completeSeries(bracket.rounds[0].series[1], 'team-5');

      const result = advanceWinners(bracket);

      // Team 6 (seed 6, worst record) -> DS[0] vs seed 1
      expect(result.rounds[1].series[0].lowerSeed?.teamId).toBe('team-6');
      // Team 5 (seed 5, better record) -> DS[1] vs seed 2
      expect(result.rounds[1].series[1].lowerSeed?.teamId).toBe('team-5');
    });

    it('handles mixed upset: seed 6 and seed 4 advance', () => {
      const bracket = buildFullBracket();
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-6');
      bracket.rounds[0].series[1] = completeSeries(bracket.rounds[0].series[1], 'team-4');

      const result = advanceWinners(bracket);

      // Team 6 (seed 6) -> DS[0] vs seed 1
      expect(result.rounds[1].series[0].lowerSeed?.teamId).toBe('team-6');
      // Team 4 (seed 4) -> DS[1] vs seed 2
      expect(result.rounds[1].series[1].lowerSeed?.teamId).toBe('team-4');
    });

    it('does not advance when only one WC series is complete', () => {
      const bracket = buildFullBracket();
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-3');
      // WC[1] still in progress

      const result = advanceWinners(bracket);

      expect(result.rounds[1].series[0].lowerSeed).toBeNull();
      expect(result.rounds[1].series[1].lowerSeed).toBeNull();
    });

    it('is idempotent when called multiple times', () => {
      const bracket = buildFullBracket();
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-3');
      bracket.rounds[0].series[1] = completeSeries(bracket.rounds[0].series[1], 'team-4');

      const result1 = advanceWinners(bracket);
      const result2 = advanceWinners(result1);

      expect(result2.rounds[1].series[0].lowerSeed?.teamId).toBe('team-4');
      expect(result2.rounds[1].series[1].lowerSeed?.teamId).toBe('team-3');
    });

    it('preserves existing DS higherSeed when advancing', () => {
      const bracket = buildFullBracket();
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-3');
      bracket.rounds[0].series[1] = completeSeries(bracket.rounds[0].series[1], 'team-4');

      const result = advanceWinners(bracket);

      expect(result.rounds[1].series[0].higherSeed?.teamId).toBe('team-1');
      expect(result.rounds[1].series[1].higherSeed?.teamId).toBe('team-2');
    });
  });

  describe('DS -> CS advancement', () => {
    it('advances both DS winners to CS', () => {
      const bracket = build4TeamBracket();
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-1');
      bracket.rounds[0].series[1] = completeSeries(bracket.rounds[0].series[1], 'team-2');

      const result = advanceWinners(bracket);

      expect(result.rounds[1].series[0].higherSeed?.teamId).toBe('team-1');
      expect(result.rounds[1].series[0].lowerSeed?.teamId).toBe('team-2');
    });

    it('assigns better-seeded DS winner as CS higherSeed', () => {
      const bracket = build4TeamBracket();
      // Upset: team 4 beats team 1
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-4');
      bracket.rounds[0].series[1] = completeSeries(bracket.rounds[0].series[1], 'team-2');

      const result = advanceWinners(bracket);

      // Team 2 (seed 2) is better seeded -> CS higherSeed
      expect(result.rounds[1].series[0].higherSeed?.teamId).toBe('team-2');
      // Team 4 (seed 4) is worse seeded -> CS lowerSeed
      expect(result.rounds[1].series[0].lowerSeed?.teamId).toBe('team-4');
    });

    it('does not advance when only one DS series is complete', () => {
      const bracket = build4TeamBracket();
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-1');

      const result = advanceWinners(bracket);

      expect(result.rounds[1].series[0].higherSeed).toBeNull();
      expect(result.rounds[1].series[0].lowerSeed).toBeNull();
    });
  });

  describe('CS -> champion', () => {
    it('sets championId when CS is complete', () => {
      const bracket = build2TeamBracket();
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-1');

      const result = advanceWinners(bracket);

      expect(result.championId).toBe('team-1');
    });

    it('does not set championId when CS is not complete', () => {
      const bracket = build2TeamBracket();

      const result = advanceWinners(bracket);

      expect(result.championId).toBeNull();
    });

    it('sets championId for underdog CS winner', () => {
      const bracket = build2TeamBracket();
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-2');

      const result = advanceWinners(bracket);

      expect(result.championId).toBe('team-2');
    });
  });

  describe('full pipeline', () => {
    it('advances through all rounds of a 6-team bracket', () => {
      const bracket = buildFullBracket();

      // Complete WC: team 3 (seed 3) and team 5 (seed 5) win
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-3');
      bracket.rounds[0].series[1] = completeSeries(bracket.rounds[0].series[1], 'team-5');

      let result = advanceWinners(bracket);

      // DS populated: team 5 (seed 5, worst) -> DS[0] vs seed 1
      expect(result.rounds[1].series[0].lowerSeed?.teamId).toBe('team-5');
      expect(result.rounds[1].series[1].lowerSeed?.teamId).toBe('team-3');

      // Complete DS: seed 1 and seed 3 win
      result.rounds[1].series[0] = completeSeries(result.rounds[1].series[0], 'team-1');
      result.rounds[1].series[1] = completeSeries(result.rounds[1].series[1], 'team-3');

      result = advanceWinners(result);

      // CS populated: team 1 (seed 1) -> higher, team 3 (seed 3) -> lower
      expect(result.rounds[2].series[0].higherSeed?.teamId).toBe('team-1');
      expect(result.rounds[2].series[0].lowerSeed?.teamId).toBe('team-3');

      // Complete CS: team 1 wins
      result.rounds[2].series[0] = completeSeries(result.rounds[2].series[0], 'team-1');

      result = advanceWinners(result);

      expect(result.championId).toBe('team-1');
    });

    it('handles partial advancement (WC done but DS in progress)', () => {
      const bracket = buildFullBracket();
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-3');
      bracket.rounds[0].series[1] = completeSeries(bracket.rounds[0].series[1], 'team-4');

      const result = advanceWinners(bracket);

      // DS populated but CS still empty
      expect(result.rounds[1].series[0].lowerSeed).not.toBeNull();
      expect(result.rounds[2].series[0].higherSeed).toBeNull();
      expect(result.championId).toBeNull();
    });
  });

  describe('bracket variants', () => {
    it('handles 4-team bracket (no WC round)', () => {
      const bracket = build4TeamBracket();
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-1');
      bracket.rounds[0].series[1] = completeSeries(bracket.rounds[0].series[1], 'team-2');

      let result = advanceWinners(bracket);

      result.rounds[1].series[0] = completeSeries(result.rounds[1].series[0], 'team-1');

      result = advanceWinners(result);

      expect(result.championId).toBe('team-1');
    });

    it('handles 2-team bracket (CS only)', () => {
      const bracket = build2TeamBracket();
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-2');

      const result = advanceWinners(bracket);

      expect(result.championId).toBe('team-2');
    });
  });

  describe('immutability', () => {
    it('does not mutate the original bracket', () => {
      const bracket = buildFullBracket();
      bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-3');
      bracket.rounds[0].series[1] = completeSeries(bracket.rounds[0].series[1], 'team-4');

      const originalDs0Lower = bracket.rounds[1].series[0].lowerSeed;

      advanceWinners(bracket);

      expect(bracket.rounds[1].series[0].lowerSeed).toBe(originalDs0Lower);
      expect(bracket.championId).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// isBracketComplete
// ---------------------------------------------------------------------------

describe('isBracketComplete', () => {
  it('returns false for a new bracket', () => {
    expect(isBracketComplete(buildFullBracket())).toBe(false);
  });

  it('returns false when WC is in progress', () => {
    const bracket = buildFullBracket();
    bracket.rounds[0].series[0] = completeSeries(bracket.rounds[0].series[0], 'team-3');

    expect(isBracketComplete(bracket)).toBe(false);
  });

  it('returns true when championId is set', () => {
    const bracket = buildFullBracket();
    bracket.championId = 'team-1';

    expect(isBracketComplete(bracket)).toBe(true);
  });

  it('returns true for 2-team bracket with champion', () => {
    const bracket = build2TeamBracket();
    bracket.championId = 'team-2';

    expect(isBracketComplete(bracket)).toBe(true);
  });
});
