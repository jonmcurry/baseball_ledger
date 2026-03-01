/**
 * Plate Appearance Resolution Module (BBW-Authentic)
 *
 * REQ-SIM-004: Batter card draw + pitcher grade check + IDT lookup.
 *
 * Implements authentic BBW plate appearance resolution as confirmed by
 * Ghidra decompilation of FUN_1058_5f49:
 * 1. Draw random position (0-34) from batter's 35-byte card
 * 2. Grade check for card values 7, 8, 11:
 *    - Roll 0-35; if < effectiveGrade, pitcher wins -> draw from pitcher's card
 *    - Otherwise: batter wins, original card value stands
 * 3. IDT lookup for card values 15-23 (bitmap-gated weighted random)
 * 4. Direct mapping for all other card values
 *
 * This is a Layer 1 module: pure logic with no I/O, runs in any JS runtime.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import type { CardValue } from '../types/player';
import { OutcomeCategory } from '../types/game';
import { CARD_LENGTH } from '../card-generator/structural';
import { getDirectOutcome } from './card-value-fallback';
import { lookupIdtOutcome } from './outcome-table';

/** Grade check fires for these card values (singles/triples in BBW). */
const GRADE_CHECK_VALUES: ReadonlySet<number> = new Set([7, 8, 11]);

/** Grade check roll range: 0 to GRADE_CHECK_RANGE-1 (BBW uses 36). */
export const GRADE_CHECK_RANGE = 36;

/** IDT active range lower bound (BBW bitmap gating). */
export const IDT_ACTIVE_LOW = 15;

/** IDT active range upper bound (BBW bitmap gating). */
export const IDT_ACTIVE_HIGH = 23;

/**
 * Result of the pitcher grade gate check.
 */
export interface GradeGateResult {
  /** The raw card value drawn from the batter's card (0-42) */
  originalValue: number;
  /** The final card value used for outcome (may be from pitcher's card) */
  finalValue: number;
  /** True if grade check fired AND pitcher won the roll */
  pitcherWon: boolean;
  /** The effective grade used for the check */
  r2Roll: number;
}

/**
 * Result of a complete plate appearance resolution.
 */
export interface PlateAppearanceResult {
  /** Position drawn from the card (0-34) */
  cardPosition: number;
  /** The raw card value at that position (0-42) */
  cardValue: number;
  /** The resolved OutcomeCategory */
  outcome: OutcomeCategory;
  /** Always false (no fallback chain in BBW) */
  usedFallback: boolean;
  /** Grade check metadata */
  pitcherGradeEffect: GradeGateResult;
  /** Undefined (no column system in BBW) */
  column?: undefined;
  /** IDT row index if IDT was used, otherwise undefined */
  outcomeTableRow?: number;
}

/**
 * Resolve a plate appearance using authentic BBW logic.
 *
 * Ghidra-confirmed flow (FUN_1058_5f49):
 * 1. Draw random position (0-34) from batter's 35-byte card
 * 2. Read card value at that position
 * 3. If card value is 7, 8, or 11 (grade-check values):
 *    - Roll 0-35; if < effectiveGrade, pitcher wins
 *    - Pitcher wins: draw from pitcher's card, map via getDirectOutcome()
 *    - Batter wins: original value stands, map via getDirectOutcome()
 * 4. If card value is in [15, 23] (IDT active range):
 *    - lookupIdtOutcome() with bitmap gating
 * 5. Otherwise: getDirectOutcome() (direct mapping)
 *
 * @param batterCard - Batter's 35-byte card (PlayerCard.card)
 * @param pitcherCard - Pitcher's 35-byte card (PlayerCard.card)
 * @param effectiveGrade - Pitcher's effective grade (1-30, from 6-layer computation)
 * @param rng - Seeded random number generator
 * @returns Complete plate appearance result
 */
export function resolvePlateAppearance(
  batterCard: CardValue[],
  pitcherCard: CardValue[],
  effectiveGrade: number,
  rng: SeededRNG,
): PlateAppearanceResult {
  // Step 1: Draw random position from batter's card
  const position = rng.nextInt(0, CARD_LENGTH - 1);
  const cardValue = batterCard[position];

  let outcome: OutcomeCategory;
  let pitcherWon = false;
  let finalValue = cardValue;
  let outcomeTableRow: number | undefined;

  if (GRADE_CHECK_VALUES.has(cardValue)) {
    // Step 2: Grade check for card values 7, 8, 11
    const gradeRoll = rng.nextInt(0, GRADE_CHECK_RANGE - 1);

    if (gradeRoll < effectiveGrade) {
      // Pitcher wins: draw from pitcher's card
      pitcherWon = true;
      const pitcherPosition = rng.nextInt(0, CARD_LENGTH - 1);
      finalValue = pitcherCard[pitcherPosition];
      outcome = getDirectOutcome(finalValue);
    } else {
      // Batter wins: original value stands
      outcome = getDirectOutcome(cardValue);
    }
  } else if (cardValue >= IDT_ACTIVE_LOW && cardValue <= IDT_ACTIVE_HIGH) {
    // Step 3: IDT lookup for card values 15-23
    const idtResult = lookupIdtOutcome(rng, cardValue);
    outcome = idtResult.outcome;
    outcomeTableRow = idtResult.rowIndex;
  } else {
    // Step 4: Direct mapping for all other values
    outcome = getDirectOutcome(cardValue);
  }

  return {
    cardPosition: position,
    cardValue,
    outcome,
    usedFallback: false,
    pitcherGradeEffect: {
      originalValue: cardValue,
      finalValue,
      pitcherWon,
      r2Roll: effectiveGrade,
    },
    column: undefined,
    outcomeTableRow,
  };
}
