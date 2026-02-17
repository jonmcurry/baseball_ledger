/**
 * Tests for SERD single-algorithm plate appearance resolution.
 *
 * One PRNG roll -> one column lookup -> one outcome.
 * Pitcher grade selects column A-E. Card directly contains OutcomeCategory values.
 */

import { OutcomeCategory } from '@lib/types/game';
import type { ApbaCard, ApbaColumn } from '@lib/types/player';
import { SeededRNG } from '@lib/rng/seeded-rng';
import {
  resolvePlateAppearance,
  gradeToColumn,
  IDT_ACTIVE_LOW,
  IDT_ACTIVE_HIGH,
} from '@lib/simulation/plate-appearance';

// --- Helpers ---

/** Build a simple test card where each column has a single repeated outcome. */
function makeUniformCard(outcomes: Record<ApbaColumn, OutcomeCategory>): ApbaCard {
  return {
    A: Array(36).fill(outcomes.A),
    B: Array(36).fill(outcomes.B),
    C: Array(36).fill(outcomes.C),
    D: Array(36).fill(outcomes.D),
    E: Array(36).fill(outcomes.E),
  };
}

/** Build a card where column C has a specific pattern and others are all outs. */
function makeTestCard(columnCOutcomes: OutcomeCategory[]): ApbaCard {
  const outs = Array(36).fill(OutcomeCategory.GROUND_OUT);
  return {
    A: [...outs],
    B: [...outs],
    C: columnCOutcomes.length === 36 ? columnCOutcomes : [...columnCOutcomes, ...outs].slice(0, 36),
    D: [...outs],
    E: [...outs],
  };
}

// --- Tests ---

