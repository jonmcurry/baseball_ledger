/**
 * Platoon Adjustment Module
 *
 * REQ-SIM-004b: Platoon adjustment (from APBA's L/R handling).
 * Applied BEFORE the card lookup by temporarily modifying the card.
 *
 * Rules:
 * - Opposite-hand matchup (LHB vs RHP, RHB vs LHP):
 *   Replace 1 out-value position (24/26/30/31) with a hit value (8)
 *   Replace 1 strikeout position (14) with a contact value (9)
 * - Same-hand matchup: No modification
 * - Switch hitter: Always gets opposite-hand advantage
 *
 * This is a Layer 1 module: pure logic with no I/O, runs in any JS runtime.
 */

import type { CardValue } from '../types/player';
import { STRUCTURAL_POSITIONS } from '../card-generator/structural';

/**
 * Card values representing out types that can be replaced.
 * 24 = LINE_OUT, 26 = GROUND_OUT, 30 = GROUND_OUT_ADVANCE, 31 = FLY_OUT
 */
export const OUT_VALUES: readonly number[] = [24, 26, 30, 31];

/**
 * Card value for a hit (used to replace an out in platoon advantage).
 * 8 = SINGLE_CLEAN
 */
export const HIT_VALUE = 8;

/**
 * Card value for strikeout.
 * 14 = STRIKEOUT_SWINGING
 */
export const STRIKEOUT_VALUE = 14;

/**
 * Card value for contact (used to replace a strikeout in platoon advantage).
 * 9 = SINGLE_ADVANCE
 */
export const CONTACT_VALUE = 9;

/**
 * Structural positions set for quick lookup.
 */
const STRUCTURAL_SET = new Set(STRUCTURAL_POSITIONS);

type BattingHand = 'L' | 'R' | 'S';
type ThrowingHand = 'L' | 'R';

/**
 * Determine if a batter has a platoon advantage against a pitcher.
 *
 * @param batterHand - Batter's batting hand ('L', 'R', or 'S' for switch)
 * @param pitcherHand - Pitcher's throwing hand ('L' or 'R')
 * @returns True if batter has platoon advantage
 */
export function hasPlatoonAdvantage(
  batterHand: BattingHand,
  pitcherHand: ThrowingHand
): boolean {
  // Switch hitters always have advantage
  if (batterHand === 'S') {
    return true;
  }

  // Opposite-hand matchup = advantage
  return batterHand !== pitcherHand;
}

/**
 * Apply platoon adjustment to a batter's card.
 *
 * For opposite-hand matchups (or switch hitters):
 * - Replace one out-value position with a hit value (8)
 * - Replace one strikeout position (14) with a contact value (9)
 *
 * For same-hand matchups, returns an unmodified copy of the card.
 *
 * @param card - The batter's 35-element card array
 * @param batterHand - Batter's batting hand
 * @param pitcherHand - Pitcher's throwing hand
 * @returns A new card array with platoon adjustments applied
 */
export function applyPlatoonAdjustment(
  card: readonly CardValue[],
  batterHand: BattingHand,
  pitcherHand: ThrowingHand
): CardValue[] {
  // Always create a copy
  const adjusted = [...card];

  // No modification for same-hand matchup
  if (!hasPlatoonAdvantage(batterHand, pitcherHand)) {
    return adjusted;
  }

  // Find first out-value position (not structural) and replace with hit
  let outReplaced = false;
  for (let i = 0; i < adjusted.length; i++) {
    if (!STRUCTURAL_SET.has(i) && OUT_VALUES.includes(adjusted[i])) {
      adjusted[i] = HIT_VALUE;
      outReplaced = true;
      break;
    }
  }

  // Find first strikeout position (not structural) and replace with contact
  let soReplaced = false;
  for (let i = 0; i < adjusted.length; i++) {
    if (!STRUCTURAL_SET.has(i) && adjusted[i] === STRIKEOUT_VALUE) {
      adjusted[i] = CONTACT_VALUE;
      soReplaced = true;
      break;
    }
  }

  return adjusted;
}
