/**
 * Bunt Resolution Module
 *
 * REQ-SIM-004c: Bunt resolution when manager signals bunt.
 * Skips normal card lookup entirely and uses probability-based resolution.
 *
 * Probability ranges (random float [0,1)):
 * - [0.00, 0.65): Sacrifice successful (batter out, runners advance)
 * - [0.65, 0.80): Bunt foul (strike; resume PA if < 2 strikes, else strikeout)
 * - [0.80, 0.90): Bunt for hit attempt (speed check)
 * - [0.90, 1.00): Failed bunt (pop out)
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import { OutcomeCategory } from '../types/game';

/** Probability thresholds per REQ-SIM-004c */
const SACRIFICE_THRESHOLD = 0.65;
const FOUL_THRESHOLD = 0.80;
const BUNT_HIT_THRESHOLD = 0.90;

/** Minimum speed for bunt-for-hit eligibility */
const BUNT_HIT_SPEED_MIN = 0.6;

/** Probability of bunt-for-hit success when speed qualifies */
const BUNT_HIT_SUCCESS_CHANCE = 0.35;

/**
 * Result of bunt resolution.
 */
export interface BuntResult {
  /** The resolved outcome, or null if bunt foul and PA resumes. */
  outcome: OutcomeCategory | null;
  /** True if the bunt was fouled off. */
  isBuntFoul: boolean;
  /** True if PA should resume (bunt foul with < 2 strikes). */
  resumePA: boolean;
  /** True if this was a bunt-for-hit attempt zone. */
  wasBuntForHit: boolean;
}

/**
 * Resolve a bunt attempt.
 *
 * Called when the manager signals bunt, bypassing normal card lookup.
 *
 * @param rng - Seeded random number generator
 * @param batterSpeed - Batter's speed rating [0, 1]
 * @param currentStrikes - Current strike count (0, 1, or 2)
 * @returns BuntResult with outcome and metadata
 */
export function resolveBunt(
  rng: SeededRNG,
  batterSpeed: number,
  currentStrikes: number,
): BuntResult {
  const roll = rng.nextFloat();

  // [0.00, 0.65): Sacrifice successful
  if (roll < SACRIFICE_THRESHOLD) {
    return {
      outcome: OutcomeCategory.SACRIFICE,
      isBuntFoul: false,
      resumePA: false,
      wasBuntForHit: false,
    };
  }

  // [0.65, 0.80): Bunt foul
  if (roll < FOUL_THRESHOLD) {
    if (currentStrikes >= 2) {
      // Foul bunt with 2 strikes = strikeout
      return {
        outcome: OutcomeCategory.STRIKEOUT_SWINGING,
        isBuntFoul: true,
        resumePA: false,
        wasBuntForHit: false,
      };
    }
    // Foul bunt with < 2 strikes = add a strike, resume PA
    return {
      outcome: null,
      isBuntFoul: true,
      resumePA: true,
      wasBuntForHit: false,
    };
  }

  // [0.80, 0.90): Bunt for hit attempt
  if (roll < BUNT_HIT_THRESHOLD) {
    // Speed check: batter must be fast enough
    if (batterSpeed > BUNT_HIT_SPEED_MIN && rng.chance(BUNT_HIT_SUCCESS_CHANCE)) {
      return {
        outcome: OutcomeCategory.SINGLE_CLEAN,
        isBuntFoul: false,
        resumePA: false,
        wasBuntForHit: true,
      };
    }
    // Bunt for hit failure: ground out
    return {
      outcome: OutcomeCategory.GROUND_OUT,
      isBuntFoul: false,
      resumePA: false,
      wasBuntForHit: true,
    };
  }

  // [0.90, 1.00): Failed bunt / pop out
  return {
    outcome: OutcomeCategory.POP_OUT,
    isBuntFoul: false,
    resumePA: false,
    wasBuntForHit: false,
  };
}
