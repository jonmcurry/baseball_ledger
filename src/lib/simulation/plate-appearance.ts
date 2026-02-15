/**
 * Plate Appearance Resolution Module
 *
 * REQ-SIM-004: Card lookup with pitcher grade gate and IDT decision table.
 * This is the core plate appearance resolution following the real APBA BBW flow.
 *
 * The real BBW (confirmed by Ghidra decompilation of FUN_1058_5f49) has TWO
 * separate grade-gated suppression paths:
 *
 * PATH A - Pitcher Card Check (card values 7, 8, 11):
 *   When pitcher wins grade check, batter's single/triple is contested.
 *   The pitcher's card determines the replacement outcome (hits, outs, or
 *   archetype symbol outcomes). Uses IDT as remapping proxy.
 *
 * PATH B - IDT Table Lookup (card values 15-23):
 *   When pitcher wins grade check, outcome is remapped via weighted random
 *   selection from the IDT.OBJ decision table (up to 3 attempts).
 *
 * Card values NOT in either path (0-6, 9-10, 12-14, 24+) ALWAYS use direct
 * mapping regardless of pitcher grade. This means:
 *   - Value 1 (HR, r=.715): never suppressed
 *   - Value 0 (double): never suppressed
 *   - Value 13 (walk, r=.978): never suppressed
 *   - Value 14 (K, r=.959): never suppressed
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
 * Confirmed by Ghidra decompilation of FUN_1058_5f49 (PA Resolution):
 *   rawOutcome >= 15 (0x0F) and rawOutcome <= 23 (0x17) -> IDT lookup path
 */
export const IDT_ACTIVE_LOW = 15;
export const IDT_ACTIVE_HIGH = 23;

/**
 * Card values that trigger the pitcher card check path.
 * Confirmed by Ghidra: `rawOutcome in [7, 8, 11] and not isRetry`
 *
 * When pitcher wins the grade check and the batter draws one of these values:
 * - 7 = SINGLE_CLEAN (high-quality single)
 * - 8 = SINGLE_CLEAN (mid-quality single)
 * - 11 = TRIPLE (per APBA card value encoding)
 *
 * The pitcher's card is consulted to determine the replacement outcome.
 * We use the IDT table as a proxy for the pitcher card remapping.
 */
export const PITCHER_CHECK_VALUES: ReadonlySet<number> = new Set([7, 8, 11]);

/**
 * Check if a card value is within the IDT-active range [15, 23].
 * Confirmed by Ghidra decompilation.
 */
export function isIDTActive(cardValue: number): boolean {
  return cardValue >= IDT_ACTIVE_LOW && cardValue <= IDT_ACTIVE_HIGH;
}

/**
 * Check if a card value triggers the pitcher card check path.
 * Card values 7, 8, 11 (singles/triples) are contested by the pitcher.
 */
export function isPitcherCheckValue(cardValue: number): boolean {
  return PITCHER_CHECK_VALUES.has(cardValue);
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
  /** True when pitcher won the grade check AND value was grade-gated */
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
 * Two-path resolution confirmed by Ghidra decompilation of FUN_1058_5f49:
 *
 * 1. Select a random card position (skipping non-drawable positions)
 * 2. Read the card value
 * 3. Grade check: R2 in [1, 15], pitcher wins if R2 <= grade
 * 4a. If PITCHER WINS and card value in {7, 8, 11} (singles/triples):
 *     -> Pitcher card check: IDT remapping as proxy
 * 4b. If PITCHER WINS and card value in [15, 23] (IDT-active):
 *     -> IDT table lookup (weighted random row, threshold match, up to 3 tries)
 * 5. Otherwise (batter wins OR value not in either path):
 *     -> Direct mapping: card value IS the outcome
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

  const isGradeGated = isIDTActive(rawCardValue) || isPitcherCheckValue(rawCardValue);

  if (pitcherWins && isIDTActive(rawCardValue)) {
    // Path B: PITCHER WINS + card value in [15, 23] -> IDT table lookup
    const lookup = lookupOutcome(rawCardValue, rng);

    if (lookup.success && lookup.outcome !== undefined) {
      outcome = lookup.outcome;
      usedFallback = false;
      outcomeTableRow = lookup.rowIndex;
    } else {
      outcome = getDirectOutcome(rawCardValue);
      usedFallback = true;
    }
  } else if (pitcherWins && isPitcherCheckValue(rawCardValue)) {
    // Path A: PITCHER WINS + card value in {7, 8, 11} -> pitcher card check
    // In real BBW, this reads from the pitcher's card. We use IDT as proxy.
    const lookup = lookupOutcome(rawCardValue, rng);

    if (lookup.success && lookup.outcome !== undefined) {
      outcome = lookup.outcome;
      usedFallback = false;
      outcomeTableRow = lookup.rowIndex;
    } else {
      outcome = getDirectOutcome(rawCardValue);
      usedFallback = true;
    }
  } else {
    // Step 5: BATTER WINS (R2 > grade) OR card value not grade-gated
    // Direct mapping: card value IS the outcome
    outcome = getDirectOutcome(rawCardValue);
    usedFallback = true;
  }

  const gradeEffect: GradeGateResult = {
    originalValue: rawCardValue,
    finalValue: rawCardValue,
    pitcherWon: pitcherWins && isGradeGated,
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
