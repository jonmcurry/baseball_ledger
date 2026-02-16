import {
  checkForError,
  getResponsiblePosition,
  checkDPDefense,
  type ErrorCheckResult,
} from '@lib/simulation/defense';
import { OutcomeCategory } from '@lib/types';
import { SeededRNG } from '@lib/rng/seeded-rng';

// ---------------------------------------------------------------------------
// getResponsiblePosition
// ---------------------------------------------------------------------------
describe('getResponsiblePosition (REQ-SIM-008)', () => {
  it('returns infield position for GROUND_OUT', () => {
    const rng = new SeededRNG(1);
    const pos = getResponsiblePosition(OutcomeCategory.GROUND_OUT, rng);
    expect(['SS', '2B', '3B', '1B']).toContain(pos);
  });

  it('returns infield position for GROUND_OUT_ADVANCE', () => {
    const rng = new SeededRNG(2);
    const pos = getResponsiblePosition(OutcomeCategory.GROUND_OUT_ADVANCE, rng);
    expect(['SS', '2B', '3B', '1B']).toContain(pos);
  });

  it('returns outfield position for FLY_OUT', () => {
    const rng = new SeededRNG(3);
    const pos = getResponsiblePosition(OutcomeCategory.FLY_OUT, rng);
    expect(['LF', 'CF', 'RF']).toContain(pos);
  });

  it('returns infield position for LINE_OUT', () => {
    const rng = new SeededRNG(4);
    const pos = getResponsiblePosition(OutcomeCategory.LINE_OUT, rng);
    expect(['SS', '2B', '3B', '1B', 'SP']).toContain(pos);
  });

  it('returns catcher/infield position for POP_OUT', () => {
    const rng = new SeededRNG(5);
    const pos = getResponsiblePosition(OutcomeCategory.POP_OUT, rng);
    expect(['C', '1B', 'SS', '2B', '3B']).toContain(pos);
  });

  it('returns null for non-batted-ball outcomes', () => {
    const rng = new SeededRNG(6);
    expect(getResponsiblePosition(OutcomeCategory.STRIKEOUT_SWINGING, rng)).toBeNull();
    expect(getResponsiblePosition(OutcomeCategory.WALK, rng)).toBeNull();
    expect(getResponsiblePosition(OutcomeCategory.HOME_RUN, rng)).toBeNull();
    expect(getResponsiblePosition(OutcomeCategory.SINGLE_CLEAN, rng)).toBeNull();
  });

  it('is deterministic with same seed', () => {
    const results1: (string | null)[] = [];
    const results2: (string | null)[] = [];
    for (let i = 0; i < 20; i++) {
      results1.push(getResponsiblePosition(OutcomeCategory.GROUND_OUT, new SeededRNG(100 + i)));
      results2.push(getResponsiblePosition(OutcomeCategory.GROUND_OUT, new SeededRNG(100 + i)));
    }
    expect(results1).toEqual(results2);
  });
});

// ---------------------------------------------------------------------------
// checkForError
// ---------------------------------------------------------------------------
describe('checkForError (REQ-SIM-008)', () => {
  it('returns no error for perfect fielding (1.000)', () => {
    for (let i = 0; i < 100; i++) {
      const rng = new SeededRNG(i);
      const result = checkForError(1.0, rng);
      expect(result.errorOccurred).toBe(false);
    }
  });

  it('always errors with fielding pct 0.000', () => {
    for (let i = 0; i < 100; i++) {
      const rng = new SeededRNG(i);
      const result = checkForError(0.0, rng);
      expect(result.errorOccurred).toBe(true);
    }
  });

  it('errors at approximately (1 - fieldingPct) rate', () => {
    let errorCount = 0;
    const trials = 5000;
    const fieldingPct = 0.95; // 5% error rate

    for (let i = 0; i < trials; i++) {
      const rng = new SeededRNG(i * 31);
      const result = checkForError(fieldingPct, rng);
      if (result.errorOccurred) errorCount++;
    }

    const rate = errorCount / trials;
    expect(rate).toBeGreaterThan(0.03);
    expect(rate).toBeLessThan(0.08);
  });

  it('high fielding pct (0.990) has very low error rate', () => {
    let errorCount = 0;
    const trials = 5000;

    for (let i = 0; i < trials; i++) {
      const rng = new SeededRNG(i * 37);
      const result = checkForError(0.990, rng);
      if (result.errorOccurred) errorCount++;
    }

    const rate = errorCount / trials;
    expect(rate).toBeLessThan(0.02);
  });
});

// ---------------------------------------------------------------------------
// checkDPDefense
// ---------------------------------------------------------------------------
describe('checkDPDefense (REQ-SIM-008a)', () => {
  it('DP succeeds when middle infield fieldingPct >= 0.95', () => {
    // High fielding = DP always succeeds
    for (let i = 0; i < 50; i++) {
      const rng = new SeededRNG(i);
      expect(checkDPDefense(0.980, 0.975, rng)).toBe(true);
    }
  });

  it('DP has 10% failure rate when combined fieldingPct < 0.95', () => {
    let failCount = 0;
    const trials = 3000;

    for (let i = 0; i < trials; i++) {
      const rng = new SeededRNG(i * 41);
      const success = checkDPDefense(0.940, 0.945, rng); // avg = 0.9425 < 0.95
      if (!success) failCount++;
    }

    const failRate = failCount / trials;
    expect(failRate).toBeGreaterThan(0.06);
    expect(failRate).toBeLessThan(0.15);
  });

  it('DP always succeeds when both fielders are excellent', () => {
    for (let i = 0; i < 100; i++) {
      const rng = new SeededRNG(i);
      expect(checkDPDefense(0.990, 0.995, rng)).toBe(true);
    }
  });

  it('DP check uses average of SS and 2B fielding pct', () => {
    // 0.96 + 0.94 = 1.90 / 2 = 0.95 (at threshold, should pass)
    for (let i = 0; i < 100; i++) {
      const rng = new SeededRNG(i);
      expect(checkDPDefense(0.960, 0.940, rng)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------
describe('defense: determinism', () => {
  it('same seed produces identical error check results', () => {
    const results1: boolean[] = [];
    const results2: boolean[] = [];

    for (let i = 0; i < 50; i++) {
      results1.push(checkForError(0.95, new SeededRNG(42 + i)).errorOccurred);
      results2.push(checkForError(0.95, new SeededRNG(42 + i)).errorOccurred);
    }

    expect(results1).toEqual(results2);
  });
});
