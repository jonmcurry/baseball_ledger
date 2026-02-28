import { MAX_PITCHER_GRADE } from './calibration-coefficients';

/**
 * Absolute ERA-to-Grade mapping (REQ-DATA-005a).
 *
 * Grades are assigned on an absolute ERA scale so that a 2.00 ERA pitcher
 * always gets a high grade regardless of who else is in the draft pool.
 * This prevents the "all-star pool problem" where elite pitchers get
 * neutral grades because they're only average *within* an elite pool.
 *
 * The grade determines which column (A-E) of the batter's SERD card is
 * read during plate appearance resolution via gradeToColumn():
 *   Grade 20+ -> Column A (elite suppression)
 *   Grade 15-19 -> Column B (strong suppression)
 *   Grade 7-14 -> Column C (neutral)
 *   Grade 4-6 -> Column D (offense boost)
 *   Grade 1-3 -> Column E (heavy offense boost)
 *
 * ERA thresholds are based on historical MLB norms:
 *   - Sub-2.00 ERA seasons are historically elite (Pedro 2000, Gibson 1968)
 *   - 2.50-3.20 ERA is a strong starter in most eras
 *   - 3.20-4.50 ERA covers the broad middle of MLB pitchers
 *   - Above 5.50 ERA is replacement level or worse
 */
const ERA_TO_GRADE_THRESHOLDS: readonly { maxERA: number; grade: number }[] = [
  { maxERA: 1.50, grade: MAX_PITCHER_GRADE },  // 22 - Historic (Gibson 1968, Pedro 2000)
  { maxERA: 1.80, grade: 21 },                  // Dominant
  { maxERA: 2.00, grade: 20 },                  // Elite+
  { maxERA: 2.20, grade: 19 },                  // Elite
  { maxERA: 2.40, grade: 18 },                  // Near-elite
  { maxERA: 2.60, grade: 17 },                  // Ace+
  { maxERA: 2.80, grade: 16 },                  // Ace
  { maxERA: 3.00, grade: 15 },                  // Strong ace
  { maxERA: 3.20, grade: 14 },                  // Elite starter
  { maxERA: 3.50, grade: 13 },                  // #1 starter
  { maxERA: 3.80, grade: 12 },                  // Strong starter
  { maxERA: 4.00, grade: 11 },                  // Above average
  { maxERA: 4.20, grade: 10 },                  // Solid starter
  { maxERA: 4.50, grade: 9 },                   // Average starter
  { maxERA: 4.80, grade: 8 },                   // Below average
  { maxERA: 5.00, grade: 7 },                   // Back-end starter
  { maxERA: 5.20, grade: 6 },                   // Spot starter
  { maxERA: 5.50, grade: 5 },                   // Middle reliever
  { maxERA: 5.80, grade: 4 },                   // Low-leverage
  { maxERA: 6.20, grade: 3 },                   // Mop-up duty
  { maxERA: 7.00, grade: 2 },                   // Emergency only
  { maxERA: Infinity, grade: 1 },                // Worst qualifier
];

/**
 * Map an ERA value to the 1-22 grade scale using absolute thresholds.
 * Lower ERA = higher grade. Grade determines SERD column selection.
 */
export function eraToGrade(era: number): number {
  for (const threshold of ERA_TO_GRADE_THRESHOLDS) {
    if (era <= threshold.maxERA) {
      return threshold.grade;
    }
  }
  return 1;
}

/**
 * Compute a pitcher's grade from their ERA using the absolute scale.
 *
 * @param pitcherERA - The pitcher's ERA
 * @param _allERAs - Deprecated, ignored. Kept for call-site compatibility during migration.
 * @returns Grade 1-22 (22 = best)
 */
export function computePitcherGrade(pitcherERA: number, _allERAs?: number[]): number {
  return eraToGrade(pitcherERA);
}

// --- Legacy functions kept for backwards compatibility with existing tests ---

/**
 * @deprecated Use eraToGrade() instead. Pool-relative grading causes the
 * all-star pool problem where elite pitchers get neutral grades.
 */
const GRADE_PERCENTILE_THRESHOLDS: readonly { maxPercentile: number; grade: number }[] = [
  { maxPercentile: 0.005, grade: MAX_PITCHER_GRADE },
  { maxPercentile: 0.010, grade: 21 },
  { maxPercentile: 0.015, grade: 20 },
  { maxPercentile: 0.020, grade: 19 },
  { maxPercentile: 0.025, grade: 18 },
  { maxPercentile: 0.030, grade: 17 },
  { maxPercentile: 0.040, grade: 16 },
  { maxPercentile: 0.07, grade: 15 },
  { maxPercentile: 0.10, grade: 14 },
  { maxPercentile: 0.15, grade: 13 },
  { maxPercentile: 0.22, grade: 12 },
  { maxPercentile: 0.30, grade: 11 },
  { maxPercentile: 0.40, grade: 10 },
  { maxPercentile: 0.50, grade: 9 },
  { maxPercentile: 0.60, grade: 8 },
  { maxPercentile: 0.70, grade: 7 },
  { maxPercentile: 0.80, grade: 6 },
  { maxPercentile: 0.87, grade: 5 },
  { maxPercentile: 0.93, grade: 4 },
  { maxPercentile: 0.97, grade: 3 },
  { maxPercentile: 0.99, grade: 2 },
  { maxPercentile: 1.00, grade: 1 },
];

/**
 * @deprecated Use eraToGrade() instead.
 */
export function computeERAPercentile(pitcherERA: number, allERAs: number[]): number {
  if (allERAs.length === 0) return 0.49;
  if (allERAs.length === 1) return 0.49;
  let betterCount = 0;
  for (const era of allERAs) {
    if (era < pitcherERA) {
      betterCount++;
    }
  }
  return betterCount / allERAs.length;
}

/**
 * @deprecated Use eraToGrade() instead.
 */
export function percentileToGrade(percentile: number): number {
  for (const threshold of GRADE_PERCENTILE_THRESHOLDS) {
    if (percentile < threshold.maxPercentile) {
      return threshold.grade;
    }
  }
  return 1;
}
