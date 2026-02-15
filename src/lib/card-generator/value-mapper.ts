import type { CardValue } from '../types';
import type { PlayerRates } from './rate-calculator';
import { getFillablePositions } from './structural';

/**
 * APBA card value constants -- each value maps to an outcome category
 * per the correlation analysis (REQ-DATA-005 Step 3).
 */
export const CARD_VALUES = {
  WALK: 13,           // r=+0.978
  STRIKEOUT: 14,      // r=+0.959
  HOME_RUN: 1,        // r=+0.715
  HOME_RUN_ALT1: 5,   // r=+0.303
  HOME_RUN_ALT2: 37,  // r=+0.301
  HOME_RUN_ALT3: 41,  // r=+0.303
  SINGLE_HIGH: 7,     // r=+0.680 (best contact)
  SINGLE_MID: 8,      // r=+0.565 (standard single)
  SINGLE_LOW: 9,      // r=+0.424 (weak/infield single)
  DOUBLE: 0,          // r=+0.519
  TRIPLE_1: 10,       // r=+0.199
  TRIPLE_2: 11,       // r=+0.227
  SB_OPPORTUNITY: 21, // r=+0.731
  SPEED_1: 23,        // r=+0.738
  SPEED_2: 36,        // r=+0.469
  // Out values (bypass IDT, always outs via direct mapping)
  OUT_GROUND: 30,     // r=-0.484, bypasses IDT (value > 25)
  OUT_CONTACT: 26,    // r=-0.498, bypasses IDT (value > 25)
  OUT_NONWALK: 31,    // r=-0.621, bypasses IDT (value > 25)
  OUT_FLY: 24,        // r=variable, partially IDT-active
  // Mixed "other" values observed on real APBA cards (position-specific)
  POWER_GATE: 33,     // 75% of position 15 in real cards, bypasses IDT -> GROUND_OUT
  SPECIAL_FLAG: 34,   // 70% of position 27 in real cards, bypasses IDT -> GROUND_OUT
  ERROR_REACH: 40,    // Reached on error outcome, bypasses IDT
} as const;

/**
 * Average pitcher hit suppression for card generation compensation.
 *
 * Lahman stats already reflect facing average pitchers. Without compensation,
 * the grade 8 (average) suppression double-counts the pitcher effect,
 * producing BA ~33 points below historical. The card must have MORE hits
 * than the raw rate so that average-grade suppression brings it back to
 * the historical level.
 *
 * With the IDT model, only IDT-active card values (5-25) can be remapped
 * when the pitcher wins the grade check. HRs (value 1) and doubles (value 0)
 * bypass IDT entirely. Empirically measured: ~10% suppression at grade 8
 * (singles suppressed through IDT, HRs/doubles never suppressed).
 */
const AVG_HIT_SUPPRESSION = 0.10;

/**
 * Outcome slot allocation: how many of the 24 fillable positions
 * should hold each outcome value, based on player rates.
 */
export interface SlotAllocation {
  walks: number;
  strikeouts: number;
  homeRuns: number;
  singles: number;    // total singles across quality tiers
  doubles: number;
  triples: number;
  speed: number;      // SB opportunity slots (always 0)
  outs: number;       // remaining positions filled with out values
}

/**
 * Distribute a total count among categories proportionally using the
 * largest remainder method (Hamilton's method). Ensures:
 * 1. The sum of allocated counts exactly equals totalCount
 * 2. Each category gets at least its floor (proportional share rounded down)
 * 3. Remaining positions go to categories with the largest fractional parts
 *
 * @param rawValues - Unrounded proportional values (must sum to ~totalCount)
 * @param totalCount - Target total that the result must sum to
 * @returns Array of integers summing to totalCount
 */
export function distributeByLargestRemainder(
  rawValues: number[],
  totalCount: number,
): number[] {
  const floors = rawValues.map(v => Math.max(0, Math.floor(v)));
  let floorSum = floors.reduce((a, b) => a + b, 0);

  // Clamp if floors already exceed total (shouldn't happen, but safety)
  if (floorSum >= totalCount) {
    // Scale floors down proportionally
    const scale = totalCount / Math.max(1, floorSum);
    const scaled = floors.map(f => Math.floor(f * scale));
    let diff = totalCount - scaled.reduce((a, b) => a + b, 0);
    for (let i = 0; i < scaled.length && diff > 0; i++) {
      scaled[i]++;
      diff--;
    }
    return scaled;
  }

  let remaining = totalCount - floorSum;

  // Build remainder array with original indices
  const remainders = rawValues.map((v, i) => ({
    index: i,
    remainder: v - floors[i],
  }));
  remainders.sort((a, b) => b.remainder - a.remainder);

  // Assign remaining slots to largest remainders
  for (let i = 0; i < remaining && i < remainders.length; i++) {
    floors[remainders[i].index]++;
  }

  return floors;
}

