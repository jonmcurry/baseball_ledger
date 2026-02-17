/**
 * Pitching Management Module
 *
 * REQ-SIM-010: Pitcher grade fatigue degradation.
 * REQ-SIM-011: Starter removal triggers.
 * REQ-SIM-012: Relief pitcher management.
 * REQ-SIM-013: Closer usage rules.
 * REQ-SIM-014: Starting pitcher rotation.
 *
 * Manages pitcher fatigue, bullpen decisions, and rotation tracking.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { PlayerCard } from '../types/player';
import type { SeededRNG } from '../rng/seeded-rng';

/**
 * Approximate batters faced per inning of stamina.
 * BBW uses per-event fatigue (data[0x47] increments per PA).
 * This converts our stamina (in innings) to a PA threshold.
 */
const PAS_PER_STAMINA_INNING = 4;

/** Minimum effective grade (never drops below this) */
const MIN_GRADE = 1;

/**
 * Maximum effective grade (never exceeds this).
 * Confirmed by Ghidra FUN_1058_5be1: final variance step uses
 * min(grade, 0x1e) then max(grade, 1) -- range [1, 30].
 */
const MAX_GRADE = 30;

/** ER threshold for removal trigger (REQ-SIM-011) */
const ER_REMOVAL_THRESHOLD = 4;

/** IP threshold for ER-based removal trigger */
const IP_REMOVAL_THRESHOLD = 4;

/** Consecutive hits/walks threshold for removal */
const CONSECUTIVE_HW_THRESHOLD = 3;

/** Inning after which consecutive H/W trigger applies */
const CONSECUTIVE_HW_INNING_MIN = 6;

/** Run deficit threshold for blowout removal (REQ-SIM-011 trigger #4) */
const BLOWOUT_DEFICIT_THRESHOLD = 5;

/** Inning at which blowout removal applies (after the 6th = 7th+) */
const BLOWOUT_INNING_MIN = 7;

/** Maximum lead margin for closer entry */
const CLOSER_MAX_LEAD = 3;

/** Minimum inning for closer entry */
const CLOSER_MIN_INNING = 9;

/** Maximum runners inherited for closer entry */
const CLOSER_MAX_RUNNERS = 2;

/**
 * In-game state tracked for the current pitcher.
 */
export interface PitcherGameState {
  inningsPitched: number;
  /** Batters faced in current game (BBW fatigue counter, maps to data[0x47]) */
  battersFaced: number;
  earnedRuns: number;
  consecutiveHitsWalks: number;
  currentInning: number;
  isShutout: boolean;
  isNoHitter: boolean;
  /** How many runs the pitcher's team is losing by (positive = losing, 0 = tied/winning) */
  runDeficit: number;
}

/**
 * Compute the effective grade for a pitcher based on fatigue.
 *
 * Per REQ-SIM-010:
 * - Pitchers have full grade through stamina-equivalent PAs
 * - Beyond stamina, grade degrades by 1 per additional PA faced
 * - Minimum grade: 1
 *
 * BBW Equivalence (confirmed by Ghidra decompilation of game loop):
 * Ghidra FUN_1058_5be1 shows BBW uses `grade = max(data[0x43] - data[0x47], 1)`.
 * BBW's mechanism (confirmed by full decompilation of FUN_1058_2cb4 + game loop):
 *   - data[0x47] zeroed at game start (1068:3da0)
 *   - data[0x47] incremented by 1 per plate appearance (game loop at 1058:2cb4,
 *     also in FUN_1058_1255 line 866 and FUN_1058_2cd7 line 3641)
 *   - data[0x47] conditionally adjusted +1/+2 based on pitcher type (10a0:9bab)
 *   - data[0x47] capped at 30 (PUSH 0x1E min() at 10a0:9b93)
 *
 * Our model uses `battersFaced` as the fatigue counter (matching BBW data[0x47]),
 * with stamina converted to a PA threshold via PAS_PER_STAMINA_INNING.
 *
 * @param pitcher - The pitcher's card with pitching attributes
 * @param battersFaced - Number of batters faced in current game
 */
export function computeEffectiveGrade(
  pitcher: PlayerCard,
  battersFaced: number,
): number {
  const pitching = pitcher.pitching;
  if (!pitching) return MIN_GRADE;

  const baseGrade = pitching.grade;
  const staminaPAs = pitching.stamina * PAS_PER_STAMINA_INNING;
  const fatigue = Math.max(0, battersFaced - staminaPAs);

  if (fatigue === 0) return baseGrade;

  return Math.max(MIN_GRADE, baseGrade - fatigue);
}

// ---------------------------------------------------------------------------
// 6-Layer Grade Adjustment (Ghidra FUN_1058_5be1)
// ---------------------------------------------------------------------------

/**
 * Relief pitcher penalty (Layer 3).
 * Non-closer relief pitchers get -2 grade when entering in relief.
 * Confirmed by Ghidra: `pitcherData.grade = clamp(pitcherData.grade - 2, 1)`
 */
