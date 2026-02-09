import {
  performSpeedCheck,
  computeEffectiveSpeed,
  advanceRunnerOnSingle,
  advanceRunnerOnDouble,
  canTagUp,
} from '@lib/simulation/baserunner';
import { SeededRNG } from '@lib/rng/seeded-rng';
import type { PlayerArchetype } from '@lib/types';

const SPEED_ARCHETYPE: PlayerArchetype = { byte33: 6, byte34: 0 };
const STANDARD_ARCHETYPE: PlayerArchetype = { byte33: 7, byte34: 0 };

// ---------------------------------------------------------------------------
// computeEffectiveSpeed
// ---------------------------------------------------------------------------
describe('computeEffectiveSpeed (REQ-SIM-006)', () => {
  it('returns base speed for standard archetype', () => {
    expect(computeEffectiveSpeed(0.5, STANDARD_ARCHETYPE, 0.5, 0)).toBe(0.5);
  });

  it('adds +0.15 bonus for speed archetype (6,0)', () => {
    expect(computeEffectiveSpeed(0.5, SPEED_ARCHETYPE, 0.5, 0)).toBeCloseTo(0.65, 2);
  });

  it('subtracts -0.10 penalty when outfielder arm > 0.8', () => {
    expect(computeEffectiveSpeed(0.5, STANDARD_ARCHETYPE, 0.85, 0)).toBeCloseTo(0.40, 2);
  });

  it('adds +0.10 bonus with 2 outs', () => {
    expect(computeEffectiveSpeed(0.5, STANDARD_ARCHETYPE, 0.5, 2)).toBeCloseTo(0.60, 2);
  });

  it('stacks all modifiers: speed archetype + 2 outs - strong arm', () => {
    // 0.5 + 0.15 (speed) + 0.10 (2 outs) - 0.10 (arm) = 0.65
    expect(computeEffectiveSpeed(0.5, SPEED_ARCHETYPE, 0.85, 2)).toBeCloseTo(0.65, 2);
  });

  it('clamps to 0.0 minimum', () => {
    expect(computeEffectiveSpeed(0.05, STANDARD_ARCHETYPE, 0.95, 0)).toBe(0);
  });

  it('clamps to 1.0 maximum', () => {
    expect(computeEffectiveSpeed(0.95, SPEED_ARCHETYPE, 0.5, 2)).toBe(1.0);
  });

  it('no arm penalty when arm <= 0.8', () => {
    expect(computeEffectiveSpeed(0.5, STANDARD_ARCHETYPE, 0.80, 0)).toBeCloseTo(0.50, 2);
  });
});

// ---------------------------------------------------------------------------
// performSpeedCheck
// ---------------------------------------------------------------------------
describe('performSpeedCheck (REQ-SIM-006)', () => {
  it('always succeeds with effectiveSpeed 1.0', () => {
    for (let i = 0; i < 50; i++) {
      const rng = new SeededRNG(i);
      expect(performSpeedCheck(rng, 1.0)).toBe(true);
    }
  });

  it('never succeeds with effectiveSpeed 0.0', () => {
    for (let i = 0; i < 50; i++) {
      const rng = new SeededRNG(i);
      expect(performSpeedCheck(rng, 0.0)).toBe(false);
    }
  });

  it('succeeds approximately at the effective speed rate', () => {
    let successes = 0;
    const trials = 3000;
    for (let i = 0; i < trials; i++) {
      const rng = new SeededRNG(i * 23);
      if (performSpeedCheck(rng, 0.6)) successes++;
    }
    const rate = successes / trials;
    expect(rate).toBeGreaterThan(0.53);
    expect(rate).toBeLessThan(0.67);
  });
});

// ---------------------------------------------------------------------------
// advanceRunnerOnSingle
// ---------------------------------------------------------------------------
describe('advanceRunnerOnSingle (REQ-SIM-006)', () => {
  it('runner on 1B goes to 2B (safe base) when speed check fails', () => {
    // Low speed = fail speed check
    const rng = new SeededRNG(42);
    const result = advanceRunnerOnSingle(
      'first', 0.0, STANDARD_ARCHETYPE, 0.5, 0, rng,
    );
    expect(result.destination).toBe('second');
    expect(result.scored).toBe(false);
  });

  it('runner on 1B goes to 3B when speed check passes', () => {
    // Use high effective speed to guarantee pass
    let foundThird = false;
    for (let seed = 0; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const result = advanceRunnerOnSingle(
        'first', 0.95, SPEED_ARCHETYPE, 0.5, 2, rng,
      );
      if (result.destination === 'third') {
        foundThird = true;
        break;
      }
    }
    expect(foundThird).toBe(true);
  });

  it('runner on 2B always scores on single', () => {
    const rng = new SeededRNG(42);
    const result = advanceRunnerOnSingle(
      'second', 0.3, STANDARD_ARCHETYPE, 0.5, 0, rng,
    );
    expect(result.scored).toBe(true);
  });

  it('runner on 3B always scores on single', () => {
    const rng = new SeededRNG(42);
    const result = advanceRunnerOnSingle(
      'third', 0.3, STANDARD_ARCHETYPE, 0.5, 0, rng,
    );
    expect(result.scored).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// advanceRunnerOnDouble
// ---------------------------------------------------------------------------
describe('advanceRunnerOnDouble (REQ-SIM-006)', () => {
  it('runner on 1B goes to 3B (safe base) when speed check fails', () => {
    const rng = new SeededRNG(42);
    const result = advanceRunnerOnDouble(
      'first', 0.0, STANDARD_ARCHETYPE, 0.5, 0, rng,
    );
    expect(result.destination).toBe('third');
    expect(result.scored).toBe(false);
  });

  it('runner on 1B scores when speed check passes', () => {
    let foundScore = false;
    for (let seed = 0; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const result = advanceRunnerOnDouble(
        'first', 0.95, SPEED_ARCHETYPE, 0.5, 2, rng,
      );
      if (result.scored) {
        foundScore = true;
        break;
      }
    }
    expect(foundScore).toBe(true);
  });

  it('runner on 2B always scores on double', () => {
    const rng = new SeededRNG(42);
    const result = advanceRunnerOnDouble(
      'second', 0.3, STANDARD_ARCHETYPE, 0.5, 0, rng,
    );
    expect(result.scored).toBe(true);
  });

  it('runner on 3B always scores on double', () => {
    const rng = new SeededRNG(42);
    const result = advanceRunnerOnDouble(
      'third', 0.3, STANDARD_ARCHETYPE, 0.5, 0, rng,
    );
    expect(result.scored).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// canTagUp (fly out tag-up)
// ---------------------------------------------------------------------------
describe('canTagUp (REQ-SIM-006)', () => {
  it('runner on 3B can tag up on fly out with <2 outs', () => {
    expect(canTagUp('third', 0)).toBe(true);
    expect(canTagUp('third', 1)).toBe(true);
  });

  it('runner on 3B cannot tag up with 2 outs', () => {
    expect(canTagUp('third', 2)).toBe(false);
  });

  it('runner on 2B cannot tag up on fly out', () => {
    expect(canTagUp('second', 0)).toBe(false);
  });

  it('runner on 1B cannot tag up on fly out', () => {
    expect(canTagUp('first', 0)).toBe(false);
  });
});
