/**
 * Tests for SERD 5-column plate appearance resolution.
 *
 * Pitcher grade selects which column (A-E) to read from the batter's card:
 *   Grade 20+  -> Column A (elite: singles 0.70, HRs 0.75, Ks 1.40)
 *   Grade 15-19 -> Column B (ace: singles 0.85, HRs 0.88, Ks 1.20)
 *   Grade 7-14  -> Column C (neutral: all 1.00)
 *   Grade 4-6   -> Column D (below avg: singles 1.15, HRs 1.12, Ks 0.80)
 *   Grade 1-3   -> Column E (terrible: singles 1.30, HRs 1.25, Ks 0.60)
 *
 * One RNG roll -> one column lookup -> one outcome. No secondary grade check.
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

/** Build a card where each column has a distinct repeated outcome. */
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

/** Build a card with distinct outcomes per column to verify column selection. */
function makeColumnTestCard(): ApbaCard {
  return makeUniformCard({
    A: OutcomeCategory.STRIKEOUT_SWINGING,
    B: OutcomeCategory.FLY_OUT,
    C: OutcomeCategory.SINGLE_CLEAN,
    D: OutcomeCategory.DOUBLE,
    E: OutcomeCategory.HOME_RUN,
  });
}

// --- Tests ---

describe('SERD 5-Column Plate Appearance Resolution', () => {
  describe('gradeToColumn() mapping', () => {
    it('maps grade 1-3 to E (terrible)', () => {
      expect(gradeToColumn(1)).toBe('E');
      expect(gradeToColumn(3)).toBe('E');
    });

    it('maps grade 4-6 to D (below average)', () => {
      expect(gradeToColumn(4)).toBe('D');
      expect(gradeToColumn(6)).toBe('D');
    });

    it('maps grade 7-14 to C (average through #1 starter)', () => {
      expect(gradeToColumn(7)).toBe('C');
      expect(gradeToColumn(14)).toBe('C');
    });

    it('maps grade 15-19 to B (strong ace, near-elite)', () => {
      expect(gradeToColumn(15)).toBe('B');
      expect(gradeToColumn(19)).toBe('B');
    });

    it('maps grade 20-30 to A (elite/historic)', () => {
      expect(gradeToColumn(20)).toBe('A');
      expect(gradeToColumn(30)).toBe('A');
    });
  });

  describe('resolvePlateAppearance() structure', () => {
    it('returns a valid PlateAppearanceResult', () => {
      const card = makeUniformCard({
        A: OutcomeCategory.WALK, B: OutcomeCategory.WALK,
        C: OutcomeCategory.WALK, D: OutcomeCategory.WALK,
        E: OutcomeCategory.WALK,
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

    it('selects column dynamically based on pitcher grade', () => {
      const card = makeColumnTestCard();

      // Grade 10 -> Column C -> SINGLE_CLEAN
      expect(resolvePlateAppearance(card, 10, new SeededRNG(42)).column).toBe('C');
      expect(resolvePlateAppearance(card, 10, new SeededRNG(42)).outcome).toBe(OutcomeCategory.SINGLE_CLEAN);

      // Grade 20 -> Column A -> STRIKEOUT_SWINGING
      expect(resolvePlateAppearance(card, 20, new SeededRNG(42)).column).toBe('A');
      expect(resolvePlateAppearance(card, 20, new SeededRNG(42)).outcome).toBe(OutcomeCategory.STRIKEOUT_SWINGING);

      // Grade 3 -> Column E -> HOME_RUN
      expect(resolvePlateAppearance(card, 3, new SeededRNG(42)).column).toBe('E');
      expect(resolvePlateAppearance(card, 3, new SeededRNG(42)).outcome).toBe(OutcomeCategory.HOME_RUN);

      // Grade 15 -> Column B -> FLY_OUT
      expect(resolvePlateAppearance(card, 15, new SeededRNG(42)).column).toBe('B');
      expect(resolvePlateAppearance(card, 15, new SeededRNG(42)).outcome).toBe(OutcomeCategory.FLY_OUT);

      // Grade 5 -> Column D -> DOUBLE
      expect(resolvePlateAppearance(card, 5, new SeededRNG(42)).column).toBe('D');
      expect(resolvePlateAppearance(card, 5, new SeededRNG(42)).outcome).toBe(OutcomeCategory.DOUBLE);
    });

    it('roll index is always in [0, 35]', () => {
      const card = makeColumnTestCard();
      for (let seed = 1; seed <= 200; seed++) {
        const rng = new SeededRNG(seed);
        const result = resolvePlateAppearance(card, 10, rng);
        expect(result.cardPosition).toBeGreaterThanOrEqual(0);
        expect(result.cardPosition).toBeLessThanOrEqual(35);
      }
    });

    it('pitcherGradeEffect.r2Roll equals the effective grade', () => {
      const card = makeColumnTestCard();
      const rng = new SeededRNG(42);
      const result = resolvePlateAppearance(card, 20, rng);
      expect(result.pitcherGradeEffect.r2Roll).toBe(20);
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
  });

  describe('column-based pitcher influence', () => {
    it('Column A (elite pitcher) produces fewer hits than Column C (average)', () => {
      // Card where Column C has 18/36 singles, Column A has 13/36 singles
      const neutral = [
        ...Array(18).fill(OutcomeCategory.SINGLE_CLEAN),
        ...Array(18).fill(OutcomeCategory.GROUND_OUT),
      ];
      const colA = [
        ...Array(13).fill(OutcomeCategory.SINGLE_CLEAN),
        ...Array(23).fill(OutcomeCategory.GROUND_OUT),
      ];
      const card: ApbaCard = {
        A: colA, B: neutral, C: neutral, D: neutral, E: neutral,
      };

      let hitsGrade20 = 0; // Column A
      let hitsGrade10 = 0; // Column C
      const trials = 500;

      for (let seed = 1; seed <= trials; seed++) {
        if (resolvePlateAppearance(card, 20, new SeededRNG(seed)).outcome === OutcomeCategory.SINGLE_CLEAN) hitsGrade20++;
        if (resolvePlateAppearance(card, 10, new SeededRNG(seed)).outcome === OutcomeCategory.SINGLE_CLEAN) hitsGrade10++;
      }

      expect(hitsGrade20).toBeLessThan(hitsGrade10);
    });

    it('Column E (terrible pitcher) produces more hits than Column C (average)', () => {
      const neutral = [
        ...Array(18).fill(OutcomeCategory.SINGLE_CLEAN),
        ...Array(18).fill(OutcomeCategory.GROUND_OUT),
      ];
      const colE = [
        ...Array(23).fill(OutcomeCategory.SINGLE_CLEAN),
        ...Array(13).fill(OutcomeCategory.GROUND_OUT),
      ];
      const card: ApbaCard = {
        A: neutral, B: neutral, C: neutral, D: neutral, E: colE,
      };

      let hitsGrade3 = 0;  // Column E
      let hitsGrade10 = 0; // Column C
      const trials = 500;

      for (let seed = 1; seed <= trials; seed++) {
        if (resolvePlateAppearance(card, 3, new SeededRNG(seed)).outcome === OutcomeCategory.SINGLE_CLEAN) hitsGrade3++;
        if (resolvePlateAppearance(card, 10, new SeededRNG(seed)).outcome === OutcomeCategory.SINGLE_CLEAN) hitsGrade10++;
      }

      expect(hitsGrade3).toBeGreaterThan(hitsGrade10);
    });

    it('all outcome types vary by column (not just singles/triples)', () => {
      const card: ApbaCard = {
        A: Array(36).fill(OutcomeCategory.STRIKEOUT_SWINGING),
        B: Array(36).fill(OutcomeCategory.FLY_OUT),
        C: Array(36).fill(OutcomeCategory.HOME_RUN),
        D: Array(36).fill(OutcomeCategory.WALK),
        E: Array(36).fill(OutcomeCategory.DOUBLE),
      };

      // Grade 20 -> Column A -> strikeout
      expect(resolvePlateAppearance(card, 20, new SeededRNG(1)).outcome).toBe(OutcomeCategory.STRIKEOUT_SWINGING);
      // Grade 10 -> Column C -> home run
      expect(resolvePlateAppearance(card, 10, new SeededRNG(1)).outcome).toBe(OutcomeCategory.HOME_RUN);
      // Grade 2 -> Column E -> double
      expect(resolvePlateAppearance(card, 2, new SeededRNG(1)).outcome).toBe(OutcomeCategory.DOUBLE);
    });

    it('no grade check: outcome is read directly from column without suppression', () => {
      // All columns have SINGLE_CLEAN. With legacy grade check, high grade would
      // suppress some singles. With column system, outcome is always the card value.
      const card = makeUniformCard({
        A: OutcomeCategory.SINGLE_CLEAN, B: OutcomeCategory.SINGLE_CLEAN,
        C: OutcomeCategory.SINGLE_CLEAN, D: OutcomeCategory.SINGLE_CLEAN,
        E: OutcomeCategory.SINGLE_CLEAN,
      });

      for (let seed = 1; seed <= 100; seed++) {
        const result = resolvePlateAppearance(card, 30, new SeededRNG(seed));
        expect(result.outcome).toBe(OutcomeCategory.SINGLE_CLEAN);
        expect(result.pitcherGradeEffect.pitcherWon).toBe(false);
      }
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
