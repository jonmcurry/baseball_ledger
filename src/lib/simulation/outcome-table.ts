/**
 * OutcomeTable - IDT.OBJ Decision Table Port
 *
 * REQ-SIM-003: Port APBA's IDT.OBJ decision table as a TypeScript OutcomeTable.
 * The original IDT.OBJ is a 36-entry x 4-column matrix (144 bytes).
 * Each row defines a weighted outcome mapping.
 *
 * IDT LOOKUP (Ghidra-confirmed):
 * BBW's IDT path (FUN_1058_5f49, lines 151-189) uses ONLY rows 15-23 with
 * separate frequency weights from DATA[row + 0x382B] (BBW_IDT_WEIGHTS),
 * NOT the in-table frequencyWeight values. No threshold matching -- just
 * weighted random selection that always succeeds. The lookupIdtOutcome()
 * function implements this exact algorithm.
 *
 * IDT BITMAP GATING (remaining gap):
 * A bitmap at DATA[0x382A] can deactivate individual rows per card value.
 * Without the exact bitmap bytes extracted from WINBB.EXE, we use a
 * full-active approximation (all 9 rows active for all card values).
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
import { BBW_IDT_WEIGHTS } from '../bbw/exe-extractor';

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
 * @deprecated Use lookupIdtOutcome() for BBW-faithful IDT resolution.
 * This legacy function uses all 36 rows with threshold matching, which
 * does not match BBW's actual algorithm (rows 15-23 with BBW_IDT_WEIGHTS).
 *
 * Look up an outcome from the table for a given card value.
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

// ---------------------------------------------------------------------------
// BBW-Faithful IDT Resolution (Ghidra FUN_1058_5f49, lines 151-189)
// ---------------------------------------------------------------------------

/**
 * Result of a BBW-faithful IDT lookup. Always succeeds.
 */
export interface IdtLookupResult {
  /** Always true -- BBW IDT always succeeds */
  success: true;
  /** The outcome category from the selected row */
  outcome: OutcomeCategory;
  /** The IDT row index (15-23) that was selected */
  rowIndex: number;
}

/**
 * IDT active rows 15-23: outcomes paired with BBW frequency weights.
 *
 * BBW uses a SEPARATE weight table at DATA[row + 0x382B] for IDT resolution,
 * NOT the in-table frequencyWeight values. The in-table weights are:
 *   [3, 1, 1, 5, 1, 2, 1, 1, 4] (total=19)
 * but BBW_IDT_WEIGHTS are:
 *   [1, 1, 1, 2, 1, 2, 1, 2, 1] (total=12)
 *
 * Confirmed by Ghidra decompilation: the second loop at lines 171-188 reads
 * `*(char *)(iVar9 + 0x382b)` for each active row's weight.
 */
const IDT_ROWS: readonly { outcomeIndex: number; weight: number }[] = [
  { outcomeIndex: OUTCOME_TABLE[15].outcomeIndex, weight: BBW_IDT_WEIGHTS[0] },  // row 15: WALK (27)
  { outcomeIndex: OUTCOME_TABLE[16].outcomeIndex, weight: BBW_IDT_WEIGHTS[1] },  // row 16: PASSED_BALL (39)
  { outcomeIndex: OUTCOME_TABLE[17].outcomeIndex, weight: BBW_IDT_WEIGHTS[2] },  // row 17: REACHED_ON_ERROR (34)
  { outcomeIndex: OUTCOME_TABLE[18].outcomeIndex, weight: BBW_IDT_WEIGHTS[3] },  // row 18: SPECIAL_EVENT (40)
  { outcomeIndex: OUTCOME_TABLE[19].outcomeIndex, weight: BBW_IDT_WEIGHTS[4] },  // row 19: HOME_RUN_VARIANT (20)
  { outcomeIndex: OUTCOME_TABLE[20].outcomeIndex, weight: BBW_IDT_WEIGHTS[5] },  // row 20: HIT_BY_PITCH (29)
  { outcomeIndex: OUTCOME_TABLE[21].outcomeIndex, weight: BBW_IDT_WEIGHTS[6] },  // row 21: HOME_RUN (19)
  { outcomeIndex: OUTCOME_TABLE[22].outcomeIndex, weight: BBW_IDT_WEIGHTS[7] },  // row 22: FLY_OUT (22)
  { outcomeIndex: OUTCOME_TABLE[23].outcomeIndex, weight: BBW_IDT_WEIGHTS[8] },  // row 23: LINE_OUT (24)
];

/** Total weight across all 9 IDT rows. */
const IDT_TOTAL_WEIGHT = BBW_IDT_WEIGHTS.reduce((sum, w) => sum + w, 0);

/**
 * BBW-faithful IDT outcome resolution.
 *
 * Confirmed by Ghidra decompilation (FUN_1058_5f49, lines 151-189):
 * 1. Accumulates total weight for active rows 15-23 using DATA[row + 0x382B]
 * 2. Generates random(totalWeight)
 * 3. Walks cumulative weights to select row
 * 4. Returns the outcomeIndex for the selected row
 *
 * Key differences from old lookupOutcome():
 * - Only uses rows 15-23 (NOT all 36 rows)
 * - Uses BBW_IDT_WEIGHTS (NOT in-table frequencyWeight)
 * - No threshold matching (BBW just selects and returns)
 * - Always succeeds (no retry/failure path)
 *
 * IDT bitmap gating (DATA[0x382A]) is omitted -- without the exact bytes,
 * all 9 rows are treated as active (full-active approximation).
 *
 * @param rng - Seeded random number generator
 * @returns Always-successful IDT lookup result with outcome and row index
 */
export function lookupIdtOutcome(rng: SeededRNG): IdtLookupResult {
  const target = rng.nextIntExclusive(0, IDT_TOTAL_WEIGHT);

  let cumulative = 0;
  for (let i = 0; i < IDT_ROWS.length; i++) {
    cumulative += IDT_ROWS[i].weight;
    if (target < cumulative) {
      return {
        success: true,
        outcome: IDT_ROWS[i].outcomeIndex as OutcomeCategory,
        rowIndex: 15 + i,
      };
    }
  }

  // Fallback: should never reach here (weights sum to IDT_TOTAL_WEIGHT)
  const lastIdx = IDT_ROWS.length - 1;
  return {
    success: true,
    outcome: IDT_ROWS[lastIdx].outcomeIndex as OutcomeCategory,
    rowIndex: 15 + lastIdx,
  };
}
