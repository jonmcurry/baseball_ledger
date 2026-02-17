/**
 * @deprecated Replaced by SERD 5-column ApbaCard system (apba-card-generator.ts).
 * Direct mapping is no longer used for PA resolution. Kept for reference.
 *
 * Direct Card Value Fallback Mapping
 *
 * REQ-SIM-004a: Direct card value to outcome fallback mapping.
 * Used when OutcomeTable lookup fails after 3 attempts.
 *
 * This is a Layer 1 module: pure logic with no I/O, runs in any JS runtime.
 */

import { OutcomeCategory } from '../types/game';

/**
 * Direct card value to outcome mapping from REQ-SIM-004a.
 * This is the authoritative fallback when the OutcomeTable lookup fails.
 *
 * Based on APBA card value correlations:
 * - Value 13 = Walk (r=+0.978)
 * - Value 14 = Strikeout (r=+0.959)
 * - Value 1 = Home Run (r=+0.715)
 * - Value 7 = Single A (r=+0.680)
 * - etc.
 */
export const CARD_VALUE_TO_OUTCOME: ReadonlyMap<number, OutcomeCategory> = new Map([
  [0, OutcomeCategory.DOUBLE],
  [1, OutcomeCategory.HOME_RUN],
  [5, OutcomeCategory.HOME_RUN_VARIANT],
  [7, OutcomeCategory.SINGLE_CLEAN],
  [8, OutcomeCategory.SINGLE_CLEAN],
  [9, OutcomeCategory.SINGLE_ADVANCE],
  [10, OutcomeCategory.TRIPLE],
  [11, OutcomeCategory.TRIPLE],
  [13, OutcomeCategory.WALK],
  [14, OutcomeCategory.STRIKEOUT_SWINGING],
  [21, OutcomeCategory.STOLEN_BASE_OPP],
  [22, OutcomeCategory.FLY_OUT],
  [23, OutcomeCategory.STOLEN_BASE_OPP],
  [24, OutcomeCategory.LINE_OUT],
  [26, OutcomeCategory.GROUND_OUT],
  [30, OutcomeCategory.GROUND_OUT_ADVANCE],
  [31, OutcomeCategory.FLY_OUT],
  [36, OutcomeCategory.STOLEN_BASE_OPP],
  [37, OutcomeCategory.HOME_RUN_VARIANT],
  [40, OutcomeCategory.REACHED_ON_ERROR],
  [41, OutcomeCategory.HOME_RUN_VARIANT],
  [42, OutcomeCategory.SPECIAL_EVENT],
]);

/**
 * Check if a card value has an explicit mapping in the fallback table.
 *
 * @param cardValue - The card value to check (0-42)
 * @returns True if the value has an explicit mapping
 */
export function isCardValueMapped(cardValue: number): boolean {
  return CARD_VALUE_TO_OUTCOME.has(cardValue);
}

/**
 * Get the outcome for a card value using the direct fallback mapping.
 *
 * If the card value has no explicit mapping (structural constants or
 * unmapped values), returns GROUND_OUT as the default outcome.
 *
 * @param cardValue - The card value to look up (0-42)
 * @returns The corresponding OutcomeCategory, or GROUND_OUT as default
 */
export function getDirectOutcome(cardValue: number): OutcomeCategory {
  return CARD_VALUE_TO_OUTCOME.get(cardValue) ?? OutcomeCategory.GROUND_OUT;
}
