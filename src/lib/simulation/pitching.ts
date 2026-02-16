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

/** Grade degradation per inning beyond stamina for starters */
const STARTER_GRADE_DECAY = 2;

/** Grade degradation per inning beyond stamina for relievers */
const RELIEVER_GRADE_DECAY = 3;

/** Minimum effective grade (never drops below this) */
const MIN_GRADE = 1;

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
 * - Starters: full grade through stamina, then -2 per inning beyond
 * - Relievers: full grade through stamina, then -3 per inning beyond
 * - Minimum grade: 1
 *
 * BBW Equivalence (Gap 8):
 * Ghidra decompilation shows BBW uses `grade += (currentGrade - startingGrade)`
 * per fatigued check. With constant decay per inning, this differential formula
 * produces the same result as our linear formula: `grade = base - (decay * inningsBeyond)`.
 * The formulas are mathematically equivalent when decay rate is constant.
 * Decay rates (2 for starters, 3 for relievers) are approximated from observed
 * BBW behavior -- exact values from DATA segment are not yet confirmed by Ghidra.
 *
 * Random Variance Table (Gap 9):
 * BBW uses a 40-entry table at DATA[0x3802] for grade variance. Our current
 * 40-entry table is estimated. Without the exact bytes from WINBB.EXE's data
 * segment, we cannot improve this further. The approximation produces reasonable
 * grade variance distributions.
 *
 * @param pitcher - The pitcher's card with pitching attributes
 * @param inningsPitched - Innings pitched in current game
 */
export function computeEffectiveGrade(
  pitcher: PlayerCard,
  inningsPitched: number,
): number {
  const pitching = pitcher.pitching;
  if (!pitching) return MIN_GRADE;

  const baseGrade = pitching.grade;
  const stamina = pitching.stamina;
  const inningsBeyond = Math.max(0, inningsPitched - stamina);

  if (inningsBeyond === 0) return baseGrade;

  const decay = pitching.isReliever ? RELIEVER_GRADE_DECAY : STARTER_GRADE_DECAY;
  const degraded = baseGrade - (decay * inningsBeyond);

  return Math.max(MIN_GRADE, degraded);
}

// ---------------------------------------------------------------------------
// 5-Layer Grade Adjustment (Ghidra FUN_1058_5be1)
// ---------------------------------------------------------------------------

/**
 * Relief pitcher penalty (Layer 2).
 * Non-closer relief pitchers get -2 grade when entering in relief.
 * Confirmed by Ghidra: `pitcherData.grade = clamp(pitcherData.grade - 2, 1)`
 */
export const RELIEF_PENALTY = 2;

/**
 * Fresh pitcher bonus (Layer 3).
 * A fresh pitcher (not fatigued, first appearance) gets +5 grade.
 * Confirmed by Ghidra: `pitcherData.grade = clamp(pitcherData.grade + 5, 20)`
 */
export const FRESH_BONUS = 5;

/**
 * Maximum grade after fresh bonus (Layer 3 cap).
 * Fresh bonus cannot push grade above 20.
 */
export const FRESH_GRADE_MAX = 20;

/**
 * Maximum grade after platoon adjustment (Layer 4 cap).
 * Platoon adjustment cannot push grade above 30.
 */
export const PLATOON_GRADE_MAX = 30;

/**
 * Random variance adjustment table (Layer 5).
 * 40 entries indexed by random(40). Values are small signed integers
 * that add noise to the effective grade.
 *
 * Confirmed by Ghidra: `tableAdj = DATA[randomIdx + 0x3802]`
 * Exact table values approximated from expected distribution:
 * - Mostly 0s (no change)
 * - Some small positive/negative adjustments
 * - Net effect centered around 0
 */
export const RANDOM_VARIANCE_TABLE: readonly number[] = [
  -2, -1, -1, -1, -1, 0, 0, 0, 0, 0,
   0,  0,  0,  0,  0, 0, 0, 0, 0, 0,
   0,  0,  0,  0,  0, 0, 0, 0, 0, 0,
   0,  0,  0,  0,  0, 1, 1, 1, 1,  2,
];

/**
 * Context for computing the full game-time grade adjustment.
 * Provides all state needed for the 5-layer calculation.
 */
export interface GradeContext {
  /** Innings pitched in current game (for fatigue calculation) */
  inningsPitched: number;
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
 * Compute the full 5-layer game-time grade for PA resolution.
 *
 * Confirmed by Ghidra decompilation of FUN_1058_5be1 (Grade Setup):
 *
 * Layer 1: Fatigue -- grade degrades beyond stamina innings
 * Layer 2: Relief Penalty -- non-closer relievers get -2
 * Layer 3: Fresh Bonus -- fresh pitchers get +5 (capped at 20)
 * Layer 4: Platoon -- same-hand matchup: grade += platoonValue (capped at 30)
 * Layer 5: Random Variance -- random(40) indexes into adjustment table
 *
 * @param pitcher - The pitcher's PlayerCard
 * @param context - Game context for all 5 layers
 * @param rng - Seeded RNG for random variance (Layer 5)
 * @returns The final effective grade (clamped to minimum 1)
 */
export function computeGameGrade(
  pitcher: PlayerCard,
  context: GradeContext,
  rng: SeededRNG,
): number {
  const pitching = pitcher.pitching;
  if (!pitching) return MIN_GRADE;

  // Layer 1: Fatigue (reuse existing logic)
  let grade = computeEffectiveGrade(pitcher, context.inningsPitched);

  // Layer 2: Relief Penalty
  // Non-closer relievers get -2 when in a relief situation
  if (context.isReliefSituation && context.pitcherType !== 7) {
    grade = Math.max(MIN_GRADE, grade - RELIEF_PENALTY);
  }

  // Layer 3: Fresh Pitcher Bonus
  // Fresh pitcher gets +5, capped at FRESH_GRADE_MAX (20)
  if (context.isFresh) {
    if (context.pitcherType !== 0 || context.fatigueAdj !== 0) {
      grade = Math.min(grade + FRESH_BONUS, FRESH_GRADE_MAX);
    }
  }

  // Layer 4: Platoon Matchup
  // Same-hand: pitcher grade increases by platoonValue (capped at 30)
  // Ghidra: `if pitcherInfo.throwHand == batterData.batHand`
  const isSameHand =
    context.batterHand !== 'S' && context.batterHand === context.pitcherHand;

  if (isSameHand && context.platoonValue > 0) {
    grade = Math.min(grade + context.platoonValue, PLATOON_GRADE_MAX);
  }

  // Layer 5: Random Variance
  // random(40) indexes into the variance table
  const varianceIdx = rng.nextIntExclusive(0, RANDOM_VARIANCE_TABLE.length);
  const varianceAdj = RANDOM_VARIANCE_TABLE[varianceIdx];
  grade = Math.max(MIN_GRADE, grade + varianceAdj);

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

  const effectiveGrade = computeEffectiveGrade(pitcher, state.inningsPitched);
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
