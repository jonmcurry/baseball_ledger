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
 * Average EFFECTIVE pitcher grade used for suppression compensation.
 *
 * The base league-average grade is ~8, but the 5-layer grade system adds
 * a platoon adjustment of +2 for same-hand matchups (Layer 4). With ~55%
 * of PAs being same-hand (RH pitcher vs RH batter), the average platoon
 * boost is ~1.1. We use 9 as the average effective grade to account for
 * this in-game adjustment, so card compensation produces correct stat
 * lines after all 5 grade layers are applied.
 */
const AVG_PITCHER_GRADE = 9;

/**
 * Probability that an average pitcher wins the grade check.
 * Only card values in {7, 8, 11} are suppressed (converted to outs)
 * when the pitcher wins. Values like 0 (double), 1 (HR), 9 (single),
 * 10 (triple), 13 (walk), 14 (K) are never suppressed.
 */
const AVG_SUPPRESSION_PROB = AVG_PITCHER_GRADE / 15;

/**
 * Fraction of single positions using suppressable values (7, 8).
 * Remaining fraction uses non-suppressable value 9.
 * Matches the default splitSinglesTiers distribution (~75% high+mid).
 */
const SUPPRESSABLE_SINGLE_FRACTION = 0.75;

/**
 * Fraction of triple positions using suppressable value (11).
 * Remaining fraction uses non-suppressable value 10.
 */
const SUPPRESSABLE_TRIPLE_FRACTION = 0.50;

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
 * Per-type hit compensation: Only card values {7, 8, 11} are suppressed
 * by the pitcher grade check (converted to outs when pitcher wins).
 * Values 0 (double), 1 (HR), 9 (single), 10 (triple) are NEVER suppressed.
 *
 * For suppressable types (singles on 7/8, triples on 11), the card needs
 * more positions than the raw rate so that after average-grade suppression
 * (8/15 probability), the effective rate matches the player's historical
 * stats. Non-suppressable types use raw rates with no inflation.
 *
 * Walks and strikeouts are allocated at their raw rates (no compensation)
 * because walks are never grade-gated and strikeouts are never suppressed.
 */
export function computeSlotAllocation(rates: PlayerRates): SlotAllocation {
  const FILLABLE_COUNT = 24;
  const speed = 0; // Speed handled by player attributes, not card slots

  // Walks: no compensation (never grade-gated)
  let walks = Math.round(rates.walkRate * FILLABLE_COUNT);

  // Strikeouts: no compensation (never suppressed)
  let strikeouts = Math.round(rates.strikeoutRate * FILLABLE_COUNT);

  // Ensure at least 1 of major outcomes for qualifying batters
  if (rates.PA > 0) {
    if (walks === 0 && rates.walkRate > 0) walks = 1;
    if (strikeouts === 0 && rates.strikeoutRate > 0) strikeouts = 1;
  }

  // Per-type hit compensation.
  // Only card values {7, 8, 11} are suppressed by pitcher grade check.
  // Effective rate per card position accounts for the suppression mix:
  //   effectiveRate = suppressableFrac * (1 - suppProb) + nonSuppressableFrac
  // Card positions needed = (targetRate * 24) / effectiveRate

  const singleEffRate = SUPPRESSABLE_SINGLE_FRACTION * (1 - AVG_SUPPRESSION_PROB)
    + (1 - SUPPRESSABLE_SINGLE_FRACTION);
  const tripleEffRate = SUPPRESSABLE_TRIPLE_FRACTION * (1 - AVG_SUPPRESSION_PROB)
    + (1 - SUPPRESSABLE_TRIPLE_FRACTION);

  // HRs (value 1) and doubles (value 0): never suppressed, raw rate
  const rawHRs = rates.homeRunRate * FILLABLE_COUNT;
  const rawDoubles = rates.doubleRate * FILLABLE_COUNT;
  // Singles (values 7/8/9): compensate for 75% suppressable fraction
  const rawSingles = rates.singleRate > 0
    ? (rates.singleRate * FILLABLE_COUNT) / singleEffRate
    : 0;
  // Triples (values 10/11): compensate for 50% suppressable fraction
  const rawTriples = rates.tripleRate > 0
    ? (rates.tripleRate * FILLABLE_COUNT) / tripleEffRate
    : 0;

  // Total hit positions needed on card
  const rawHitTotal = rawHRs + rawSingles + rawDoubles + rawTriples;
  let hitPositions = Math.round(rawHitTotal);

  // Budget: leave at least 1 out slot after walks + Ks
  let budget = FILLABLE_COUNT - walks - strikeouts - 1;
  if (budget < 0) {
    // Extreme case: walks + Ks fill the card; reduce from largest
    while (walks + strikeouts > FILLABLE_COUNT - 1) {
      if (strikeouts >= walks) strikeouts--;
      else walks--;
    }
    budget = FILLABLE_COUNT - walks - strikeouts - 1;
  }
  hitPositions = Math.min(hitPositions, Math.max(0, budget));

  // Distribute hit positions among types proportionally (largest remainder)
  let homeRuns = 0;
  let singles = 0;
  let doubles = 0;
  let triples = 0;

  if (rawHitTotal > 0 && hitPositions > 0) {
    const rawValues = [rawHRs, rawSingles, rawDoubles, rawTriples];
    const distributed = distributeByLargestRemainder(rawValues, hitPositions);
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
