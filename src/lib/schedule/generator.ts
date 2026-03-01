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
  /** Probability of rain cancellation per game (default: 0.03 = 3%). */
  rainoutChance?: number;
  /** Maximum calendar days for the schedule (default: 162). */
  maxCalendarDays?: number;
}

const DEFAULT_TARGET_GAMES = 162;
const DEFAULT_INTRA_DIV_WEIGHT = 2.0;
const DEFAULT_RAINOUT_CHANCE = 0.03;
const DEFAULT_MAX_CALENDAR_DAYS = 162;

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
): { intraDivGames: number; interDivGames: number; extraGames: number } {
  const intraOpponents = teamsInDiv - 1;
  const interOpponents = totalTeamsInLeague - teamsInDiv;

  if (intraOpponents === 0 && interOpponents === 0) {
    return { intraDivGames: 0, interDivGames: 0, extraGames: 0 };
  }

  // If only one division or no intra opponents, all games are inter
  if (intraOpponents === 0) {
    const interBase = Math.floor(targetGames / interOpponents);
    const extra = targetGames - interBase * interOpponents;
    return { intraDivGames: 0, interDivGames: interBase, extraGames: extra };
  }

  // If no inter opponents (only one division with all teams in same div)
  if (interOpponents === 0) {
    const intraBase = Math.floor(targetGames / intraOpponents);
    const extra = targetGames - intraBase * intraOpponents;
    return { intraDivGames: intraBase, interDivGames: 0, extraGames: extra };
  }

  // Solve: intraOpponents * intraDivGames + interOpponents * interDivGames = targetGames
  //        intraDivGames = weight * interDivGames
  // Use floor to guarantee we never exceed target, then compute remainder.
  const interDivGames = Math.floor(
    targetGames / (interOpponents + intraOpponents * weight),
  );
  const intraDivGames = Math.floor(weight * interDivGames);

  const baseTotal = intraOpponents * intraDivGames + interOpponents * interDivGames;
  const extraGames = targetGames - baseTotal;

  return { intraDivGames, interDivGames, extraGames };
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

  const maxCalendarDays = config?.maxCalendarDays ?? DEFAULT_MAX_CALENDAR_DAYS;
  const rainoutChance = config?.rainoutChance ?? DEFAULT_RAINOUT_CHANCE;

  // Build daily schedule by interleaving league matchups
  let days = buildDailySchedule(leagueGroups, leagueMatchups, rng);

  // Compress schedule to fit within maxCalendarDays using doubleheaders
  days = compressToTargetDays(days, maxCalendarDays);

  // Apply rain cancellations and schedule makeup games
  if (rainoutChance > 0) {
    days = applyRainoutsAndMakeups(days, rainoutChance, rng);
  }

  return days;
}

/**
 * Generate all matchups for a single league, respecting division weighting.
 * Guarantees each team plays exactly targetGames by distributing remainder
 * games across intra-division matchups.
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

  // Distribute extra games to hit exactly targetGames per team.
  // Each extra game is added to an intra-division matchup pair, round-robin.
  if (targets.extraGames > 0) {
    distributeExtraGames(matchups, targets.extraGames, leagueTeams, divGroups, rng);
  }

  // Shuffle for variety
  return rng.shuffle(matchups);
}

/**
 * Distribute extra games so every team hits exactly targetGames.
 * extraPerTeam is the deficit each team needs. Each matchup added fills
 * 1 game for both teams involved. Prioritizes intra-division pairs.
 */
