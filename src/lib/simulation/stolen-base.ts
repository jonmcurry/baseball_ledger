/**
 * Stolen Base Resolution Module
 *
 * REQ-SIM-009: Stolen base attempts triggered by manager AI or STOLEN_BASE_OPP outcome.
 *
 * Resolution formula:
 * - Base success probability = runner's speed * 0.75
 * - Archetype (6,0) bonus: +0.15
 * - Catcher arm rating penalty: -(catcher.arm * 0.20)
 * - If random < adjusted probability: stolen base successful
 * - Else: caught stealing (runner is out)
 *
 * Only runners on 1B or 2B may attempt, and only with < 2 outs.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { PlayerArchetype } from '../types/player';
import type { SeededRNG } from '../rng/seeded-rng';
import type { BasePosition } from './baserunner';

/** Speed multiplier for base probability */
const SPEED_MULTIPLIER = 0.75;

/** Speed archetype (6,0) bonus */
const SPEED_ARCHETYPE_BONUS = 0.15;

/** Catcher arm penalty multiplier */
const CATCHER_ARM_MULTIPLIER = 0.20;

/**
 * Result of a stolen base attempt.
 */
export interface StolenBaseResult {
  success: boolean;
  destination: BasePosition | 'out';
}

/**
 * Check whether a stolen base attempt is eligible.
 *
 * Per REQ-SIM-009: only runners on 1B or 2B, with < 2 outs.
 */
export function canAttemptStolenBase(
  currentBase: BasePosition,
  outs: number,
): boolean {
  if (outs >= 2) return false;
  return currentBase === 'first' || currentBase === 'second';
}

/**
 * Compute the adjusted stolen base success probability.
 *
 * Per REQ-SIM-009:
 * - Base: runner speed * 0.75
 * - +0.15 if speed archetype (6,0)
 * - -(catcher.arm * 0.20)
 * - Clamped to [0, 1]
 */
export function computeStolenBaseProbability(
  runnerSpeed: number,
  runnerArchetype: PlayerArchetype,
  catcherArm: number,
): number {
  let probability = runnerSpeed * SPEED_MULTIPLIER;

  // Speed archetype bonus
  if (runnerArchetype.byte33 === 6 && runnerArchetype.byte34 === 0) {
    probability += SPEED_ARCHETYPE_BONUS;
  }

  // Catcher arm penalty
  probability -= catcherArm * CATCHER_ARM_MULTIPLIER;

  return Math.max(0, Math.min(1.0, probability));
}

/**
 * Attempt a stolen base.
 *
 * Per REQ-SIM-009:
 * - Compute adjusted probability
 * - If random < probability: success (runner advances one base)
 * - Else: caught stealing (runner is out)
 *
 * @param currentBase - Runner's current base ('first' or 'second')
 * @param runnerSpeed - Runner's speed rating [0, 1]
 * @param runnerArchetype - Runner's archetype flags
 * @param catcherArm - Catcher's arm rating [0, 1]
 * @param rng - Seeded random number generator
 */
export function attemptStolenBase(
  currentBase: BasePosition,
  runnerSpeed: number,
  runnerArchetype: PlayerArchetype,
  catcherArm: number,
  rng: SeededRNG,
): StolenBaseResult {
  const probability = computeStolenBaseProbability(
    runnerSpeed, runnerArchetype, catcherArm,
  );

  if (rng.nextFloat() < probability) {
    const destination: BasePosition = currentBase === 'first' ? 'second' : 'third';
    return { success: true, destination };
  }

  return { success: false, destination: 'out' };
}
