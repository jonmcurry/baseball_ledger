import { MAX_PITCHER_GRADE } from './calibration-coefficients';

/**
 * Pitcher grade percentile thresholds (REQ-DATA-005a).
 *
 * 1-22 grade scale matching BBW's observed distribution.
 * Grade 22 = best (top 0.5%), Grade 1 = worst (bottom 1%).
 * Lower ERA = better pitcher = higher grade.
 *
 * ERA Percentile | Grade | Description
 * Top 0.5%       | 22    | Historic ace
 * Top 1.0%       | 21    | Dominant
 * Top 1.5%       | 20    | Elite+
 * Top 2.0%       | 19    | Elite
 * Top 2.5%       | 18    | Near-elite
 * Top 3.0%       | 17    | Ace+
 * Top 4.0%       | 16    | Ace
 * Top 7%         | 15    | Strong ace
 * Top 10%        | 14    | Elite starter
 * Top 15%        | 13    | #1 starter
 * Top 22%        | 12    | Strong starter
 * Top 30%        | 11    | Above average
 * Top 40%        | 10    | Solid starter
 * Top 50%        | 9     | Average starter
 * Top 60%        | 8     | Below average starter
 * Top 70%        | 7     | Back-end starter
 * Top 80%        | 6     | Spot starter/long relief
 * Top 87%        | 5     | Middle reliever
 * Top 93%        | 4     | Low-leverage relief
 * Top 97%        | 3     | Mop-up duty
 * Top 99%        | 2     | Emergency only
 * Bottom 1%      | 1     | Worst qualifier
 */
const GRADE_PERCENTILE_THRESHOLDS: readonly { maxPercentile: number; grade: number }[] = [
  { maxPercentile: 0.005, grade: MAX_PITCHER_GRADE },  // 22
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
 * Compute a pitcher's ERA percentile rank among all qualifying pitchers.
 * Lower ERA = lower percentile (better).
 *
 * @param pitcherERA - The pitcher's ERA
 * @param allERAs - Array of all qualifying pitcher ERAs (unsorted is fine)
 * @returns Percentile rank in [0, 1] (0 = best ERA, 1 = worst)
 */
export function computeERAPercentile(pitcherERA: number, allERAs: number[]): number {
  if (allERAs.length === 0) return 0.49;
  if (allERAs.length === 1) return 0.49; // Single pitcher -> average (grade 9)

  // Count how many pitchers have a lower ERA (better)
  let betterCount = 0;
  for (const era of allERAs) {
    if (era < pitcherERA) {
      betterCount++;
    }
  }

  return betterCount / allERAs.length;
}

/**
 * Map an ERA percentile to the 1-22 grade scale (REQ-DATA-005a).
 * Grade 22 = best, Grade 1 = worst.
 */
export function percentileToGrade(percentile: number): number {
  for (const threshold of GRADE_PERCENTILE_THRESHOLDS) {
    if (percentile < threshold.maxPercentile) {
      return threshold.grade;
    }
  }
  return 1;
}

/**
 * Compute a pitcher's grade from their ERA relative to all qualifying pitchers.
 *
 * @param pitcherERA - The pitcher's ERA
 * @param allERAs - Array of all qualifying pitcher ERAs
 * @returns Grade 1-22 (22 = best)
 */
export function computePitcherGrade(pitcherERA: number, allERAs: number[]): number {
  const percentile = computeERAPercentile(pitcherERA, allERAs);
  return percentileToGrade(percentile);
}
