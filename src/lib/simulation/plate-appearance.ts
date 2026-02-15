/**
 * Plate Appearance Resolution Module
 *
 * REQ-SIM-004: Card lookup with pitcher grade gate and IDT decision table.
 * This is the core plate appearance resolution following the real APBA BBW flow:
 *
 * 1. Select a random card position (0-34, skipping non-drawable)
 * 2. Read the card value at that position
 * 3. Grade check: R2 in [1,15], pitcher wins if R2 <= grade
 * 4. If pitcher wins AND card value is IDT-active (5-25):
 *    -> IDT table lookup (up to 3 attempts via outcome-table.ts)
 *    -> If match: use IDT outcomeIndex as OutcomeCategory
 *    -> If no match after 3 attempts: fallback to direct mapping
 * 5. If batter wins OR card value not IDT-active:
 *    -> Direct mapping (card value IS the outcome)
 *
 * Card values 0-4 (doubles, HRs) and 26+ (outs, specials) bypass the IDT
 * entirely, even when the pitcher wins. This preserves their near-perfect
 * correlation (e.g., value 1 = HR with r=.715 never suppressed by pitcher).
 *
 * Values 5-25 (singles, walks, Ks, triples, etc.) are IDT-active and can
 * be remapped to any OutcomeCategory when the pitcher wins the grade check.
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
 * Non-drawable positions (structural constants + flag bytes) as a Set for O(1) lookup.
 */
const NON_DRAWABLE_SET = new Set(NON_DRAWABLE_POSITIONS);

/**
 * IDT-active card value range boundaries.
 * Derived from OUTCOME_TABLE: minimum thresholdLow=5, maximum thresholdHigh=25.
 * Card values in [IDT_ACTIVE_LOW, IDT_ACTIVE_HIGH] can be remapped by the IDT
 * table when the pitcher wins the grade check.
 * Values outside this range (0-4, 26+) ALWAYS use direct mapping.
 */
export const IDT_ACTIVE_LOW = 5;
export const IDT_ACTIVE_HIGH = 25;

/**
 * Check if a card value is within the IDT-active range.
 * Values 5-25 can be remapped by the IDT table when the pitcher wins.
 * Values 0-4 (doubles, HRs) and 26+ (outs, specials) bypass IDT entirely.
 */
export function isIDTActive(cardValue: number): boolean {
  return cardValue >= IDT_ACTIVE_LOW && cardValue <= IDT_ACTIVE_HIGH;
}

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
 * Result of the pitcher grade gate check.
 */
export interface GradeGateResult {
  /** The original card value before any remapping */
  originalValue: number;
  /** Same as originalValue (IDT changes the outcome, not the card value) */
  finalValue: number;
  /** True when pitcher won the grade check AND value was IDT-active */
  pitcherWon: boolean;
  /** The R2 roll value [1, 15] */
  r2Roll: number;
}

/**
 * Result of a complete plate appearance resolution.
 */
export interface PlateAppearanceResult {
  cardPosition: number;
  cardValue: number;
  outcome: OutcomeCategory;
  /** True when direct mapping was used (batter wins or IDT fallback) */
  usedFallback: boolean;
  pitcherGradeEffect: GradeGateResult;
  /** The IDT row index that matched, if IDT was used */
  outcomeTableRow?: number;
}

/**
 * Resolve a complete plate appearance using the real APBA BBW flow.
 *
 * Resolution order (from APBA_REVERSE_ENGINEERING.md Section 4):
 * 1. Select a random card position (skipping non-drawable positions)
 * 2. Read the card value
 * 3. Grade check: R2 in [1, 15], pitcher wins if R2 <= grade
 * 4. If PITCHER WINS and card value is IDT-active (5-25):
 *    -> IDT table lookup (weighted random row, check threshold match, up to 3 tries)
 *    -> Match found: outcome = IDT outcomeIndex
 *    -> No match: fallback to direct card value mapping
 * 5. If BATTER WINS or card value not IDT-active:
 *    -> Direct mapping: card value IS the outcome
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

  // Step 3: Grade check -- R2 in [1, 15], pitcher wins if R2 <= grade
  const r2 = rng.nextInt(1, 15);
  const pitcherWins = r2 <= pitcherGrade;

  let outcome: OutcomeCategory;
  let usedFallback: boolean;
  let outcomeTableRow: number | undefined;

  if (pitcherWins && isIDTActive(rawCardValue)) {
    // Step 4a: PITCHER WINS and card value is IDT-matchable (5-25)
    // Look up outcome from IDT table (up to 3 attempts)
    const lookup = lookupOutcome(rawCardValue, rng);

    if (lookup.success && lookup.outcome !== undefined) {
      // IDT matched: use the IDT outcome
      outcome = lookup.outcome;
      usedFallback = false;
      outcomeTableRow = lookup.rowIndex;
    } else {
      // IDT failed after 3 attempts: fall back to direct mapping
      outcome = getDirectOutcome(rawCardValue);
      usedFallback = true;
    }
  } else {
    // Step 4b: BATTER WINS (R2 > grade) OR card value not IDT-active
    // Direct mapping: card value IS the outcome
    outcome = getDirectOutcome(rawCardValue);
    usedFallback = true;
  }

  const gradeEffect: GradeGateResult = {
    originalValue: rawCardValue,
    finalValue: rawCardValue,
    pitcherWon: pitcherWins && isIDTActive(rawCardValue),
    r2Roll: r2,
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
