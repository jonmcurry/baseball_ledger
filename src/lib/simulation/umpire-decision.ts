/**
 * Umpire Decision Module
 *
 * Ghidra FUN_1058_7726 reveals the umpire check is DETERMINISTIC (not
 * probabilistic) based on player record attributes:
 *
 *   resultCode = min(resultCode, 7)
 *   playerRecord = getPlayerRecord(pitcherIndex)
 *   if playerRecord[offset + 0x2f] < 1:          // attribute flag == 0
 *     if resultCode in [4,5,6]:
 *       if playerRecord[0x33] > 0 OR playerRecord[0x35] > 0:
 *         return 0  // NO override
 *     return 1  // OVERRIDE
 *   else:
 *     return 0  // NO override
 *
 * Without a complete PLAYERS.DAT field map for offsets 0x2f, 0x33, 0x35,
 * we cannot replicate the exact deterministic logic. Our implementation
 * uses a 3% probabilistic approximation that produces similar aggregate
 * override rates observed in BBW simulations.
 *
 * Data reference: seg36:0x6BA6 = "Umpire's Decision" string + identity lookup table.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import { OutcomeCategory } from '../types/game';

/**
 * Probability that the umpire overrides an outcome on a close call.
 * This is a probabilistic APPROXIMATION of BBW's deterministic check.
 * BBW uses player record attributes (offsets 0x2f, 0x33, 0x35) to decide;
 * without those field mappings, we use a flat 3% rate that matches
 * observed aggregate BBW override frequency.
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
 * Per Ghidra FUN_1058_7726: result codes 1-7 are subject to a
 * deterministic umpire decision check based on player attributes.
 * Our implementation approximates this with a flat probability check.
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
