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
