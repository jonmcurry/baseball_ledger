/**
 * Plate Appearance Resolution Module
 *
 * REQ-SIM-004: Card lookup with pitcher grade gate.
 * This is the core plate appearance resolution that combines:
 * - Card position selection (random from 0-34, skipping structural)
 * - Pitcher grade check (determines resolution path)
 * - Direct card value mapping (when batter wins, or value outside IDT range)
 * - IDT.OBJ outcome table scrambling (when pitcher wins AND value in IDT range)
 *
 * BBW resolution order:
 *   card draw -> grade check -> batter wins? direct mapping : IDT table
 *
 * The pitcher grade gates WHETHER the IDT table is consulted. Card values
 * (0-42) directly encode outcomes (value 13 = walk, 14 = K, 7 = single, etc.)
 * with r=.978/.959/.680 correlations in real APBA data. The IDT table scrambles
 * outcomes only when the pitcher wins the grade check, acting as a defense
 * mechanism that converts batter-favorable values into mixed results.
 *
 * Values outside IDT range (0-4, 26+) always use direct mapping regardless
 * of the grade check, since no IDT row can match them.
 *
 * This is a Layer 1 module: pure logic with no I/O, runs in any JS runtime.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import type { CardValue } from '../types/player';
import { OutcomeCategory } from '../types/game';
import { NON_DRAWABLE_POSITIONS, CARD_LENGTH } from '../card-generator/structural';
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
 * IDT-active card value range. Values in [IDT_RANGE_LOW, IDT_RANGE_HIGH]
 * can match IDT table rows (all rows have thresholdLow >= 5, thresholdHigh <= 25).
 * Values outside this range always use direct mapping.
 */
export const IDT_RANGE_LOW = 5;
export const IDT_RANGE_HIGH = 25;

/**
 * Grade check offset. In APBA, the pitcher has a baseline defensive influence
 * beyond the raw grade number. This offset is added to the grade when
 * determining if the pitcher wins the grade check. It represents the
 * inherent pitcher advantage in the batting/pitching matchup.
 *
 * The grade check formula: R in [1, 15], pitcher wins if R <= (grade + offset).
 * With offset=2:
 *   Grade 1 (poor):  3/15 = 20.0% pitcher influence
 *   Grade 8 (avg):  10/15 = 66.7% pitcher influence
 *   Grade 15 (ace): 15/15 = 100% pitcher influence (capped)
 *
 * This produces realistic BA ranges:
 *   vs grade 1:  ~.360 BA (bad pitcher, batter dominates)
 *   vs grade 8:  ~.290 BA (balanced)
 *   vs grade 15: ~.240 BA (ace suppresses hits)
 */
export const GRADE_CHECK_OFFSET = 2;

/**
 * Hit suppression scale for legacy applyPitcherGradeGate() function.
 * Combined suppression = (grade/15) * HIT_SUPPRESSION_SCALE.
 */
export const HIT_SUPPRESSION_SCALE = 0.10;

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
 * Check if a card value is in the IDT-active range (can match IDT table rows).
 */
export function isIDTActive(cardValue: number): boolean {
  return cardValue >= IDT_RANGE_LOW && cardValue <= IDT_RANGE_HIGH;
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
 * BBW faithful resolution (per REQ-SIM-004 + correlation analysis):
 * 1. Select a random card position (skipping structural constants)
 * 2. Read the card value
 * 3. Pitcher grade check: R in [1,15], pitcher wins if R <= grade
 * 4a. If batter wins OR value outside IDT range: direct card value mapping
 * 4b. If pitcher wins AND value in IDT range (5-25): IDT table scrambling
 *     (if IDT misses 3x, fall back to direct mapping)
 *
 * This model is validated by correlation analysis: value 13 has r=.978 with
 * walks, value 14 has r=.959 with strikeouts. These near-perfect correlations
 * prove card values directly encode outcomes (not scrambled through IDT).
 * The IDT table serves as the pitcher's defense mechanism, scrambling
 * batter-favorable outcomes only when the pitcher wins the grade check.
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

  // Step 3: Pitcher grade check
  // R in [1, 15]; pitcher wins if R <= (grade + offset), capped at 15
  const gradeRoll = rng.nextInt(1, 15);
  const effectiveGrade = Math.min(pitcherGrade + GRADE_CHECK_OFFSET, 15);
  const pitcherWins = gradeRoll <= effectiveGrade;

  let outcome: OutcomeCategory;
  let outcomeTableRow: number | undefined;
  let usedFallback: boolean;

  // Step 4: Resolve outcome based on grade check result
  if (pitcherWins && isIDTActive(rawCardValue)) {
    // Pitcher wins AND value is in IDT range (5-25):
    // IDT table scrambles the outcome. This is the pitcher's defense --
    // it converts batter-favorable card values into a mix of outcomes.
    const tableResult = lookupOutcome(rawCardValue, rng);

    if (tableResult.success && tableResult.outcome !== undefined) {
      outcome = tableResult.outcome;
      outcomeTableRow = tableResult.rowIndex;
      usedFallback = false;
    } else {
      // IDT miss after 3 attempts: fall back to direct mapping
      outcome = getDirectOutcome(rawCardValue);
      usedFallback = true;
    }
  } else {
    // Batter wins OR value outside IDT range (0-4, 26+):
    // Direct card value mapping. The card value IS the outcome.
    outcome = getDirectOutcome(rawCardValue);
    usedFallback = true;
  }

  // Build GradeGateResult for test compatibility
  const gradeEffect: GradeGateResult = {
    originalValue: rawCardValue,
    finalValue: rawCardValue,
    pitcherWon: pitcherWins && isIDTActive(rawCardValue),
    r2Roll: gradeRoll,
  };

  return {
    cardPosition,
    cardValue: rawCardValue,
    outcome,
    usedFallback,
    pitcherGradeEffect: gradeEffect,
    outcomeTableRow,
  };
}