function distributeExtraGames(
  matchups: [string, string][],
  extraPerTeam: number,
  leagueTeams: readonly TeamSummary[],
  divGroups: Map<string, string[]>,
  rng: SeededRNG,
): void {
  // Track how many more games each team needs
  const needs = new Map<string, number>();
  for (const team of leagueTeams) {
    needs.set(team.id, extraPerTeam);
  }

  // Build candidate pairs: intra-division first, then inter-division
  const intraPairs: [string, string][] = [];
  for (const [, divTeamIds] of divGroups) {
    for (let i = 0; i < divTeamIds.length; i++) {
      for (let j = i + 1; j < divTeamIds.length; j++) {
        intraPairs.push([divTeamIds[i], divTeamIds[j]]);
      }
    }
  }

  const interPairs: [string, string][] = [];
  const allIds = leagueTeams.map((t) => t.id);
  const teamDivMap = new Map<string, string>();
  for (const t of leagueTeams) teamDivMap.set(t.id, t.division);
  for (let i = 0; i < allIds.length; i++) {
    for (let j = i + 1; j < allIds.length; j++) {
      if (teamDivMap.get(allIds[i]) !== teamDivMap.get(allIds[j])) {
        interPairs.push([allIds[i], allIds[j]]);
      }
    }
  }

  const candidates = [...intraPairs, ...interPairs];

  let passes = 0;
  while (passes < 200) {
    passes++;
    let added = false;
    for (const [a, b] of candidates) {
      const needA = needs.get(a) ?? 0;
      const needB = needs.get(b) ?? 0;
      if (needA > 0 && needB > 0) {
        if (rng.chance(0.5)) {
          matchups.push([a, b]);
        } else {
          matchups.push([b, a]);
        }
        needs.set(a, needA - 1);
        needs.set(b, needB - 1);
        added = true;
      }
    }
    // Check if all teams are satisfied
    let allDone = true;
    for (const [, n] of needs) {
      if (n > 0) { allDone = false; break; }
    }
    if (allDone || !added) break;
  }
}

/**
 * Generate evenly distributed matchups when there's only one division.
 * Guarantees exactly targetGames per team using floor + remainder.
 */
