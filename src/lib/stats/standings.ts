/**
 * Standings Calculator
 *
 * REQ-SCH-006: Compute standings after simulation.
 * REQ-STS-004: Pythagorean W-L expectation.
 *
 * Computes win percentage, games behind, Pythagorean expected W%,
 * sorts divisions, identifies division winners and wild card teams.
 *
 * Layer 1: Pure logic, no I/O, deterministic.
 */

import type { TeamSummary, DivisionStandings } from '../types/league';

/** Detailed standings entry with computed fields. */
export interface StandingsEntry {
  team: TeamSummary;
  winPct: number;
  gamesBehind: number;
  runDifferential: number;
  pythagoreanWinPct: number;
}

/**
 * Compute win percentage. Returns 0 if no games played.
 */
export function computeWinPct(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return wins / total;
}

/**
 * Compute games behind the division leader.
 * GB = ((leaderW - teamW) + (teamL - leaderL)) / 2
 */
export function computeGamesBehind(
  leaderWins: number,
  leaderLosses: number,
  teamWins: number,
  teamLosses: number,
): number {
  return ((leaderWins - teamWins) + (teamLosses - leaderLosses)) / 2;
}

/**
 * Compute Pythagorean expected win percentage.
 * W% = RS^2 / (RS^2 + RA^2)
 * Returns 0.500 if both RS and RA are zero.
 */
export function computePythagorean(runsScored: number, runsAllowed: number): number {
  const rs2 = runsScored ** 2;
  const ra2 = runsAllowed ** 2;
  if (rs2 + ra2 === 0) return 0.5;
  return rs2 / (rs2 + ra2);
}

/**
 * Sort teams by W-L record for standings.
 * Tiebreakers: 1) Win%, 2) Run differential, 3) Runs scored.
 * Returns a new sorted array.
 */
export function sortStandings(teams: readonly TeamSummary[]): TeamSummary[] {
  return [...teams].sort((a, b) => {
    const wpDiff = computeWinPct(b.wins, b.losses) - computeWinPct(a.wins, a.losses);
    if (Math.abs(wpDiff) > 0.0001) return wpDiff;

    const diffA = a.runsScored - a.runsAllowed;
    const diffB = b.runsScored - b.runsAllowed;
    if (diffB !== diffA) return diffB - diffA;

    return b.runsScored - a.runsScored;
  });
}

/**
 * Group teams by league/division and compute full standings.
 * Returns sorted DivisionStandings[].
 */
export function computeStandings(teams: readonly TeamSummary[]): DivisionStandings[] {
  const groups = new Map<string, TeamSummary[]>();

  for (const team of teams) {
    const key = `${team.leagueDivision}-${team.division}`;
    const group = groups.get(key) ?? [];
    group.push(team);
    groups.set(key, group);
  }

  const standings: DivisionStandings[] = [];
  for (const [key, groupTeams] of groups) {
    const [leagueDivision, division] = key.split('-') as ['AL' | 'NL', string];
    standings.push({
      leagueDivision,
      division,
      teams: sortStandings(groupTeams),
    });
  }

  return standings;
}

/**
 * Identify division winners (best record in each division).
 * Returns Map where key is "AL-East" format, value is the leading team.
 */
export function getDivisionWinners(
  standings: readonly DivisionStandings[],
): Map<string, TeamSummary> {
  const winners = new Map<string, TeamSummary>();
  for (const div of standings) {
    if (div.teams.length > 0) {
      const key = `${div.leagueDivision}-${div.division}`;
      winners.set(key, div.teams[0]); // Already sorted, first is leader
    }
  }
  return winners;
}

/**
 * Identify wild card teams for a league.
 * WC teams = best records among non-division-winners in the specified league.
 */
export function getWildCardTeams(
  league: 'AL' | 'NL',
  standings: readonly DivisionStandings[],
  divisionWinners: ReadonlySet<string>,
  wildcardSlots = 3,
): TeamSummary[] {
  const candidates: TeamSummary[] = [];

  for (const div of standings) {
    if (div.leagueDivision !== league) continue;
    for (const team of div.teams) {
      if (!divisionWinners.has(team.id)) {
        candidates.push(team);
      }
    }
  }

  const sorted = sortStandings(candidates);
  return sorted.slice(0, wildcardSlots);
}
