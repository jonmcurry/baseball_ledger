/**
 * Tests for Standings Calculator (REQ-SCH-006, REQ-STS-004)
 *
 * Compute standings, games behind, Pythagorean W-L, division winners,
 * and wild card teams.
 */

import type { TeamSummary, DivisionStandings } from '@lib/types/league';
import {
  computeWinPct,
  computeGamesBehind,
  computePythagorean,
  sortStandings,
  computeStandings,
  getDivisionWinners,
  getWildCardTeams,
  computeStreak,
  computeLastN,
} from '@lib/stats/standings';
import type { GameResultForTeam } from '@lib/stats/standings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTeam(
  id: string,
  league: 'AL' | 'NL',
  division: string,
  wins: number,
  losses: number,
  rs = 500,
  ra = 500,
): TeamSummary {
  return {
    id, name: `Team ${id}`, city: `City ${id}`, ownerId: null,
    managerProfile: 'balanced', leagueDivision: league, division,
    wins, losses, runsScored: rs, runsAllowed: ra,
    homeWins: 0, homeLosses: 0, awayWins: 0, awayLosses: 0,
    streak: '-', lastTenWins: 0, lastTenLosses: 0,
  };
}

// ---------------------------------------------------------------------------
// computeWinPct
// ---------------------------------------------------------------------------

describe('computeWinPct', () => {
  it('computes win percentage', () => {
    expect(computeWinPct(90, 72)).toBeCloseTo(90 / 162, 3);
  });

  it('returns 0 when no games played', () => {
    expect(computeWinPct(0, 0)).toBe(0);
  });

  it('returns 1.000 for perfect record', () => {
    expect(computeWinPct(162, 0)).toBeCloseTo(1.0, 3);
  });
});

// ---------------------------------------------------------------------------
// computeGamesBehind
// ---------------------------------------------------------------------------

