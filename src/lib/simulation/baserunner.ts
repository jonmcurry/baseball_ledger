/**
 * Baserunner Engine Module
 *
 * REQ-SIM-006: Baserunner speed checks with archetype/arm/outs modifiers.
 * REQ-SIM-007: Runner advancement priorities (3B first, then 2B, then 1B).
 *
 * Speed checks determine whether runners take extra bases on hits.
 * The outcome-resolver provides conservative defaults; this module
 * enhances resolution with speed-dependent extra-base advancement.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { PlayerArchetype } from '../types/player';
import type { SeededRNG } from '../rng/seeded-rng';

/** Speed archetype bonus per REQ-SIM-006 */
const SPEED_ARCHETYPE_BONUS = 0.15;

/** Strong arm penalty threshold and amount per REQ-SIM-006 */
const STRONG_ARM_THRESHOLD = 0.8;
const STRONG_ARM_PENALTY = 0.10;

/** Two-out aggressiveness bonus per REQ-SIM-006 */
const TWO_OUT_BONUS = 0.10;

/** Base positions for type safety */
export type BasePosition = 'first' | 'second' | 'third';

/**
 * Result of a runner advancement decision.
 */
export interface RunnerAdvancement {
  destination: BasePosition | 'scored';
  scored: boolean;
  tookExtraBase: boolean;
}

/**
 * Compute effective speed for a speed check.
 *
 * Per REQ-SIM-006:
 * - Base: runner's speed rating [0, 1]
 * - +0.15 if runner archetype is (6,0) [speed specialist]
 * - -0.10 if outfielder's arm rating > 0.8
 * - +0.10 if 2 outs (runner more aggressive)
 *
 * Result clamped to [0, 1].
 */
export function computeEffectiveSpeed(
  baseSpeed: number,
  archetype: PlayerArchetype,
  outfielderArm: number,
  outs: number,
): number {
  let effective = baseSpeed;

  // Speed archetype bonus
  if (archetype.byte33 === 6 && archetype.byte34 === 0) {
    effective += SPEED_ARCHETYPE_BONUS;
  }

  // Strong arm penalty
  if (outfielderArm > STRONG_ARM_THRESHOLD) {
    effective -= STRONG_ARM_PENALTY;
  }

  // Two-out aggressiveness
  if (outs === 2) {
    effective += TWO_OUT_BONUS;
  }

  return Math.max(0, Math.min(1.0, effective));
}

/**
 * Perform a speed check.
 *
 * Per REQ-SIM-006:
 * - Generate random float [0,1)
 * - If random < effectiveSpeed: success (runner takes extra base)
 * - Else: failure (runner stops at safe base)
 */
export function performSpeedCheck(rng: SeededRNG, effectiveSpeed: number): boolean {
  return rng.nextFloat() < effectiveSpeed;
}

/**
 * Determine runner advancement on a single.
 *
 * - Runner on 1B: safe base = 2B, speed check for 3B
 * - Runner on 2B: always scores
 * - Runner on 3B: always scores
 */
export function advanceRunnerOnSingle(
  currentBase: BasePosition,
  runnerSpeed: number,
  runnerArchetype: PlayerArchetype,
  outfielderArm: number,
  outs: number,
  rng: SeededRNG,
): RunnerAdvancement {
  if (currentBase === 'third' || currentBase === 'second') {
    return { destination: 'scored', scored: true, tookExtraBase: false };
  }

  // Runner on 1B: speed check for extra base
  const effectiveSpeed = computeEffectiveSpeed(runnerSpeed, runnerArchetype, outfielderArm, outs);
  if (performSpeedCheck(rng, effectiveSpeed)) {
    return { destination: 'third', scored: false, tookExtraBase: true };
  }
  return { destination: 'second', scored: false, tookExtraBase: false };
}

/**
 * Determine runner advancement on a double.
 *
 * - Runner on 1B: safe base = 3B, speed check to score
 * - Runner on 2B: always scores
 * - Runner on 3B: always scores
 */
export function advanceRunnerOnDouble(
  currentBase: BasePosition,
  runnerSpeed: number,
  runnerArchetype: PlayerArchetype,
  outfielderArm: number,
  outs: number,
  rng: SeededRNG,
): RunnerAdvancement {
  if (currentBase === 'third' || currentBase === 'second') {
    return { destination: 'scored', scored: true, tookExtraBase: false };
  }

  // Runner on 1B: speed check to score
  const effectiveSpeed = computeEffectiveSpeed(runnerSpeed, runnerArchetype, outfielderArm, outs);
  if (performSpeedCheck(rng, effectiveSpeed)) {
    return { destination: 'scored', scored: true, tookExtraBase: true };
  }
  return { destination: 'third', scored: false, tookExtraBase: false };
}

/**
 * Check if a runner can tag up on a fly out.
 *
 * Only runner on 3B can tag up, and only with < 2 outs.
 */
export function canTagUp(currentBase: BasePosition, outs: number): boolean {
  return currentBase === 'third' && outs < 2;
}
