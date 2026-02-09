/**
 * Tests for Schedule Generator (REQ-SCH-001 through REQ-SCH-004)
 *
 * Round-robin schedule generation: league separation, balanced matchups,
 * division weighting, bye handling, and determinism.
 */

import type { TeamSummary } from '@lib/types/league';
import type { ScheduleDay } from '@lib/types/schedule';
import { SeededRNG } from '@lib/rng/seeded-rng';
import {
  generateRoundRobinPairings,
  computeMatchupTargets,
  generateSchedule,
  type ScheduleConfig,
} from '@lib/schedule/generator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTeam(
  id: string,
  league: 'AL' | 'NL',
  division: string,
): TeamSummary {
  return {
    id,
    name: `Team ${id}`,
    city: `City ${id}`,
    ownerId: null,
    managerProfile: 'balanced',
    leagueDivision: league,
    division,
    wins: 0,
    losses: 0,
    runsScored: 0,
    runsAllowed: 0,
  };
}

/** Create a standard 8-team league: 4 AL (2 East, 2 West), 4 NL (2 East, 2 West). */
function makeStandardLeague(): TeamSummary[] {
  return [
    makeTeam('al-e1', 'AL', 'East'),
    makeTeam('al-e2', 'AL', 'East'),
    makeTeam('al-w1', 'AL', 'West'),
    makeTeam('al-w2', 'AL', 'West'),
    makeTeam('nl-e1', 'NL', 'East'),
    makeTeam('nl-e2', 'NL', 'East'),
    makeTeam('nl-w1', 'NL', 'West'),
    makeTeam('nl-w2', 'NL', 'West'),
  ];
}

/** Count how many times teamA plays teamB across all schedule days. */
function countMatchups(
  schedule: ScheduleDay[],
  teamA: string,
  teamB: string,
): number {
  let count = 0;
  for (const day of schedule) {
    for (const game of day.games) {
      if (
        (game.homeTeamId === teamA && game.awayTeamId === teamB) ||
        (game.homeTeamId === teamB && game.awayTeamId === teamA)
      ) {
        count++;
      }
    }
  }
  return count;
}

/** Collect all unique team IDs that play on a given day. */
function teamsPlayingOnDay(day: ScheduleDay): Set<string> {
  const teams = new Set<string>();
  for (const game of day.games) {
    teams.add(game.homeTeamId);
    teams.add(game.awayTeamId);
  }
  return teams;
}

// ---------------------------------------------------------------------------
// generateRoundRobinPairings
// ---------------------------------------------------------------------------

describe('generateRoundRobinPairings', () => {
  it('generates N-1 rounds for N teams (even)', () => {
    const rounds = generateRoundRobinPairings(['a', 'b', 'c', 'd']);
    expect(rounds).toHaveLength(3); // 4 teams -> 3 rounds
  });

  it('generates N rounds for N teams (odd, with BYE)', () => {
    const rounds = generateRoundRobinPairings(['a', 'b', 'c']);
    // 3 teams -> padded to 4 with BYE -> 3 rounds
    expect(rounds).toHaveLength(3);
  });

  it('each round has N/2 pairings (even)', () => {
    const rounds = generateRoundRobinPairings(['a', 'b', 'c', 'd']);
    for (const round of rounds) {
      expect(round).toHaveLength(2); // 4/2 = 2 games per round
    }
  });

  it('every pair of teams meets exactly once across all rounds', () => {
    const teamIds = ['a', 'b', 'c', 'd', 'e', 'f'];
    const rounds = generateRoundRobinPairings(teamIds);

    // Count how many times each pair appears
    const pairCount = new Map<string, number>();
    for (const round of rounds) {
      for (const [t1, t2] of round) {
        const key = [t1, t2].sort().join('-');
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }

    // Each pair of real teams (not BYE) should appear exactly once
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        const key = [teamIds[i], teamIds[j]].sort().join('-');
        expect(pairCount.get(key)).toBe(1);
      }
    }
  });

  it('no team plays twice in the same round', () => {
    const rounds = generateRoundRobinPairings(['a', 'b', 'c', 'd', 'e', 'f']);
    for (const round of rounds) {
      const seen = new Set<string>();
      for (const [t1, t2] of round) {
        expect(seen.has(t1)).toBe(false);
        expect(seen.has(t2)).toBe(false);
        seen.add(t1);
        seen.add(t2);
      }
    }
  });

  it('handles 2 teams', () => {
    const rounds = generateRoundRobinPairings(['a', 'b']);
    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toHaveLength(1);
    expect(rounds[0][0]).toEqual(['a', 'b']);
  });
});

// ---------------------------------------------------------------------------
// computeMatchupTargets
// ---------------------------------------------------------------------------