/**
 * Compute how many of the 24 fillable card positions to allocate
 * to each outcome type, based on the player's per-PA rates.
 * (35 total - 9 structural - 2 archetype = 24 fillable positions)
 *
 * Hit compensation: The total number of hit positions is computed by
 * dividing the raw hit rate by (1 - AVG_HIT_SUPPRESSION) to account
 * for the average pitcher grade suppression. This ensures that vs a
 * grade 8 (average) pitcher, the simulation produces batting averages
 * matching the player's historical stats.
 *
 * Walks and strikeouts are allocated at their raw rates (no compensation)
 * because walk suppression is a separate pitcher-control effect and
 * strikeouts are never suppressed.
 */
export function computeSlotAllocation(rates: PlayerRates): SlotAllocation {
  const FILLABLE_COUNT = 24;
  const speed = 0; // Speed handled by player attributes, not card slots

  // Total per-PA hit rate from individual hit categories
  const totalHitRate = rates.singleRate + rates.doubleRate
    + rates.tripleRate + rates.homeRunRate;

  // Compensate total hit positions for average pitcher suppression.
  // Card needs MORE hits than historical rate because average pitcher
  // (grade 8) will suppress ~24% of hits: (8/15) * 0.45.
  const compensatedHitRate = totalHitRate > 0
    ? totalHitRate / (1 - AVG_HIT_SUPPRESSION)
    : 0;
  let totalHitPositions = Math.round(compensatedHitRate * FILLABLE_COUNT);

  // Walks: no compensation (walk suppression models pitcher control separately)
  let walks = Math.round(rates.walkRate * FILLABLE_COUNT);

  // Strikeouts: not suppressed, allocate directly
  let strikeouts = Math.round(rates.strikeoutRate * FILLABLE_COUNT);

  // Ensure at least 1 of major outcomes for qualifying batters
  if (rates.PA > 0) {
    if (walks === 0 && rates.walkRate > 0) walks = 1;
    if (strikeouts === 0 && rates.strikeoutRate > 0) strikeouts = 1;
  }

  // Budget: leave at least 1 out slot
  const budget = FILLABLE_COUNT - 1;
  let allocated = walks + strikeouts + totalHitPositions;

  // If over budget, reduce hits first (they'll be partially suppressed anyway)
  while (allocated > budget && totalHitPositions > 0) {
    totalHitPositions--;
    allocated--;
  }
  // If still over, reduce from largest non-hit category
  while (allocated > budget) {
    if (strikeouts >= walks) strikeouts--;
    else walks--;
    allocated--;
  }

  // Distribute hit positions among categories proportionally (largest remainder)
  let homeRuns = 0;
  let singles = 0;
  let doubles = 0;
  let triples = 0;

  if (totalHitRate > 0 && totalHitPositions > 0) {
    const rawValues = [
      (rates.homeRunRate / totalHitRate) * totalHitPositions,
      (rates.singleRate / totalHitRate) * totalHitPositions,
      (rates.doubleRate / totalHitRate) * totalHitPositions,
      (rates.tripleRate / totalHitRate) * totalHitPositions,
    ];
    const distributed = distributeByLargestRemainder(rawValues, totalHitPositions);
    homeRuns = distributed[0];
    singles = distributed[1];
    doubles = distributed[2];
    triples = distributed[3];
  }

  // Out slots absorb the remainder -- always at least 1 out slot
  const total = walks + strikeouts + homeRuns + singles + doubles + triples;
  const outs = Math.max(1, FILLABLE_COUNT - total);

  return { walks, strikeouts, homeRuns, singles, doubles, triples, speed, outs };
}

/**
 * Split singles count into quality tiers based on BABIP-like distribution.
 * Returns [highQuality(7), standard(8), weak(9)] counts.
 */