describe('SERD Plate Appearance Resolution', () => {
  describe('gradeToColumn()', () => {
    it('maps grade 1-3 to E (terrible)', () => {
      expect(gradeToColumn(1)).toBe('E');
      expect(gradeToColumn(3)).toBe('E');
    });

    it('maps grade 4-6 to D (below average)', () => {
      expect(gradeToColumn(4)).toBe('D');
      expect(gradeToColumn(6)).toBe('D');
    });

    it('maps grade 7-12 to C (average)', () => {
      expect(gradeToColumn(7)).toBe('C');
      expect(gradeToColumn(12)).toBe('C');
    });

    it('maps grade 13-18 to B (strong)', () => {
      expect(gradeToColumn(13)).toBe('B');
      expect(gradeToColumn(18)).toBe('B');
    });

    it('maps grade 19-30 to A (elite)', () => {
      expect(gradeToColumn(19)).toBe('A');
      expect(gradeToColumn(30)).toBe('A');
    });
  });

  describe('resolvePlateAppearance()', () => {
    it('returns a valid PlateAppearanceResult', () => {
      const card = makeUniformCard({
        A: OutcomeCategory.STRIKEOUT_SWINGING,
        B: OutcomeCategory.FLY_OUT,
        C: OutcomeCategory.SINGLE_CLEAN,
        D: OutcomeCategory.DOUBLE,
        E: OutcomeCategory.HOME_RUN,
      });
      const rng = new SeededRNG(42);
      const result = resolvePlateAppearance(card, 10, rng);

      expect(result).toHaveProperty('cardPosition');
      expect(result).toHaveProperty('cardValue');
      expect(result).toHaveProperty('outcome');
      expect(result).toHaveProperty('usedFallback');
      expect(result).toHaveProperty('pitcherGradeEffect');
      expect(result).toHaveProperty('column');
      expect(result.outcomeTableRow).toBeUndefined();
      expect(result.usedFallback).toBe(false);
    });

    it('grade 10 selects column C and returns SINGLE_CLEAN from uniform card', () => {
      const card = makeUniformCard({
        A: OutcomeCategory.STRIKEOUT_SWINGING,
        B: OutcomeCategory.FLY_OUT,
        C: OutcomeCategory.SINGLE_CLEAN,
        D: OutcomeCategory.DOUBLE,
        E: OutcomeCategory.HOME_RUN,
      });
      const rng = new SeededRNG(42);
      const result = resolvePlateAppearance(card, 10, rng);
      expect(result.column).toBe('C');
      expect(result.outcome).toBe(OutcomeCategory.SINGLE_CLEAN);
    });

    it('grade 20 selects column A', () => {
      const card = makeUniformCard({
        A: OutcomeCategory.STRIKEOUT_SWINGING,
        B: OutcomeCategory.FLY_OUT,
        C: OutcomeCategory.SINGLE_CLEAN,
        D: OutcomeCategory.DOUBLE,
        E: OutcomeCategory.HOME_RUN,
      });
      const rng = new SeededRNG(42);
      const result = resolvePlateAppearance(card, 20, rng);
      expect(result.column).toBe('A');
      expect(result.outcome).toBe(OutcomeCategory.STRIKEOUT_SWINGING);
    });

    it('grade 2 selects column E', () => {
      const card = makeUniformCard({
        A: OutcomeCategory.STRIKEOUT_SWINGING,
        B: OutcomeCategory.FLY_OUT,
        C: OutcomeCategory.SINGLE_CLEAN,
        D: OutcomeCategory.DOUBLE,
        E: OutcomeCategory.HOME_RUN,
      });
      const rng = new SeededRNG(42);
      const result = resolvePlateAppearance(card, 2, rng);
      expect(result.column).toBe('E');
      expect(result.outcome).toBe(OutcomeCategory.HOME_RUN);
    });

    it('same seed produces same outcome (determinism)', () => {
      const card = makeTestCard([
        OutcomeCategory.SINGLE_CLEAN, OutcomeCategory.DOUBLE, OutcomeCategory.HOME_RUN,
        OutcomeCategory.WALK, OutcomeCategory.STRIKEOUT_SWINGING, OutcomeCategory.FLY_OUT,
        OutcomeCategory.GROUND_OUT, OutcomeCategory.SINGLE_ADVANCE, OutcomeCategory.TRIPLE,
        ...Array(27).fill(OutcomeCategory.GROUND_OUT),
      ]);

      const results1: OutcomeCategory[] = [];
      const results2: OutcomeCategory[] = [];

      for (let i = 0; i < 10; i++) {
        const rng1 = new SeededRNG(100 + i);
        const rng2 = new SeededRNG(100 + i);
        results1.push(resolvePlateAppearance(card, 10, rng1).outcome);
        results2.push(resolvePlateAppearance(card, 10, rng2).outcome);
      }

      expect(results1).toEqual(results2);
    });

    it('different seeds produce different outcomes', () => {
      const card = makeTestCard([
        OutcomeCategory.SINGLE_CLEAN, OutcomeCategory.DOUBLE, OutcomeCategory.HOME_RUN,
        OutcomeCategory.WALK, OutcomeCategory.STRIKEOUT_SWINGING, OutcomeCategory.FLY_OUT,
        OutcomeCategory.GROUND_OUT, OutcomeCategory.SINGLE_ADVANCE, OutcomeCategory.TRIPLE,
        ...Array(27).fill(OutcomeCategory.GROUND_OUT),
      ]);

      const outcomes = new Set<OutcomeCategory>();
      for (let seed = 1; seed <= 100; seed++) {
        const rng = new SeededRNG(seed);
        outcomes.add(resolvePlateAppearance(card, 10, rng).outcome);
      }
      expect(outcomes.size).toBeGreaterThan(1);
    });

    it('roll index is always in [0, 35]', () => {
      const card = makeUniformCard({
        A: OutcomeCategory.GROUND_OUT,
        B: OutcomeCategory.GROUND_OUT,
        C: OutcomeCategory.GROUND_OUT,
        D: OutcomeCategory.GROUND_OUT,
        E: OutcomeCategory.GROUND_OUT,
      });

      for (let seed = 1; seed <= 200; seed++) {
        const rng = new SeededRNG(seed);
        const result = resolvePlateAppearance(card, 10, rng);
        expect(result.cardPosition).toBeGreaterThanOrEqual(0);
        expect(result.cardPosition).toBeLessThanOrEqual(35);
      }
    });

    it('higher grade produces more outs (column A vs column E)', () => {
      const card: ApbaCard = {
        A: Array(36).fill(OutcomeCategory.STRIKEOUT_SWINGING),
        B: [...Array(18).fill(OutcomeCategory.STRIKEOUT_SWINGING), ...Array(18).fill(OutcomeCategory.SINGLE_CLEAN)],
        C: [...Array(12).fill(OutcomeCategory.STRIKEOUT_SWINGING), ...Array(24).fill(OutcomeCategory.SINGLE_CLEAN)],
        D: [...Array(6).fill(OutcomeCategory.STRIKEOUT_SWINGING), ...Array(30).fill(OutcomeCategory.SINGLE_CLEAN)],
        E: Array(36).fill(OutcomeCategory.SINGLE_CLEAN),
      };

      let hitsGrade25 = 0;
      let hitsGrade3 = 0;

      for (let seed = 1; seed <= 500; seed++) {
        const rng25 = new SeededRNG(seed);
        const rng3 = new SeededRNG(seed);
        if (resolvePlateAppearance(card, 25, rng25).outcome === OutcomeCategory.SINGLE_CLEAN) hitsGrade25++;
        if (resolvePlateAppearance(card, 3, rng3).outcome === OutcomeCategory.SINGLE_CLEAN) hitsGrade3++;
      }

      expect(hitsGrade25).toBe(0);
      expect(hitsGrade3).toBe(500);
    });

    it('cardValue matches the outcome enum value', () => {
      const card = makeUniformCard({
        A: OutcomeCategory.WALK,
        B: OutcomeCategory.WALK,
        C: OutcomeCategory.WALK,
        D: OutcomeCategory.WALK,
        E: OutcomeCategory.WALK,
      });
      const rng = new SeededRNG(42);
      const result = resolvePlateAppearance(card, 10, rng);
      expect(result.cardValue).toBe(OutcomeCategory.WALK);
      expect(result.cardValue).toBe(result.outcome);
    });

    it('pitcherGradeEffect.r2Roll equals the effective grade', () => {
      const card = makeUniformCard({
        A: OutcomeCategory.GROUND_OUT,
        B: OutcomeCategory.GROUND_OUT,
        C: OutcomeCategory.GROUND_OUT,
        D: OutcomeCategory.GROUND_OUT,
        E: OutcomeCategory.GROUND_OUT,
      });
      const rng = new SeededRNG(42);
      const result = resolvePlateAppearance(card, 20, rng);
      expect(result.pitcherGradeEffect.r2Roll).toBe(20);
    });
  });

  describe('legacy constants', () => {
    it('IDT_ACTIVE_LOW is 15 (backwards compatibility)', () => {
      expect(IDT_ACTIVE_LOW).toBe(15);
    });

    it('IDT_ACTIVE_HIGH is 23 (backwards compatibility)', () => {
      expect(IDT_ACTIVE_HIGH).toBe(23);
    });
  });
});
