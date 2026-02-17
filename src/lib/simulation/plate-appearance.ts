/**
 * Plate Appearance Resolution Module (SERD Single-Algorithm)
 *
 * REQ-SIM-004: Single roll -> column select -> card lookup.
 *
 * Replaces the previous 3-path system (Path A pitcher card check,
 * Path B IDT table, Path C direct mapping) with the SERD approach:
 * one PRNG roll, one column lookup on a 5-column card, one outcome.
 *
 * The pitcher's effective grade (1-30 from pitching.ts) selects which
 * column (A-E) to read. The card directly contains OutcomeCategory
 * values, so there's no fallback chain, no IDT table, no symbol
 * resolution, and no probabilistic grade gate.
 *
 * This is a Layer 1 module: pure logic with no I/O, runs in any JS runtime.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import type { ApbaCard, ApbaColumn } from '../types/player';
import { OutcomeCategory } from '../types/game';
import { gradeToColumn } from '../card-generator/apba-card-generator';

// Re-export gradeToColumn for convenience
export { gradeToColumn };

/** Total outcome slots per column (2d6 = 36 equiprobable results). */
const SLOTS_PER_COLUMN = 36;

/**
 * Legacy IDT constants -- kept for backwards compatibility with tests
 * that reference them (e.g., power-rating.test.ts).
 * @deprecated No longer used in PA resolution (SERD replaces IDT).
 */
export const IDT_ACTIVE_LOW = 15;
export const IDT_ACTIVE_HIGH = 23;

/**
 * Result of the pitcher grade gate check.
 * In SERD mode, this reports the column selection instead of a grade gate.
 */
export interface GradeGateResult {
  /** The raw roll index (0-35) */
  originalValue: number;
  /** Same as originalValue */
  finalValue: number;
  /** Always true in SERD (grade always selects column) */
  pitcherWon: boolean;
  /** The effective grade used for column selection */
  r2Roll: number;
}

/**
 * Result of a complete plate appearance resolution.
 */
export interface PlateAppearanceResult {
  /** Roll index (0-35) into the column */
  cardPosition: number;
  /** The OutcomeCategory enum value (for logging) */
  cardValue: number;
  /** The resolved outcome */
  outcome: OutcomeCategory;
  /** Always false in SERD (always direct lookup) */
  usedFallback: boolean;
  /** Column selection metadata */
  pitcherGradeEffect: GradeGateResult;
  /** Column that was selected (SERD-specific) */
  column?: ApbaColumn;
  /** Undefined in SERD (no IDT) */
  outcomeTableRow?: number;
}

/**
 * Resolve a plate appearance using the SERD single-algorithm approach.
 *
 * One PRNG roll -> one column lookup -> one outcome.
 *
 * @param apbaCard - The batter's 5-column APBA card
 * @param effectiveGrade - Pitcher's effective grade (1-30, from pitching.ts)
 * @param rng - Seeded random number generator
 * @returns Complete plate appearance result
 */
export function resolvePlateAppearance(
  apbaCard: ApbaCard,
  effectiveGrade: number,
  rng: SeededRNG,
): PlateAppearanceResult {
  // Step 1: Select column based on pitcher grade
  const column = gradeToColumn(effectiveGrade);

  // Step 2: Roll for outcome (36 equiprobable, simulating 2d6)
  const rollIndex = rng.nextInt(0, SLOTS_PER_COLUMN - 1);

  // Step 3: Direct lookup -- the card IS the outcome
  const outcome = apbaCard[column][rollIndex];

  return {
    cardPosition: rollIndex,
    cardValue: outcome,
    outcome,
    usedFallback: false,
    pitcherGradeEffect: {
      originalValue: rollIndex,
      finalValue: rollIndex,
      pitcherWon: true,
      r2Roll: effectiveGrade,
    },
    column,
    outcomeTableRow: undefined,
  };
}
