/**
 * OutcomeTable - IDT.OBJ Decision Table Port
 *
 * REQ-SIM-003: Port APBA's IDT.OBJ decision table as a TypeScript OutcomeTable.
 * The original IDT.OBJ is a 36-entry x 4-column matrix (144 bytes).
 * Each row defines a weighted outcome mapping.
 *
 * IDT BITMAP GATING (Gap 6):
 * In real BBW, a bitmap at DATA[0x382A] determines which IDT rows are active
 * for each card value in [15, 23]. The exact bitmap bytes are unknown from our
 * Ghidra analysis. We use a full-active approximation: all 36 rows are eligible
 * for all card values. This produces reasonable outcome distributions but may
 * differ slightly from BBW's exact per-value row filtering.
 *
 * The IDT path is now ACTIVE because card[24] (power rating) holds values 15-21
 * for most batters. When position 24 is drawn and the pitcher wins the grade
 * check, the IDT table determines the replacement outcome.
 *
 * This is a Layer 1 module: pure logic with no I/O, runs in any JS runtime.
 */

import type { SeededRNG } from '../rng/seeded-rng';
import type { OutcomeTableEntry } from '../types/game';
import { OutcomeCategory } from '../types/game';

/**
 * Maximum number of lookup attempts before failing.
 */
const MAX_ATTEMPTS = 3;

/**
 * The 36-row outcome table ported from APBA IDT.OBJ (144 bytes = 36 x 4).
 * Each row defines a frequency-weighted outcome mapping.
 *
 * frequencyWeight: 1-5, determines how often this row is selected
 * thresholdLow/High: card value range that triggers this outcome
 * outcomeIndex: maps to an OutcomeCategory enum value
 */
export const OUTCOME_TABLE: OutcomeTableEntry[] = [
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 10, outcomeIndex: 15 },
  { frequencyWeight: 4, thresholdLow: 13, thresholdHigh: 25, outcomeIndex: 25 },
  { frequencyWeight: 2, thresholdLow: 5, thresholdHigh: 10, outcomeIndex: 38 },
  { frequencyWeight: 3, thresholdLow: 8, thresholdHigh: 12, outcomeIndex: 17 },
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 11, outcomeIndex: 16 },
  { frequencyWeight: 2, thresholdLow: 7, thresholdHigh: 13, outcomeIndex: 28 },
  { frequencyWeight: 3, thresholdLow: 6, thresholdHigh: 14, outcomeIndex: 37 },
  { frequencyWeight: 1, thresholdLow: 8, thresholdHigh: 22, outcomeIndex: 21 },
  { frequencyWeight: 2, thresholdLow: 6, thresholdHigh: 13, outcomeIndex: 31 },
  { frequencyWeight: 4, thresholdLow: 9, thresholdHigh: 10, outcomeIndex: 23 },
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 12, outcomeIndex: 17 },
  { frequencyWeight: 3, thresholdLow: 12, thresholdHigh: 11, outcomeIndex: 18 },
  { frequencyWeight: 1, thresholdLow: 6, thresholdHigh: 13, outcomeIndex: 30 },
  { frequencyWeight: 2, thresholdLow: 7, thresholdHigh: 11, outcomeIndex: 23 },
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 14, outcomeIndex: 18 },
  { frequencyWeight: 3, thresholdLow: 6, thresholdHigh: 10, outcomeIndex: 27 },
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 15, outcomeIndex: 39 },
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 10, outcomeIndex: 34 },
  { frequencyWeight: 5, thresholdLow: 15, thresholdHigh: 24, outcomeIndex: 40 },
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 16, outcomeIndex: 20 },
  { frequencyWeight: 2, thresholdLow: 7, thresholdHigh: 12, outcomeIndex: 29 },
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 17, outcomeIndex: 19 },
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 23, outcomeIndex: 22 },
  { frequencyWeight: 4, thresholdLow: 10, thresholdHigh: 11, outcomeIndex: 24 },
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 18, outcomeIndex: 36 },
  { frequencyWeight: 3, thresholdLow: 8, thresholdHigh: 11, outcomeIndex: 32 },
  { frequencyWeight: 2, thresholdLow: 6, thresholdHigh: 21, outcomeIndex: 22 },
  { frequencyWeight: 3, thresholdLow: 9, thresholdHigh: 12, outcomeIndex: 16 },
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 19, outcomeIndex: 20 },
  { frequencyWeight: 4, thresholdLow: 11, thresholdHigh: 13, outcomeIndex: 33 },
  { frequencyWeight: 1, thresholdLow: 7, thresholdHigh: 20, outcomeIndex: 24 },
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 10, outcomeIndex: 21 },
  { frequencyWeight: 2, thresholdLow: 6, thresholdHigh: 12, outcomeIndex: 26 },
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 11, outcomeIndex: 19 },
  { frequencyWeight: 5, thresholdLow: 14, thresholdHigh: 14, outcomeIndex: 35 },
  { frequencyWeight: 1, thresholdLow: 5, thresholdHigh: 10, outcomeIndex: 15 },
];

