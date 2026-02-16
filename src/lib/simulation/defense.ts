/**
 * Defense Engine Module
 *
 * REQ-SIM-008: Error resolution based on fielding percentage.
 * REQ-SIM-008a: Double play defense check on middle infield.
 *
 * Determines which fielder handles a batted ball, whether an error
 * occurs, and whether a double play attempt succeeds defensively.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import { OutcomeCategory } from '../types/game';

/** Positions that handle ground balls */
const GROUND_BALL_POSITIONS = ['SS', '2B', '3B', '1B'] as const;

/** Positions that handle fly balls */
const FLY_BALL_POSITIONS = ['LF', 'CF', 'RF'] as const;

/** Positions that handle line drives */
const LINE_DRIVE_POSITIONS = ['SS', '2B', '3B', '1B', 'SP'] as const;

/** Positions that handle pop ups */
const POP_UP_POSITIONS = ['C', '1B', 'SS', '2B', '3B'] as const;

/** DP defense: threshold for middle infield average fielding pct */
const DP_FIELDING_THRESHOLD = 0.95;

/** DP defense: failure probability when below threshold */
const DP_FAILURE_RATE = 0.10;

/**
 * Result of an error check.
 */
export interface ErrorCheckResult {
  errorOccurred: boolean;
}

/**
 * Determine which fielding position is responsible for a batted ball.
 *
 * Returns a deterministic random position from the appropriate pool
 * based on outcome type, or null for non-batted-ball outcomes.
 *
 * @param outcome - The PA outcome category
 * @param rng - Seeded random number generator for determinism
 */
export function getResponsiblePosition(
  outcome: OutcomeCategory,
  rng: SeededRNG,
): string | null {
  switch (outcome) {
    case OutcomeCategory.GROUND_OUT:
    case OutcomeCategory.GROUND_OUT_ADVANCE:
      return rng.pick(GROUND_BALL_POSITIONS);

    case OutcomeCategory.FLY_OUT:
      return rng.pick(FLY_BALL_POSITIONS);

    case OutcomeCategory.LINE_OUT:
      return rng.pick(LINE_DRIVE_POSITIONS);

    case OutcomeCategory.POP_OUT:
      return rng.pick(POP_UP_POSITIONS);

    default:
      return null;
  }
}

/**
 * Check whether a fielding error occurs.
 *
 * Per REQ-SIM-008:
 * - Error probability = 1 - fieldingPct
 * - Random float [0,1): if < (1 - fieldingPct), error occurs
 *
 * @param fieldingPct - Fielder's fielding percentage [0, 1]
 * @param rng - Seeded random number generator
 */
export function checkForError(
  fieldingPct: number,
  rng: SeededRNG,
): ErrorCheckResult {
  const errorProbability = 1.0 - fieldingPct;
  const roll = rng.nextFloat();

  return {
    errorOccurred: roll < errorProbability,
  };
}

/**
 * Check whether a double play succeeds defensively.
 *
 * Per REQ-SIM-008a:
 * - Average SS and 2B fielding percentages
 * - If average >= 0.95: DP always succeeds
 * - If average < 0.95: 10% chance DP fails (only lead runner out)
 *
 * @param ssFieldingPct - Shortstop fielding percentage [0, 1]
 * @param secondBaseFieldingPct - Second baseman fielding percentage [0, 1]
 * @param rng - Seeded random number generator
 * @returns true if DP succeeds, false if DP fails
 */
export function checkDPDefense(
  ssFieldingPct: number,
  secondBaseFieldingPct: number,
  rng: SeededRNG,
): boolean {
  const avgFielding = (ssFieldingPct + secondBaseFieldingPct) / 2;

  if (avgFielding >= DP_FIELDING_THRESHOLD) {
    return true;
  }

  // Below threshold: 10% failure rate
  return !rng.chance(DP_FAILURE_RATE);
}
