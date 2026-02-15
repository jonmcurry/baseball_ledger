/**
 * Plate Appearance Resolution Module
 *
 * REQ-SIM-004: Card lookup with pitcher grade gate.
 * This is the core plate appearance resolution that combines:
 * - Card position selection (random from 0-34, skipping structural)
 * - Direct card value to outcome mapping (card value IS the outcome)
 * - Pitcher grade suppression (only affects HIT outcomes)
 *
 * APBA BBW resolution order (proven by correlation analysis):
 *   card draw -> direct mapping -> pitcher grade suppresses hits only
 *
 * Card values (0-42) directly encode outcomes. Correlation analysis of
 * real APBA data proves: value 13 = walk (r=.978), value 14 = K (r=.959),
 * value 7 = single (r=.680). These near-perfect correlations prove card
 * values are NEVER scrambled through the IDT table during PA resolution.
 *
 * The pitcher grade gate ONLY affects hit outcomes (singles, doubles,
 * triples, HRs). Walks, strikeouts, outs, and all other outcomes pass
 * through unchanged regardless of pitcher quality.
 *
 * This is a Layer 1 module: pure logic with no I/O, runs in any JS runtime.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import type { CardValue } from '../types/player';
import { OutcomeCategory } from '../types/game';
import { NON_DRAWABLE_POSITIONS, CARD_LENGTH } from '../card-generator/structural';
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
 * Hit-type outcomes that the pitcher grade gate can suppress.
 */
export const HIT_OUTCOMES: ReadonlySet<OutcomeCategory> = new Set([
  OutcomeCategory.SINGLE_CLEAN,
  OutcomeCategory.SINGLE_ADVANCE,
  OutcomeCategory.DOUBLE,
  OutcomeCategory.TRIPLE,
  OutcomeCategory.HOME_RUN,
  OutcomeCategory.HOME_RUN_VARIANT,
]);

/**
 * Check if a card value is a hit type.
 */
export function isHitCardValue(value: number): boolean {
  return HIT_CARD_VALUES.has(value);
}

/**
 * Check if an outcome is a hit type that can be suppressed by pitcher grade.
 */
export function isHitOutcome(outcome: OutcomeCategory): boolean {
  return HIT_OUTCOMES.has(outcome);
}

/**
 * Non-drawable positions (structural constants + flag bytes) as a Set for O(1) lookup.
 */
const NON_DRAWABLE_SET = new Set(NON_DRAWABLE_POSITIONS);

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
  } while (NON_DRAWABLE_SET.has(position) && attempts < maxAttempts);

  // Fallback to first non-structural position if somehow stuck
  if (NON_DRAWABLE_SET.has(position)) {
    for (let i = 0; i < CARD_LENGTH; i++) {
      if (!NON_DRAWABLE_SET.has(i)) {
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
 * Hit suppression scale for pitcher grade gate.
 * Combined suppression probability = (grade/15) * HIT_SUPPRESSION_SCALE.
 *
 * Only HIT outcomes (singles, doubles, triples, HRs) are subject to
 * suppression. Walks, strikeouts, and outs are never affected.
 *
 * Calibrated against Buford's real APBA card (.290 BA target vs grade 8):
 *   Grade 1 (poor):  (1/15) * 0.55 = 3.7% hit suppression
 *   Grade 8 (avg):   (8/15) * 0.55 = 29.3% hit suppression
 *   Grade 15 (ace): (15/15) * 0.55 = 55.0% hit suppression
 */
export const HIT_SUPPRESSION_SCALE = 0.55;

/**
 * Apply the pitcher grade gate to a card value (legacy API, kept for tests).
 *
 * From REQ-SIM-004 step 4d (calibrated two-roll system):
 * - Roll 1: Generate random integer R2 in [1, 15]
 *   If R2 <= pitcher.grade: pitcher "wins" the matchup
 * - Roll 2: If pitcher won AND card value is a hit type,
 *   there is a HIT_SUPPRESSION_SCALE chance it becomes a ground out
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
 * APBA BBW faithful resolution (per correlation analysis):
 * 1. Select a random card position (skipping structural constants)
 * 2. Read the card value
 * 3. Direct mapping: card value IS the outcome (always)
 * 4. Pitcher grade suppression: ONLY hit outcomes can be converted to outs
 *
 * Correlation analysis proves this model:
 *   value 13 -> walk (r=.978), value 14 -> K (r=.959)
 * These near-perfect correlations are impossible if values were scrambled
 * through the IDT table. Card values directly encode outcomes.
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
  // Step 1: Select card position (skips structural constants)
  const cardPosition = selectCardPosition(rng);

  // Step 2: Read card value
  const rawCardValue = readCardValue(card, cardPosition);

  // Step 3: Direct mapping -- card value IS the outcome
  let outcome = getDirectOutcome(rawCardValue);

  // Step 4: Pitcher grade suppression -- ONLY affects hit outcomes
  // Walks (13), Ks (14), outs, and all other values pass through unchanged.
  // Combined suppression = (grade/15) * HIT_SUPPRESSION_SCALE
  let pitcherWon = false;
  let gradeRoll = 0;

  if (isHitOutcome(outcome)) {
    gradeRoll = rng.nextInt(1, 15);
    if (gradeRoll <= pitcherGrade && rng.chance(HIT_SUPPRESSION_SCALE)) {
      outcome = OutcomeCategory.GROUND_OUT;
      pitcherWon = true;
    }
  }

  const gradeEffect: GradeGateResult = {
    originalValue: rawCardValue,
    finalValue: pitcherWon ? 26 : rawCardValue, // 26 = GROUND_OUT
    pitcherWon,
    r2Roll: gradeRoll,
  };

  return {
    cardPosition,
    cardValue: rawCardValue,
    outcome,
    usedFallback: true, // Always direct mapping now
    pitcherGradeEffect: gradeEffect,
  };
}
