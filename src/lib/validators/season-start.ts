/**
 * Season Start Validator
 *
 * REQ-SCH-009: Pure validator for the "Start New Season" preconditions.
 * After archive, a league is in 'setup' with rosters intact.
 * This function gates the transition to regular_season without a new draft.
 *
 * Layer 1: Pure logic, no side effects.
 */

export interface StartSeasonCheck {
  canStart: boolean;
  reason: string | null;
}

const REQUIRED_ROSTER_SIZE = 21;

export function canStartSeason(
  status: string,
  seasonYear: number,
  teamCount: number,
  minRosterSize: number,
): StartSeasonCheck {
  if (status !== 'setup') {
    return { canStart: false, reason: 'League must be in setup status' };
  }

  if (seasonYear <= 1) {
    return { canStart: false, reason: 'First season requires a draft' };
  }

  if (teamCount < 2) {
    return { canStart: false, reason: 'At least 2 teams are required' };
  }

  if (minRosterSize < REQUIRED_ROSTER_SIZE) {
    return { canStart: false, reason: `All teams must have at least ${REQUIRED_ROSTER_SIZE} roster players` };
  }

  return { canStart: true, reason: null };
}
