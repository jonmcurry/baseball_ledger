/**
 * SERD 5-Column APBA Card Generator
 *
 * Generates cards per the Simulation Engine Reference Document (SERD) approach:
 * one PRNG roll -> one column lookup -> one outcome. The card IS the stat line.
 *
 * Each card has 5 columns (A-E) with 36 OutcomeCategory outcomes per column:
 *   Column A = vs best pitchers (precise control, more outs/Ks)
 *   Column B = vs good pitchers
 *   Column C = vs average pitchers (neutral, matches player's actual MLB rates)
 *   Column D = vs below-average pitchers
 *   Column E = vs worst pitchers (wild, more hits/walks)
 *
 * Pitcher effective grade (1-30 from 6-layer computation in pitching.ts)
 * maps to a column via gradeToColumn().
 */

import { OutcomeCategory } from '../types/game';
import type { ApbaCard, ApbaColumn, PlayerArchetype } from '../types/player';
import type { PlayerRates } from './rate-calculator';

/** Rate multipliers per column. Column C is always 1.0 (neutral). */
export interface RateMultipliers {
  single: number;
  double: number;
  triple: number;
  hr: number;
  walk: number;
  hbp: number;
  strikeout: number;
  error: number;
  dp: number;
}

/**
 * Column multiplier calibration table.
 *
 * These control how pitcher quality shifts batter outcome rates.
 * Column C matches the player's actual MLB rates.
 * Column A suppresses reach-base outcomes (ace pitcher).
 * Column E boosts reach-base outcomes (wild pitcher).
 *
 * The multipliers are symmetric around C so that the weighted average
 * across all columns equals the base rate regardless of pitcher grade
 * distribution.
 */
export const COLUMN_MULTIPLIERS: Record<ApbaColumn, RateMultipliers> = {
  A: { single: 0.55, double: 0.60, triple: 0.50, hr: 0.70, walk: 0.70, hbp: 0.70, strikeout: 1.50, error: 0.80, dp: 1.40 },
  B: { single: 0.72, double: 0.75, triple: 0.70, hr: 0.80, walk: 0.80, hbp: 0.80, strikeout: 1.30, error: 0.88, dp: 1.25 },
  C: { single: 1.00, double: 1.00, triple: 1.00, hr: 1.00, walk: 1.00, hbp: 1.00, strikeout: 1.00, error: 1.00, dp: 1.00 },
  D: { single: 1.06, double: 1.05, triple: 1.05, hr: 1.04, walk: 1.04, hbp: 1.04, strikeout: 0.92, error: 1.03, dp: 0.95 },
  E: { single: 1.15, double: 1.12, triple: 1.10, hr: 1.10, walk: 1.08, hbp: 1.08, strikeout: 0.80, error: 1.08, dp: 0.88 },
};

/** Total outcomes per column (2d6 = 36 equiprobable results). */
const SLOTS_PER_COLUMN = 36;

/**
 * Out type distribution for remaining out slots.
 * Weights must sum to 1.0.
 */
const OUT_TYPE_WEIGHTS: { outcome: OutcomeCategory; weight: number }[] = [
  { outcome: OutcomeCategory.GROUND_OUT, weight: 0.40 },
  { outcome: OutcomeCategory.FLY_OUT, weight: 0.30 },
  { outcome: OutcomeCategory.LINE_OUT, weight: 0.15 },
  { outcome: OutcomeCategory.POP_OUT, weight: 0.10 },
  { outcome: OutcomeCategory.GROUND_OUT_ADVANCE, weight: 0.05 },
];

/**
 * Map pitcher effective grade (1-30) to card column.
 *
 * Grade ranges from pitching.ts computeGameGrade() (6-layer):
 *   1-3   = E (terrible, heavily fatigued)
 *   4-6   = D (below average, tired or weak pitcher)
 *   7-12  = C (average, typical starter mid-game)
 *   13-18 = B (strong, fresh starter or closer)
 *   19-30 = A (elite, ace with fresh/platoon bonuses)
 *
 * Typical grade-8 starter with no bonuses = Column C (neutral).
 * Fresh bonus (+5) or platoon (+2) pushes into B or A.
 * Fatigue drops into D/E for late-game degradation.
 */
export function gradeToColumn(grade: number): ApbaColumn {
  if (grade >= 19) return 'A';
  if (grade >= 13) return 'B';
  if (grade >= 7) return 'C';
  if (grade >= 4) return 'D';
  return 'E';
}

/**
 * Allocate outcome slots for a single column based on adjusted rates.
 *
 * Slots are allocated in priority order. Remaining slots become generic outs
 * distributed according to OUT_TYPE_WEIGHTS.
 */