describe('computeMatchupTargets', () => {
  it('returns intra and inter division game counts', () => {
    // 4 teams in league, 2 per division, target 162 games, intraDivWeight=2
    const targets = computeMatchupTargets(2, 2, 4, 162, 2.0);
    expect(targets.intraDivGames).toBeGreaterThan(0);
    expect(targets.interDivGames).toBeGreaterThan(0);
    // Total should add up to target
    const intraOpponents = 2 - 1; // 1 other team in division
    const interOpponents = 4 - 2; // 2 teams in other division
    const totalGames =
      intraOpponents * targets.intraDivGames +
      interOpponents * targets.interDivGames;
    expect(totalGames).toBe(162);
  });

  it('intra-division games > inter-division games when weight > 1', () => {
    const targets = computeMatchupTargets(3, 2, 6, 162, 2.0);
    expect(targets.intraDivGames).toBeGreaterThan(targets.interDivGames);
  });

  it('equal games when weight = 1', () => {
    const targets = computeMatchupTargets(3, 2, 6, 162, 1.0);
    // Should be approximately equal (rounding may differ by 1)
    expect(Math.abs(targets.intraDivGames - targets.interDivGames)).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// generateSchedule
// ---------------------------------------------------------------------------

describe('generateSchedule', () => {
  it('returns ScheduleDay array', () => {
    const teams = makeStandardLeague();
    const rng = new SeededRNG(42);
    const schedule = generateSchedule(teams, rng);
    expect(Array.isArray(schedule)).toBe(true);
    expect(schedule.length).toBeGreaterThan(0);
  });

  it('each day has sequential day numbers starting at 1', () => {
    const teams = makeStandardLeague();
    const rng = new SeededRNG(42);
    const schedule = generateSchedule(teams, rng);
    for (let i = 0; i < schedule.length; i++) {
      expect(schedule[i].dayNumber).toBe(i + 1);
    }
  });

  it('all game IDs are unique', () => {
    const teams = makeStandardLeague();
    const rng = new SeededRNG(42);
    const schedule = generateSchedule(teams, rng);
    const ids = new Set<string>();
    for (const day of schedule) {
      for (const game of day.games) {
        expect(ids.has(game.id)).toBe(false);
        ids.add(game.id);
      }
    }
  });

  it('games start unplayed', () => {
    const teams = makeStandardLeague();
    const rng = new SeededRNG(42);
    const schedule = generateSchedule(teams, rng);
    for (const day of schedule) {
      for (const game of day.games) {
        expect(game.isComplete).toBe(false);
        expect(game.homeScore).toBeNull();
        expect(game.awayScore).toBeNull();
        expect(game.gameLogId).toBeNull();
      }
    }
  });

  // REQ-SCH-001: AL teams only play AL, NL only play NL
  it('AL teams never play NL teams', () => {
    const teams = makeStandardLeague();
    const rng = new SeededRNG(42);
    const schedule = generateSchedule(teams, rng);

    const alTeamIds = new Set(teams.filter((t) => t.leagueDivision === 'AL').map((t) => t.id));
    const nlTeamIds = new Set(teams.filter((t) => t.leagueDivision === 'NL').map((t) => t.id));

    for (const day of schedule) {
      for (const game of day.games) {
        const homeAL = alTeamIds.has(game.homeTeamId);
        const awayAL = alTeamIds.has(game.awayTeamId);
        // Both must be in same league
        expect(homeAL).toBe(awayAL);
      }
    }
  });

  // REQ-SCH-002: All teams play on the same day
  it('all teams play on every day (even team count)', () => {
    const teams = makeStandardLeague();
    const rng = new SeededRNG(42);
    const schedule = generateSchedule(teams, rng);

    const allTeamIds = new Set(teams.map((t) => t.id));
    for (const day of schedule) {
      const playing = teamsPlayingOnDay(day);
      expect(playing).toEqual(allTeamIds);
    }
  });

  // REQ-SCH-003: Each team plays close to the target number of games
  it('each team plays approximately the target number of games', () => {
    const teams = makeStandardLeague();
    const rng = new SeededRNG(42);
    const config: ScheduleConfig = { targetGamesPerTeam: 40 };
    const schedule = generateSchedule(teams, rng, config);

    const gameCounts = new Map<string, number>();
    for (const day of schedule) {
      for (const game of day.games) {
        gameCounts.set(game.homeTeamId, (gameCounts.get(game.homeTeamId) ?? 0) + 1);
        gameCounts.set(game.awayTeamId, (gameCounts.get(game.awayTeamId) ?? 0) + 1);
      }
    }

    for (const team of teams) {
      const count = gameCounts.get(team.id) ?? 0;
      // Allow small variance due to rounding
      expect(count).toBeGreaterThanOrEqual(38);
      expect(count).toBeLessThanOrEqual(42);
    }
  });

  // REQ-SCH-001: Intra-division matchups more frequent
  it('intra-division matchups are more frequent than inter-division', () => {
    const teams = makeStandardLeague();
    const rng = new SeededRNG(42);
    const config: ScheduleConfig = { targetGamesPerTeam: 60, intraDivisionWeight: 2.0 };
    const schedule = generateSchedule(teams, rng, config);

    // al-e1 vs al-e2 (same division) should be > al-e1 vs al-w1 (different division)
    const intraDivCount = countMatchups(schedule, 'al-e1', 'al-e2');
    const interDivCount = countMatchups(schedule, 'al-e1', 'al-w1');

    expect(intraDivCount).toBeGreaterThan(interDivCount);
  });

  // REQ-SCH-004: Bye handling for odd teams
  it('handles odd number of teams in a league with byes', () => {
    const teams = [
      makeTeam('al-e1', 'AL', 'East'),
      makeTeam('al-e2', 'AL', 'East'),
      makeTeam('al-w1', 'AL', 'West'),
      // 3 AL teams = odd, one gets bye each day
      makeTeam('nl-e1', 'NL', 'East'),
      makeTeam('nl-e2', 'NL', 'East'),
    ];
    const rng = new SeededRNG(42);
    const config: ScheduleConfig = { targetGamesPerTeam: 20 };
    const schedule = generateSchedule(teams, rng, config);
    expect(schedule.length).toBeGreaterThan(0);

    // For AL days: only 1 game (2 of 3 teams play), 1 team gets bye
    const alTeamIds = new Set(['al-e1', 'al-e2', 'al-w1']);
    for (const day of schedule) {
      const alGames = day.games.filter(
        (g) => alTeamIds.has(g.homeTeamId) || alTeamIds.has(g.awayTeamId),
      );
      // At most 1 AL game per day (3 teams, 1 bye)
      expect(alGames.length).toBeLessThanOrEqual(1);
    }
  });

  // Determinism via SeededRNG
  it('produces identical schedules from same seed', () => {
    const teams = makeStandardLeague();
    const rng1 = new SeededRNG(99);
    const rng2 = new SeededRNG(99);
    const s1 = generateSchedule(teams, rng1);
    const s2 = generateSchedule(teams, rng2);

    expect(s1.length).toBe(s2.length);
    for (let d = 0; d < s1.length; d++) {
      expect(s1[d].games.length).toBe(s2[d].games.length);
      for (let g = 0; g < s1[d].games.length; g++) {
        expect(s1[d].games[g].homeTeamId).toBe(s2[d].games[g].homeTeamId);
        expect(s1[d].games[g].awayTeamId).toBe(s2[d].games[g].awayTeamId);
      }
    }
  });

  it('produces different schedules from different seeds', () => {
    const teams = makeStandardLeague();
    const s1 = generateSchedule(teams, new SeededRNG(1));
    const s2 = generateSchedule(teams, new SeededRNG(999));

    // At least one game should differ in home/away assignment
    let hasDifference = false;
    const minLen = Math.min(s1.length, s2.length);
    for (let d = 0; d < minLen && !hasDifference; d++) {
      const minGames = Math.min(s1[d].games.length, s2[d].games.length);
      for (let g = 0; g < minGames; g++) {
        if (
          s1[d].games[g].homeTeamId !== s2[d].games[g].homeTeamId ||
          s1[d].games[g].awayTeamId !== s2[d].games[g].awayTeamId
        ) {
          hasDifference = true;
          break;
        }
      }
    }
    expect(hasDifference).toBe(true);
  });

  it('throws on empty teams array', () => {
    const rng = new SeededRNG(42);
    expect(() => generateSchedule([], rng)).toThrow();
  });

  it('works with a single league (all AL)', () => {
    const teams = [
      makeTeam('t1', 'AL', 'East'),
      makeTeam('t2', 'AL', 'East'),
      makeTeam('t3', 'AL', 'West'),
      makeTeam('t4', 'AL', 'West'),
    ];
    const rng = new SeededRNG(42);
    const schedule = generateSchedule(teams, rng, { targetGamesPerTeam: 30 });
    expect(schedule.length).toBeGreaterThan(0);

    // All games should involve AL teams only
    const teamIds = new Set(teams.map((t) => t.id));
    for (const day of schedule) {
      for (const game of day.games) {
        expect(teamIds.has(game.homeTeamId)).toBe(true);
        expect(teamIds.has(game.awayTeamId)).toBe(true);
      }
    }
  });

  it('no team plays itself', () => {
    const teams = makeStandardLeague();
    const rng = new SeededRNG(42);
    const schedule = generateSchedule(teams, rng);
    for (const day of schedule) {
      for (const game of day.games) {
        expect(game.homeTeamId).not.toBe(game.awayTeamId);
      }
    }
  });

  it('no team plays more than once per day', () => {
    const teams = makeStandardLeague();
    const rng = new SeededRNG(42);
    const schedule = generateSchedule(teams, rng);
    for (const day of schedule) {
      const seen = new Set<string>();
      for (const game of day.games) {
        expect(seen.has(game.homeTeamId)).toBe(false);
        expect(seen.has(game.awayTeamId)).toBe(false);
        seen.add(game.homeTeamId);
        seen.add(game.awayTeamId);
      }
    }
  });
});
