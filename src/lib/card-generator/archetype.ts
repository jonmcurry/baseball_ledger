import type { PlayerArchetype, Position } from '../types';
import type { BattingStats } from '../types';
import { CALIBRATED_ARCHETYPE } from './calibration-coefficients';

/**
 * Premium defensive positions where elite defense archetype applies.
 */
const PREMIUM_DEFENSE_POSITIONS: ReadonlySet<Position> = new Set([
  'C', 'SS', '2B', '3B', 'CF',
]);

/**
 * Determine archetype flags for bytes 33-34 (REQ-DATA-005 Step 5).
 *
 * Hierarchical decision tree (first match wins):
 * 1. Pitcher (as batter) -> (0, 6)
 * 2. Power hitter (HR >= 18 or ISO >= 0.170) + LH/switch -> (1, 1)
 * 3. Power hitter (HR >= 18 or ISO >= 0.170) -> (1, 0)
 * 4. Speed specialist (SB >= 20 or sbRate >= 0.75) -> (6, 0)
 * 5. Contact + speed (BA >= 0.280 and SB >= 10) -> (0, 2)
 * 6. Elite defense (fielding top 10% at premium position) -> (8, 0)
 * 7. Utility/pinch hit (multi-position, BA < 0.250) -> (5, 0)
 * 8. Standard (all non-special batters) -> (0, 1)
 *
 * Note: BBW analysis shows (0,1) is the most common archetype (385/760 players),
 * used as the default for all non-special batters regardless of batting hand.
 * Thresholds calibrated from BBW distribution (best F1 = 0.805 for power).
 */
export function determineArchetype(
  stats: BattingStats,
  battingHand: 'L' | 'R' | 'S',
  isPitcher: boolean,
  primaryPosition: Position,
  sbRate: number,
  isEliteDefense: boolean,
  eligiblePositionCount: number,
): PlayerArchetype {
  // 1. Pitcher
  if (isPitcher) {
    return { byte33: 0, byte34: 6 };
  }

  const iso = stats.SLG - stats.BA;
  const isLeftOrSwitch = battingHand === 'L' || battingHand === 'S';

  // 2-3. Power hitter (calibrated thresholds from BBW analysis)
  if (stats.HR >= CALIBRATED_ARCHETYPE.powerHRThreshold || iso >= CALIBRATED_ARCHETYPE.powerISOThreshold) {
    if (isLeftOrSwitch) {
      return { byte33: 1, byte34: 1 }; // Power + platoon
    }
    return { byte33: 1, byte34: 0 }; // Power
  }

  // 4. Speed specialist
  if (stats.SB >= 20 || sbRate >= 0.75) {
    return { byte33: 6, byte34: 0 };
  }

  // 5. Contact + speed
  if (stats.BA >= 0.280 && stats.SB >= 10) {
    return { byte33: 0, byte34: 2 };
  }

  // 6. Elite defense
  if (isEliteDefense && PREMIUM_DEFENSE_POSITIONS.has(primaryPosition)) {
    return { byte33: 8, byte34: 0 };
  }

  // 7. Utility/pinch hit
  if (eligiblePositionCount >= 3 && stats.BA < 0.250) {
    return { byte33: 5, byte34: 0 };
  }

  // 8. Default: (0, 1) for all non-special batters (BBW most common archetype)
  return { byte33: 0, byte34: 1 };
}

/**
 * Check if a player qualifies as elite defense (top 10% fielding at position).
 * This is a simple check: fielding percentage >= threshold.
 * The threshold varies by position but we use a general 0.985 cutoff.
 */
export function isEliteFielder(
  fieldingPct: number,
  primaryPosition: Position,
): boolean {
  if (!PREMIUM_DEFENSE_POSITIONS.has(primaryPosition)) {
    return false;
  }
  return fieldingPct >= 0.985;
}
