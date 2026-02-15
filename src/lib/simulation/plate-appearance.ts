/**
 * Plate Appearance Resolution Module
 *
 * REQ-SIM-004: Card lookup with pitcher grade gate.
 * This is the core plate appearance resolution that combines:
 * - Card position selection (random from 0-34, skipping non-drawable)
 * - Direct card value to outcome mapping (card value IS the outcome)
 * - Pitcher grade suppression (hits and walks)
 *
 * APBA BBW resolution order (proven by correlation analysis):
 *   card draw -> direct mapping -> pitcher grade suppresses hits + walks
 *
 * Card values (0-42) directly encode outcomes. Correlation analysis of
 * real APBA data proves: value 13 = walk (r=.978), value 14 = K (r=.959),
 * value 7 = single (r=.680). The high correlation is preserved because
 * the grade gate applies uniformly to all walks (same suppression rate
 * regardless of which player's card is drawn).
 *
 * The pitcher grade gate affects:
 * - HIT outcomes: converted to GROUND_OUT with probability (grade/15)*HIT_SUPPRESSION_SCALE
 * - WALK outcomes: converted to GROUND_OUT with probability (grade/15)*WALK_SUPPRESSION_SCALE
 * - Strikeouts, outs, and other outcomes: pass through unchanged
 *
 * Walk suppression models pitcher control -- better pitchers walk fewer
 * batters. This is analogous to how the real APBA BBW IDT table can
 * convert mid-range card values (including walks) to alternative outcomes.
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
 * Calibrated for 24 drawable positions (excluding archetype positions 33-34).
 * Buford's real APBA card has 8 hits in 24 drawable positions.
 * Target .290 BA vs grade 8 pitcher:
 *   8 * (1 - (8/15)*0.45) / (24 - 3 walks) = 8 * 0.76 / 21 = .290
 *
 *   Grade 1 (poor):  (1/15) * 0.45 = 3.0% hit suppression
 *   Grade 8 (avg):   (8/15) * 0.45 = 24.0% hit suppression
 *   Grade 15 (ace): (15/15) * 0.45 = 45.0% hit suppression
 */
export const HIT_SUPPRESSION_SCALE = 0.45;

/**
 * Walk suppression scale for pitcher grade gate.
 * Combined walk suppression = (grade/15) * WALK_SUPPRESSION_SCALE.
 *
 * Models pitcher control: better pitchers walk fewer batters.
 * In real APBA BBW, the IDT table can convert mid-range card values
 * (including value 13 = walk) to alternative outcomes when the pitcher
 * wins the grade check. This simplified model achieves the same effect.
 *
 * Calibrated to reduce average walk rate from ~12% to ~8.5% at grade 8:
 *   Grade 1 (poor):  (1/15) * 0.45 = 3.0% walk suppression
 *   Grade 8 (avg):   (8/15) * 0.45 = 24.0% walk suppression
 *   Grade 15 (ace): (15/15) * 0.45 = 45.0% walk suppression
 */
export const WALK_SUPPRESSION_SCALE = 0.45;

/**
 * Apply the pitcher grade gate to a card value (legacy API, kept for tests).
 *
 * From REQ-SIM-004 step 4d (calibrated two-roll system):
 * - Roll 1: Generate random integer R2 in [1, 15]
 *   If R2 <= pitcher.grade: pitcher "wins" the matchup
 * - Roll 2: If pitcher won AND card value is a hit or walk,
 *   there is a suppression chance it becomes a ground out
 *
 * Combined hit suppression = (grade / 15) * HIT_SUPPRESSION_SCALE
 * Combined walk suppression = (grade / 15) * WALK_SUPPRESSION_SCALE
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
  const isHit = isHitCardValue(cardValue);
  const isWalk = cardValue === 13;

  // Non-hit, non-walk values pass through unchanged
  if (!isHit && !isWalk) {
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
  if (pitcherWinsRoll) {
    const suppressionScale = isHit ? HIT_SUPPRESSION_SCALE : WALK_SUPPRESSION_SCALE;
    if (rng.chance(suppressionScale)) {
      // Hit or walk becomes a ground out
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
 * APBA BBW faithful resolution (per correlation analysis):
 * 1. Select a random card position (skipping non-drawable positions)
 * 2. Read the card value
 * 3. Direct mapping: card value IS the outcome (always)
 * 4. Pitcher grade suppression: hits and walks can be converted to outs
 *
 * The grade gate models how pitcher quality affects plate appearances:
 * - Better pitchers suppress more hits (fewer singles, doubles, etc.)
 * - Better pitchers also walk fewer batters (better control)
 * - Strikeouts and outs are never affected
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
  // Step 1: Select card position (skips non-drawable positions)
  const cardPosition = selectCardPosition(rng);

  // Step 2: Read card value
  const rawCardValue = readCardValue(card, cardPosition);

  // Step 3: Direct mapping -- card value IS the outcome
  let outcome = getDirectOutcome(rawCardValue);

  // Step 4: Pitcher grade suppression
  // Combined hit suppression = (grade/15) * HIT_SUPPRESSION_SCALE
  // Combined walk suppression = (grade/15) * WALK_SUPPRESSION_SCALE
  let pitcherWon = false;
  let gradeRoll = 0;

  if (isHitOutcome(outcome)) {
    gradeRoll = rng.nextInt(1, 15);
    if (gradeRoll <= pitcherGrade && rng.chance(HIT_SUPPRESSION_SCALE)) {
      outcome = OutcomeCategory.GROUND_OUT;
      pitcherWon = true;
    }
  } else if (outcome === OutcomeCategory.WALK) {
    gradeRoll = rng.nextInt(1, 15);
    if (gradeRoll <= pitcherGrade && rng.chance(WALK_SUPPRESSION_SCALE)) {
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
