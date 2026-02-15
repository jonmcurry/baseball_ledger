/**
 * Umpire Decision Module
 *
 * Ghidra decompilation of FUN_1058_7726 and FUN_1058_5f49 reveals a
 * post-resolution umpire check that can override certain outcomes:
 *
 *   resultCode = getResultCode()
 *   if resultCode != 0 and resultCode < 10:
 *     umpireResult = checkUmpireDecision(gameState, UMPIRE_TABLE[resultCode])
 *     if umpireResult != 0:
 *       gameState.finalOutcome = 2  // force specific outcome
 *
 * The umpire check adds a small random chance of close-call reversals,
 * primarily affecting borderline strikeout/walk situations.
 *
 * Data reference: seg36:0x6BA6 = "Umpire's Decision" string + lookup table.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import { OutcomeCategory } from '../types/game';

/**
 * Probability that the umpire overrides an outcome on a close call.
 * This represents borderline strike/ball calls and close plays at first.
 * Approximated from BBW behavior -- exact table values not yet extracted.
 */
const UMPIRE_OVERRIDE_CHANCE = 0.03;

/**
 * Outcome categories that can trigger an umpire close-call check.
 * Primarily strikeouts (called third strike) and certain ground outs
 * (close play at first).
 */
const UMPIRE_ELIGIBLE_OUTCOMES: ReadonlySet<OutcomeCategory> = new Set([
  OutcomeCategory.STRIKEOUT_LOOKING,  // Called third strike - could be ball 4
  OutcomeCategory.GROUND_OUT,         // Close play at first base
]);

/**
 * Map of outcome -> umpire reversal outcome.
 * When the umpire overrides, the outcome changes to the reversal.
 */
const UMPIRE_REVERSAL_MAP: ReadonlyMap<OutcomeCategory, OutcomeCategory> = new Map([
  [OutcomeCategory.STRIKEOUT_LOOKING, OutcomeCategory.WALK],      // Ball 4 instead of K
  [OutcomeCategory.GROUND_OUT, OutcomeCategory.SINGLE_CLEAN],     // Safe at first
]);

/**
 * Result of the umpire decision check.
 */
export interface UmpireDecisionResult {
  /** The final outcome after umpire check */
  outcome: OutcomeCategory;
  /** Whether the umpire overrode the original outcome */
  overridden: boolean;
}

/**
 * Check for an umpire close-call decision that can override an outcome.
 *
 * Per Ghidra FUN_1058_7726: certain outcomes (result codes 1-9) are
 * subject to an umpire decision check. If the check triggers, the
 * outcome is forced to a specific value (code 2 in the decompilation).
 *
 * @param outcome - The resolved outcome before umpire check
 * @param rng - Seeded random number generator
 * @returns The potentially overridden outcome with metadata
 */
export function checkUmpireDecision(
  outcome: OutcomeCategory,
  rng: SeededRNG,
): UmpireDecisionResult {
  // Only eligible outcomes can be overridden
  if (!UMPIRE_ELIGIBLE_OUTCOMES.has(outcome)) {
    return { outcome, overridden: false };
  }

  // Random check -- small chance of umpire override
  if (!rng.chance(UMPIRE_OVERRIDE_CHANCE)) {
    return { outcome, overridden: false };
  }

  // Look up the reversal
  const reversal = UMPIRE_REVERSAL_MAP.get(outcome);
  if (reversal === undefined) {
    return { outcome, overridden: false };
  }

  return { outcome: reversal, overridden: true };
}