/**
 * Pre-computed total weight of all rows.
 */
let cachedTotalWeight: number | null = null;

/**
 * Pre-computed cumulative weights for binary search.
 */
let cachedCumulativeWeights: number[] | null = null;

/**
 * Get the total weight of all rows in the outcome table.
 * Cached for performance.
 */
export function getTotalWeight(): number {
  if (cachedTotalWeight === null) {
    cachedTotalWeight = OUTCOME_TABLE.reduce(
      (sum, row) => sum + row.frequencyWeight,
      0
    );
  }
  return cachedTotalWeight;
}

/**
 * Build cumulative weights array for efficient weighted selection.
 * Example: weights [1, 4, 2] => cumulative [1, 5, 7]
 */
export function buildCumulativeWeights(): number[] {
  if (cachedCumulativeWeights === null) {
    cachedCumulativeWeights = [];
    let cumulative = 0;
    for (const row of OUTCOME_TABLE) {
      cumulative += row.frequencyWeight;
      cachedCumulativeWeights.push(cumulative);
    }
  }
  return cachedCumulativeWeights;
}

/**
 * Select a row index using weighted random selection.
 * Rows with higher frequencyWeight are selected more often.
 *
 * @param rng - Seeded random number generator
 * @returns Row index (0 to OUTCOME_TABLE.length - 1)
 */
export function selectWeightedRow(rng: SeededRNG): number {
  const cumulative = buildCumulativeWeights();
  const total = getTotalWeight();
  const target = rng.nextInt(1, total);

  // Binary search for the row
  let low = 0;
  let high = cumulative.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (cumulative[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

/**
 * Check if a card value matches a row's threshold range.
 * Match is inclusive: cardValue must be >= thresholdLow AND <= thresholdHigh.
 *
 * Note: Some rows have thresholdLow > thresholdHigh (inverted range).
 * These rows never match any card value.
 *
 * @param cardValue - The card value to check (0-42)
 * @param row - The outcome table row to check against
 * @returns True if cardValue falls within the threshold range
 */
export function cardValueMatchesRow(
  cardValue: number,
  row: OutcomeTableEntry
): boolean {
  return cardValue >= row.thresholdLow && cardValue <= row.thresholdHigh;
}

/**
 * Result of an outcome table lookup.
 */
export interface LookupResult {
  /** Whether the lookup found a matching row */
  success: boolean;
  /** The outcome category if successful */
  outcome?: OutcomeCategory;
  /** The row index that was selected (even if it didn't match) */
  rowIndex: number;
  /** Number of attempts made */
  attempts: number;
}

/**
 * Look up an outcome from the table for a given card value.
 *
 * Process (per REQ-SIM-004 step 5):
 * 1. Select an OutcomeTable row using weighted random selection
 * 2. Check if cardValue falls within [thresholdLow, thresholdHigh]
 * 3. If yes: return the outcomeIndex as the play result
 * 4. If no: re-select a different row (up to MAX_ATTEMPTS attempts)
 * 5. If no match after MAX_ATTEMPTS: return success: false
 *
 * @param cardValue - The card value to look up (0-42)
 * @param rng - Seeded random number generator
 * @returns Lookup result with success status, outcome, and metadata
 */
export function lookupOutcome(cardValue: number, rng: SeededRNG): LookupResult {
  let lastRowIndex = -1;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const rowIndex = selectWeightedRow(rng);
    lastRowIndex = rowIndex;
    const row = OUTCOME_TABLE[rowIndex];

    if (cardValueMatchesRow(cardValue, row)) {
      return {
        success: true,
        outcome: row.outcomeIndex as OutcomeCategory,
        rowIndex,
        attempts: attempt,
      };
    }
  }

  // No match found after MAX_ATTEMPTS
  return {
    success: false,
    rowIndex: lastRowIndex,
    attempts: MAX_ATTEMPTS,
  };
}
