import {
  computeStolenBaseProbability,
  attemptStolenBase,
  canAttemptStolenBase,
  type StolenBaseResult,
} from '@lib/simulation/stolen-base';
import { SeededRNG } from '@lib/rng/seeded-rng';
import type { PlayerArchetype } from '@lib/types';

const SPEED_ARCHETYPE: PlayerArchetype = { byte33: 6, byte34: 0 };
const STANDARD_ARCHETYPE: PlayerArchetype = { byte33: 7, byte34: 0 };

// ---------------------------------------------------------------------------
// canAttemptStolenBase
// ---------------------------------------------------------------------------
describe('canAttemptStolenBase (REQ-SIM-009)', () => {
  it('allows SB attempt with runner on 1B and < 2 outs', () => {
    expect(canAttemptStolenBase('first', 0)).toBe(true);
    expect(canAttemptStolenBase('first', 1)).toBe(true);
  });

  it('allows SB attempt with runner on 2B and < 2 outs', () => {
    expect(canAttemptStolenBase('second', 0)).toBe(true);
    expect(canAttemptStolenBase('second', 1)).toBe(true);
  });

  it('disallows SB attempt with 2 outs', () => {
    expect(canAttemptStolenBase('first', 2)).toBe(false);
    expect(canAttemptStolenBase('second', 2)).toBe(false);
  });

  it('disallows SB attempt from 3B', () => {
    expect(canAttemptStolenBase('third', 0)).toBe(false);
    expect(canAttemptStolenBase('third', 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeStolenBaseProbability
// ---------------------------------------------------------------------------
describe('computeStolenBaseProbability (REQ-SIM-009)', () => {
  it('base probability = speed * 0.75', () => {
    const prob = computeStolenBaseProbability(0.8, STANDARD_ARCHETYPE, 0.5);
    expect(prob).toBeCloseTo(0.8 * 0.75 - 0.5 * 0.20, 4);
  });

  it('adds +0.15 for speed archetype (6,0)', () => {
    const probStandard = computeStolenBaseProbability(0.8, STANDARD_ARCHETYPE, 0.0);
    const probSpeed = computeStolenBaseProbability(0.8, SPEED_ARCHETYPE, 0.0);
    expect(probSpeed - probStandard).toBeCloseTo(0.15, 4);
  });

  it('subtracts catcher arm * 0.20 penalty', () => {
    const probNoArm = computeStolenBaseProbability(0.8, STANDARD_ARCHETYPE, 0.0);
    const probWithArm = computeStolenBaseProbability(0.8, STANDARD_ARCHETYPE, 0.9);
    expect(probNoArm - probWithArm).toBeCloseTo(0.9 * 0.20, 4);
  });

  it('stacks speed archetype bonus and catcher arm penalty', () => {
    // speed * 0.75 + 0.15 (archetype) - catcher.arm * 0.20
    // 0.8 * 0.75 + 0.15 - 0.7 * 0.20 = 0.60 + 0.15 - 0.14 = 0.61
    const prob = computeStolenBaseProbability(0.8, SPEED_ARCHETYPE, 0.7);
    expect(prob).toBeCloseTo(0.61, 2);
  });

  it('clamps to 0.0 minimum', () => {
    // Very slow runner against great catcher arm
    const prob = computeStolenBaseProbability(0.1, STANDARD_ARCHETYPE, 1.0);
    expect(prob).toBeGreaterThanOrEqual(0);
  });

  it('clamps to 1.0 maximum', () => {
    // Speed specialist, max speed, no arm
    const prob = computeStolenBaseProbability(1.0, SPEED_ARCHETYPE, 0.0);
    expect(prob).toBeLessThanOrEqual(1.0);
  });
});

// ---------------------------------------------------------------------------
// attemptStolenBase
// ---------------------------------------------------------------------------
describe('attemptStolenBase (REQ-SIM-009)', () => {
  it('returns success when random < probability', () => {
    // High speed, speed archetype, weak arm = very high probability
    let successCount = 0;
    for (let i = 0; i < 100; i++) {
      const rng = new SeededRNG(i);
      const result = attemptStolenBase(
        'first', 1.0, SPEED_ARCHETYPE, 0.0, rng,
      );
      if (result.success) successCount++;
    }
    // With prob near 0.90, should succeed almost always
    expect(successCount).toBeGreaterThan(85);
  });

  it('returns failure (caught stealing) when random >= probability', () => {
    // Very slow runner against great catcher = very low probability
    let failCount = 0;
    for (let i = 0; i < 100; i++) {
      const rng = new SeededRNG(i);
      const result = attemptStolenBase(
        'first', 0.1, STANDARD_ARCHETYPE, 1.0, rng,
      );
      if (!result.success) failCount++;
    }
    // With very low probability, should fail almost always
    expect(failCount).toBeGreaterThan(90);
  });

  it('runner on 1B advances to 2B on success', () => {
    // Use high probability to ensure success
    let found = false;
    for (let seed = 0; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const result = attemptStolenBase(
        'first', 0.95, SPEED_ARCHETYPE, 0.0, rng,
      );
      if (result.success) {
        expect(result.destination).toBe('second');
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('runner on 2B advances to 3B on success', () => {
    let found = false;
    for (let seed = 0; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const result = attemptStolenBase(
        'second', 0.95, SPEED_ARCHETYPE, 0.0, rng,
      );
      if (result.success) {
        expect(result.destination).toBe('third');
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('runner is out on failure (caught stealing)', () => {
    let found = false;
    for (let seed = 0; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const result = attemptStolenBase(
        'first', 0.3, STANDARD_ARCHETYPE, 0.8, rng,
      );
      if (!result.success) {
        expect(result.destination).toBe('out');
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('success rate approximates computed probability', () => {
    let successes = 0;
    const trials = 3000;
    const speed = 0.7;
    const catcherArm = 0.5;

    for (let i = 0; i < trials; i++) {
      const rng = new SeededRNG(i * 29);
      const result = attemptStolenBase(
        'first', speed, STANDARD_ARCHETYPE, catcherArm, rng,
      );
      if (result.success) successes++;
    }

    const expectedProb = computeStolenBaseProbability(speed, STANDARD_ARCHETYPE, catcherArm);
    const actualRate = successes / trials;
    expect(actualRate).toBeGreaterThan(expectedProb - 0.05);
    expect(actualRate).toBeLessThan(expectedProb + 0.05);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------
describe('stolen-base: determinism', () => {
  it('same seed produces identical SB results', () => {
    const results1: boolean[] = [];
    const results2: boolean[] = [];

    for (let i = 0; i < 50; i++) {
      results1.push(
        attemptStolenBase('first', 0.7, SPEED_ARCHETYPE, 0.5, new SeededRNG(42 + i)).success,
      );
      results2.push(
        attemptStolenBase('first', 0.7, SPEED_ARCHETYPE, 0.5, new SeededRNG(42 + i)).success,
      );
    }

    expect(results1).toEqual(results2);
  });
});
