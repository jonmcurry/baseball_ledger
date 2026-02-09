/**
 * Manager AI Decision Engine
 *
 * REQ-AI-002: Pre-pitch decision evaluation using manager profiles.
 * REQ-AI-003: Reliever selection priority.
 * REQ-AI-004: Stolen base decision detail.
 *
 * Before each plate appearance, the manager AI evaluates the game
 * situation using the assigned profile's thresholds:
 *
 *   decisionScore = baseFactors * profileThreshold * inningMultiplier
 *   If decisionScore > random(): execute the decision
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { ManagerProfile } from './manager-profiles';
import type { SeededRNG } from '../rng/seeded-rng';

/** Score differential threshold beyond which steals are not attempted */
const STEAL_BLOWOUT_THRESHOLD = 4;

/** Maximum score differential for bunt consideration */
const BUNT_SCORE_DIFF_MAX = 2;

/** Late innings start at inning 7 */
const LATE_INNING_START = 7;

/** Extra innings start at inning 10 */
const EXTRA_INNING_START = 10;

/**
 * Game situation snapshot used for decision evaluation.
 */
export interface GameSituation {
  inning: number;
  outs: number;
  runnerOnFirst: boolean;
  runnerOnSecond: boolean;
  runnerOnThird: boolean;
  scoreDiff: number;            // Positive = winning, negative = losing
  batterContactRate: number;    // 0-1
  batterOpsRank: number;        // 0-1, percentile rank (1.0 = best)
  runnerSpeed: number;          // 0-1
  pitcherEffectiveGradePct: number; // effectiveGrade / startingGrade, 0-1
  firstBaseOpen: boolean;
  runnerInScoringPosition: boolean;
}

/**
 * Get the inning-based multiplier for decision scoring.
 *
 * - Innings 1-6: 1.0 (no multiplier)
 * - Innings 7-9: lateInningMultiplier
 * - Innings 10+: extraInningMultiplier
 */
export function getInningMultiplier(
  profile: ManagerProfile,
  inning: number,
): number {
  if (inning >= EXTRA_INNING_START) return profile.extraInningMultiplier;
  if (inning >= LATE_INNING_START) return profile.lateInningMultiplier;
  return 1.0;
}

/**
 * Compute decision score: baseFactors * threshold * multiplier.
 *
 * Per REQ-AI-002 formula.
 */
export function computeDecisionScore(
  baseFactors: number,
  profileThreshold: number,
  inningMultiplier: number,
): number {
  return baseFactors * profileThreshold * inningMultiplier;
}

/**
 * Evaluate whether to attempt a stolen base.
 *
 * Per REQ-AI-004:
 * - Only with runner on 1B or 2B, < 2 outs
 * - Not attempted when up or down by 4+ runs
 * - Base factor = runner.speed * (1 if close game else 0.5)
 * - More likely in close games after 6th inning
 */
export function evaluateStealDecision(
  profile: ManagerProfile,
  sit: GameSituation,
  rng: SeededRNG,
): boolean {
  // Prerequisites
  if (!sit.runnerOnFirst && !sit.runnerOnSecond) return false;
  if (sit.outs >= 2) return false;
  if (Math.abs(sit.scoreDiff) >= STEAL_BLOWOUT_THRESHOLD) return false;

  const closeGame = Math.abs(sit.scoreDiff) <= 2;
  const baseFactor = sit.runnerSpeed * (closeGame ? 1.0 : 0.5);
  const multiplier = getInningMultiplier(profile, sit.inning);
  const score = computeDecisionScore(baseFactor, profile.stealAttemptThreshold, multiplier);

  return rng.nextFloat() < score;
}

/**
 * Evaluate whether to call a sacrifice bunt.
 *
 * Per REQ-AI-002:
 * - Requires runner on 1B or 2B
 * - Requires 0 outs (no bunt with 1+ outs)
 * - Game must be within 2 runs
 * - Base factor = (1 - batter.contactRate) -- weaker hitters bunt more
 */
export function evaluateBuntDecision(
  profile: ManagerProfile,
  sit: GameSituation,
  rng: SeededRNG,
): boolean {
  // Prerequisites
  if (!sit.runnerOnFirst && !sit.runnerOnSecond) return false;
  if (sit.outs !== 0) return false;
  if (Math.abs(sit.scoreDiff) > BUNT_SCORE_DIFF_MAX) return false;

  const baseFactor = 1 - sit.batterContactRate;
  const multiplier = getInningMultiplier(profile, sit.inning);
  const score = computeDecisionScore(baseFactor, profile.buntThreshold, multiplier);

  return rng.nextFloat() < score;
}

/**
 * Evaluate whether to issue an intentional walk.
 *
 * Per REQ-AI-002:
 * - Requires first base open
 * - Base factor = batterOpsRank * (1B open) * (scoring position runner)
 * - Higher OPS rank makes IBB more likely
 */
export function evaluateIntentionalWalkDecision(
  profile: ManagerProfile,
  sit: GameSituation,
  rng: SeededRNG,
): boolean {
  if (!sit.firstBaseOpen) return false;

  const scoringPosFactor = sit.runnerInScoringPosition ? 1.0 : 0.3;
  const baseFactor = sit.batterOpsRank * scoringPosFactor;
  const multiplier = getInningMultiplier(profile, sit.inning);
  const score = computeDecisionScore(baseFactor, profile.intentionalWalkThreshold, multiplier);

  return rng.nextFloat() < score;
}

/**
 * Evaluate whether to pull the current pitcher.
 *
 * Per REQ-AI-002:
 * - Base factor = (1 - effectiveGradePct) = fatigue factor
 * - Lower effective grade -> higher pull likelihood
 * - pitcherPullThreshold is a TOLERANCE value: higher = more patient
 *   (conservative=0.70 "lets starters go deep", aggressive=0.40 "quick hook")
 *   So we invert it: (1 - threshold) = pull aggressiveness
 */
export function evaluatePitcherPullDecision(
  profile: ManagerProfile,
  sit: GameSituation,
  rng: SeededRNG,
): boolean {
  const fatigueFactor = 1 - sit.pitcherEffectiveGradePct;
  const pullAggressiveness = 1 - profile.pitcherPullThreshold;
  const multiplier = getInningMultiplier(profile, sit.inning);
  const score = computeDecisionScore(fatigueFactor, pullAggressiveness, multiplier);

  return rng.nextFloat() < score;
}
