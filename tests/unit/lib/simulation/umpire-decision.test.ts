/**
 * Umpire Decision Unit Tests
 *
 * Ghidra FUN_1058_7726: Post-resolution umpire check that can override
 * certain outcomes on close calls.
 */

import { SeededRNG } from '@lib/rng/seeded-rng';
import { checkUmpireDecision } from '@lib/simulation/umpire-decision';
import { OutcomeCategory } from '@lib/types/game';

describe('checkUmpireDecision (Ghidra FUN_1058_7726)', () => {
  it('returns unchanged outcome for non-eligible outcomes', () => {
    const rng = new SeededRNG(42);

    const nonEligible = [
      OutcomeCategory.SINGLE_CLEAN,
      OutcomeCategory.HOME_RUN,
      OutcomeCategory.DOUBLE,
      OutcomeCategory.WALK,
      OutcomeCategory.FLY_OUT,
      OutcomeCategory.STRIKEOUT_SWINGING,
    ];

    for (const outcome of nonEligible) {
      const result = checkUmpireDecision(outcome, rng);
      expect(result.outcome).toBe(outcome);
      expect(result.overridden).toBe(false);
    }
  });

  it('can override STRIKEOUT_LOOKING to WALK (called third strike reversal)', () => {
    let overrideCount = 0;
    const samples = 2000;

    for (let i = 0; i < samples; i++) {
      const rng = new SeededRNG(i);
      const result = checkUmpireDecision(OutcomeCategory.STRIKEOUT_LOOKING, rng);
      if (result.overridden) {
        expect(result.outcome).toBe(OutcomeCategory.WALK);
        overrideCount++;
      }
    }

    // Override chance is ~3%, so expect some overrides but not many
    expect(overrideCount).toBeGreaterThan(0);
    expect(overrideCount).toBeLessThan(samples * 0.10); // well under 10%
  });

  it('can override GROUND_OUT to SINGLE_CLEAN (safe at first reversal)', () => {
    let overrideCount = 0;
    const samples = 2000;

    for (let i = 0; i < samples; i++) {
      const rng = new SeededRNG(i * 7 + 100);
      const result = checkUmpireDecision(OutcomeCategory.GROUND_OUT, rng);
      if (result.overridden) {
        expect(result.outcome).toBe(OutcomeCategory.SINGLE_CLEAN);
        overrideCount++;
      }
    }

    expect(overrideCount).toBeGreaterThan(0);
    expect(overrideCount).toBeLessThan(samples * 0.10);
  });

  it('produces deterministic results with same seed', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);

    const results1 = Array.from({ length: 50 }, () =>
      checkUmpireDecision(OutcomeCategory.STRIKEOUT_LOOKING, rng1)
    );
    const results2 = Array.from({ length: 50 }, () =>
      checkUmpireDecision(OutcomeCategory.STRIKEOUT_LOOKING, rng2)
    );

    expect(results1).toEqual(results2);
  });

  it('override rate is approximately 3%', () => {
    let overrides = 0;
    const samples = 5000;

    for (let i = 0; i < samples; i++) {
      const rng = new SeededRNG(i * 31);
      const result = checkUmpireDecision(OutcomeCategory.STRIKEOUT_LOOKING, rng);
      if (result.overridden) overrides++;
    }

    const rate = overrides / samples;
    // 3% +/- 2% tolerance
    expect(rate).toBeGreaterThan(0.01);
    expect(rate).toBeLessThan(0.06);
  });
});
