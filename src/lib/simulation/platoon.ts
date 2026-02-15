/**
 * Platoon Adjustment Module
 *
 * REQ-SIM-004b: Platoon adjustment (from APBA's L/R handling).
 *
 * Ghidra decompilation of FUN_1058_5be1 (Grade Setup) reveals that the real
 * APBA BBW implements platoon as a GRADE MODIFICATION, not a card modification:
 *
 *   if pitcherInfo.throwHand == batterData.batHand:
 *     pitcherData.grade = clamp(pitcherData.grade + batterData.platoonAdj, 30)
 *
 * Same-hand matchup: pitcher's grade INCREASES (pitcher advantage).
 * Opposite-hand matchup: no adjustment (batter at normal effectiveness).
 * Switch hitter: never same-hand, so no adjustment.
 *
 * The grade-based function `computePlatoonGradeAdjustment()` implements
 * the real BBW approach and is integrated into `computeGameGrade()` in
 * pitching.ts as Layer 4.
 *
 * The old card-modification approach (`applyPlatoonAdjustment()`) is
 * preserved for backward compatibility but is not the real BBW method.
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
  for (let i = 0; i < adjusted.length; i++) {
    if (!STRUCTURAL_SET.has(i) && OUT_VALUES.includes(adjusted[i])) {
      adjusted[i] = HIT_VALUE;
      break;
    }
  }

  // Find first strikeout position (not structural) and replace with contact
  for (let i = 0; i < adjusted.length; i++) {
    if (!STRUCTURAL_SET.has(i) && adjusted[i] === STRIKEOUT_VALUE) {
      adjusted[i] = CONTACT_VALUE;
      break;
    }
  }

  return adjusted;
}

// ---------------------------------------------------------------------------
// Grade-Based Platoon (Real BBW approach per Ghidra FUN_1058_5be1)
// ---------------------------------------------------------------------------

/**
 * Compute the platoon grade adjustment for a matchup.
 *
 * Per Ghidra decompilation of FUN_1058_5be1 (Layer 4):
 *   if pitcherInfo.throwHand == batterData.batHand:
 *     grade += platoonValue
 *
 * Same-hand matchup: pitcher gets grade bonus (pitcher advantage).
 * Opposite-hand or switch hitter: no adjustment.
 *
 * @param batterHand - Batter's batting hand ('L', 'R', or 'S')
 * @param pitcherHand - Pitcher's throwing hand ('L' or 'R')
 * @param platoonValue - The platoon adjustment value from batter data
 * @returns Grade adjustment to add (0 if no adjustment applies)
 */
export function computePlatoonGradeAdjustment(
  batterHand: BattingHand,
  pitcherHand: ThrowingHand,
  platoonValue: number,
): number {
  // Switch hitters never trigger same-hand platoon
  if (batterHand === 'S') {
    return 0;
  }

  // Same-hand matchup: pitcher gets grade bonus
  if (batterHand === pitcherHand) {
    return platoonValue;
  }

  // Opposite-hand: no adjustment
  return 0;
}
