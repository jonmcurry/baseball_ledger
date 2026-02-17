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

/**
 * BBW FUN_1058_1255 opcode 'D': pitcher grade threshold for steal suppression.
 * When opposing pitcher's effective grade exceeds 14/15 (~93%), steals are
 * suppressed (pitcher too dominant to risk). Extracted from decompiled
 * bytecode VM: if (pitcher.grade > 0x0E) skip_steal.
 */
const PITCHER_GRADE_STEAL_GATE = 14 / 15;

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
  bestBenchOps?: number;        // OPS of best available bench player
  batterOps?: number;           // Current batter's OPS
  platoonAdvantage?: number;    // 1.0 neutral, >1.0 if platoon applies
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
  // BBW: elite pitcher (grade > 14/15) suppresses steal attempts
  if (sit.pitcherEffectiveGradePct > PITCHER_GRADE_STEAL_GATE) return false;

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

/**
 * Evaluate whether to call a hit-and-run.
 *
 * Per REQ-AI-002:
 * - Requires runner on 1B only (not 2B or 3B -- too risky)
 * - Requires < 2 outs
 * - Base factor = batter.contactRate (high contact hitters make H&R safer)
 */
export function evaluateHitAndRunDecision(
  profile: ManagerProfile,
  sit: GameSituation,
  rng: SeededRNG,
): boolean {
  // Prerequisites: runner on 1B only, no other bases occupied, < 2 outs
  // BBW: H&R suppressed in blowout games (same threshold as steal)
  if (!sit.runnerOnFirst) return false;
  if (sit.runnerOnSecond || sit.runnerOnThird) return false;
  if (sit.outs >= 2) return false;
  if (Math.abs(sit.scoreDiff) >= STEAL_BLOWOUT_THRESHOLD) return false;

  const baseFactor = sit.batterContactRate;
  const multiplier = getInningMultiplier(profile, sit.inning);
  const score = computeDecisionScore(baseFactor, profile.hitAndRunThreshold, multiplier);

  return rng.nextFloat() < score;
}

/**
 * Evaluate whether to pinch-hit for the current batter.
 *
 * Per REQ-AI-002:
 * - Requires bench OPS data (bestBenchOps and batterOps must be provided)
 * - Bench player must be better than current batter
 * - Base factor = (benchOPS - batterOPS) / benchOPS * platoonAdvantage
 */
export function evaluatePinchHitDecision(
  profile: ManagerProfile,
  sit: GameSituation,
  rng: SeededRNG,
): boolean {
  if (sit.bestBenchOps === undefined || sit.batterOps === undefined) return false;
  if (sit.bestBenchOps <= sit.batterOps) return false;

  const opsDiff = (sit.bestBenchOps - sit.batterOps) / sit.bestBenchOps;
  const platoonFactor = sit.platoonAdvantage ?? 1.0;
  const baseFactor = opsDiff * platoonFactor;
  const multiplier = getInningMultiplier(profile, sit.inning);
  const score = computeDecisionScore(baseFactor, profile.pinchHitThreshold, multiplier);

  return rng.nextFloat() < score;
}

/**
 * Evaluate whether to attempt aggressive baserunning (take extra base).
 *
 * Used after hit resolution to decide if a runner takes an extra base
 * (e.g., 1B->3B on a single, 2B->home on a single).
 *
 * - Requires runner on 1B or 2B, < 2 outs
 * - Base factor = runner speed
 */
export function evaluateAggressiveBaserunning(
  profile: ManagerProfile,
  sit: GameSituation,
  rng: SeededRNG,
): boolean {
  if (!sit.runnerOnFirst && !sit.runnerOnSecond) return false;
  if (sit.outs >= 2) return false;

  const baseFactor = sit.runnerSpeed;
  const multiplier = getInningMultiplier(profile, sit.inning);
  const score = computeDecisionScore(baseFactor, profile.aggressiveBaserunning, multiplier);

  return rng.nextFloat() < score;
}
