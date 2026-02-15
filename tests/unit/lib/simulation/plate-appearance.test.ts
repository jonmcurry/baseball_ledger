/**
 * Plate Appearance Resolution Unit Tests
 *
 * REQ-SIM-004: Card lookup with pitcher grade gate and IDT decision table.
 * Tests the real APBA BBW resolution flow:
 *   card draw -> grade check -> IDT table (pitcher wins) / direct mapping (batter wins)
 *
 * TDD: These tests are written FIRST before the implementation.
 */

import { SeededRNG } from '@lib/rng/seeded-rng';
import {
  selectCardPosition,
  readCardValue,
  resolvePlateAppearance,
  IDT_ACTIVE_LOW,
  IDT_ACTIVE_HIGH,
  isIDTActive,
} from '@lib/simulation/plate-appearance';
import { OutcomeCategory } from '@lib/types/game';
import { STRUCTURAL_POSITIONS } from '@lib/card-generator/structural';
import type { CardValue } from '@lib/types/player';

describe('REQ-SIM-004: Plate Appearance Resolution (Real APBA BBW IDT Flow)', () => {
  // Create a test card with known values at non-structural positions
  function createTestCard(fillValue: CardValue = 7): CardValue[] {
    const card: CardValue[] = new Array(35).fill(fillValue);
    // Apply structural constants at positions 1, 3, 6, 11, 13, 18, 23, 25, 32
    card[1] = 30;
    card[3] = 28;
    card[6] = 27;
    card[11] = 26;
    card[13] = 31;
    card[18] = 29;
    card[23] = 25;
    card[25] = 32;
    card[32] = 35;
    return card;
  }

  describe('IDT_ACTIVE_LOW and IDT_ACTIVE_HIGH constants', () => {
    it('IDT_ACTIVE_LOW is 5 (minimum thresholdLow in IDT table)', () => {
      expect(IDT_ACTIVE_LOW).toBe(5);
    });

    it('IDT_ACTIVE_HIGH is 25 (maximum thresholdHigh in IDT table)', () => {
      expect(IDT_ACTIVE_HIGH).toBe(25);
    });
  });

  describe('isIDTActive()', () => {
    it('returns true for values in IDT range [5, 25]', () => {
      expect(isIDTActive(5)).toBe(true);
      expect(isIDTActive(7)).toBe(true);   // single
      expect(isIDTActive(13)).toBe(true);  // walk
      expect(isIDTActive(14)).toBe(true);  // strikeout
      expect(isIDTActive(25)).toBe(true);
    });

    it('returns false for values below IDT range (0-4)', () => {
      expect(isIDTActive(0)).toBe(false);  // double
      expect(isIDTActive(1)).toBe(false);  // home run
      expect(isIDTActive(4)).toBe(false);
    });

    it('returns false for values above IDT range (26+)', () => {
      expect(isIDTActive(26)).toBe(false); // ground out
      expect(isIDTActive(30)).toBe(false); // ground out advance
      expect(isIDTActive(37)).toBe(false); // HR variant
      expect(isIDTActive(40)).toBe(false); // reached on error
      expect(isIDTActive(41)).toBe(false); // HR variant
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
      card[0] = 13; // Walk at position 0

      expect(readCardValue(card, 0)).toBe(13);
    });

    it('handles structural positions', () => {
      const card = createTestCard();
      expect(readCardValue(card, 1)).toBe(30);
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

    it('pitcher wins uses IDT for IDT-active values (diverse outcomes)', () => {
      // Card filled with value 7 (SINGLE_CLEAN, IDT-active).
      // Grade 15 always wins the grade check (R2 <= 15 is always true).
      // IDT should remap value 7 to various outcomes, not just SINGLE_CLEAN.
      const card = createTestCard(7);
      const rng = new SeededRNG(42);
      const outcomeSet = new Set<OutcomeCategory>();
      let idtUsedCount = 0;
      const samples = 500;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rng);
        outcomeSet.add(result.outcome);
        if (!result.usedFallback) {
          idtUsedCount++;
        }
      }

      // IDT should produce diverse outcomes (not just SINGLE_CLEAN)
      expect(outcomeSet.size).toBeGreaterThanOrEqual(3);
      // IDT should be used for most results (grade 15 always wins, 7 is IDT-active)
      expect(idtUsedCount).toBeGreaterThan(samples * 0.30);
    });

    it('batter wins uses direct mapping (grade 1, mostly SINGLE_CLEAN)', () => {
      // Card filled with value 7. Grade 1: pitcher wins only 1/15 = 6.7% of time.
      // Batter wins ~93% -> direct mapping -> value 7 = SINGLE_CLEAN.
      const card = createTestCard(7);
      const rng = new SeededRNG(42);
      let singles = 0;
      const samples = 500;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 1, rng);
        if (
          result.outcome === OutcomeCategory.SINGLE_CLEAN ||
          result.outcome === OutcomeCategory.SINGLE_ADVANCE
        ) {
          singles++;
        }
      }

      // With grade 1, batter wins ~93% of time -> direct mapping -> mostly singles
      expect(singles).toBeGreaterThan(samples * 0.70);
    });

    it('non-IDT values bypass IDT even when pitcher wins (value 1 = HR)', () => {
      // Card filled with value 1 (HOME_RUN, NOT IDT-active: 1 < 5).
      // Even grade 15 cannot suppress HRs through IDT.
      const card = createTestCard(1);
      const rng = new SeededRNG(42);
      let homeRuns = 0;
      const samples = 200;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rng);
        if (result.outcome === OutcomeCategory.HOME_RUN) {
          homeRuns++;
        }
        // Should always use fallback (direct mapping) since value 1 is not IDT-active
        expect(result.usedFallback).toBe(true);
      }

      // All draws should produce HOME_RUN via direct mapping
      expect(homeRuns).toBe(samples);
    });

    it('non-IDT values bypass IDT even when pitcher wins (value 0 = double)', () => {
      // Card filled with value 0 (DOUBLE, NOT IDT-active: 0 < 5).
      const card = createTestCard(0);
      const rng = new SeededRNG(42);
      let doubles = 0;
      const samples = 200;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rng);
        if (result.outcome === OutcomeCategory.DOUBLE) {
          doubles++;
        }
        expect(result.usedFallback).toBe(true);
      }

      expect(doubles).toBe(samples);
    });

    it('non-IDT out values always produce outs regardless of grade', () => {
      // Card filled with value 26 (GROUND_OUT, NOT IDT-active: 26 > 25).
      const card = createTestCard(26);
      const rng = new SeededRNG(42);
      let groundOuts = 0;
      const samples = 200;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 1, rng);
        if (result.outcome === OutcomeCategory.GROUND_OUT) {
          groundOuts++;
        }
        expect(result.usedFallback).toBe(true);
      }

      expect(groundOuts).toBe(samples);
    });

    it('higher pitcher grade produces more IDT outcomes', () => {
      // IDT-active card (value 7). Compare grade 15 vs grade 1 IDT usage.
      const card = createTestCard(7);
      const samples = 500;

      const rngHigh = new SeededRNG(42);
      let idtHighGrade = 0;
      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rngHigh);
        if (!result.usedFallback) idtHighGrade++;
      }

      const rngLow = new SeededRNG(42);
      let idtLowGrade = 0;
      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 1, rngLow);
        if (!result.usedFallback) idtLowGrade++;
      }

      // Grade 15 should trigger IDT much more often than grade 1
      expect(idtHighGrade).toBeGreaterThan(idtLowGrade);
    });

    it('higher pitcher grade produces more outs on IDT-active card', () => {
      const card = createTestCard(7); // singles, IDT-active
      const samples = 500;

      const rngHigh = new SeededRNG(42);
      let outsHighGrade = 0;
      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rngHigh);
        if (
          result.outcome >= OutcomeCategory.GROUND_OUT &&
          result.outcome <= OutcomeCategory.STRIKEOUT_SWINGING
        ) {
          outsHighGrade++;
        }
      }

      const rngLow = new SeededRNG(42);
      let outsLowGrade = 0;
      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 1, rngLow);
        if (
          result.outcome >= OutcomeCategory.GROUND_OUT &&
          result.outcome <= OutcomeCategory.STRIKEOUT_SWINGING
        ) {
          outsLowGrade++;
        }
      }

      // High grade pitcher should produce more outs through IDT
      expect(outsHighGrade).toBeGreaterThan(outsLowGrade);
    });

    it('outcomeTableRow is set when IDT is used', () => {
      // Grade 15 + IDT-active value should produce some IDT results
      const card = createTestCard(7);
      const rng = new SeededRNG(42);
      let hasTableRow = false;

      for (let i = 0; i < 100; i++) {
        const result = resolvePlateAppearance(card, 15, rng);
        if (result.outcomeTableRow !== undefined) {
          hasTableRow = true;
          expect(result.outcomeTableRow).toBeGreaterThanOrEqual(0);
          expect(result.outcomeTableRow).toBeLessThan(36);
          break;
        }
      }

      expect(hasTableRow).toBe(true);
    });

    it('outcomeTableRow is undefined when direct mapping is used', () => {
      // Value 1 (HR) is not IDT-active, always direct mapping
      const card = createTestCard(1);
      const rng = new SeededRNG(42);

      for (let i = 0; i < 50; i++) {
        const result = resolvePlateAppearance(card, 15, rng);
        expect(result.outcomeTableRow).toBeUndefined();
      }
    });

    it('grade check R2 roll is recorded in pitcherGradeEffect', () => {
      const card = createTestCard(7);
      const rng = new SeededRNG(42);

      const result = resolvePlateAppearance(card, 10, rng);

      expect(result.pitcherGradeEffect.r2Roll).toBeGreaterThanOrEqual(1);
      expect(result.pitcherGradeEffect.r2Roll).toBeLessThanOrEqual(15);
      expect(result.pitcherGradeEffect.originalValue).toBe(result.cardValue);
    });
  });
});