export const RELIEF_PENALTY = 2;

/**
 * Fresh pitcher bonus (Layer 4).
 * A fresh pitcher (not fatigued, first appearance) gets +5 grade.
 * Confirmed by Ghidra: `pitcherData.grade = clamp(pitcherData.grade + 5, 20)`
 */
export const FRESH_BONUS = 5;

/**
 * Maximum grade after fresh bonus (Layer 4 cap).
 * Fresh bonus cannot push grade above 20.
 */
export const FRESH_GRADE_MAX = 20;

/**
 * Maximum grade after platoon adjustment (Layer 5 cap).
 * Platoon adjustment cannot push grade above 30.
 */
export const PLATOON_GRADE_MAX = 30;

/**
 * Random variance adjustment table (Layer 6).
 * 40 entries indexed by random(40). Values are small signed integers
 * that add noise to the effective grade.
 *
 * EXTRACTED from WINBB.EXE DATA[0x3802] (segment 36).
 * Distribution: 1x(+3), 3x(+2), 6x(+1), 20x(0), 6x(-1), 3x(-2), 1x(-3)
 * Mean = 0.0, symmetric around zero. Range [-3, +3].
 */
export const RANDOM_VARIANCE_TABLE: readonly number[] = [
   3,  2,  2,  2,  1,  1,  1,  1,  1,  1,
   0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
   0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  -1, -1, -1, -1, -1, -1, -2, -2, -2, -3,
];

/**
 * Context for computing the full game-time grade adjustment.
 * Provides all state needed for the 6-layer calculation.
 */
export interface GradeContext {
  /** Batters faced in current game (BBW per-PA fatigue counter) */
  battersFaced: number;
  /** True if pitcher entered in a relief situation */
  isReliefSituation: boolean;
  /** Pitcher type flag (7 = closer, other = non-closer) */
  pitcherType: number;
  /** True if pitcher is fresh (first game appearance, not fatigued) */
  isFresh: boolean;
  /** Fatigue adjustment flag from game state */
  fatigueAdj: number;
  /** Batter's batting hand ('L', 'R', or 'S') */
  batterHand: 'L' | 'R' | 'S';
  /** Pitcher's throwing hand ('L' or 'R') */
  pitcherHand: 'L' | 'R';
  /** Platoon grade adjustment value from batter data */
  platoonValue: number;
}

/**
 * Compute the full 6-layer game-time grade for PA resolution.
 *
 * Confirmed by full Ghidra decompilation of FUN_1058_5be1 (Grade Setup, 83 lines):
 *
 * Layer 1: Base grade from pitcher record data[0x43]
 * Layer 2: Fatigue -- grade = max(data[0x43] - data[0x47], 1), per-PA counter
 *          Condition: FUN_10c8_3ac9(pitcher) != 1 OR pitcher[0x46] != 0
 * Layer 3: Relief Penalty -- data[0x314] != 0 AND data[0x311] != 7 -> grade -= 2
 * Layer 4: Fresh Bonus -- data[0x49] != 0 AND (data[0x311] != 0 OR
 *          data[0x2eb] != 0 OR table_lookup != 0) -> min(grade + 5, 20)
 * Layer 5: Platoon -- pitcher[0x2a] == batter[0x38] -> min(grade + batter[0x3b], 30)
 * Layer 6: Random Variance -- random(40) indexes DATA[0x3802] -> min(grade + v, 30)
 *
 * @param pitcher - The pitcher's PlayerCard
 * @param context - Game context for all layers
 * @param rng - Seeded RNG for random variance (Layer 6)
 * @returns The final effective grade (clamped to [1, 30])
 */
export function computeGameGrade(
  pitcher: PlayerCard,
  context: GradeContext,
  rng: SeededRNG,
): number {
  const pitching = pitcher.pitching;
  if (!pitching) return MIN_GRADE;

  // Layers 1-2: Base grade + Fatigue (per-PA model, reuse existing logic)
  let grade = computeEffectiveGrade(pitcher, context.battersFaced);

  // Layer 3: Relief Penalty
  // Non-closer relievers get -2 when in a relief situation
  if (context.isReliefSituation && context.pitcherType !== 7) {
    grade = Math.max(MIN_GRADE, grade - RELIEF_PENALTY);
  }

  // Layer 4: Fresh Pitcher Bonus
  // BBW: data[0x49] != 0 AND (data[0x311] != 0 OR data[0x2eb] != 0 OR table != 0)
  // Fresh pitcher gets +5, capped at FRESH_GRADE_MAX (20).
  // Guard: never reduce grade below current (for extended grades > 15).
  if (context.isFresh) {
    if (context.pitcherType !== 0 || context.fatigueAdj !== 0) {
      const withBonus = Math.min(grade + FRESH_BONUS, FRESH_GRADE_MAX);
      grade = Math.max(grade, withBonus);
    }
  }

  // Layer 5: Platoon Matchup
  // Same-hand: pitcher grade increases by platoonValue (capped at 30)
  // Ghidra: `if pitcherInfo.throwHand == batterData.batHand`
  const isSameHand =
    context.batterHand !== 'S' && context.batterHand === context.pitcherHand;

  if (isSameHand && context.platoonValue > 0) {
    grade = Math.min(grade + context.platoonValue, PLATOON_GRADE_MAX);
  }

  // Layer 6: Random Variance
  // random(40) indexes into the variance table
  // Ghidra FUN_1058_5be1: min(grade + variance, 30) then max(result, 1)
  const varianceIdx = rng.nextIntExclusive(0, RANDOM_VARIANCE_TABLE.length);
  const varianceAdj = RANDOM_VARIANCE_TABLE[varianceIdx];
  grade = Math.min(MAX_GRADE, grade + varianceAdj);
  grade = Math.max(MIN_GRADE, grade);

  return grade;
}

