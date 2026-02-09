/**
 * Schedule Generator
 *
 * REQ-SCH-001: AL teams only play AL teams, NL only plays NL.
 *              Intra-division matchups weighted more frequently.
 * REQ-SCH-002: All teams play on the same day, once per day.
 * REQ-SCH-003: Balanced round-robin, target 162 games per team.
 * REQ-SCH-004: If odd teams in a league, one team gets a bye each day.
 *
 * Uses circle method for round-robin pairing generation.
 * All randomization uses SeededRNG for determinism (REQ-NFR-007).
 *
 * Layer 1: Pure logic, no I/O, deterministic given same seed.
 */

import type { TeamSummary } from '../types/league';
import type { ScheduleDay, ScheduleGameSummary } from '../types/schedule';
import type { SeededRNG } from '../rng/seeded-rng';
import { AppError } from '../errors/app-error';
import { ERROR_CODES } from '../errors/error-codes';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface ScheduleConfig {
  /** Target games per team (default: 162). */
  targetGamesPerTeam?: number;
  /** Weight for intra-division matchups relative to inter-division (default: 2.0). */
  intraDivisionWeight?: number;
}

const DEFAULT_TARGET_GAMES = 162;
const DEFAULT_INTRA_DIV_WEIGHT = 2.0;

// ---------------------------------------------------------------------------
// Round-Robin Pairing (Circle Method)
// ---------------------------------------------------------------------------

/**
 * Generate round-robin pairings using the circle method.
 * For N teams (even): produces N-1 rounds of N/2 pairings.
 * For N teams (odd): adds a BYE phantom, produces N rounds.
 * Each pair of real teams meets exactly once.
 *
 * Returns array of rounds, each round is an array of [teamA, teamB] pairs.
 * BYE pairings use the string 'BYE'.
 */
export function generateRoundRobinPairings(
  teamIds: readonly string[],
): [string, string][][] {
  const ids = [...teamIds];
  if (ids.length % 2 !== 0) {
    ids.push('BYE');
  }

  const n = ids.length;
  const rounds: [string, string][][] = [];

  // Circle method: fix ids[0], rotate positions 1..n-1
  for (let round = 0; round < n - 1; round++) {
    const pairings: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const home = ids[i];
      const away = ids[n - 1 - i];
      // Skip BYE pairings
      if (home === 'BYE' || away === 'BYE') continue;
      pairings.push([home, away]);
    }
    rounds.push(pairings);

    // Rotate positions 1..n-1: last element moves to position 1
    const last = ids[n - 1];
    for (let i = n - 1; i > 1; i--) {
      ids[i] = ids[i - 1];
    }
    ids[1] = last;
  }

  return rounds;
}

// ---------------------------------------------------------------------------
// Matchup Targets
// ---------------------------------------------------------------------------

/**
 * Compute how many times intra-division and inter-division opponents meet.
 *
 * @param teamsInDiv - Number of teams per division
 * @param divsInLeague - Number of divisions in the league
 * @param totalTeamsInLeague - Total teams in the league
 * @param targetGames - Target total games per team
 * @param weight - How much more intra-division games compared to inter (e.g. 2.0)
 * @returns Object with intraDivGames and interDivGames per opponent
 */
export function computeMatchupTargets(
  teamsInDiv: number,
  _divsInLeague: number,
  totalTeamsInLeague: number,
  targetGames: number,
  weight: number,
): { intraDivGames: number; interDivGames: number } {
  const intraOpponents = teamsInDiv - 1;
  const interOpponents = totalTeamsInLeague - teamsInDiv;

  if (intraOpponents === 0 && interOpponents === 0) {
    return { intraDivGames: 0, interDivGames: 0 };
  }

  // If only one division or no intra opponents, all games are inter
  if (intraOpponents === 0) {
    const interGames = Math.round(targetGames / interOpponents);
    return { intraDivGames: 0, interDivGames: interGames };
  }

  // If no inter opponents (only one division with all teams in same div)
  if (interOpponents === 0) {
    const intraGames = Math.round(targetGames / intraOpponents);
    return { intraDivGames: intraGames, interDivGames: 0 };
  }

  // Solve: intraOpponents * intraDivGames + interOpponents * interDivGames = targetGames
  //        intraDivGames = weight * interDivGames
  // => interOpponents * interDivGames + intraOpponents * weight * interDivGames = targetGames
  // => interDivGames * (interOpponents + intraOpponents * weight) = targetGames
  const interDivGames = Math.round(
    targetGames / (interOpponents + intraOpponents * weight),
  );
  const intraDivGames = Math.round(weight * interDivGames);

  // Adjust to hit exact target
  const total = intraOpponents * intraDivGames + interOpponents * interDivGames;
  if (total !== targetGames) {
    // Adjust inter games to fill remainder
    const remaining = targetGames - intraOpponents * intraDivGames;
    const adjustedInter = Math.round(remaining / interOpponents);
    return { intraDivGames, interDivGames: adjustedInter };
  }

  return { intraDivGames, interDivGames };
}

