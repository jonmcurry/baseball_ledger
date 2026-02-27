/**
 * Tests for BBW-faithful plate appearance resolution.
 *
 * BBW grade-check mechanism: batter's card determines base outcomes (Column C),
 * then pitcher grade selectively suppresses SINGLE_CLEAN and TRIPLE via a
 * grade check (random(36) < effectiveGrade). All other outcomes (WALK, HR,
 * DOUBLE, STRIKEOUT, SINGLE_ADVANCE, etc.) are batter-determined and NOT
 * affected by pitcher grade.
 *
 * Confirmed by Ghidra decompilation of FUN_1058_5f49:
 * - Card values 7/8 (singles) and 11 (triples) go through grade check
 * - Card values 13 (walks), 14 (K), 0 (doubles), 1 (HR) resolve directly
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

/** All-one-outcome card for Column C. */
function makeAllColumnC(outcome: OutcomeCategory): ApbaCard {
  return makeUniformCard({
    A: OutcomeCategory.GROUND_OUT,
    B: OutcomeCategory.GROUND_OUT,
    C: outcome,
    D: OutcomeCategory.GROUND_OUT,
    E: OutcomeCategory.GROUND_OUT,
  });
}

// --- Tests ---

describe('BBW Plate Appearance Resolution', () => {
  describe('gradeToColumn() (legacy, backwards compatibility)', () => {
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
      const card = makeAllColumnC(OutcomeCategory.WALK);
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

    it('always uses column C regardless of grade', () => {
      const card = makeAllColumnC(OutcomeCategory.WALK);
      for (const grade of [1, 5, 10, 15, 20, 25, 30]) {
        const rng = new SeededRNG(42);
        const result = resolvePlateAppearance(card, grade, rng);
        expect(result.column).toBe('C');
      }
    });

    it('roll index is always in [0, 35]', () => {
      const card = makeAllColumnC(OutcomeCategory.GROUND_OUT);
      for (let seed = 1; seed <= 200; seed++) {
        const rng = new SeededRNG(seed);
        const result = resolvePlateAppearance(card, 10, rng);
        expect(result.cardPosition).toBeGreaterThanOrEqual(0);
        expect(result.cardPosition).toBeLessThanOrEqual(35);
      }
    });

    it('pitcherGradeEffect.r2Roll equals the effective grade', () => {
      const card = makeAllColumnC(OutcomeCategory.GROUND_OUT);
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

  describe('BBW grade check -- SINGLE_CLEAN suppression', () => {
    it('grade 25 suppresses most SINGLE_CLEAN outcomes to outs', () => {
      const card = makeAllColumnC(OutcomeCategory.SINGLE_CLEAN);
      let hits = 0;
      const trials = 1000;

      for (let seed = 1; seed <= trials; seed++) {
        const rng = new SeededRNG(seed);
        const result = resolvePlateAppearance(card, 25, rng);
        if (result.outcome === OutcomeCategory.SINGLE_CLEAN) hits++;
      }

      // Grade 25/36 = ~69% suppression -> ~31% should survive as hits
      expect(hits).toBeGreaterThan(200);     // At least 20% survive
      expect(hits).toBeLessThan(450);        // At most 45% survive
    });

    it('grade 1 barely suppresses SINGLE_CLEAN outcomes', () => {
      const card = makeAllColumnC(OutcomeCategory.SINGLE_CLEAN);
      let hits = 0;
      const trials = 1000;

      for (let seed = 1; seed <= trials; seed++) {
        const rng = new SeededRNG(seed);
        const result = resolvePlateAppearance(card, 1, rng);
        if (result.outcome === OutcomeCategory.SINGLE_CLEAN) hits++;
      }

      // Grade 1/36 = ~2.8% suppression -> ~97% should survive
      expect(hits).toBeGreaterThan(900);
    });

    it('higher grade suppresses more SINGLE_CLEAN than lower grade', () => {
      const card = makeAllColumnC(OutcomeCategory.SINGLE_CLEAN);

      let hitsLow = 0;
      let hitsHigh = 0;
      const trials = 500;

      for (let seed = 1; seed <= trials; seed++) {
        const rngLow = new SeededRNG(seed);
        const rngHigh = new SeededRNG(seed);
        if (resolvePlateAppearance(card, 5, rngLow).outcome === OutcomeCategory.SINGLE_CLEAN) hitsLow++;
        if (resolvePlateAppearance(card, 20, rngHigh).outcome === OutcomeCategory.SINGLE_CLEAN) hitsHigh++;
      }

      expect(hitsLow).toBeGreaterThan(hitsHigh);
    });

    it('suppressed SINGLE_CLEAN becomes an out type', () => {
      const card = makeAllColumnC(OutcomeCategory.SINGLE_CLEAN);
      const outTypes = new Set([
        OutcomeCategory.GROUND_OUT,
        OutcomeCategory.FLY_OUT,
        OutcomeCategory.LINE_OUT,
        OutcomeCategory.POP_OUT,
      ]);

      for (let seed = 1; seed <= 500; seed++) {
        const rng = new SeededRNG(seed);
        const result = resolvePlateAppearance(card, 30, rng);
        if (result.outcome !== OutcomeCategory.SINGLE_CLEAN) {
          expect(outTypes.has(result.outcome)).toBe(true);
        }
      }
    });
  });

  describe('BBW grade check -- TRIPLE suppression', () => {
    it('grade 20 suppresses TRIPLE outcomes', () => {
      const card = makeAllColumnC(OutcomeCategory.TRIPLE);
      let triples = 0;
      const trials = 500;

      for (let seed = 1; seed <= trials; seed++) {
        const rng = new SeededRNG(seed);
        const result = resolvePlateAppearance(card, 20, rng);
        if (result.outcome === OutcomeCategory.TRIPLE) triples++;
      }

      // Grade 20/36 = ~56% suppression -> ~44% should survive
      expect(triples).toBeLessThan(trials * 0.60);
      expect(triples).toBeGreaterThan(trials * 0.25);
    });
  });

  describe('BBW grade check -- non-suppressible outcomes', () => {
    it('SINGLE_ADVANCE is NOT affected by grade', () => {
      const card = makeAllColumnC(OutcomeCategory.SINGLE_ADVANCE);

      let hitsGrade1 = 0;
      let hitsGrade30 = 0;
      const trials = 500;

      for (let seed = 1; seed <= trials; seed++) {
        const rng1 = new SeededRNG(seed);
        const rng30 = new SeededRNG(seed);
        if (resolvePlateAppearance(card, 1, rng1).outcome === OutcomeCategory.SINGLE_ADVANCE) hitsGrade1++;
        if (resolvePlateAppearance(card, 30, rng30).outcome === OutcomeCategory.SINGLE_ADVANCE) hitsGrade30++;
      }

      // Both should be 100% -- grade does NOT affect SINGLE_ADVANCE
      expect(hitsGrade1).toBe(trials);
      expect(hitsGrade30).toBe(trials);
    });

    it('WALK is NOT affected by grade', () => {
      const card = makeAllColumnC(OutcomeCategory.WALK);

      for (const grade of [1, 15, 30]) {
        let walks = 0;
        for (let seed = 1; seed <= 200; seed++) {
          const rng = new SeededRNG(seed);
          if (resolvePlateAppearance(card, grade, rng).outcome === OutcomeCategory.WALK) walks++;
        }
        expect(walks).toBe(200);
      }
    });

    it('HOME_RUN is NOT affected by grade', () => {
      const card = makeAllColumnC(OutcomeCategory.HOME_RUN);

      for (const grade of [1, 15, 30]) {
        let hrs = 0;
        for (let seed = 1; seed <= 200; seed++) {
          const rng = new SeededRNG(seed);
          if (resolvePlateAppearance(card, grade, rng).outcome === OutcomeCategory.HOME_RUN) hrs++;
        }
        expect(hrs).toBe(200);
      }
    });

    it('DOUBLE is NOT affected by grade', () => {
      const card = makeAllColumnC(OutcomeCategory.DOUBLE);

      for (const grade of [1, 15, 30]) {
        let doubles = 0;
        for (let seed = 1; seed <= 200; seed++) {
          const rng = new SeededRNG(seed);
          if (resolvePlateAppearance(card, grade, rng).outcome === OutcomeCategory.DOUBLE) doubles++;
        }
        expect(doubles).toBe(200);
      }
    });

    it('STRIKEOUT_SWINGING is NOT affected by grade', () => {
      const card = makeAllColumnC(OutcomeCategory.STRIKEOUT_SWINGING);

      for (const grade of [1, 15, 30]) {
        let ks = 0;
        for (let seed = 1; seed <= 200; seed++) {
          const rng = new SeededRNG(seed);
          if (resolvePlateAppearance(card, grade, rng).outcome === OutcomeCategory.STRIKEOUT_SWINGING) ks++;
        }
        expect(ks).toBe(200);
      }
    });

    it('HIT_BY_PITCH is NOT affected by grade', () => {
      const card = makeAllColumnC(OutcomeCategory.HIT_BY_PITCH);

      for (const grade of [1, 15, 30]) {
        let hbps = 0;
        for (let seed = 1; seed <= 200; seed++) {
          const rng = new SeededRNG(seed);
          if (resolvePlateAppearance(card, grade, rng).outcome === OutcomeCategory.HIT_BY_PITCH) hbps++;
        }
        expect(hbps).toBe(200);
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
