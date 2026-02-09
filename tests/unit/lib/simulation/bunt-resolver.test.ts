import {
  resolveBunt,
  type BuntResult,
} from '@lib/simulation/bunt-resolver';
import { OutcomeCategory } from '@lib/types';
import { SeededRNG } from '@lib/rng/seeded-rng';

// ---------------------------------------------------------------------------
// Probability distribution tests
// ---------------------------------------------------------------------------
describe('resolveBunt probability distribution (REQ-SIM-004c)', () => {
  const trials = 5000;

  it('produces ~65% sacrifice success', () => {
    let sacrificeCount = 0;
    for (let i = 0; i < trials; i++) {
      const rng = new SeededRNG(i * 13);
      const result = resolveBunt(rng, 0.5, 0);
      if (result.outcome === OutcomeCategory.SACRIFICE) {
        sacrificeCount++;
      }
    }
    const rate = sacrificeCount / trials;
    expect(rate).toBeGreaterThan(0.58);
    expect(rate).toBeLessThan(0.72);
  });

  it('produces ~15% bunt foul', () => {
    let foulCount = 0;
    for (let i = 0; i < trials; i++) {
      const rng = new SeededRNG(i * 17);
      const result = resolveBunt(rng, 0.5, 0);
      if (result.isBuntFoul) {
        foulCount++;
      }
    }
    const rate = foulCount / trials;
    expect(rate).toBeGreaterThan(0.10);
    expect(rate).toBeLessThan(0.22);
  });

  it('produces ~10% bunt-for-hit attempt zone', () => {
    let hitAttemptCount = 0;
    for (let i = 0; i < trials; i++) {
      const rng = new SeededRNG(i * 19);
      const result = resolveBunt(rng, 0.5, 0);
      if (result.wasBuntForHit) {
        hitAttemptCount++;
      }
    }
    const rate = hitAttemptCount / trials;
    expect(rate).toBeGreaterThan(0.05);
    expect(rate).toBeLessThan(0.16);
  });
});

// ---------------------------------------------------------------------------
// Sacrifice success
// ---------------------------------------------------------------------------
describe('resolveBunt: sacrifice success', () => {
  it('returns SACRIFICE outcome', () => {
    // Find a seed that produces sacrifice (roll < 0.65)
    for (let seed = 0; seed < 100; seed++) {
      const rng = new SeededRNG(seed);
      const result = resolveBunt(rng, 0.5, 0);
      if (result.outcome === OutcomeCategory.SACRIFICE) {
        expect(result.isBuntFoul).toBe(false);
        expect(result.wasBuntForHit).toBe(false);
        return;
      }
    }
    throw new Error('Expected at least one sacrifice in 100 trials');
  });
});

// ---------------------------------------------------------------------------
// Bunt foul
// ---------------------------------------------------------------------------
describe('resolveBunt: bunt foul', () => {
  it('sets isBuntFoul=true and resumePA=true when strikes < 2', () => {
    for (let seed = 0; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const result = resolveBunt(rng, 0.5, 0); // 0 strikes
      if (result.isBuntFoul) {
        expect(result.resumePA).toBe(true);
        expect(result.outcome).toBeNull();
        return;
      }
    }
    throw new Error('Expected at least one bunt foul in 200 trials');
  });

  it('sets isBuntFoul=true and resumePA=true with 1 strike', () => {
    for (let seed = 0; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const result = resolveBunt(rng, 0.5, 1); // 1 strike
      if (result.isBuntFoul) {
        expect(result.resumePA).toBe(true);
        expect(result.outcome).toBeNull();
        return;
      }
    }
    throw new Error('Expected at least one bunt foul in 200 trials');
  });

  it('produces STRIKEOUT on bunt foul with 2 strikes', () => {
    for (let seed = 0; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const result = resolveBunt(rng, 0.5, 2); // 2 strikes
      if (result.isBuntFoul) {
        expect(result.outcome).toBe(OutcomeCategory.STRIKEOUT_SWINGING);
        expect(result.resumePA).toBe(false);
        return;
      }
    }
    throw new Error('Expected at least one bunt foul in 200 trials');
  });
});

