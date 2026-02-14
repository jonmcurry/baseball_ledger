/**
 * Plate Appearance Resolution Module
 *
 * REQ-SIM-004: Card lookup with pitcher grade gate.
 * This is the core plate appearance resolution that combines:
 * - Card position selection (random from 0-34, skipping structural)
 * - Pitcher grade gate (higher grade = more likely to shift hits to outs)
 * - OutcomeTable lookup
 * - Direct card value fallback
 *
 * This is a Layer 1 module: pure logic with no I/O, runs in any JS runtime.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import type { CardValue } from '../types/player';
import { OutcomeCategory } from '../types/game';
import { STRUCTURAL_POSITIONS, CARD_LENGTH } from '../card-generator/structural';
import { getDirectOutcome } from './card-value-fallback';
import { lookupOutcome } from './outcome-table';

/**
 * Hit-type card values from SRD REQ-SIM-004 step 4d.
 * These are the values that can be shifted to outs by the pitcher grade gate.
 */
export const HIT_CARD_VALUES: ReadonlySet<number> = new Set([
  0,  // Double
  1,  // Home Run
  5,  // HR variant
  7,  // Single A
  8,  // Single B
  9,  // Single C
  10, // Triple A
  11, // Triple B
  37, // HR variant
  40, // Hit/special
  41, // HR variant
]);

/**
 * Check if a card value is a hit type.
 */
export function isHitCardValue(value: number): boolean {
  return HIT_CARD_VALUES.has(value);
}

/**
 * Structural positions as a Set for O(1) lookup.
 */
const STRUCTURAL_SET = new Set(STRUCTURAL_POSITIONS);

/**
 * Select a random card position (0-34) that is NOT a structural constant.
 * Re-rolls if a structural position is selected.
 *
 * @param rng - Seeded random number generator
 * @returns A non-structural card position (0-34)
 */
export function selectCardPosition(rng: SeededRNG): number {
  let position: number;
  let attempts = 0;
  const maxAttempts = 100; // Safety limit

  do {
    position = rng.nextIntExclusive(0, CARD_LENGTH);
    attempts++;
  } while (STRUCTURAL_SET.has(position) && attempts < maxAttempts);

  // Fallback to first non-structural position if somehow stuck
  if (STRUCTURAL_SET.has(position)) {
    for (let i = 0; i < CARD_LENGTH; i++) {
      if (!STRUCTURAL_SET.has(i)) {
        return i;
      }
    }
  }

  return position;
}

/**
 * Read the card value at a given position.
 *
 * @param card - The 35-element card array
 * @param position - The position to read (0-34)
 * @returns The card value at that position
 */
export function readCardValue(card: readonly CardValue[], position: number): CardValue {
  return card[position];
}

/**
 * Result of applying the pitcher grade gate.
 */
export interface GradeGateResult {
  originalValue: number;
  finalValue: number;
  pitcherWon: boolean;
  r2Roll: number;
}

/**
 * Calibration constant for hit suppression.
 * When the pitcher wins the R2 roll, this is the probability a hit becomes
 * a ground out. Combined suppression = (pitcherGrade / 15) * scale.
 *
 *   Grade 15 (ace):  20.0% total suppression
 *   Grade 8  (avg):  10.7% total suppression
 *   Grade 1  (poor):  1.3% total suppression
 */
export const HIT_SUPPRESSION_SCALE = 0.10;

/**
 * Apply the pitcher grade gate to a card value.
 *
 * From REQ-SIM-004 step 4d (calibrated two-roll system):
 * - Roll 1: Generate random integer R2 in [1, 15]
 *   If R2 <= pitcher.grade: pitcher "wins" the matchup
 * - Roll 2: If pitcher won AND card value is a hit type,
 *   there is a HIT_SUPPRESSION_SCALE (20%) chance it becomes a ground out
 *
 * Combined suppression = (grade / 15) * HIT_SUPPRESSION_SCALE
 *
 * @param cardValue - The card value to potentially modify
 * @param pitcherGrade - Pitcher's grade (1-15)
 * @param rng - Seeded random number generator
 * @returns The result with original value, final value, and whether pitcher won
 */
export function applyPitcherGradeGate(
  cardValue: number,
  pitcherGrade: number,
  rng: SeededRNG
): GradeGateResult {
  // Non-hit values pass through unchanged
  if (!isHitCardValue(cardValue)) {
    return {
      originalValue: cardValue,
      finalValue: cardValue,
      pitcherWon: false,
      r2Roll: 0,
    };
  }

  // Roll 1: R2 in [1, 15] -- pitcher wins if R2 <= grade
  const r2 = rng.nextInt(1, 15);
  const pitcherWinsRoll = r2 <= pitcherGrade;

  // Roll 2: If pitcher won the matchup, apply calibrated suppression
  if (pitcherWinsRoll && rng.chance(HIT_SUPPRESSION_SCALE)) {
    // Hit becomes a ground out
    return {
      originalValue: cardValue,
      finalValue: 26, // GROUND_OUT
      pitcherWon: true,
      r2Roll: r2,
    };
  }

  // Batter's card value stands
  return {
    originalValue: cardValue,
    finalValue: cardValue,
    pitcherWon: false,
    r2Roll: r2,
  };
}

/**
 * Result of a complete plate appearance resolution.
 */
export interface PlateAppearanceResult {
  cardPosition: number;
  cardValue: number;
  outcome: OutcomeCategory;
  usedFallback: boolean;
  pitcherGradeEffect: GradeGateResult;
  outcomeTableRow?: number;
}

/**
 * Resolve a complete plate appearance.
 *
 * Process (per REQ-SIM-004):
 * 1. Select a random card position (skipping structural constants)
 * 2. Read the card value
 * 3. Apply pitcher grade gate (may shift hit to out)
 * 4. Map card value directly to outcome category
 *
 * @param card - The batter's 35-element card array
 * @param pitcherGrade - Pitcher's current effective grade (1-15)
 * @param rng - Seeded random number generator
 * @returns Complete plate appearance result
 */
export function resolvePlateAppearance(
  card: readonly CardValue[],
  pitcherGrade: number,
  rng: SeededRNG
): PlateAppearanceResult {
  // Step 1: Select card position
  const cardPosition = selectCardPosition(rng);

  // Step 2: Read card value
  const rawCardValue = readCardValue(card, cardPosition);

  // Step 3: Apply pitcher grade gate
  const gradeEffect = applyPitcherGradeGate(rawCardValue, pitcherGrade, rng);
  const effectiveCardValue = gradeEffect.finalValue;

  // Step 4: IDT.OBJ table lookup (primary path per REQ-SIM-004).
  // APBA BBW resolves outcomes through the IDT outcome table first.
  // If no row matches after 3 attempts, fall back to direct card value mapping.
  const tableResult = lookupOutcome(effectiveCardValue, rng);
  let outcome: OutcomeCategory;
  let outcomeTableRow: number | undefined;
  let usedFallback: boolean;

  if (tableResult.success && tableResult.outcome !== undefined) {
    outcome = tableResult.outcome;
    outcomeTableRow = tableResult.rowIndex;
    usedFallback = false;
  } else {
    // Fallback: direct card value mapping (REQ-SIM-004a)
    outcome = getDirectOutcome(effectiveCardValue);
    usedFallback = true;
  }

  return {
    cardPosition,
    cardValue: rawCardValue,
    outcome,
    usedFallback,
    pitcherGradeEffect: gradeEffect,
    outcomeTableRow,
  };
}
