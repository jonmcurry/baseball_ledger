import type { CardValue } from '../types';
import type { PlayerRates } from './rate-calculator';
import { getOutcomePositions, OUTCOME_POSITION_COUNT } from './structural';
import { CALIBRATED_SLOPES, CALIBRATED_INTERCEPTS } from './calibration-coefficients';

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
 * Shorthand aliases for calibrated regression coefficients.
 * These replace the old ad-hoc constants (CARD_K_FACTOR, CARD_DOUBLES_FACTOR,
 * AVG_SUPPRESSION_PROB, etc.) with values derived from BBW binary card analysis.
 *
 * The regression naturally absorbs suppression compensation: it was fit against
 * real BBW card counts, which already reflect the interplay between card values
 * and the simulation's pitcher grade gate.
 */
const SLOPES = CALIBRATED_SLOPES;
const INTERCEPTS = CALIBRATED_INTERCEPTS;

/**
 * Outcome slot allocation: how many of the 20 outcome positions
 * should hold each outcome value, based on player rates.
 *
 * Excludes 15 pre-set positions:
 *   9 structural, 2 archetype, 1 power (pos 24), 3 gates (pos 0/15/20)
 *
 * Gate position pre-sets contribute 1 walk OR 1 K (position 0),
 * 1 K (position 20), and 1 out (position 15). These are accounted for
 * in the allocation so total card composition is correct.
 */