// ---------------------------------------------------------------------------
// Bunt for hit
// ---------------------------------------------------------------------------
describe('resolveBunt: bunt for hit', () => {
  it('fast batter (speed > 0.6) can reach base on bunt for hit', () => {
    let reached = false;
    for (let seed = 0; seed < 500; seed++) {
      const rng = new SeededRNG(seed);
      const result = resolveBunt(rng, 0.8, 0); // Fast batter
      if (result.wasBuntForHit && result.outcome === OutcomeCategory.SINGLE_CLEAN) {
        reached = true;
        break;
      }
    }
    expect(reached).toBe(true);
  });

  it('slow batter (speed <= 0.6) never reaches on bunt for hit', () => {
    for (let seed = 0; seed < 500; seed++) {
      const rng = new SeededRNG(seed);
      const result = resolveBunt(rng, 0.4, 0); // Slow batter
      if (result.wasBuntForHit) {
        expect(result.outcome).not.toBe(OutcomeCategory.SINGLE_CLEAN);
      }
    }
  });

  it('bunt for hit failure is GROUND_OUT', () => {
    for (let seed = 0; seed < 500; seed++) {
      const rng = new SeededRNG(seed);
      const result = resolveBunt(rng, 0.4, 0);
      if (result.wasBuntForHit) {
        expect(result.outcome).toBe(OutcomeCategory.GROUND_OUT);
        return;
      }
    }
    throw new Error('Expected at least one bunt for hit attempt in 500 trials');
  });
});

// ---------------------------------------------------------------------------
// Failed bunt (pop out)
// ---------------------------------------------------------------------------
describe('resolveBunt: failed bunt (pop out)', () => {
  it('roll >= 0.90 produces POP_OUT', () => {
    let foundPopOut = false;
    for (let seed = 0; seed < 500; seed++) {
      const rng = new SeededRNG(seed);
      const result = resolveBunt(rng, 0.5, 0);
      if (result.outcome === OutcomeCategory.POP_OUT) {
        foundPopOut = true;
        break;
      }
    }
    expect(foundPopOut).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------
describe('resolveBunt: determinism', () => {
  it('same seed produces identical results', () => {
    const results1: BuntResult[] = [];
    const results2: BuntResult[] = [];

    for (let i = 0; i < 50; i++) {
      results1.push(resolveBunt(new SeededRNG(42 + i), 0.5, 0));
      results2.push(resolveBunt(new SeededRNG(42 + i), 0.5, 0));
    }

    expect(results1).toEqual(results2);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('resolveBunt: edge cases', () => {
  it('handles speed exactly 0.6 (not eligible for bunt hit)', () => {
    for (let seed = 0; seed < 500; seed++) {
      const rng = new SeededRNG(seed);
      const result = resolveBunt(rng, 0.6, 0);
      if (result.wasBuntForHit) {
        // speed must be > 0.6, exactly 0.6 should not reach
        expect(result.outcome).toBe(OutcomeCategory.GROUND_OUT);
      }
    }
  });

  it('handles speed 0 (no bunt hit possible)', () => {
    for (let seed = 0; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const result = resolveBunt(rng, 0, 0);
      if (result.wasBuntForHit) {
        expect(result.outcome).toBe(OutcomeCategory.GROUND_OUT);
      }
    }
  });

  it('handles speed 1.0 (maximum)', () => {
    let hitReached = false;
    for (let seed = 0; seed < 500; seed++) {
      const rng = new SeededRNG(seed);
      const result = resolveBunt(rng, 1.0, 0);
      if (result.wasBuntForHit && result.outcome === OutcomeCategory.SINGLE_CLEAN) {
        hitReached = true;
        break;
      }
    }
    expect(hitReached).toBe(true);
  });
});
