/**
 * Tests for BBW-authentic plate appearance resolution.
 *
 * Ghidra-confirmed flow (FUN_1058_5f49):
 * 1. Draw position (0-34) from batter's 35-byte card
 * 2. Grade check for card values 7, 8, 11 (pitcher wins -> pitcher card draw)
 * 3. IDT lookup for card values 15-23 (bitmap-gated weighted random)
 * 4. Direct mapping for all other card values via getDirectOutcome()
 */

import { OutcomeCategory } from '@lib/types/game';
import type { CardValue } from '@lib/types/player';
import { SeededRNG } from '@lib/rng/seeded-rng';
import { CARD_LENGTH } from '@lib/card-generator/structural';
import {
  resolvePlateAppearance,
  GRADE_CHECK_RANGE,
  IDT_ACTIVE_LOW,
  IDT_ACTIVE_HIGH,
} from '@lib/simulation/plate-appearance';

// --- Helpers ---

/** Build a 35-byte batter card filled with a single value. */
function makeUniformCard(value: CardValue): CardValue[] {
  return new Array(CARD_LENGTH).fill(value);
}

/** Build a pitcher card: mostly strikeouts (14) and walks (13). */
function makePitcherCard(): CardValue[] {
  const card = new Array(CARD_LENGTH).fill(14); // strikeouts
  card[0] = 13;  // walk
  card[2] = 13;  // walk
  card[4] = 26;  // ground out
  card[5] = 26;  // ground out
  return card;
}

/** Build a batter card with specific values at positions, default fill elsewhere. */
function makeBatterCard(overrides: Partial<Record<number, CardValue>> = {}, fill: CardValue = 0): CardValue[] {
  const card = new Array(CARD_LENGTH).fill(fill);
  for (const [pos, val] of Object.entries(overrides)) {
    card[Number(pos)] = val;
  }
  return card;
}

// --- Tests ---