// ---------------------------------------------------------------------------
// Schedule Generation
// ---------------------------------------------------------------------------

let gameIdCounter = 0;

function makeGameId(_rng: SeededRNG, dayNum: number, gameIdx: number): string {
  gameIdCounter++;
  return `g-${dayNum}-${gameIdx}-${gameIdCounter}`;
}

/**
 * Generate a full regular-season schedule.
 *
 * @param teams - All teams in the league
 * @param rng - Seeded RNG for determinism
 * @param config - Optional schedule configuration
 * @returns Array of ScheduleDay objects
 */
export function generateSchedule(
  teams: readonly TeamSummary[],
  rng: SeededRNG,
  config?: ScheduleConfig,
): ScheduleDay[] {
  if (teams.length === 0) {
    throw new AppError(
      'VALIDATION',
      ERROR_CODES.SCHEDULE_NO_TEAMS,
      'Cannot generate schedule with no teams',
      400,
    );
  }

  const targetGames = config?.targetGamesPerTeam ?? DEFAULT_TARGET_GAMES;
  const intraDivWeight = config?.intraDivisionWeight ?? DEFAULT_INTRA_DIV_WEIGHT;

  // Reset counter for determinism
  gameIdCounter = 0;

  // Split teams by league
  const leagueGroups = new Map<string, TeamSummary[]>();
  for (const team of teams) {
    const group = leagueGroups.get(team.leagueDivision) ?? [];
    group.push(team);
    leagueGroups.set(team.leagueDivision, group);
  }

  // Generate matchup lists for each league
  const leagueMatchups = new Map<string, [string, string][]>();

  for (const [league, leagueTeams] of leagueGroups) {
    const matchups = generateLeagueMatchups(leagueTeams, targetGames, intraDivWeight, rng);
    leagueMatchups.set(league, matchups);
  }

  // Build daily schedule by interleaving league matchups
  return buildDailySchedule(leagueGroups, leagueMatchups, rng);
}

/**
 * Generate all matchups for a single league, respecting division weighting.
 */
function generateLeagueMatchups(
  leagueTeams: readonly TeamSummary[],
  targetGames: number,
  intraDivWeight: number,
  rng: SeededRNG,
): [string, string][] {
  // Group by division
  const divGroups = new Map<string, string[]>();
  for (const team of leagueTeams) {
    const group = divGroups.get(team.division) ?? [];
    group.push(team.id);
    divGroups.set(team.division, group);
  }

  const divisions = [...divGroups.keys()];
  const teamIds = leagueTeams.map((t) => t.id);

  // If only 1 division, all games are "intra-division"
  if (divisions.length <= 1) {
    return generateEvenMatchups(teamIds, targetGames, rng);
  }

  // Compute targets
  const teamsPerDiv = Math.ceil(leagueTeams.length / divisions.length);
  const targets = computeMatchupTargets(
    teamsPerDiv,
    divisions.length,
    leagueTeams.length,
    targetGames,
    intraDivWeight,
  );

  // Build matchup list
  const matchups: [string, string][] = [];

  // Intra-division matchups
  for (const [, divTeamIds] of divGroups) {
    for (let i = 0; i < divTeamIds.length; i++) {
      for (let j = i + 1; j < divTeamIds.length; j++) {
        for (let g = 0; g < targets.intraDivGames; g++) {
          // Alternate home/away
          if (g % 2 === 0) {
            matchups.push([divTeamIds[i], divTeamIds[j]]);
          } else {
            matchups.push([divTeamIds[j], divTeamIds[i]]);
          }
        }
      }
    }
  }

  // Inter-division matchups
  for (let di = 0; di < divisions.length; di++) {
    for (let dj = di + 1; dj < divisions.length; dj++) {
      const divA = divGroups.get(divisions[di])!;
      const divB = divGroups.get(divisions[dj])!;
      for (const a of divA) {
        for (const b of divB) {
          for (let g = 0; g < targets.interDivGames; g++) {
            if (g % 2 === 0) {
              matchups.push([a, b]);
            } else {
              matchups.push([b, a]);
            }
          }
        }
      }
    }
  }

  // Shuffle for variety
  return rng.shuffle(matchups);
}

