/**
 * Division Assignment Algorithm
 *
 * REQ-LGE-005: Divide teams evenly into AL and NL. Within each league,
 * distribute into 3 divisions (East, Central, West). Allowed team counts
 * are 18, 24, and 30 (all divisible by 6).
 *
 * Layer 1: Pure logic, no I/O, deterministic.
 */

import { AppError } from '../errors/app-error';
import { ERROR_CODES } from '../errors/error-codes';

export const DIVISIONS = ['East', 'Central', 'West'] as const;
const LEAGUES = ['AL', 'NL'] as const;

/** Allowed total team counts. Each divides evenly by 6 (2 leagues * 3 divisions). */
export const ALLOWED_TEAM_COUNTS = [18, 24, 30] as const;

export interface DivisionAssignment {
  teamIndex: number;
  leagueDivision: 'AL' | 'NL';
  division: string;
}

/**
 * Assign teams to divisions across AL and NL.
 *
 * @param teamCount - Total number of teams (must be 18, 24, or 30)
 * @returns Array of division assignments, one per team
 * @throws AppError if teamCount is invalid
 */
export function assignDivisions(teamCount: number): DivisionAssignment[] {
  if (!ALLOWED_TEAM_COUNTS.includes(teamCount as 18 | 24 | 30)) {
    throw new AppError(
      'VALIDATION',
      ERROR_CODES.VALIDATION_FAILED,
      `Team count must be one of ${ALLOWED_TEAM_COUNTS.join(', ')}, got ${teamCount}`,
      400,
    );
  }

  const perLeague = teamCount / 2;
  const perDivision = perLeague / DIVISIONS.length;

  const assignments: DivisionAssignment[] = [];
  let teamIndex = 0;

  for (const league of LEAGUES) {
    for (const division of DIVISIONS) {
      for (let t = 0; t < perDivision; t++) {
        assignments.push({
          teamIndex,
          leagueDivision: league,
          division,
        });
        teamIndex++;
      }
    }
  }

  return assignments;
}
