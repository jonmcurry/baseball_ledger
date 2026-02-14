/**
 * Plate Appearance Resolution Unit Tests
 *
 * REQ-SIM-004: Card lookup with pitcher grade gate.
 * This is the core plate appearance resolution that combines:
 * - Card position selection
 * - Structural constant skipping
 * - Pitcher grade gate (higher grade = more likely to shift hits to outs)
 * - OutcomeTable lookup
 * - Direct card value fallback
 *
 * TDD: These tests are written FIRST before the implementation.
 */

import { SeededRNG } from '@lib/rng/seeded-rng';
import {
  selectCardPosition,
  readCardValue,
  applyPitcherGradeGate,
  resolvePlateAppearance,
  PlateAppearanceResult,
  HIT_CARD_VALUES,
  isHitCardValue,
} from '@lib/simulation/plate-appearance';
import { OutcomeCategory } from '@lib/types/game';
import { STRUCTURAL_POSITIONS } from '@lib/card-generator/structural';
import type { CardValue } from '@lib/types/player';

describe('REQ-SIM-004: Plate Appearance Resolution', () => {
  // Create a test card with known values at non-structural positions
  function createTestCard(): CardValue[] {
    const card: CardValue[] = new Array(35).fill(7); // Default to 7 (SINGLE_CLEAN)
    // Apply structural constants at positions 0, 2, 5, 10, 12, 17, 22, 24, 31
    card[0] = 30;
    card[2] = 28;
    card[5] = 27;
    card[10] = 26;
    card[12] = 31;
    card[17] = 29;
    card[22] = 25;
    card[24] = 32;
    card[31] = 35;
    return card;
  }

  describe('HIT_CARD_VALUES constant', () => {
    it('includes hit-type card values from SRD', () => {
      // From SRD REQ-SIM-004 step 4d: hit types are 0,1,5,7,8,9,10,11,37,40,41
      expect(HIT_CARD_VALUES).toContain(0);  // Double
      expect(HIT_CARD_VALUES).toContain(1);  // Home Run
      expect(HIT_CARD_VALUES).toContain(5);  // HR variant
      expect(HIT_CARD_VALUES).toContain(7);  // Single A
      expect(HIT_CARD_VALUES).toContain(8);  // Single B
      expect(HIT_CARD_VALUES).toContain(9);  // Single C
      expect(HIT_CARD_VALUES).toContain(10); // Triple A
      expect(HIT_CARD_VALUES).toContain(11); // Triple B
      expect(HIT_CARD_VALUES).toContain(37); // HR variant
      expect(HIT_CARD_VALUES).toContain(40); // Hit/special
      expect(HIT_CARD_VALUES).toContain(41); // HR variant
    });
  });

  describe('isHitCardValue()', () => {
    it('returns true for hit card values', () => {
      expect(isHitCardValue(1)).toBe(true);  // Home run
      expect(isHitCardValue(7)).toBe(true);  // Single
      expect(isHitCardValue(0)).toBe(true);  // Double
    });

    it('returns false for non-hit card values', () => {
      expect(isHitCardValue(13)).toBe(false);  // Walk
      expect(isHitCardValue(14)).toBe(false);  // Strikeout
      expect(isHitCardValue(24)).toBe(false);  // Line out
    });
  });

  describe('selectCardPosition()', () => {
    it('returns a position in range [0, 34]', () => {
      const rng = new SeededRNG(42);
      for (let i = 0; i < 100; i++) {
        const pos = selectCardPosition(rng);
        expect(pos).toBeGreaterThanOrEqual(0);
        expect(pos).toBeLessThanOrEqual(34);
      }
    });

    it('produces deterministic results with same seed', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const sequence1 = Array.from({ length: 20 }, () => selectCardPosition(rng1));
      const sequence2 = Array.from({ length: 20 }, () => selectCardPosition(rng2));

      expect(sequence1).toEqual(sequence2);
    });

    it('skips structural constant positions (re-rolls)', () => {
      const rng = new SeededRNG(42);
      const structuralSet = new Set(STRUCTURAL_POSITIONS);

      for (let i = 0; i < 100; i++) {
        const pos = selectCardPosition(rng);
        expect(structuralSet.has(pos)).toBe(false);
      }
    });
  });

  describe('readCardValue()', () => {
    it('returns the value at the given position', () => {
      const card = createTestCard();
      card[1] = 13; // Walk at position 1

      expect(readCardValue(card, 1)).toBe(13);
    });

    it('handles structural positions (returns value but should not normally be called)', () => {
      const card = createTestCard();
      // Position 0 is structural with value 30
      expect(readCardValue(card, 0)).toBe(30);
    });
  });

  describe('applyPitcherGradeGate()', () => {
    it('does not change non-hit card values', () => {
      const rng = new SeededRNG(42);

      // Non-hit values should pass through unchanged
      for (let i = 0; i < 100; i++) {
        const result = applyPitcherGradeGate(13, 15, rng); // 13 = walk
        expect(result.originalValue).toBe(13);
        expect(result.finalValue).toBe(13);
        expect(result.pitcherWon).toBe(false);
      }
    });

    it('has chance to shift hit values based on pitcher grade', () => {
      const rng = new SeededRNG(42);
      let pitcherWins = 0;
      const samples = 1000;

      for (let i = 0; i < samples; i++) {
        const result = applyPitcherGradeGate(7, 15, rng); // Value 7 is a hit, grade 15 is max
        if (result.pitcherWon) {
          pitcherWins++;
        }
      }

      // Grade 15 = (15/15) * 0.20 = 20% combined suppression.
      // With 1000 samples, expect 150-250 suppressions.
      expect(pitcherWins).toBeGreaterThan(samples * 0.12);
      expect(pitcherWins).toBeLessThan(samples * 0.30);
    });

    it('low grade pitchers rarely win the matchup', () => {
      const rng = new SeededRNG(42);
      let pitcherWins = 0;
      const samples = 1000;

      for (let i = 0; i < samples; i++) {
        const result = applyPitcherGradeGate(7, 1, rng); // Value 7 is a hit, grade 1 is min
        if (result.pitcherWon) {
          pitcherWins++;
        }
      }

      // With grade 1/15, pitcher should win rarely
      // R2 must be <= 1, which is 1/15 chance, then shift happens 1/15 of those times
      expect(pitcherWins).toBeLessThan(samples * 0.2);
    });

    it('returns deterministic results with same seed', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const results1 = Array.from({ length: 20 }, () =>
        applyPitcherGradeGate(7, 10, rng1)
      );
      const results2 = Array.from({ length: 20 }, () =>
        applyPitcherGradeGate(7, 10, rng2)
      );

      expect(results1).toEqual(results2);
    });
  });

  describe('resolvePlateAppearance()', () => {
    it('returns a PlateAppearanceResult with all required fields', () => {
      const rng = new SeededRNG(42);
      const card = createTestCard();

      const result = resolvePlateAppearance(card, 10, rng);

      expect(result).toHaveProperty('cardPosition');
      expect(result).toHaveProperty('cardValue');
      expect(result).toHaveProperty('outcome');
      expect(result).toHaveProperty('usedFallback');
      expect(result).toHaveProperty('pitcherGradeEffect');
    });

    it('cardPosition is always a non-structural position', () => {
      const rng = new SeededRNG(42);
      const card = createTestCard();
      const structuralSet = new Set(STRUCTURAL_POSITIONS);

      for (let i = 0; i < 100; i++) {
        const result = resolvePlateAppearance(card, 10, rng);
        expect(structuralSet.has(result.cardPosition)).toBe(false);
      }
    });

    it('outcome is a valid OutcomeCategory', () => {
      const rng = new SeededRNG(42);
      const card = createTestCard();

      for (let i = 0; i < 100; i++) {
        const result = resolvePlateAppearance(card, 10, rng);
        expect(Object.values(OutcomeCategory)).toContain(result.outcome);
      }
    });

    it('produces deterministic results with same seed', () => {
      const card = createTestCard();

      const rng1 = new SeededRNG(12345);
      const results1 = Array.from({ length: 10 }, () =>
        resolvePlateAppearance(card, 10, rng1)
      );

      const rng2 = new SeededRNG(12345);
      const results2 = Array.from({ length: 10 }, () =>
        resolvePlateAppearance(card, 10, rng2)
      );

      expect(results1).toEqual(results2);
    });

    it('maps card values directly to outcomes without IDT table', () => {
      // Card filled with value 7 (SINGLE_CLEAN) should produce singles
      // when not suppressed by grade gate
      const card = createTestCard();
      const rng = new SeededRNG(42);
      let singles = 0;
      const samples = 100;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 8, rng); // Grade 8 = ~10.7% suppression
        if (
          result.outcome === OutcomeCategory.SINGLE_CLEAN ||
          result.outcome === OutcomeCategory.SINGLE_ADVANCE
        ) {
          singles++;
        }
      }

      // All 26 variable positions have value 7 (SINGLE_CLEAN).
      // Grade 8 suppresses ~10.7% of hits, so expect ~89-100 singles out of 100.
      expect(singles).toBeGreaterThanOrEqual(80);
      expect(singles).toBeLessThanOrEqual(samples);
    });

    it('grade 15 suppresses approximately 20% of hits', () => {
      const rng = new SeededRNG(42);
      let pitcherWins = 0;
      const samples = 5000;

      for (let i = 0; i < samples; i++) {
        const result = applyPitcherGradeGate(7, 15, rng);
        if (result.pitcherWon) {
          pitcherWins++;
        }
      }

      // Combined suppression = (15/15) * 0.20 = 20%, expect 15-25% range
      const rate = pitcherWins / samples;
      expect(rate).toBeGreaterThanOrEqual(0.15);
      expect(rate).toBeLessThanOrEqual(0.25);
    });

    it('grade 8 suppresses approximately 10% of hits', () => {
      const rng = new SeededRNG(42);
      let pitcherWins = 0;
      const samples = 5000;

      for (let i = 0; i < samples; i++) {
        const result = applyPitcherGradeGate(7, 8, rng);
        if (result.pitcherWon) {
          pitcherWins++;
        }
      }

      // Combined suppression = (8/15) * 0.20 = 10.7%, expect 7-15% range
      const rate = pitcherWins / samples;
      expect(rate).toBeGreaterThanOrEqual(0.07);
      expect(rate).toBeLessThanOrEqual(0.15);
    });

    it('grade 1 suppresses approximately 1.3% of hits', () => {
      const rng = new SeededRNG(42);
      let pitcherWins = 0;
      const samples = 5000;

      for (let i = 0; i < samples; i++) {
        const result = applyPitcherGradeGate(7, 1, rng);
        if (result.pitcherWon) {
          pitcherWins++;
        }
      }

      // Combined suppression = (1/15) * 0.20 = 1.3%, expect 0-4% range
      const rate = pitcherWins / samples;
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(0.04);
    });

    it('higher pitcher grade produces more outs', () => {
      const card = createTestCard();
      // Fill with hit values
      for (let i = 0; i < 35; i++) {
        if (!new Set(STRUCTURAL_POSITIONS).has(i)) {
          card[i] = 7; // Single
        }
      }

      // Test with high grade pitcher
      const rngHigh = new SeededRNG(42);
      let outsWithHighGrade = 0;
      const samples = 500;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rngHigh);
        if (
          result.outcome >= OutcomeCategory.GROUND_OUT &&
          result.outcome <= OutcomeCategory.STRIKEOUT_SWINGING
        ) {
          outsWithHighGrade++;
        }
      }

      // Test with low grade pitcher
      const rngLow = new SeededRNG(42);
      let outsWithLowGrade = 0;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 1, rngLow);
        if (
          result.outcome >= OutcomeCategory.GROUND_OUT &&
          result.outcome <= OutcomeCategory.STRIKEOUT_SWINGING
        ) {
          outsWithLowGrade++;
        }
      }

      // High grade should produce more outs
      expect(outsWithHighGrade).toBeGreaterThan(outsWithLowGrade);
    });
  });
});