/**
 * Check whether a starting pitcher should be removed.
 *
 * Per REQ-SIM-011, any ONE of these triggers removal:
 * 1. Effective grade has dropped to 50% or less of starting grade
 * 2. 4+ earned runs AND 4+ innings pitched
 * 3. 3 consecutive hits/walks in an inning after the 5th
 * 4. Losing by 5+ runs after the 6th inning
 *
 * Per REQ-SIM-013 exception: do NOT pull if shutout or no-hitter in progress.
 */
export function shouldRemoveStarter(
  pitcher: PlayerCard,
  state: PitcherGameState,
): boolean {
  // REQ-SIM-013 exception: protect shutout/no-hitter
  if (state.isShutout || state.isNoHitter) {
    return false;
  }

  const pitching = pitcher.pitching;
  if (!pitching) return false;

  const effectiveGrade = computeEffectiveGrade(pitcher, state.battersFaced);
  const startingGrade = pitching.grade;

  // Trigger 1: Grade at 50% or less of starting grade
  if (effectiveGrade <= startingGrade * 0.5) {
    return true;
  }

  // Trigger 2: 4+ ER and 4+ IP
  if (state.earnedRuns >= ER_REMOVAL_THRESHOLD && state.inningsPitched >= IP_REMOVAL_THRESHOLD) {
    return true;
  }

  // Trigger 3: 3 consecutive hits/walks after the 5th inning
  if (
    state.consecutiveHitsWalks >= CONSECUTIVE_HW_THRESHOLD &&
    state.currentInning >= CONSECUTIVE_HW_INNING_MIN
  ) {
    return true;
  }

  // Trigger 4: Losing by 5+ runs after the 6th inning
  if (
    state.runDeficit >= BLOWOUT_DEFICIT_THRESHOLD &&
    state.currentInning >= BLOWOUT_INNING_MIN
  ) {
    return true;
  }

  return false;
}

/**
 * Select the best available reliever from the bullpen.
 *
 * Per REQ-SIM-012: select the reliever with the highest grade.
 * Excludes closers (they are reserved for save situations).
 *
 * @param bullpen - Available bullpen pitchers
 * @returns The best reliever, or null if none available
 */
export function selectReliever(
  bullpen: PlayerCard[],
): PlayerCard | null {
  const relievers = bullpen.filter(
    (p) => p.pitching && p.pitching.role !== 'CL',
  );

  if (relievers.length === 0) return null;

  return relievers.reduce((best, current) => {
    const bestGrade = best.pitching?.grade ?? 0;
    const currentGrade = current.pitching?.grade ?? 0;
    return currentGrade > bestGrade ? current : best;
  });
}

/**
 * Check whether to bring in the closer.
 *
 * Per REQ-SIM-013:
 * - Team is winning by 3 or fewer runs
 * - In the 9th inning or later
 * - No more than 2 runners on base from previous pitcher
 *
 * @param teamScore - Current team score
 * @param opponentScore - Current opponent score
 * @param inning - Current inning number
 * @param runnersOnBase - Number of runners currently on base
 */
export function shouldBringInCloser(
  teamScore: number,
  opponentScore: number,
  inning: number,
  runnersOnBase: number,
): boolean {
  const lead = teamScore - opponentScore;

  if (lead <= 0) return false;
  if (lead > CLOSER_MAX_LEAD) return false;
  if (inning < CLOSER_MIN_INNING) return false;
  if (runnersOnBase > CLOSER_MAX_RUNNERS) return false;

  return true;
}

/**
 * Get the next starting pitcher from the rotation.
 *
 * Per REQ-SIM-014: 4 starters rotate sequentially.
 * SP1 -> SP2 -> SP3 -> SP4 -> SP1 -> ...
 *
 * @param rotation - Array of starting pitchers (4 starters)
 * @param gameNumber - Sequential game number (0-indexed)
 */
export function getNextStarter(
  rotation: PlayerCard[],
  gameNumber: number,
): PlayerCard {
  const index = gameNumber % rotation.length;
  return rotation[index];
}
