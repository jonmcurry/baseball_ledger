/**
 * Plate Appearance Resolution Module (SERD 5-Column System)
 *
 * REQ-SIM-004: Batter card lookup + pitcher grade-based column selection.
 *
 * Implements plate appearance resolution using the SERD 5-column card system:
 * - Pitcher's effective grade selects which column (A-E) of the batter's card
 *   is used via gradeToColumn()
 * - Column A (elite pitchers, grade 20+): suppresses hits/walks, boosts Ks
 * - Column C (average pitchers, grade 7-14): neutral MLB rates
 * - Column E (weak pitchers, grade 1-3): boosts hits/walks, suppresses Ks
 * - All outcome types (HR, double, single, walk, K, etc.) are affected by
 *   the column multipliers built into the card at generation time
 *
 * The column multipliers are baked into each card's 5 columns by
 * apba-card-generator.ts, so this module simply reads the correct column.
 *
 * This is a Layer 1 module: pure logic with no I/O, runs in any JS runtime.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import type { ApbaCard, ApbaColumn } from '../types/player';
import { OutcomeCategory } from '../types/game';
import { gradeToColumn } from '../card-generator/apba-card-generator';

// Re-export gradeToColumn for convenience (used by card-generator tests)
export { gradeToColumn };

/** Total outcome slots per column (2d6 = 36 equiprobable results). */
const SLOTS_PER_COLUMN = 36;

/**
 * Legacy IDT constants -- kept for backwards compatibility with tests
 * that reference them (e.g., power-rating.test.ts).
 * @deprecated No longer used in PA resolution.
 */
export const IDT_ACTIVE_LOW = 15;
export const IDT_ACTIVE_HIGH = 23;

/**
 * Result of the pitcher grade gate check.
 * Reports the grade used for column selection.
 */
export interface GradeGateResult {
  /** The raw roll index (0-35) */
  originalValue: number;
  /** Same as originalValue (no IDT remapping) */
  finalValue: number;
  /** Always false (no legacy grade check; column system handles suppression) */
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
  /** The initial OutcomeCategory from batter's card */
  cardValue: number;
  /** The resolved outcome (same as cardValue; no post-read suppression) */
  outcome: OutcomeCategory;
  /** Always false (no fallback chain in this system) */
  usedFallback: boolean;
  /** Grade check metadata */
  pitcherGradeEffect: GradeGateResult;
  /** The column selected by pitcher grade (A-E) */
  column?: ApbaColumn;
  /** Undefined (no IDT) */
  outcomeTableRow?: number;
}

/**
 * Resolve a plate appearance using the SERD 5-column system.
 *
 * 1. Map pitcher's effective grade to a column (A-E) via gradeToColumn()
 * 2. Roll a random outcome from the 36 equiprobable slots in that column
 * 3. Return the outcome directly (all suppression/boosting is already
 *    encoded in the column's outcome distribution)
 *
 * Column mapping (from gradeToColumn):
 *   Grade 20+  -> Column A (elite: fewer hits, more Ks)
 *   Grade 15-19 -> Column B (strong: moderate suppression)
 *   Grade 7-14  -> Column C (average: neutral MLB rates)
 *   Grade 4-6   -> Column D (below avg: more hits, fewer Ks)
 *   Grade 1-3   -> Column E (weak: most hits, fewest Ks)
 *
 * @param apbaCard - The batter's 5-column APBA card
 * @param effectiveGrade - Pitcher's effective grade (1-30, from pitching.ts 6-layer)
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

  // Step 3: Read outcome directly from the selected column
  const outcome = apbaCard[column][rollIndex];

  return {
    cardPosition: rollIndex,
    cardValue: outcome,
    outcome,
    usedFallback: false,
    pitcherGradeEffect: {
      originalValue: rollIndex,
      finalValue: rollIndex,
      pitcherWon: false,
      r2Roll: effectiveGrade,
    },
    column,
    outcomeTableRow: undefined,
  };
}
