/**
 * Division Assignment Algorithm
 *
 * REQ-LGE-005: Divide teams evenly into AL and NL. Within each league,
 * distribute into 4 divisions (East, South, West, North). If team count
 * doesn't divide evenly by 8, distribute as evenly as possible.
 *
 * Layer 1: Pure logic, no I/O, deterministic.
 */

import { AppError } from '../errors/app-error';
import { ERROR_CODES } from '../errors/error-codes';

const DIVISIONS = ['East', 'South', 'West', 'North'] as const;
const LEAGUES = ['AL', 'NL'] as const;

const MIN_TEAMS = 4;
const MAX_TEAMS = 32;

export interface DivisionAssignment {
  teamIndex: number;
  leagueDivision: 'AL' | 'NL';
  division: string;
}

/**
 * Distribute N items as evenly as possible across K buckets.
 * Returns array of bucket sizes, largest first.
 *
 * Example: distribute(6, 4) -> [2, 2, 1, 1]
 */
function distributeEvenly(count: number, buckets: number): number[] {
  const base = Math.floor(count / buckets);
  const remainder = count % buckets;
  const sizes: number[] = [];
  for (let i = 0; i < buckets; i++) {
    sizes.push(base + (i < remainder ? 1 : 0));
  }
  return sizes;
}

/**
 * Assign teams to divisions across AL and NL.
 *
 * @param teamCount - Total number of teams (even, 4-32)
 * @returns Array of division assignments, one per team
 * @throws AppError if teamCount is invalid
 */
export function assignDivisions(teamCount: number): DivisionAssignment[] {
  if (teamCount < MIN_TEAMS || teamCount > MAX_TEAMS) {
    throw new AppError(
      'VALIDATION',
      ERROR_CODES.VALIDATION_FAILED,
      `Team count must be between ${MIN_TEAMS} and ${MAX_TEAMS}, got ${teamCount}`,
      400,
    );
  }
  if (teamCount % 2 !== 0) {
    throw new AppError(
      'VALIDATION',
      ERROR_CODES.VALIDATION_FAILED,
      `Team count must be even, got ${teamCount}`,
      400,
    );
  }

  const perLeague = teamCount / 2;
  const divisionSizes = distributeEvenly(perLeague, DIVISIONS.length);

  const assignments: DivisionAssignment[] = [];
  let teamIndex = 0;

  for (const league of LEAGUES) {
    for (let d = 0; d < DIVISIONS.length; d++) {
      for (let t = 0; t < divisionSizes[d]; t++) {
        assignments.push({
          teamIndex,
          leagueDivision: league,
          division: DIVISIONS[d],
        });
        teamIndex++;
      }
    }
  }

  return assignments;
}
