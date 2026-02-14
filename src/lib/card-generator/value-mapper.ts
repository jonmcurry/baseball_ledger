import type { CardValue } from '../types';
import type { PlayerRates } from './rate-calculator';
import { getVariablePositions } from './structural';

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
  // Out values
  OUT_GROUND: 30,     // r=-0.484
  OUT_CONTACT: 26,    // r=-0.498
  OUT_NONWALK: 31,    // r=-0.621
  OUT_FLY: 24,        // r=variable
} as const;

/**
 * Scale factors for mapping rates to card position counts.
 * Higher scale = more card positions allocated for that outcome.
 */
const SCALE_FACTORS = {
  walk: 1.0,
  strikeout: 1.0,
  homeRun: 1.0,
  single: 1.0,
  double: 1.0,
  triple: 1.0,
} as const;

/**
 * Outcome slot allocation: how many of the 26 variable positions
 * should hold each outcome value, based on player rates.
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
 * Compute how many of the 26 variable card positions to allocate
 * to each outcome type, based on the player's per-PA rates.
 */
export function computeSlotAllocation(rates: PlayerRates): SlotAllocation {
  const VARIABLE_COUNT = 26;

  // Raw (unrounded) slot counts based on rate * scale * variable positions
  const rawWalks = rates.walkRate * SCALE_FACTORS.walk * VARIABLE_COUNT;
  const rawStrikeouts = rates.strikeoutRate * SCALE_FACTORS.strikeout * VARIABLE_COUNT;
  const rawHomeRuns = rates.homeRunRate * SCALE_FACTORS.homeRun * VARIABLE_COUNT;
  const rawSingles = rates.singleRate * SCALE_FACTORS.single * VARIABLE_COUNT;
  const rawDoubles = rates.doubleRate * SCALE_FACTORS.double * VARIABLE_COUNT;
  const rawTriples = rates.tripleRate * SCALE_FACTORS.triple * VARIABLE_COUNT;

  // Speed slots: 0-3 based on steal rate and volume
  const rawSpeed = rates.sbRate >= 0.75 ? 3 : rates.sbRate >= 0.50 ? 2 : rates.sbRate > 0 ? 1 : 0;

  // Round all positive outcome slots
  let walks = Math.round(rawWalks);
  let strikeouts = Math.round(rawStrikeouts);
  let homeRuns = Math.round(rawHomeRuns);
  let singles = Math.round(rawSingles);
  let doubles = Math.round(rawDoubles);
  let triples = Math.round(rawTriples);
  const speed = rawSpeed;

  // Ensure at least 1 of major outcomes for qualifying batters
  if (rates.PA > 0) {
    if (walks === 0 && rates.walkRate > 0) walks = 1;
    if (strikeouts === 0 && rates.strikeoutRate > 0) strikeouts = 1;
  }

  // Calculate total allocated
  let total = walks + strikeouts + homeRuns + singles + doubles + triples + speed;

  // If we exceed 26, scale down proportionally (out slots must exist)
  if (total > VARIABLE_COUNT - 1) {
    const scale = (VARIABLE_COUNT - 1) / total;
    walks = Math.round(walks * scale);
    strikeouts = Math.round(strikeouts * scale);
    homeRuns = Math.round(homeRuns * scale);
    singles = Math.round(singles * scale);
    doubles = Math.round(doubles * scale);
    triples = Math.round(triples * scale);
    total = walks + strikeouts + homeRuns + singles + doubles + triples + speed;
  }

  // Out slots absorb the remainder
  const outs = Math.max(0, VARIABLE_COUNT - total);

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
 * Fill the 26 variable positions of a 35-element card array
 * with outcome values based on the slot allocation (REQ-DATA-005 Step 3).
 *
 * The card array must already have structural constants applied.
 * Mutates and returns the card.
 */
export function fillVariablePositions(
  card: CardValue[],
  allocation: SlotAllocation,
  babip: number,
): CardValue[] {
  const variablePositions = getVariablePositions();
  let posIdx = 0;

  // Fill walks (value 13)
  for (let i = 0; i < allocation.walks && posIdx < variablePositions.length; i++) {
    card[variablePositions[posIdx++]] = CARD_VALUES.WALK;
  }

  // Fill strikeouts (value 14)
  for (let i = 0; i < allocation.strikeouts && posIdx < variablePositions.length; i++) {
    card[variablePositions[posIdx++]] = CARD_VALUES.STRIKEOUT;
  }

  // Fill home runs (value 1, overflow to 5/37/41)
  const hrValues = [CARD_VALUES.HOME_RUN, CARD_VALUES.HOME_RUN_ALT1, CARD_VALUES.HOME_RUN_ALT2, CARD_VALUES.HOME_RUN_ALT3];
  for (let i = 0; i < allocation.homeRuns && posIdx < variablePositions.length; i++) {
    card[variablePositions[posIdx++]] = hrValues[Math.min(i, hrValues.length - 1)];
  }

  // Fill singles split by quality
  const [high, mid, low] = splitSinglesTiers(allocation.singles, babip);
  for (let i = 0; i < high && posIdx < variablePositions.length; i++) {
    card[variablePositions[posIdx++]] = CARD_VALUES.SINGLE_HIGH;
  }
  for (let i = 0; i < mid && posIdx < variablePositions.length; i++) {
    card[variablePositions[posIdx++]] = CARD_VALUES.SINGLE_MID;
  }
  for (let i = 0; i < low && posIdx < variablePositions.length; i++) {
    card[variablePositions[posIdx++]] = CARD_VALUES.SINGLE_LOW;
  }

  // Fill doubles (value 0)
  for (let i = 0; i < allocation.doubles && posIdx < variablePositions.length; i++) {
    card[variablePositions[posIdx++]] = CARD_VALUES.DOUBLE;
  }

  // Fill triples (value 10/11)
  const tripleValues = [CARD_VALUES.TRIPLE_1, CARD_VALUES.TRIPLE_2];
  for (let i = 0; i < allocation.triples && posIdx < variablePositions.length; i++) {
    card[variablePositions[posIdx++]] = tripleValues[Math.min(i, tripleValues.length - 1)];
  }

  // Fill speed slots (values 21, 23, 36)
  const speedValues = [CARD_VALUES.SB_OPPORTUNITY, CARD_VALUES.SPEED_1, CARD_VALUES.SPEED_2];
  for (let i = 0; i < allocation.speed && posIdx < variablePositions.length; i++) {
    card[variablePositions[posIdx++]] = speedValues[Math.min(i, speedValues.length - 1)];
  }

  // Fill remaining with out values (rotating through out types)
  const outValues = [CARD_VALUES.OUT_GROUND, CARD_VALUES.OUT_CONTACT, CARD_VALUES.OUT_NONWALK, CARD_VALUES.OUT_FLY];
  let outIdx = 0;
  while (posIdx < variablePositions.length) {
    card[variablePositions[posIdx++]] = outValues[outIdx % outValues.length];
    outIdx++;
  }

  return card;
}