describe('computeGamesBehind', () => {
  it('returns 0 for the leader', () => {
    expect(computeGamesBehind(90, 72, 90, 72)).toBe(0);
  });

  it('computes 1 game behind', () => {
    expect(computeGamesBehind(90, 72, 89, 73)).toBe(1);
  });

  it('computes half game behind', () => {
    expect(computeGamesBehind(90, 72, 90, 73)).toBe(0.5);
  });

  it('computes many games behind', () => {
    expect(computeGamesBehind(100, 62, 70, 92)).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// computePythagorean
// ---------------------------------------------------------------------------

describe('computePythagorean', () => {
  it('computes Pythagorean W% for a strong team', () => {
    // RS=800, RA=600 -> 640000/(640000+360000) = 0.640
    expect(computePythagorean(800, 600)).toBeCloseTo(640000 / 1000000, 3);
  });

  it('returns 0.500 when RS equals RA', () => {
    expect(computePythagorean(500, 500)).toBeCloseTo(0.5, 3);
  });

  it('returns 0.500 when both are zero', () => {
    expect(computePythagorean(0, 0)).toBeCloseTo(0.5, 3);
  });

  it('returns near 1.0 for dominant team', () => {
    expect(computePythagorean(1000, 100)).toBeGreaterThan(0.95);
  });
});

// ---------------------------------------------------------------------------
// sortStandings
// ---------------------------------------------------------------------------

describe('sortStandings', () => {
  it('sorts by win percentage descending', () => {
    const teams = [
      makeTeam('a', 'AL', 'East', 80, 82),
      makeTeam('b', 'AL', 'East', 95, 67),
      makeTeam('c', 'AL', 'East', 88, 74),
    ];
    const sorted = sortStandings(teams);
    expect(sorted[0].id).toBe('b');
    expect(sorted[1].id).toBe('c');
    expect(sorted[2].id).toBe('a');
  });

  it('breaks ties by run differential', () => {
    const teams = [
      makeTeam('a', 'AL', 'East', 90, 72, 700, 650), // diff +50
      makeTeam('b', 'AL', 'East', 90, 72, 800, 600), // diff +200
    ];
    const sorted = sortStandings(teams);
    expect(sorted[0].id).toBe('b');
  });

  it('breaks further ties by runs scored', () => {
    const teams = [
      makeTeam('a', 'AL', 'East', 90, 72, 700, 700),
      makeTeam('b', 'AL', 'East', 90, 72, 750, 750),
    ];
    const sorted = sortStandings(teams);
    expect(sorted[0].id).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// computeStandings
// ---------------------------------------------------------------------------

describe('computeStandings', () => {
  it('groups teams by league and division', () => {
    const teams = [
      makeTeam('a1', 'AL', 'East', 90, 72),
      makeTeam('a2', 'AL', 'East', 85, 77),
      makeTeam('n1', 'NL', 'West', 88, 74),
      makeTeam('n2', 'NL', 'West', 82, 80),
    ];
    const standings = computeStandings(teams);
    expect(standings).toHaveLength(2); // AL East + NL West
    const alEast = standings.find((s) => s.leagueDivision === 'AL' && s.division === 'East');
    expect(alEast).toBeDefined();
    expect(alEast!.teams).toHaveLength(2);
    expect(alEast!.teams[0].id).toBe('a1'); // Higher win%
  });

  it('sorts teams within each division', () => {
    const teams = [
      makeTeam('a3', 'AL', 'East', 70, 92),
      makeTeam('a1', 'AL', 'East', 95, 67),
      makeTeam('a2', 'AL', 'East', 88, 74),
    ];
    const standings = computeStandings(teams);
    expect(standings[0].teams[0].id).toBe('a1');
    expect(standings[0].teams[1].id).toBe('a2');
    expect(standings[0].teams[2].id).toBe('a3');
  });
});

// ---------------------------------------------------------------------------
// getDivisionWinners
// ---------------------------------------------------------------------------

describe('getDivisionWinners', () => {
  it('identifies the best team in each division', () => {
    const standings: DivisionStandings[] = [
      {
        leagueDivision: 'AL', division: 'East',
        teams: [makeTeam('ae1', 'AL', 'East', 95, 67), makeTeam('ae2', 'AL', 'East', 88, 74)],
      },
      {
        leagueDivision: 'AL', division: 'West',
        teams: [makeTeam('aw1', 'AL', 'West', 92, 70), makeTeam('aw2', 'AL', 'West', 80, 82)],
      },
    ];
    const winners = getDivisionWinners(standings);
    expect(winners.get('AL-East')!.id).toBe('ae1');
    expect(winners.get('AL-West')!.id).toBe('aw1');
  });
});

// ---------------------------------------------------------------------------
// getWildCardTeams
// ---------------------------------------------------------------------------

describe('getWildCardTeams', () => {
  it('returns best non-division-winners', () => {
    const standings: DivisionStandings[] = [
      {
        leagueDivision: 'AL', division: 'East',
        teams: [
          makeTeam('ae1', 'AL', 'East', 95, 67),
          makeTeam('ae2', 'AL', 'East', 90, 72),
          makeTeam('ae3', 'AL', 'East', 85, 77),
        ],
      },
      {
        leagueDivision: 'AL', division: 'West',
        teams: [
          makeTeam('aw1', 'AL', 'West', 92, 70),
          makeTeam('aw2', 'AL', 'West', 88, 74),
        ],
      },
    ];
    const winners = new Set(['ae1', 'aw1']);
    const wc = getWildCardTeams('AL', standings, winners, 3);
    expect(wc).toHaveLength(3);
    // Should be ae2(90W), aw2(88W), ae3(85W) sorted by record
    expect(wc[0].id).toBe('ae2');
    expect(wc[1].id).toBe('aw2');
    expect(wc[2].id).toBe('ae3');
  });

  it('returns fewer teams when not enough available', () => {
    const standings: DivisionStandings[] = [
      {
        leagueDivision: 'AL', division: 'East',
        teams: [makeTeam('ae1', 'AL', 'East', 95, 67), makeTeam('ae2', 'AL', 'East', 80, 82)],
      },
    ];
    const winners = new Set(['ae1']);
    const wc = getWildCardTeams('AL', standings, winners, 3);
    expect(wc).toHaveLength(1);
    expect(wc[0].id).toBe('ae2');
  });

  it('filters to the correct league', () => {
    const standings: DivisionStandings[] = [
      {
        leagueDivision: 'AL', division: 'East',
        teams: [makeTeam('ae1', 'AL', 'East', 95, 67), makeTeam('ae2', 'AL', 'East', 85, 77)],
      },
      {
        leagueDivision: 'NL', division: 'East',
        teams: [makeTeam('ne1', 'NL', 'East', 92, 70), makeTeam('ne2', 'NL', 'East', 88, 74)],
      },
    ];
    const winners = new Set(['ae1', 'ne1']);
    const alWC = getWildCardTeams('AL', standings, winners, 3);
    expect(alWC.every((t) => t.leagueDivision === 'AL')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeStreak
// ---------------------------------------------------------------------------

describe('computeStreak', () => {
  function makeGame(won: boolean, dayNumber: number): GameResultForTeam {
    return { won, dayNumber };
  }

  it('returns "-" for no games', () => {
    expect(computeStreak([])).toBe('-');
  });

  it('returns "W1" for a single win', () => {
    expect(computeStreak([makeGame(true, 1)])).toBe('W1');
  });

  it('returns "L1" for a single loss', () => {
    expect(computeStreak([makeGame(false, 1)])).toBe('L1');
  });

  it('counts consecutive wins from most recent', () => {
    const games = [
      makeGame(false, 1),
      makeGame(true, 2),
      makeGame(true, 3),
      makeGame(true, 4),
    ];
    expect(computeStreak(games)).toBe('W3');
  });

  it('counts consecutive losses from most recent', () => {
    const games = [
      makeGame(true, 1),
      makeGame(true, 2),
      makeGame(false, 3),
      makeGame(false, 4),
    ];
    expect(computeStreak(games)).toBe('L2');
  });

  it('handles unsorted input by sorting by dayNumber DESC', () => {
    const games = [
      makeGame(true, 4),
      makeGame(false, 1),
      makeGame(true, 3),
      makeGame(true, 2),
    ];
    // Most recent = day 4 (W), then day 3 (W), then day 2 (W), day 1 (L)
    expect(computeStreak(games)).toBe('W3');
  });

  it('stops at first break in streak', () => {
    const games = [
      makeGame(true, 1),
      makeGame(false, 2),
      makeGame(true, 3),
    ];
    expect(computeStreak(games)).toBe('W1');
  });
});

// ---------------------------------------------------------------------------
// computeLastN
// ---------------------------------------------------------------------------

describe('computeLastN', () => {
  function makeGame(won: boolean, dayNumber: number): GameResultForTeam {
    return { won, dayNumber };
  }

  it('returns {wins:0, losses:0} for no games', () => {
    expect(computeLastN([], 10)).toEqual({ wins: 0, losses: 0 });
  });

  it('returns record for fewer games than N', () => {
    const games = [makeGame(true, 1), makeGame(false, 2), makeGame(true, 3)];
    expect(computeLastN(games, 10)).toEqual({ wins: 2, losses: 1 });
  });

  it('returns only the last N games', () => {
    const games = [
      makeGame(true, 1),   // oldest - excluded
      makeGame(true, 2),   // excluded
      makeGame(false, 3),  // excluded
      makeGame(true, 4),
      makeGame(false, 5),
      makeGame(true, 6),
      makeGame(true, 7),
      makeGame(false, 8),
      makeGame(true, 9),
      makeGame(true, 10),
      makeGame(false, 11),
      makeGame(true, 12),
      makeGame(true, 13),
    ];
    // Last 10: days 4-13 = W, L, W, W, L, W, W, L, W, W = 7-3
    const result = computeLastN(games, 10);
    expect(result).toEqual({ wins: 7, losses: 3 });
  });

  it('handles exactly N games', () => {
    const games = Array.from({ length: 10 }, (_, i) => makeGame(i % 2 === 0, i + 1));
    // 5 wins (0,2,4,6,8), 5 losses (1,3,5,7,9)
    expect(computeLastN(games, 10)).toEqual({ wins: 5, losses: 5 });
  });
});
