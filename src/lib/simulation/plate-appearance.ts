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
import { lookupOutcome } from './outcome-table';
import { getDirectOutcome } from './card-value-fallback';

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
 * Apply the pitcher grade gate to a card value.
 *
 * From REQ-SIM-004 step 4d:
 * - Generate random integer R2 in [1, 15]
 * - If R2 <= pitcher.grade: pitcher "wins" the matchup
 * - If the card value is a hit type, there's a (pitcher.grade / 15) probability
 *   it becomes an out instead
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

  // Generate R2 in [1, 15]
  const r2 = rng.nextInt(1, 15);

  // Check if pitcher wins the matchup
  if (r2 <= pitcherGrade) {
    // Pitcher wins - check if hit shifts to out
    const shiftChance = pitcherGrade / 15;
    if (rng.chance(shiftChance)) {
      // Hit becomes an out - use ground out (26) as default
      return {
        originalValue: cardValue,
        finalValue: 26, // GROUND_OUT
        pitcherWon: true,
        r2Roll: r2,
      };
    }
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
 * 4. Look up outcome in OutcomeTable
 * 5. If table lookup fails, use direct card value fallback
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

  // Step 4: OutcomeTable lookup
  const lookupResult = lookupOutcome(effectiveCardValue, rng);

  if (lookupResult.success && lookupResult.outcome !== undefined) {
    return {
      cardPosition,
      cardValue: rawCardValue,
      outcome: lookupResult.outcome,
      usedFallback: false,
      pitcherGradeEffect: gradeEffect,
      outcomeTableRow: lookupResult.rowIndex,
    };
  }

  // Step 5: Fallback to direct card value mapping
  const fallbackOutcome = getDirectOutcome(effectiveCardValue);

  return {
    cardPosition,
    cardValue: rawCardValue,
    outcome: fallbackOutcome,
    usedFallback: true,
    pitcherGradeEffect: gradeEffect,
    outcomeTableRow: lookupResult.rowIndex,
  };
}