export function splitSinglesTiers(totalSingles: number, babip: number): [number, number, number] {
  if (totalSingles === 0) return [0, 0, 0];

  // Higher BABIP -> more hard-hit singles (value 7)
  // Default distribution: 30% high, 45% mid, 25% low
  let highPct = 0.30;
  let midPct = 0.45;

  if (babip > 0.320) {
    highPct = 0.40;
    midPct = 0.40;
  } else if (babip > 0.300) {
    highPct = 0.35;
    midPct = 0.40;
  } else if (babip < 0.260) {
    highPct = 0.20;
    midPct = 0.45;
  }

  const high = Math.round(totalSingles * highPct);
  const mid = Math.round(totalSingles * midPct);
  // Ensure total adds up
  const low = totalSingles - high - mid;

  return [Math.max(0, high), Math.max(0, mid), Math.max(0, low)];
}

/**
 * Fill the 24 fillable variable positions of a 35-element card array
 * with outcome values based on the slot allocation (REQ-DATA-005 Step 3).
 *
 * Fills only the 24 non-structural, non-archetype positions.
 * Archetype positions 33-34 are set separately by the generator.
 * The card array must already have structural constants applied.
 * Mutates and returns the card.
 */
export function fillVariablePositions(
  card: CardValue[],
  allocation: SlotAllocation,
  babip: number,
): CardValue[] {
  const fillablePositions = getFillablePositions();
  let posIdx = 0;

  // Fill walks (value 13)
  for (let i = 0; i < allocation.walks && posIdx < fillablePositions.length; i++) {
    card[fillablePositions[posIdx++]] = CARD_VALUES.WALK;
  }

  // Fill strikeouts (value 14)
  for (let i = 0; i < allocation.strikeouts && posIdx < fillablePositions.length; i++) {
    card[fillablePositions[posIdx++]] = CARD_VALUES.STRIKEOUT;
  }

  // Fill home runs (value 1, overflow to 5/37/41)
  const hrValues = [CARD_VALUES.HOME_RUN, CARD_VALUES.HOME_RUN_ALT1, CARD_VALUES.HOME_RUN_ALT2, CARD_VALUES.HOME_RUN_ALT3];
  for (let i = 0; i < allocation.homeRuns && posIdx < fillablePositions.length; i++) {
    card[fillablePositions[posIdx++]] = hrValues[Math.min(i, hrValues.length - 1)];
  }

  // Fill singles split by quality
  const [high, mid, low] = splitSinglesTiers(allocation.singles, babip);
  for (let i = 0; i < high && posIdx < fillablePositions.length; i++) {
    card[fillablePositions[posIdx++]] = CARD_VALUES.SINGLE_HIGH;
  }
  for (let i = 0; i < mid && posIdx < fillablePositions.length; i++) {
    card[fillablePositions[posIdx++]] = CARD_VALUES.SINGLE_MID;
  }
  for (let i = 0; i < low && posIdx < fillablePositions.length; i++) {
    card[fillablePositions[posIdx++]] = CARD_VALUES.SINGLE_LOW;
  }

  // Fill doubles (value 0)
  for (let i = 0; i < allocation.doubles && posIdx < fillablePositions.length; i++) {
    card[fillablePositions[posIdx++]] = CARD_VALUES.DOUBLE;
  }

  // Fill triples (value 10/11)
  const tripleValues = [CARD_VALUES.TRIPLE_1, CARD_VALUES.TRIPLE_2];
  for (let i = 0; i < allocation.triples && posIdx < fillablePositions.length; i++) {
    card[fillablePositions[posIdx++]] = tripleValues[Math.min(i, tripleValues.length - 1)];
  }

  // Fill remaining with out values.
  // All out values produce outs via direct mapping. No ROE in mix --
  // errors are handled by the defense module's checkForError() in the game runner.
  const outMixValues = [
    CARD_VALUES.OUT_GROUND,    // 30 - ground out advance
    CARD_VALUES.OUT_CONTACT,   // 26 - ground out
    CARD_VALUES.POWER_GATE,    // 33 - ground out (default mapping)
    CARD_VALUES.OUT_NONWALK,   // 31 - fly out
    CARD_VALUES.SPECIAL_FLAG,  // 34 - ground out (default mapping)
    CARD_VALUES.OUT_GROUND,    // 30 - repeat
    CARD_VALUES.OUT_CONTACT,   // 26 - repeat
    CARD_VALUES.OUT_FLY,       // 24 - line out
    CARD_VALUES.OUT_NONWALK,   // 31 - fly out
    CARD_VALUES.OUT_GROUND,    // 30 - repeat
  ];
  let outIdx = 0;
  while (posIdx < fillablePositions.length) {
    card[fillablePositions[posIdx++]] = outMixValues[outIdx % outMixValues.length];
    outIdx++;
  }

  return card;
}