function generateEvenMatchups(
  teamIds: readonly string[],
  targetGames: number,
  rng: SeededRNG,
): [string, string][] {
  const n = teamIds.length;
  if (n < 2) return [];

  const opponents = n - 1;
  const gamesPerOpponent = Math.floor(targetGames / opponents);
  const extraGames = targetGames - gamesPerOpponent * opponents;

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

  // Distribute extra games across pairs to hit exact target
  if (extraGames > 0) {
    const gameCounts = new Map<string, number>();
    for (const id of teamIds) gameCounts.set(id, 0);
    for (const [h, a] of matchups) {
      gameCounts.set(h, (gameCounts.get(h) ?? 0) + 1);
      gameCounts.set(a, (gameCounts.get(a) ?? 0) + 1);
    }

    const pairs: [string, string][] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairs.push([teamIds[i], teamIds[j]]);
      }
    }

    let rem = extraGames;
    let passes = 0;
    while (rem > 0 && passes < 50) {
      passes++;
      pairs.sort((a, b) => {
        const ca = (gameCounts.get(a[0]) ?? 0) + (gameCounts.get(a[1]) ?? 0);
        const cb = (gameCounts.get(b[0]) ?? 0) + (gameCounts.get(b[1]) ?? 0);
        return ca - cb;
      });
      for (const [a, b] of pairs) {
        if (rem <= 0) break;
        if (rng.chance(0.5)) {
          matchups.push([a, b]);
        } else {
          matchups.push([b, a]);
        }
        gameCounts.set(a, (gameCounts.get(a) ?? 0) + 1);
        gameCounts.set(b, (gameCounts.get(b) ?? 0) + 1);
        rem--;
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
          gameNumber: 1 as const,
          isRainout: false,
          makeupOfId: null,
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

// ---------------------------------------------------------------------------
// Schedule Compression (Doubleheaders)
// ---------------------------------------------------------------------------

/**
 * Compress a schedule so it fits within maxDays calendar days.
 * Overflow games (days > maxDays) become doubleheaders on earlier days.
 */
function compressToTargetDays(
  days: ScheduleDay[],
  maxDays: number,
): ScheduleDay[] {
  if (days.length <= maxDays) return days;

  // Collect overflow games
  const overflowGames: ScheduleGameSummary[] = [];
  for (let i = maxDays; i < days.length; i++) {
    overflowGames.push(...days[i].games);
  }

  // Truncate to maxDays
  const compressed = days.slice(0, maxDays);

  // Build a map of teams playing per day for quick lookup
  const teamsPerDay: Map<number, Map<string, number>>[] = [];
  for (let d = 0; d < compressed.length; d++) {
    const teamGameCounts = new Map<string, number>();
    for (const game of compressed[d].games) {
      teamGameCounts.set(game.homeTeamId, (teamGameCounts.get(game.homeTeamId) ?? 0) + 1);
      teamGameCounts.set(game.awayTeamId, (teamGameCounts.get(game.awayTeamId) ?? 0) + 1);
    }
    teamsPerDay.push(teamGameCounts as unknown as Map<number, Map<string, number>>);
  }

  // For each overflow game, find earliest day where both teams play <= 1 game
  for (const game of overflowGames) {
    let placed = false;
    for (let d = 0; d < compressed.length; d++) {
      const counts = teamsPerDay[d] as unknown as Map<string, number>;
      const homeCount = counts.get(game.homeTeamId) ?? 0;
      const awayCount = counts.get(game.awayTeamId) ?? 0;
      if (homeCount <= 1 && awayCount <= 1) {
        // Place as doubleheader game 2
        const dhGame: ScheduleGameSummary = {
          ...game,
          gameNumber: 2 as const,
        };
        compressed[d].games.push(dhGame);
        counts.set(game.homeTeamId, homeCount + 1);
        counts.set(game.awayTeamId, awayCount + 1);
        placed = true;
        break;
      }
    }
    // If no day found (very unlikely), append to last day
    if (!placed) {
      const dhGame: ScheduleGameSummary = { ...game, gameNumber: 2 as const };
      compressed[compressed.length - 1].games.push(dhGame);
    }
  }

  return compressed;
}

// ---------------------------------------------------------------------------
// Rain Cancellation + Makeup Games
// ---------------------------------------------------------------------------

/**
 * Apply rain cancellations and schedule makeup doubleheaders.
 * Deterministic via SeededRNG. Each rained-out game becomes a makeup
 * doubleheader on the nearest future day where both teams play <= 1 game.
 */
function applyRainoutsAndMakeups(
  days: ScheduleDay[],
  rainChance: number,
  rng: SeededRNG,
): ScheduleDay[] {
  const rainouts: { dayIndex: number; game: ScheduleGameSummary }[] = [];

  // Mark games as rained out
  for (let d = 0; d < days.length; d++) {
    for (let g = 0; g < days[d].games.length; g++) {
      const game = days[d].games[g];
      // Only rain out regular games (not existing doubleheaders or makeups)
      if (game.gameNumber === 1 && !game.makeupOfId && rng.chance(rainChance)) {
        days[d].games[g] = {
          ...game,
          isRainout: true,
          isComplete: true, // rained out = done (won't be simulated)
        };
        rainouts.push({ dayIndex: d, game: days[d].games[g] });
      }
    }
  }

  // Schedule makeup games as doubleheaders
  for (const { dayIndex, game } of rainouts) {
    let placed = false;
    // Search from the day after the rainout forward
    for (let d = dayIndex + 1; d < days.length; d++) {
      // Count games per team on this day (excluding rainouts)
      const teamCounts = new Map<string, number>();
      for (const g of days[d].games) {
        if (g.isRainout) continue;
        teamCounts.set(g.homeTeamId, (teamCounts.get(g.homeTeamId) ?? 0) + 1);
        teamCounts.set(g.awayTeamId, (teamCounts.get(g.awayTeamId) ?? 0) + 1);
      }
      const homeCount = teamCounts.get(game.homeTeamId) ?? 0;
      const awayCount = teamCounts.get(game.awayTeamId) ?? 0;
      if (homeCount <= 1 && awayCount <= 1) {
        gameIdCounter++;
        const makeupGame: ScheduleGameSummary = {
          id: `g-mkup-${game.id}-${gameIdCounter}`,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          gameNumber: 2 as const,
          isRainout: false,
          makeupOfId: game.id,
          homeScore: null,
          awayScore: null,
          isComplete: false,
          gameLogId: null,
        };
        days[d].games.push(makeupGame);
        placed = true;
        break;
      }
    }
    // If no future day found, append to last day
    if (!placed) {
      gameIdCounter++;
      const makeupGame: ScheduleGameSummary = {
        id: `g-mkup-${game.id}-${gameIdCounter}`,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        gameNumber: 2 as const,
        isRainout: false,
        makeupOfId: game.id,
        homeScore: null,
        awayScore: null,
        isComplete: false,
        gameLogId: null,
      };
      days[days.length - 1].games.push(makeupGame);
    }
  }

  return days;
}
