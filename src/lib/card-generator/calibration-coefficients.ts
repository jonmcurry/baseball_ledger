/**
 * BBW-Calibrated Card Generation Constants
 *
 * Proportional allocation model: count = round(rate * SIMULATION_DRAWABLE_COUNT)
 * with suppression compensation for grade-gated outcomes.
 *
 * Replaces the regression-based model (slopes + intercepts) which inflated hit
 * counts via non-zero intercepts. The proportional model matches real BBW cards
 * within +/-1 position for verified players (Buford, Robinson, Belanger 1971).
 */

import { OutcomeCategory } from '../types/game';
import { CARD_VALUE_TO_OUTCOME } from '../simulation/card-value-fallback';

/**
 * Maximum pitcher grade. BBW uses grades 1-22, not the 1-15 that was
 * previously assumed. Grades > 15 always win the grade gate roll
 * (R2 in [1,15]), providing 100% suppression.
 */
export const MAX_PITCHER_GRADE = 22;

/**
 * Average pitcher grade used for suppression compensation during card generation.
 * A typical MLB season has an average pitcher grade around 8, meaning the pitcher
 * wins the grade check about 53% of the time (8/15).
 */
export const AVG_PITCHER_GRADE = 8;

/**
 * Fraction of card values per outcome type that are grade-gated (suppressed
 * when pitcher wins). Used to compute suppression compensation factors.
 *
 * Singles: values 7, 8 are grade-gated (PITCHER_CHECK_VALUES), value 9 is not.
 *   -> 2 of 3 single values are suppressed = 2/3
 *
 * Triples: value 11 is grade-gated (PITCHER_CHECK_VALUES), value 10 is not.
 *   -> 1 of 2 triple values is suppressed = 1/2
 *
 * All other outcomes (walks, Ks, HRs, doubles) are never grade-gated.
 */
export const SUPPRESSION_FRACTIONS = {
  single: 2 / 3,
  triple: 1 / 2,
} as const;

/**
 * Hit contributions from archetype byte values at positions 33-34.
 *
 * In BBW, archetype bytes double as outcome values when drawn during simulation.
 * The card-value-fallback mapping determines what each byte value produces:
 *   0 -> DOUBLE, 1 -> HOME_RUN, 5 -> HOME_RUN_VARIANT, 7 -> SINGLE_CLEAN,
 *   8 -> SINGLE_CLEAN, others -> GROUND_OUT (default)
 *
 * These contributions must be subtracted from fill targets to avoid double-counting.
 */
export interface ArchetypeHitContribution {
  homeRuns: number;
  doubles: number;
  singles: number;
}

/**
 * Compute hit contributions from a pair of archetype byte values.
 * Uses the same CARD_VALUE_TO_OUTCOME mapping that the simulation engine uses.
 */
export function getArchetypeHitContributions(
  byte33: number,
  byte34: number,
): ArchetypeHitContribution {
  let homeRuns = 0;
  let doubles = 0;
  let singles = 0;

  for (const val of [byte33, byte34]) {
    const outcome = CARD_VALUE_TO_OUTCOME.get(val);
    if (outcome === OutcomeCategory.HOME_RUN || outcome === OutcomeCategory.HOME_RUN_VARIANT) {
      homeRuns++;
    } else if (outcome === OutcomeCategory.DOUBLE) {
      doubles++;
    } else if (outcome === OutcomeCategory.SINGLE_CLEAN || outcome === OutcomeCategory.SINGLE_ADVANCE) {
      singles++;
    }
  }

  return { homeRuns, doubles, singles };
}

/**
 * Calibrated power rating tiers from BBW card[24] vs Lahman ISO analysis.
 *
 * BBW power ratings show weak linear correlation with ISO (r=-0.17), suggesting
 * BBW uses era-relative power assignment or a different metric. The mode-based
 * tiers below are derived from the most common BBW power value in each ISO bucket.
 *
 * Values are IDT-active [13-21] per APBA specification:
 *   13 = none, 15 = minimal, 16 = below avg, 17 = average,
 *   18 = above avg, 19 = good, 20 = very good, 21 = excellent
 */
export const CALIBRATED_POWER_TIERS: readonly { maxISO: number; cardValue: number; label: string }[] = [
  { maxISO: 0.050, cardValue: 18, label: 'No power (BBW mode: 18)' },
  { maxISO: 0.080, cardValue: 18, label: 'Minimal (BBW mode: 18)' },
  { maxISO: 0.110, cardValue: 18, label: 'Below average (BBW mode: 18)' },
  { maxISO: 0.150, cardValue: 20, label: 'Average (BBW mode: 20)' },
  { maxISO: 0.190, cardValue: 20, label: 'Above average (BBW mode: 20)' },
  { maxISO: 0.230, cardValue: 20, label: 'Good (BBW mode: 20)' },
  { maxISO: 0.280, cardValue: 20, label: 'Very good (BBW mode: 20)' },
  { maxISO: Infinity, cardValue: 21, label: 'Excellent' },
];

/**
 * Calibrated archetype thresholds from BBW distribution analysis.
 *
 * Best F1 for power archetype detection: HR >= 18 OR ISO >= 0.170 (F1 = 0.805).
 * Current thresholds: HR >= 25 OR ISO >= 0.230 are too conservative.
 */
export const CALIBRATED_ARCHETYPE = {
  powerHRThreshold: 18,
  powerISOThreshold: 0.170,
  speedSBThreshold: 20,   // Keep current -- matches BBW well
  contactSpeedBAThreshold: 0.280, // Keep current
  contactSpeedSBThreshold: 10,    // Keep current
} as const;