/**
 * Generate evenly distributed matchups when there's only one division.
 */
function generateEvenMatchups(
  teamIds: readonly string[],
  targetGames: number,
  rng: SeededRNG,
): [string, string][] {
  const n = teamIds.length;
  if (n < 2) return [];

  const opponents = n - 1;
  const gamesPerOpponent = Math.round(targetGames / opponents);

  const matchups: [string, string][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let g = 0; g < gamesPerOpponent; g++) {
        if (g % 2 === 0) {
          matchups.push([teamIds[i], teamIds[j]]);
        } else {
          matchups.push([teamIds[j], teamIds[i]]);
        }
      }
    }
  }

  return rng.shuffle(matchups);
}

/**
 * Build daily schedule by distributing matchups into days.
 * Ensures no team plays more than once per day.
 */
function buildDailySchedule(
  leagueGroups: Map<string, TeamSummary[]>,
  leagueMatchups: Map<string, [string, string][]>,
  rng: SeededRNG,
): ScheduleDay[] {
  // Create per-league remaining matchup queues
  const queues = new Map<string, [string, string][]>();
  for (const [league, matchups] of leagueMatchups) {
    queues.set(league, [...matchups]);
  }

  const days: ScheduleDay[] = [];
  let dayNumber = 0;

  // Keep going until all matchups are scheduled
  while (hasRemainingMatchups(queues)) {
    dayNumber++;
    const dayGames: ScheduleGameSummary[] = [];
    const teamsUsedToday = new Set<string>();

    // Process each league
    for (const [league, leagueTeams] of leagueGroups) {
      const queue = queues.get(league)!;
      const teamIds = new Set(leagueTeams.map((t) => t.id));

      // Try to schedule as many games as possible for this league today
      const scheduled = scheduleLeagueDay(queue, teamIds, teamsUsedToday, rng);
      for (const [home, away] of scheduled) {
        const gameIdx = dayGames.length;
        dayGames.push({
          id: makeGameId(rng, dayNumber, gameIdx),
          homeTeamId: home,
          awayTeamId: away,
          homeScore: null,
          awayScore: null,
          isComplete: false,
          gameLogId: null,
        });
        teamsUsedToday.add(home);
        teamsUsedToday.add(away);
      }
    }

    if (dayGames.length > 0) {
      days.push({ dayNumber, games: dayGames });
    }
  }

  return days;
}

/**
 * Schedule as many games as possible for one league on one day.
 * Removes scheduled matchups from the queue.
 */
function scheduleLeagueDay(
  queue: [string, string][],
  leagueTeamIds: Set<string>,
  teamsUsedToday: Set<string>,
  rng: SeededRNG,
): [string, string][] {
  const scheduled: [string, string][] = [];
  const usedThisDay = new Set(teamsUsedToday);
  const maxGames = Math.floor(leagueTeamIds.size / 2);

  // Scan through queue and pick games where neither team is busy
  const remaining: [string, string][] = [];
  for (const matchup of queue) {
    const [home, away] = matchup;
    if (scheduled.length < maxGames && !usedThisDay.has(home) && !usedThisDay.has(away)) {
      // Randomly flip home/away for variety
      if (rng.chance(0.5)) {
        scheduled.push([home, away]);
      } else {
        scheduled.push([away, home]);
      }
      usedThisDay.add(home);
      usedThisDay.add(away);
    } else {
      remaining.push(matchup);
    }
  }

  // Replace queue contents with remaining matchups
  queue.length = 0;
  queue.push(...remaining);

  return scheduled;
}

function hasRemainingMatchups(queues: Map<string, [string, string][]>): boolean {
  for (const [, queue] of queues) {
    if (queue.length > 0) return true;
  }
  return false;
}