export interface SlotAllocation {
  walks: number;
  strikeouts: number;
  homeRuns: number;
  singles: number;    // total singles across quality tiers
  doubles: number;
  triples: number;
  speed: number;      // SB opportunity slots
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
 * Compute how many of the 20 outcome positions to allocate to each
 * outcome type, based on the player's per-PA rates.
 *
 * Uses regression-calibrated coefficients derived from BBW binary card analysis
 * (3 seasons, 535 matched batters). Each outcome count is predicted by:
 *   count = SLOPE * lahman_rate + INTERCEPT
 *
 * The regression naturally captures BBW's suppression compensation because it
 * was fit against real BBW card counts that already reflect the interplay
 * between card values and the pitcher grade gate.
 *
 * Total card: 35 positions
 *   - 9 structural constants (fixed values)
 *   - 2 archetype flags (bytes 33-34)
 *   - 1 power rating (position 24, set separately)
 *   - 3 gate positions (pos 0, 15, 20, pre-set)
 *   = 20 outcome positions for sequential fill
 */
export function computeSlotAllocation(
  rates: PlayerRates,
  gateWalkCount: number = 0,
  gateKCount: number = 0,
): SlotAllocation {
  const FILL_COUNT = OUTCOME_POSITION_COUNT; // 20
  const speed = 0; // Speed slots handled post-allocation in fillVariablePositions

  // Zero-PA players (no stats) get all-out cards
  if (rates.PA === 0) {
    return { walks: 0, strikeouts: 0, homeRuns: 0, singles: 0, doubles: 0, triples: 0, speed: 0, outs: FILL_COUNT };
  }

  // Regression-based total counts across all drawable positions.
  // The regression intercepts provide baseline counts even at zero rate,
  // matching BBW's behavior where every batter gets some walks/Ks on their card.
  let totalWalks = Math.round(
    Math.max(0, SLOPES.walk * rates.walkRate + INTERCEPTS.walk),
  );
  let totalKs = Math.round(
    Math.max(0, SLOPES.strikeout * rates.strikeoutRate + INTERCEPTS.strikeout),
  );

  // Ensure at least 1 of major outcomes for qualifying batters
  if (rates.PA > 0) {
    if (totalWalks === 0 && rates.walkRate > 0) totalWalks = 1;
    if (totalKs === 0 && rates.strikeoutRate > 0) totalKs = 1;
  }

  // Subtract gate pre-sets from the fill allocation
  let walks = Math.max(0, totalWalks - gateWalkCount);
  let strikeouts = Math.max(0, totalKs - gateKCount);

  // Hit counts from regression (already incorporates suppression compensation)
  const rawHRs = Math.max(0, SLOPES.homeRun * rates.homeRunRate + INTERCEPTS.homeRun);
  const rawSingles = Math.max(0, SLOPES.single * rates.singleRate + INTERCEPTS.single);
  const rawDoubles = Math.max(0, SLOPES.double * rates.doubleRate + INTERCEPTS.double);
  const rawTriples = Math.max(0, SLOPES.triple * rates.tripleRate + INTERCEPTS.triple);

  const rawHitTotal = rawHRs + rawSingles + rawDoubles + rawTriples;
  let hitPositions = Math.round(rawHitTotal);

  // Budget: leave at least 1 out slot in the 20 fill positions
  let budget = FILL_COUNT - walks - strikeouts - 1;
  if (budget < 0) {
    while (walks + strikeouts > FILL_COUNT - 1) {
      if (strikeouts >= walks) strikeouts--;
      else walks--;
    }
    budget = FILL_COUNT - walks - strikeouts - 1;
  }
  hitPositions = Math.min(hitPositions, Math.max(0, budget));

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

  const total = walks + strikeouts + homeRuns + singles + doubles + triples;
  const outs = Math.max(1, FILL_COUNT - total);

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
 * Pre-set gate positions on the card before outcome fill.
 *
 * Per BBW card analysis (828 cards, 1971 season):
 *   Position 0: value 13 (41%) or 14 (32%) -- primary outcome gate
 *   Position 15: value 33 (75%) -- power gate
 *   Position 20: value 14 (94%) -- strikeout gate
 *
 * Returns counts of pre-set walks and Ks for allocation adjustment.
 */
export function applyGateValues(
  card: CardValue[],
  walkRate: number,
  strikeoutRate: number,
  iso: number,
): { gateWalkCount: number; gateKCount: number } {
  let gateWalkCount = 0;
  let gateKCount = 0;

  // Position 0: primary gate -- walk-heavy batters get 13, K-heavy get 14
  if (walkRate > strikeoutRate) {
    card[0] = CARD_VALUES.WALK;
    gateWalkCount++;
  } else {
    card[0] = CARD_VALUES.STRIKEOUT;
    gateKCount++;
  }

  // Position 15: power gate -- 33 for low-power, otherwise use walk/K
  if (iso < 0.150) {
    card[15] = CARD_VALUES.POWER_GATE; // value 33 -> ground out
  } else {
    card[15] = CARD_VALUES.POWER_GATE; // still 33 for consistency
  }

  // Position 20: strikeout gate -- always 14 (94% in BBW)
  card[20] = CARD_VALUES.STRIKEOUT;
  gateKCount++;

  return { gateWalkCount, gateKCount };
}

/**
 * Fill the 20 outcome positions of a 35-element card array with outcome
 * values based on the slot allocation (REQ-DATA-005 Step 3).
 *
 * Fills only the 20 positions that are not structural, archetype, power,
 * or gate positions. Gate positions (0, 15, 20) and power position (24)
 * are set separately. Archetype positions 33-34 are set by the generator.
 *
 * The card array must already have structural constants and gate values applied.
 * Mutates and returns the card.
 *
 * @param speed - Player speed rating (0-1) for SB card value placement
 */
export function fillVariablePositions(
  card: CardValue[],
  allocation: SlotAllocation,
  babip: number,
  speed: number = 0,
): CardValue[] {
  const outcomePositions = getOutcomePositions();
  let posIdx = 0;

  // Fill walks (value 13)
  for (let i = 0; i < allocation.walks && posIdx < outcomePositions.length; i++) {
    card[outcomePositions[posIdx++]] = CARD_VALUES.WALK;
  }

  // Fill strikeouts (value 14)
  for (let i = 0; i < allocation.strikeouts && posIdx < outcomePositions.length; i++) {
    card[outcomePositions[posIdx++]] = CARD_VALUES.STRIKEOUT;
  }

  // Fill home runs (value 1, overflow to 5/37/41)
  const hrValues = [CARD_VALUES.HOME_RUN, CARD_VALUES.HOME_RUN_ALT1, CARD_VALUES.HOME_RUN_ALT2, CARD_VALUES.HOME_RUN_ALT3];
  for (let i = 0; i < allocation.homeRuns && posIdx < outcomePositions.length; i++) {
    card[outcomePositions[posIdx++]] = hrValues[Math.min(i, hrValues.length - 1)];
  }

  // Fill singles split by quality
  const [high, mid, low] = splitSinglesTiers(allocation.singles, babip);
  for (let i = 0; i < high && posIdx < outcomePositions.length; i++) {
    card[outcomePositions[posIdx++]] = CARD_VALUES.SINGLE_HIGH;
  }
  for (let i = 0; i < mid && posIdx < outcomePositions.length; i++) {
    card[outcomePositions[posIdx++]] = CARD_VALUES.SINGLE_MID;
  }
  for (let i = 0; i < low && posIdx < outcomePositions.length; i++) {
    card[outcomePositions[posIdx++]] = CARD_VALUES.SINGLE_LOW;
  }

  // Fill doubles (value 0)
  for (let i = 0; i < allocation.doubles && posIdx < outcomePositions.length; i++) {
    card[outcomePositions[posIdx++]] = CARD_VALUES.DOUBLE;
  }

  // Fill triples (value 10/11)
  const tripleValues = [CARD_VALUES.TRIPLE_1, CARD_VALUES.TRIPLE_2];
  for (let i = 0; i < allocation.triples && posIdx < outcomePositions.length; i++) {
    card[outcomePositions[posIdx++]] = tripleValues[Math.min(i, tripleValues.length - 1)];
  }

  // Fill remaining with out values
  const outMixValues = [
    CARD_VALUES.OUT_GROUND,    // 30 - ground out advance
    CARD_VALUES.OUT_CONTACT,   // 26 - ground out
    CARD_VALUES.OUT_NONWALK,   // 31 - fly out
    CARD_VALUES.SPECIAL_FLAG,  // 34 - ground out (default mapping)
    CARD_VALUES.OUT_GROUND,    // 30 - repeat
    CARD_VALUES.OUT_CONTACT,   // 26 - repeat
    CARD_VALUES.OUT_NONWALK,   // 31 - fly out
    CARD_VALUES.OUT_GROUND,    // 30 - repeat
  ];
  let outIdx = 0;
  while (posIdx < outcomePositions.length) {
    card[outcomePositions[posIdx++]] = outMixValues[outIdx % outMixValues.length];
    outIdx++;
  }

  // Speed/SB card values: replace trailing out positions for fast players.
  // Per BBW, values 21 (SB opportunity), 23 (speed), 36 (running play)
  // appear on fast players' cards.
  if (speed >= 0.6) {
    const speedValues: number[] = [CARD_VALUES.SB_OPPORTUNITY]; // value 21
    if (speed >= 0.7) speedValues.push(CARD_VALUES.SPEED_2); // value 36
    if (speed >= 0.8) speedValues.push(CARD_VALUES.SPEED_1); // value 23

    // Replace the last N out positions with speed values
    for (let i = 0; i < speedValues.length; i++) {
      // Walk backwards from the end to find out positions to replace
      for (let j = outcomePositions.length - 1; j >= 0; j--) {
        const pos = outcomePositions[j];
        const val = card[pos];
        // Only replace out-type values
        if (val === CARD_VALUES.OUT_GROUND || val === CARD_VALUES.OUT_CONTACT
          || val === CARD_VALUES.OUT_NONWALK || val === CARD_VALUES.SPECIAL_FLAG) {
          card[pos] = speedValues[i];
          break;
        }
      }
    }
  }

  return card;
}
