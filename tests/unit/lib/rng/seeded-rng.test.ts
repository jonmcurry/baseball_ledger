/**
 * SeededRNG Unit Tests
 *
 * REQ-NFR-007: Simulation determinism with seeded RNG
 * REQ-TEST-003: 100% line coverage, 100% branch coverage for rng/
 *
 * TDD: These tests are written FIRST before the implementation.
 */

import { SeededRNG } from '@lib/rng/seeded-rng';

describe('REQ-NFR-007: SeededRNG Determinism', () => {
  describe('constructor', () => {
    it('creates an instance with a given seed', () => {
      const rng = new SeededRNG(12345);
      expect(rng).toBeInstanceOf(SeededRNG);
    });

    it('creates an instance with seed 0', () => {
      const rng = new SeededRNG(0);
      expect(rng).toBeInstanceOf(SeededRNG);
    });

    it('creates an instance with a large seed', () => {
      const rng = new SeededRNG(2147483647);
      expect(rng).toBeInstanceOf(SeededRNG);
    });
  });

  describe('nextFloat()', () => {
    it('returns a number in range [0, 1)', () => {
      const rng = new SeededRNG(42);
      for (let i = 0; i < 100; i++) {
        const value = rng.nextFloat();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('produces the same sequence for the same seed', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const sequence1 = Array.from({ length: 10 }, () => rng1.nextFloat());
      const sequence2 = Array.from({ length: 10 }, () => rng2.nextFloat());

      expect(sequence1).toEqual(sequence2);
    });

    it('produces different sequences for different seeds', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(54321);

      const sequence1 = Array.from({ length: 10 }, () => rng1.nextFloat());
      const sequence2 = Array.from({ length: 10 }, () => rng2.nextFloat());

      expect(sequence1).not.toEqual(sequence2);
    });

    it('has reasonable distribution (no clustering)', () => {
      const rng = new SeededRNG(999);
      const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const samples = 10000;

      for (let i = 0; i < samples; i++) {
        const value = rng.nextFloat();
        const bucket = Math.floor(value * 10);
        buckets[bucket]++;
      }

      // Each bucket should have roughly 10% of samples (1000)
      // Allow 20% variance (800-1200)
      for (const count of buckets) {
        expect(count).toBeGreaterThan(800);
        expect(count).toBeLessThan(1200);
      }
    });
  });

  describe('nextInt(min, max)', () => {
    it('returns an integer in range [min, max] inclusive', () => {
      const rng = new SeededRNG(42);
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(1, 10);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(10);
      }
    });

    it('produces the same sequence for the same seed', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const sequence1 = Array.from({ length: 10 }, () => rng1.nextInt(0, 100));
      const sequence2 = Array.from({ length: 10 }, () => rng2.nextInt(0, 100));

      expect(sequence1).toEqual(sequence2);
    });

    it('handles min equal to max', () => {
      const rng = new SeededRNG(42);
      for (let i = 0; i < 10; i++) {
        expect(rng.nextInt(5, 5)).toBe(5);
      }
    });

    it('handles zero-based ranges', () => {
      const rng = new SeededRNG(42);
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(0, 34);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(34);
      }
    });

    it('handles negative ranges', () => {
      const rng = new SeededRNG(42);
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(-10, -1);
        expect(value).toBeGreaterThanOrEqual(-10);
        expect(value).toBeLessThanOrEqual(-1);
      }
    });

    it('handles mixed positive and negative ranges', () => {
      const rng = new SeededRNG(42);
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(-5, 5);
        expect(value).toBeGreaterThanOrEqual(-5);
        expect(value).toBeLessThanOrEqual(5);
      }
    });

    it('covers the full range for small ranges', () => {
      const rng = new SeededRNG(42);
      const seen = new Set<number>();
      // With a range of 1-6, we should see all values within ~100 samples
      for (let i = 0; i < 100; i++) {
        seen.add(rng.nextInt(1, 6));
      }
      expect(seen.size).toBe(6);
    });
  });

  describe('nextIntExclusive(min, max)', () => {
    it('returns an integer in range [min, max)', () => {
      const rng = new SeededRNG(42);
      for (let i = 0; i < 100; i++) {
        const value = rng.nextIntExclusive(0, 35);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(35);
      }
    });

    it('never returns the max value', () => {
      const rng = new SeededRNG(42);
      for (let i = 0; i < 1000; i++) {
        const value = rng.nextIntExclusive(0, 10);
        expect(value).not.toBe(10);
      }
    });
  });

  describe('reset(seed)', () => {
    it('resets the RNG to produce the same sequence', () => {
      const rng = new SeededRNG(12345);
      const firstSequence = Array.from({ length: 5 }, () => rng.nextFloat());

      rng.reset(12345);
      const secondSequence = Array.from({ length: 5 }, () => rng.nextFloat());

      expect(firstSequence).toEqual(secondSequence);
    });

    it('can reset to a different seed', () => {
      const rng = new SeededRNG(12345);
      const firstSequence = Array.from({ length: 5 }, () => rng.nextFloat());

      rng.reset(54321);
      const secondSequence = Array.from({ length: 5 }, () => rng.nextFloat());

      expect(firstSequence).not.toEqual(secondSequence);
    });
  });

  describe('getSeed()', () => {
    it('returns the current seed', () => {
      const rng = new SeededRNG(12345);
      expect(rng.getSeed()).toBe(12345);
    });

    it('returns the new seed after reset', () => {
      const rng = new SeededRNG(12345);
      rng.reset(54321);
      expect(rng.getSeed()).toBe(54321);
    });
  });

  describe('pick(array)', () => {
    it('returns an element from the array', () => {
      const rng = new SeededRNG(42);
      const items = ['a', 'b', 'c', 'd', 'e'];
      for (let i = 0; i < 100; i++) {
        const picked = rng.pick(items);
        expect(items).toContain(picked);
      }
    });

    it('produces deterministic picks for the same seed', () => {
      const items = ['alpha', 'beta', 'gamma', 'delta'];

      const rng1 = new SeededRNG(12345);
      const picks1 = Array.from({ length: 10 }, () => rng1.pick(items));

      const rng2 = new SeededRNG(12345);
      const picks2 = Array.from({ length: 10 }, () => rng2.pick(items));

      expect(picks1).toEqual(picks2);
    });

    it('handles single-element arrays', () => {
      const rng = new SeededRNG(42);
      expect(rng.pick(['only'])).toBe('only');
    });
  });

  describe('shuffle(array)', () => {
    it('returns a shuffled copy (does not mutate original)', () => {
      const rng = new SeededRNG(42);
      const original = [1, 2, 3, 4, 5];
      const originalCopy = [...original];
      const shuffled = rng.shuffle(original);

      // Original unchanged
      expect(original).toEqual(originalCopy);
      // Shuffled contains same elements
      expect(shuffled.sort()).toEqual(originalCopy.sort());
    });

    it('produces deterministic shuffles for the same seed', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const rng1 = new SeededRNG(12345);
      const shuffled1 = rng1.shuffle(items);

      const rng2 = new SeededRNG(12345);
      const shuffled2 = rng2.shuffle(items);

      expect(shuffled1).toEqual(shuffled2);
    });

    it('handles empty arrays', () => {
      const rng = new SeededRNG(42);
      expect(rng.shuffle([])).toEqual([]);
    });

    it('handles single-element arrays', () => {
      const rng = new SeededRNG(42);
      expect(rng.shuffle([42])).toEqual([42]);
    });
  });

  describe('chance(probability)', () => {
    it('returns true with given probability', () => {
      const rng = new SeededRNG(42);
      let trueCount = 0;
      const trials = 10000;

      for (let i = 0; i < trials; i++) {
        if (rng.chance(0.3)) trueCount++;
      }

      // Expect roughly 30% true (3000)
      // Allow 5% variance (2500-3500)
      expect(trueCount).toBeGreaterThan(2500);
      expect(trueCount).toBeLessThan(3500);
    });

    it('returns true for probability 1.0', () => {
      const rng = new SeededRNG(42);
      for (let i = 0; i < 100; i++) {
        expect(rng.chance(1.0)).toBe(true);
      }
    });

    it('returns false for probability 0.0', () => {
      const rng = new SeededRNG(42);
      for (let i = 0; i < 100; i++) {
        expect(rng.chance(0.0)).toBe(false);
      }
    });

    it('produces deterministic results for the same seed', () => {
      const rng1 = new SeededRNG(12345);
      const results1 = Array.from({ length: 20 }, () => rng1.chance(0.5));

      const rng2 = new SeededRNG(12345);
      const results2 = Array.from({ length: 20 }, () => rng2.chance(0.5));

      expect(results1).toEqual(results2);
    });
  });

  describe('edge cases and robustness', () => {
    it('continues producing valid values after many iterations', () => {
      const rng = new SeededRNG(42);
      for (let i = 0; i < 100000; i++) {
        const value = rng.nextFloat();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('produces different values within a sequence', () => {
      const rng = new SeededRNG(42);
      const values = Array.from({ length: 100 }, () => rng.nextFloat());
      const uniqueValues = new Set(values);
      // Should have at least 95 unique values out of 100
      expect(uniqueValues.size).toBeGreaterThan(95);
    });
  });
});