function allocateColumnSlots(
  rates: PlayerRates,
  column: ApbaColumn,
): OutcomeCategory[] {
  const mult = COLUMN_MULTIPLIERS[column];

  // Compute adjusted slot counts
  const rawWalks = rates.walkRate * mult.walk * SLOTS_PER_COLUMN;
  const rawHbp = rates.hbpRate * mult.hbp * SLOTS_PER_COLUMN;
  const rawStrikeouts = rates.strikeoutRate * mult.strikeout * SLOTS_PER_COLUMN;
  const rawHR = rates.homeRunRate * mult.hr * SLOTS_PER_COLUMN;
  const rawTriples = rates.tripleRate * mult.triple * SLOTS_PER_COLUMN;
  const rawDoubles = rates.doubleRate * mult.double * SLOTS_PER_COLUMN;
  const rawSingles = rates.singleRate * mult.single * SLOTS_PER_COLUMN;
  const rawErrors = (rates.hbpRate > 0 ? 0.02 : 0.015) * mult.error * SLOTS_PER_COLUMN;
  const rawDP = rates.gdpRate * mult.dp * SLOTS_PER_COLUMN;

  // Round with a running remainder for better accuracy
  let remainder = 0;
  function roundWithRemainder(raw: number): number {
    const adjusted = raw + remainder;
    const rounded = Math.round(adjusted);
    remainder = adjusted - rounded;
    return Math.max(0, rounded);
  }

  const walks = roundWithRemainder(rawWalks);
  const hbp = roundWithRemainder(rawHbp);
  const strikeouts = roundWithRemainder(rawStrikeouts);
  const homeRuns = roundWithRemainder(rawHR);
  const triples = roundWithRemainder(rawTriples);
  const doubles = roundWithRemainder(rawDoubles);
  const totalSingles = roundWithRemainder(rawSingles);
  const errors = roundWithRemainder(rawErrors);
  const dp = roundWithRemainder(rawDP);

  // Split singles: 70% SINGLE_CLEAN, 30% SINGLE_ADVANCE
  const singlesAdvance = Math.round(totalSingles * 0.3);
  const singlesClean = totalSingles - singlesAdvance;

  // Split strikeouts: 60% swinging, 40% looking
  const kSwinging = Math.round(strikeouts * 0.6);
  const kLooking = strikeouts - kSwinging;

  // Build outcome array
  const outcomes: OutcomeCategory[] = [];

  function addSlots(outcome: OutcomeCategory, count: number): void {
    for (let i = 0; i < count && outcomes.length < SLOTS_PER_COLUMN; i++) {
      outcomes.push(outcome);
    }
  }

  addSlots(OutcomeCategory.WALK, walks);
  addSlots(OutcomeCategory.HIT_BY_PITCH, hbp);
  addSlots(OutcomeCategory.STRIKEOUT_SWINGING, kSwinging);
  addSlots(OutcomeCategory.STRIKEOUT_LOOKING, kLooking);
  addSlots(OutcomeCategory.HOME_RUN, homeRuns);
  addSlots(OutcomeCategory.TRIPLE, triples);
  addSlots(OutcomeCategory.DOUBLE, doubles);
  addSlots(OutcomeCategory.SINGLE_CLEAN, singlesClean);
  addSlots(OutcomeCategory.SINGLE_ADVANCE, singlesAdvance);
  addSlots(OutcomeCategory.REACHED_ON_ERROR, errors);
  addSlots(OutcomeCategory.DOUBLE_PLAY, dp);

  // Fill remaining with out types
  const remainingSlots = SLOTS_PER_COLUMN - outcomes.length;
  if (remainingSlots > 0) {
    distributeOuts(outcomes, remainingSlots);
  }

  // Truncate if rounding overflowed (shouldn't happen, but safety)
  while (outcomes.length > SLOTS_PER_COLUMN) {
    outcomes.pop();
  }

  return outcomes;
}

/**
 * Distribute remaining out slots according to OUT_TYPE_WEIGHTS.
 */
function distributeOuts(outcomes: OutcomeCategory[], count: number): void {
  let remaining = count;
  for (let i = 0; i < OUT_TYPE_WEIGHTS.length; i++) {
    const entry = OUT_TYPE_WEIGHTS[i];
    const isLast = i === OUT_TYPE_WEIGHTS.length - 1;
    const slots = isLast ? remaining : Math.round(count * entry.weight);
    const actual = Math.min(slots, remaining);
    for (let j = 0; j < actual; j++) {
      outcomes.push(entry.outcome);
    }
    remaining -= actual;
  }
}

/**
 * Deterministic shuffle of outcomes within a column.
 * Uses a simple seeded algorithm based on the column index for variety.
 */
function shuffleColumn(outcomes: OutcomeCategory[], columnSeed: number): void {
  // Fisher-Yates shuffle with simple LCG
  let state = columnSeed;
  for (let i = outcomes.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    const tmp = outcomes[i];
    outcomes[i] = outcomes[j];
    outcomes[j] = tmp;
  }
}

/**
 * Generate a 5-column APBA card from player batting rates.
 *
 * Each column has 36 OutcomeCategory outcomes. Column C matches
 * the player's actual MLB rates. Other columns are shifted by
 * COLUMN_MULTIPLIERS to reflect pitcher quality.
 *
 * @param rates - Player per-PA batting rates (from rate-calculator.ts)
 * @param _archetype - Player archetype (reserved for future per-archetype tuning)
 * @returns 5-column ApbaCard
 */
export function generateApbaCard(
  rates: PlayerRates,
  _archetype: PlayerArchetype,
): ApbaCard {
  const columns: ApbaColumn[] = ['A', 'B', 'C', 'D', 'E'];
  const card: Record<string, OutcomeCategory[]> = {};

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    const outcomes = allocateColumnSlots(rates, col);
    shuffleColumn(outcomes, ci * 7919 + 31);
    card[col] = outcomes;
  }

  return card as ApbaCard;
}

/**
 * Generate a 5-column APBA card for a pitcher batting.
 *
 * Pitchers are terrible hitters: ~85% outs, ~8% K, ~5% walks, ~2% singles.
 */
export function generatePitcherApbaCard(): ApbaCard {
  const pitcherRates: PlayerRates = {
    PA: 100,
    walkRate: 0.05,
    strikeoutRate: 0.30,
    homeRunRate: 0.005,
    singleRate: 0.05,
    doubleRate: 0.01,
    tripleRate: 0.002,
    sbRate: 0,
    iso: 0.020,
    hbpRate: 0.005,
    sfRate: 0.005,
    shRate: 0.05,
    gdpRate: 0.01,
  };

  const pitcherArchetype: PlayerArchetype = { byte33: 0, byte34: 6 };
  return generateApbaCard(pitcherRates, pitcherArchetype);
}
