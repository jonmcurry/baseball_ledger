/**
 * SeededRNG - Deterministic Random Number Generator
 *
 * REQ-NFR-007: Simulation determinism with seeded RNG.
 * Uses the Mulberry32 algorithm - a simple, fast, and well-distributed
 * 32-bit PRNG that produces deterministic sequences for any given seed.
 *
 * This is a Layer 1 module: pure logic with no I/O, runs in any JS runtime.
 *
 * @example
 * const rng = new SeededRNG(12345);
 * const roll = rng.nextInt(1, 6);  // Deterministic dice roll
 * const cardPosition = rng.nextIntExclusive(0, 35);  // Card lookup
 */

/**
 * Seeded pseudo-random number generator using Mulberry32 algorithm.
 * Produces deterministic sequences - same seed always gives same sequence.
 */
export class SeededRNG {
  private state: number;
  private initialSeed: number;

  /**
   * Create a new SeededRNG with the given seed.
   * @param seed - Initial seed value (any 32-bit integer)
   */
  constructor(seed: number) {
    this.initialSeed = seed;
    this.state = seed;
  }

  /**
   * Get the initial seed value.
   */
  getSeed(): number {
    return this.initialSeed;
  }

  /**
   * Reset the RNG to a new seed (or the original seed if not provided).
   * @param seed - New seed value
   */
  reset(seed: number): void {
    this.initialSeed = seed;
    this.state = seed;
  }

  /**
   * Generate the next random 32-bit integer using Mulberry32 algorithm.
   * Internal method used by all other generators.
   */
  private next32(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /**
   * Generate a random float in range [0, 1).
   * @returns A number >= 0 and < 1
   */
  nextFloat(): number {
    return this.next32() / 4294967296;
  }

  /**
   * Generate a random integer in range [min, max] (inclusive).
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   * @returns An integer >= min and <= max
   */
  nextInt(min: number, max: number): number {
    const range = max - min + 1;
    return Math.floor(this.nextFloat() * range) + min;
  }

  /**
   * Generate a random integer in range [min, max) (exclusive max).
   * Useful for array indexing where you want 0 to length-1.
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns An integer >= min and < max
   */
  nextIntExclusive(min: number, max: number): number {
    const range = max - min;
    return Math.floor(this.nextFloat() * range) + min;
  }

  /**
   * Return true with the given probability.
   * @param probability - Value between 0.0 and 1.0
   * @returns True with the given probability
   */
  chance(probability: number): boolean {
    return this.nextFloat() < probability;
  }

  /**
   * Pick a random element from an array.
   * @param array - Non-empty array to pick from
   * @returns A randomly selected element
   */
  pick<T>(array: readonly T[]): T {
    const index = this.nextIntExclusive(0, array.length);
    return array[index];
  }

  /**
   * Return a shuffled copy of the array using Fisher-Yates shuffle.
   * Does not mutate the original array.
   * @param array - Array to shuffle
   * @returns A new array with elements in random order
   */
  shuffle<T>(array: readonly T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextIntExclusive(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
