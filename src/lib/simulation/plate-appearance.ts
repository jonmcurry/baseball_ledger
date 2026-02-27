/**
 * Plate Appearance Resolution Module (BBW-Faithful Grade Check)
 *
 * REQ-SIM-004: Batter card lookup + pitcher grade-check suppression.
 *
 * Implements the BBW (APBA Baseball for Windows 3.0) PA resolution:
 * - Batter's card (Column C) determines base outcome rates
 * - Pitcher grade selectively suppresses SINGLE_CLEAN and TRIPLE
 *   via a grade check: random(36) < effectiveGrade -> pitcher wins
 * - All other outcomes (WALK, HR, DOUBLE, STRIKEOUT, SINGLE_ADVANCE,
 *   HBP, etc.) are batter-determined -- pitcher grade has NO effect
 *
 * Confirmed by Ghidra decompilation of FUN_1058_5f49:
 * - Card values 7/8 (singles) go through grade check -> SINGLE_CLEAN
 * - Card value 11 (triples) goes through grade check -> TRIPLE
 * - Card value 9 (weak singles) NOT grade-checked -> SINGLE_ADVANCE
 * - Card values 13 (walk), 14 (K), 0 (double), 1 (HR) resolve directly
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
 * BBW grade check range. When a grade-suppressible outcome is rolled,
 * random(GRADE_CHECK_RANGE) < effectiveGrade determines if the pitcher
 * suppresses the hit. Using 36 matches the BBW 2d6 card system.
 *
 * Grade 8 (average): 8/36 = 22% suppression of SINGLE_CLEAN/TRIPLE
 * Grade 15 (ace): 15/36 = 42% suppression
 * Grade 20 (elite): 20/36 = 56% suppression
 * Grade 30 (max): 30/36 = 83% suppression
 */
const GRADE_CHECK_RANGE = 36;

/**
 * Out type distribution when grade check suppresses a hit.
 * Weights sum to 1.0. Matches BBW fielding resolution distribution
 * (FUN_10a0_3c17 card value resolution, pitcher cards typically
 * resolve to ground outs via values 12-13).
 */
const GRADE_CHECK_OUT_WEIGHTS: { outcome: OutcomeCategory; weight: number }[] = [
  { outcome: OutcomeCategory.GROUND_OUT, weight: 0.45 },
  { outcome: OutcomeCategory.FLY_OUT, weight: 0.30 },
  { outcome: OutcomeCategory.LINE_OUT, weight: 0.15 },
  { outcome: OutcomeCategory.POP_OUT, weight: 0.10 },
];

/**
 * Legacy IDT constants -- kept for backwards compatibility with tests
 * that reference them (e.g., power-rating.test.ts).
 * @deprecated No longer used in PA resolution.
 */
export const IDT_ACTIVE_LOW = 15;
export const IDT_ACTIVE_HIGH = 23;

/**
 * Result of the pitcher grade gate check.
 * Reports whether the grade check fired and the grade used.
 */
export interface GradeGateResult {
  /** The raw roll index (0-35) */
  originalValue: number;
  /** Same as originalValue (no IDT remapping) */
  finalValue: number;
  /** True if grade check fired and pitcher won */
  pitcherWon: boolean;
  /** The effective grade used for the grade check */
  r2Roll: number;
}

/**
 * Result of a complete plate appearance resolution.
 */
export interface PlateAppearanceResult {
  /** Roll index (0-35) into the column */
  cardPosition: number;
  /** The initial OutcomeCategory from batter's card (before grade check) */
  cardValue: number;
  /** The resolved outcome (after grade check, may differ from cardValue) */
  outcome: OutcomeCategory;
  /** Always false (no fallback chain in this system) */
  usedFallback: boolean;
  /** Grade check metadata */
  pitcherGradeEffect: GradeGateResult;
  /** Always 'C' (batter's base rates) */
  column?: ApbaColumn;
  /** Undefined (no IDT) */
  outcomeTableRow?: number;
}

/**
 * Resolve an out type when the grade check suppresses a hit.
 *
 * In BBW (FUN_10a0_3c17), the pitcher's card value at the checked
 * position determines the fielding play. Pitcher cards are filled with
 * values 12-13 (fielding positions 1-2), producing mostly ground outs.
 * We approximate this with weighted random distribution.
 */
function resolveGradeCheckOut(rng: SeededRNG): OutcomeCategory {
  const roll = rng.nextFloat();
  let cumulative = 0;
  for (const entry of GRADE_CHECK_OUT_WEIGHTS) {
    cumulative += entry.weight;
    if (roll < cumulative) return entry.outcome;
  }
  return OutcomeCategory.GROUND_OUT;
}

/**
 * Resolve a plate appearance using BBW-faithful grade-check resolution.
 *
 * 1. Always read from Column C (batter's actual MLB rates)
 * 2. Roll a random outcome from the 36 equiprobable slots
 * 3. If outcome is SINGLE_CLEAN or TRIPLE, apply grade check:
 *    - random(36) < effectiveGrade -> pitcher suppresses -> out
 *    - otherwise -> hit stands
 * 4. All other outcomes are batter-determined (no grade effect)
 *
 * This faithfully implements BBW FUN_1058_5f49:
 * - Values 7/8 (SINGLE_CLEAN) and 11 (TRIPLE) are grade-checked
 * - Value 9 (SINGLE_ADVANCE) is NOT grade-checked
 * - Values 13 (WALK), 14 (STRIKEOUT), 0 (DOUBLE), 1 (HR) resolve directly
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
  // Step 1: Always use Column C (batter's base rates)
  // BBW: the batter's card determines base outcomes, not the pitcher
  const column: ApbaColumn = 'C';

  // Step 2: Roll for outcome (36 equiprobable, simulating 2d6)
  const rollIndex = rng.nextInt(0, SLOTS_PER_COLUMN - 1);

  // Step 3: Read initial outcome from batter's card
  const initialOutcome = apbaCard[column][rollIndex];
  let outcome = initialOutcome;
  let pitcherWon = false;

  // Step 4: BBW Grade Check (FUN_1058_5f49, card values 7/8/11)
  // SINGLE_CLEAN (BBW values 7/8) and TRIPLE (BBW value 11) are
  // pitcher-suppressible. SINGLE_ADVANCE (BBW value 9) is NOT.
  if (
    outcome === OutcomeCategory.SINGLE_CLEAN ||
    outcome === OutcomeCategory.TRIPLE
  ) {
    const gradeRoll = rng.nextInt(0, GRADE_CHECK_RANGE - 1);
    if (gradeRoll < effectiveGrade) {
      // Pitcher wins: suppress hit -> convert to out type
      outcome = resolveGradeCheckOut(rng);
      pitcherWon = true;
    }
  }

  return {
    cardPosition: rollIndex,
    cardValue: initialOutcome,
    outcome,
    usedFallback: false,
    pitcherGradeEffect: {
      originalValue: rollIndex,
      finalValue: rollIndex,
      pitcherWon,
      r2Roll: effectiveGrade,
    },
    column,
    outcomeTableRow: undefined,
  };
}