describe('BBW Plate Appearance Resolution', () => {
  describe('basic draw and direct mapping', () => {
    it('draws from batter card and maps via getDirectOutcome()', () => {
      // Card filled with 13 (WALK). Every draw should produce WALK.
      const batterCard = makeUniformCard(13);
      const pitcherCard = makePitcherCard();
      const rng = new SeededRNG(42);

      const result = resolvePlateAppearance(batterCard, pitcherCard, 10, rng);
      expect(result.outcome).toBe(OutcomeCategory.WALK);
      expect(result.cardValue).toBe(13);
    });

    it('maps value 0 to DOUBLE', () => {
      const card = makeUniformCard(0); // 0 -> DOUBLE
      const result = resolvePlateAppearance(card, makePitcherCard(), 10, new SeededRNG(1));
      expect(result.outcome).toBe(OutcomeCategory.DOUBLE);
    });

    it('maps value 1 to HOME_RUN', () => {
      const card = makeUniformCard(1); // 1 -> HOME_RUN
      const result = resolvePlateAppearance(card, makePitcherCard(), 10, new SeededRNG(1));
      expect(result.outcome).toBe(OutcomeCategory.HOME_RUN);
    });

    it('maps value 14 to STRIKEOUT_SWINGING', () => {
      const card = makeUniformCard(14); // 14 -> STRIKEOUT_SWINGING
      const result = resolvePlateAppearance(card, makePitcherCard(), 10, new SeededRNG(1));
      expect(result.outcome).toBe(OutcomeCategory.STRIKEOUT_SWINGING);
    });

    it('maps unmapped value to GROUND_OUT (default)', () => {
      const card = makeUniformCard(2); // 2 -> not in map -> GROUND_OUT
      const result = resolvePlateAppearance(card, makePitcherCard(), 10, new SeededRNG(1));
      expect(result.outcome).toBe(OutcomeCategory.GROUND_OUT);
    });

    it('card position is always in [0, 34]', () => {
      const card = makeUniformCard(13);
      const pitcherCard = makePitcherCard();
      for (let seed = 1; seed <= 200; seed++) {
        const result = resolvePlateAppearance(card, pitcherCard, 10, new SeededRNG(seed));
        expect(result.cardPosition).toBeGreaterThanOrEqual(0);
        expect(result.cardPosition).toBeLessThanOrEqual(CARD_LENGTH - 1);
      }
    });
  });

  describe('grade check (card values 7, 8, 11)', () => {
    it('grade check fires for card value 7', () => {
      const card = makeUniformCard(7); // SINGLE_CLEAN, triggers grade check
      const pitcherCard = makeUniformCard(14); // All strikeouts
      let pitcherWonCount = 0;
      const trials = 500;

      for (let seed = 1; seed <= trials; seed++) {
        const result = resolvePlateAppearance(card, pitcherCard, 8, new SeededRNG(seed));
        if (result.pitcherGradeEffect.pitcherWon) pitcherWonCount++;
      }

      // With grade 8 and GRADE_CHECK_RANGE 15, pitcher wins ~53% (8/15)
      expect(pitcherWonCount).toBeGreaterThan(trials * 0.38);
      expect(pitcherWonCount).toBeLessThan(trials * 0.68);
    });

    it('grade check fires for card value 8', () => {
      const card = makeUniformCard(8);
      const pitcherCard = makeUniformCard(14);
      let pitcherWonCount = 0;

      for (let seed = 1; seed <= 200; seed++) {
        const result = resolvePlateAppearance(card, pitcherCard, 8, new SeededRNG(seed));
        if (result.pitcherGradeEffect.pitcherWon) pitcherWonCount++;
      }

      // Grade 8 with GRADE_CHECK_RANGE 15: pitcher wins ~53% (8/15)
      expect(pitcherWonCount).toBeGreaterThan(0);
    });

    it('grade check fires for card value 11', () => {
      const card = makeUniformCard(11); // TRIPLE, triggers grade check
      const pitcherCard = makeUniformCard(14);
      let pitcherWonCount = 0;

      for (let seed = 1; seed <= 200; seed++) {
        const result = resolvePlateAppearance(card, pitcherCard, 8, new SeededRNG(seed));
        if (result.pitcherGradeEffect.pitcherWon) pitcherWonCount++;
      }

      expect(pitcherWonCount).toBeGreaterThan(0);
    });

    it('grade check does NOT fire for value 0 (DOUBLE)', () => {
      const card = makeUniformCard(0);
      const pitcherCard = makePitcherCard();

      for (let seed = 1; seed <= 100; seed++) {
        const result = resolvePlateAppearance(card, pitcherCard, 30, new SeededRNG(seed));
        expect(result.pitcherGradeEffect.pitcherWon).toBe(false);
        expect(result.outcome).toBe(OutcomeCategory.DOUBLE);
      }
    });

    it('grade check does NOT fire for value 1 (HOME_RUN)', () => {
      const card = makeUniformCard(1);
      const pitcherCard = makePitcherCard();

      for (let seed = 1; seed <= 100; seed++) {
        const result = resolvePlateAppearance(card, pitcherCard, 30, new SeededRNG(seed));
        expect(result.pitcherGradeEffect.pitcherWon).toBe(false);
      }
    });

    it('grade check does NOT fire for value 9 (SINGLE_ADVANCE)', () => {
      const card = makeUniformCard(9);
      const pitcherCard = makePitcherCard();

      for (let seed = 1; seed <= 100; seed++) {
        const result = resolvePlateAppearance(card, pitcherCard, 30, new SeededRNG(seed));
        expect(result.pitcherGradeEffect.pitcherWon).toBe(false);
      }
    });

    it('grade check does NOT fire for value 13 (WALK)', () => {
      const card = makeUniformCard(13);
      const pitcherCard = makePitcherCard();

      for (let seed = 1; seed <= 100; seed++) {
        const result = resolvePlateAppearance(card, pitcherCard, 30, new SeededRNG(seed));
        expect(result.pitcherGradeEffect.pitcherWon).toBe(false);
      }
    });

    it('grade check does NOT fire for value 14 (STRIKEOUT)', () => {
      const card = makeUniformCard(14);
      const pitcherCard = makePitcherCard();

      for (let seed = 1; seed <= 100; seed++) {
        const result = resolvePlateAppearance(card, pitcherCard, 30, new SeededRNG(seed));
        expect(result.pitcherGradeEffect.pitcherWon).toBe(false);
      }
    });

    it('when pitcher wins, draws from pitcher card', () => {
      // Batter card: all 7s (SINGLE_CLEAN, grade check value)
      // Pitcher card: all 14s (STRIKEOUT_SWINGING)
      const batterCard = makeUniformCard(7);
      const pitcherCard = makeUniformCard(14);

      // Very high grade = pitcher almost always wins
      let strikeoutCount = 0;
      const trials = 300;

      for (let seed = 1; seed <= trials; seed++) {
        const result = resolvePlateAppearance(batterCard, pitcherCard, 30, new SeededRNG(seed));
        if (result.pitcherGradeEffect.pitcherWon) {
          // When pitcher wins, outcome should come from pitcher's card (strikeout)
          expect(result.outcome).toBe(OutcomeCategory.STRIKEOUT_SWINGING);
          expect(result.pitcherGradeEffect.finalValue).toBe(14);
          strikeoutCount++;
        } else {
          // When batter wins, outcome comes from batter's card (single)
          expect(result.outcome).toBe(OutcomeCategory.SINGLE_CLEAN);
        }
      }

      // Grade 30 with GRADE_CHECK_RANGE 15: pitcher always wins (30 > 14)
      expect(strikeoutCount).toBe(trials);
    });

    it('higher grade means more pitcher wins', () => {
      const batterCard = makeUniformCard(7); // grade check triggers
      const pitcherCard = makeUniformCard(14); // strikeouts
      const trials = 500;

      let winsLowGrade = 0;
      let winsHighGrade = 0;

      for (let seed = 1; seed <= trials; seed++) {
        if (resolvePlateAppearance(batterCard, pitcherCard, 5, new SeededRNG(seed)).pitcherGradeEffect.pitcherWon) winsLowGrade++;
        if (resolvePlateAppearance(batterCard, pitcherCard, 30, new SeededRNG(seed)).pitcherGradeEffect.pitcherWon) winsHighGrade++;
      }

      expect(winsHighGrade).toBeGreaterThan(winsLowGrade);
    });

    it('grade 0 means pitcher never wins', () => {
      const batterCard = makeUniformCard(7);
      const pitcherCard = makeUniformCard(14);

      for (let seed = 1; seed <= 100; seed++) {
        const result = resolvePlateAppearance(batterCard, pitcherCard, 0, new SeededRNG(seed));
        expect(result.pitcherGradeEffect.pitcherWon).toBe(false);
        expect(result.outcome).toBe(OutcomeCategory.SINGLE_CLEAN);
      }
    });
  });

  describe('IDT lookup (card values 15-23)', () => {
    it('IDT fires for card values in [15, 23]', () => {
      for (let cv = IDT_ACTIVE_LOW; cv <= IDT_ACTIVE_HIGH; cv++) {
        const card = makeUniformCard(cv);
        const pitcherCard = makePitcherCard();
        const result = resolvePlateAppearance(card, pitcherCard, 10, new SeededRNG(42));

        // IDT always succeeds and returns a valid outcome
        expect(result.outcomeTableRow).toBeDefined();
        expect(result.outcomeTableRow).toBeGreaterThanOrEqual(15);
        expect(result.outcomeTableRow).toBeLessThanOrEqual(23);
      }
    });

    it('IDT does NOT fire for values outside [15, 23]', () => {
      for (const cv of [0, 1, 5, 7, 8, 9, 10, 13, 14, 24, 26, 30, 42]) {
        const card = makeUniformCard(cv);
        const pitcherCard = makePitcherCard();
        const result = resolvePlateAppearance(card, pitcherCard, 10, new SeededRNG(42));

        expect(result.outcomeTableRow).toBeUndefined();
      }
    });

    it('IDT produces valid OutcomeCategory values', () => {
      const card = makeUniformCard(18); // IDT range
      const pitcherCard = makePitcherCard();
      const outcomes = new Set<OutcomeCategory>();

      for (let seed = 1; seed <= 200; seed++) {
        const result = resolvePlateAppearance(card, pitcherCard, 10, new SeededRNG(seed));
        outcomes.add(result.outcome);
      }

      // IDT should produce multiple distinct outcomes
      expect(outcomes.size).toBeGreaterThan(1);
    });
  });

  describe('result structure', () => {
    it('returns all required PlateAppearanceResult fields', () => {
      const card = makeUniformCard(13); // WALK
      const pitcherCard = makePitcherCard();
      const rng = new SeededRNG(42);

      const result = resolvePlateAppearance(card, pitcherCard, 10, rng);

      expect(result).toHaveProperty('cardPosition');
      expect(result).toHaveProperty('cardValue');
      expect(result).toHaveProperty('outcome');
      expect(result).toHaveProperty('usedFallback');
      expect(result).toHaveProperty('pitcherGradeEffect');
      expect(result.usedFallback).toBe(false);
      expect(result.column).toBeUndefined();
    });

    it('pitcherGradeEffect.effectiveGrade equals the effective grade', () => {
      const card = makeUniformCard(13);
      const pitcherCard = makePitcherCard();
      const result = resolvePlateAppearance(card, pitcherCard, 20, new SeededRNG(42));

      expect(result.pitcherGradeEffect.effectiveGrade).toBe(20);
    });
  });

  describe('determinism', () => {
    it('same seed produces same outcome', () => {
      const card = makeBatterCard({
        0: 7, 2: 13, 4: 1, 7: 14, 9: 0, 10: 9
      }, 26);
      const pitcherCard = makePitcherCard();

      const results1: OutcomeCategory[] = [];
      const results2: OutcomeCategory[] = [];

      for (let i = 0; i < 20; i++) {
        results1.push(resolvePlateAppearance(card, pitcherCard, 12, new SeededRNG(100 + i)).outcome);
        results2.push(resolvePlateAppearance(card, pitcherCard, 12, new SeededRNG(100 + i)).outcome);
      }

      expect(results1).toEqual(results2);
    });

    it('different seeds produce different outcomes', () => {
      const card = makeBatterCard({
        0: 7, 2: 13, 4: 1, 7: 14, 9: 0, 10: 9
      }, 26);
      const pitcherCard = makePitcherCard();

      const outcomes = new Set<OutcomeCategory>();
      for (let seed = 1; seed <= 100; seed++) {
        outcomes.add(resolvePlateAppearance(card, pitcherCard, 10, new SeededRNG(seed)).outcome);
      }

      expect(outcomes.size).toBeGreaterThan(1);
    });
  });

  describe('statistical behavior', () => {
    it('higher grade = more suppression on grade-check values', () => {
      // Card with many grade-check values (7 = single clean)
      const batterCard = makeUniformCard(7);
      // Pitcher card produces outs/Ks when drawn
      const pitcherCard = makeUniformCard(26); // GROUND_OUT
      const trials = 1000;

      let singlesLowGrade = 0;
      let singlesHighGrade = 0;

      for (let seed = 1; seed <= trials; seed++) {
        const resultLow = resolvePlateAppearance(batterCard, pitcherCard, 5, new SeededRNG(seed));
        const resultHigh = resolvePlateAppearance(batterCard, pitcherCard, 25, new SeededRNG(seed));

        if (resultLow.outcome === OutcomeCategory.SINGLE_CLEAN) singlesLowGrade++;
        if (resultHigh.outcome === OutcomeCategory.SINGLE_CLEAN) singlesHighGrade++;
      }

      // Higher grade should suppress more singles
      expect(singlesHighGrade).toBeLessThan(singlesLowGrade);
      // Low grade (5/15 = ~33% suppression) should allow most singles through
      expect(singlesLowGrade).toBeGreaterThan(trials * 0.55);
      // High grade (25/15 -> 100% suppression) should block ALL singles
      expect(singlesHighGrade).toBe(0);
    });

    it('non-grade-check values are not affected by pitcher grade', () => {
      // Card with value 1 (HOME_RUN) -- not a grade check value
      const batterCard = makeUniformCard(1);
      const pitcherCard = makePitcherCard();

      let hrsLowGrade = 0;
      let hrsHighGrade = 0;
      const trials = 200;

      for (let seed = 1; seed <= trials; seed++) {
        if (resolvePlateAppearance(batterCard, pitcherCard, 3, new SeededRNG(seed)).outcome === OutcomeCategory.HOME_RUN) hrsLowGrade++;
        if (resolvePlateAppearance(batterCard, pitcherCard, 30, new SeededRNG(seed)).outcome === OutcomeCategory.HOME_RUN) hrsHighGrade++;
      }

      // Both should be 100% HR since value 1 is direct mapped
      expect(hrsLowGrade).toBe(trials);
      expect(hrsHighGrade).toBe(trials);
    });
  });

  describe('constants', () => {
    it('GRADE_CHECK_RANGE is 15', () => {
      expect(GRADE_CHECK_RANGE).toBe(15);
    });

    it('IDT_ACTIVE_LOW is 15', () => {
      expect(IDT_ACTIVE_LOW).toBe(15);
    });

    it('IDT_ACTIVE_HIGH is 23', () => {
      expect(IDT_ACTIVE_HIGH).toBe(23);
    });
  });
});
