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
  resolveSymbolValue,
  IDT_ACTIVE_LOW,
  IDT_ACTIVE_HIGH,
  isIDTActive,
  PITCHER_CHECK_VALUES,
  isPitcherCheckValue,
} from '@lib/simulation/plate-appearance';
import { OutcomeCategory } from '@lib/types/game';
import { STRUCTURAL_POSITIONS } from '@lib/card-generator/structural';
import { generatePitcherBattingCard } from '@lib/card-generator/pitcher-card';
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

  describe('IDT_ACTIVE_LOW and IDT_ACTIVE_HIGH constants (Ghidra confirmed)', () => {
    it('IDT_ACTIVE_LOW is 15 (confirmed by Ghidra: 0x0F)', () => {
      expect(IDT_ACTIVE_LOW).toBe(15);
    });

    it('IDT_ACTIVE_HIGH is 23 (confirmed by Ghidra: 0x17)', () => {
      expect(IDT_ACTIVE_HIGH).toBe(23);
    });
  });

  describe('isIDTActive() -- Ghidra confirmed range [15, 23]', () => {
    it('returns true for values in IDT range [15, 23]', () => {
      expect(isIDTActive(15)).toBe(true);
      expect(isIDTActive(17)).toBe(true);  // double outcome
      expect(isIDTActive(19)).toBe(true);  // home run outcome
      expect(isIDTActive(21)).toBe(true);  // ground out outcome
      expect(isIDTActive(23)).toBe(true);  // pop out outcome
    });

    it('returns false for values below IDT range (0-14)', () => {
      expect(isIDTActive(0)).toBe(false);   // double (card value)
      expect(isIDTActive(1)).toBe(false);   // home run (card value)
      expect(isIDTActive(7)).toBe(false);   // single (card value)
      expect(isIDTActive(13)).toBe(false);  // walk (card value)
      expect(isIDTActive(14)).toBe(false);  // strikeout (card value)
    });

    it('returns false for values above IDT range (24+)', () => {
      expect(isIDTActive(24)).toBe(false);  // line out
      expect(isIDTActive(26)).toBe(false);  // ground out
      expect(isIDTActive(30)).toBe(false);  // ground out advance
      expect(isIDTActive(37)).toBe(false);  // HR variant
      expect(isIDTActive(40)).toBe(false);  // reached on error
    });
  });

  describe('PITCHER_CHECK_VALUES (Ghidra confirmed: card values 7, 8, 11)', () => {
    it('contains exactly {7, 8, 11}', () => {
      expect(PITCHER_CHECK_VALUES.has(7)).toBe(true);
      expect(PITCHER_CHECK_VALUES.has(8)).toBe(true);
      expect(PITCHER_CHECK_VALUES.has(11)).toBe(true);
      expect(PITCHER_CHECK_VALUES.size).toBe(3);
    });

    it('does not contain walk (13), K (14), HR (1), or double (0)', () => {
      expect(PITCHER_CHECK_VALUES.has(0)).toBe(false);
      expect(PITCHER_CHECK_VALUES.has(1)).toBe(false);
      expect(PITCHER_CHECK_VALUES.has(13)).toBe(false);
      expect(PITCHER_CHECK_VALUES.has(14)).toBe(false);
    });
  });

  describe('isPitcherCheckValue()', () => {
    it('returns true for pitcher-checked values {7, 8, 11}', () => {
      expect(isPitcherCheckValue(7)).toBe(true);
      expect(isPitcherCheckValue(8)).toBe(true);
      expect(isPitcherCheckValue(11)).toBe(true);
    });

    it('returns false for non-pitcher-checked values', () => {
      expect(isPitcherCheckValue(0)).toBe(false);
      expect(isPitcherCheckValue(1)).toBe(false);
      expect(isPitcherCheckValue(9)).toBe(false);
      expect(isPitcherCheckValue(13)).toBe(false);
      expect(isPitcherCheckValue(14)).toBe(false);
      expect(isPitcherCheckValue(21)).toBe(false);
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
      // Card filled with value 21 (GROUND_OUT outcome index, IDT-active in [15,23]).
      // Grade 15 always wins the grade check (R2 <= 15 is always true).
      // IDT should remap value 21 to various outcomes, not just GROUND_OUT.
      const card = createTestCard(21);
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

      // IDT should produce diverse outcomes (not just GROUND_OUT)
      expect(outcomeSet.size).toBeGreaterThanOrEqual(3);
      // BBW IDT always succeeds -- grade 15 always wins, 21 is IDT-active
      expect(idtUsedCount).toBe(samples);
    });

    it('batter wins uses direct mapping (grade 1, mostly GROUND_OUT)', () => {
      // Card filled with value 16 (IDT-active, unmapped -> GROUND_OUT). Grade 1: pitcher wins only 1/15 of time.
      // Batter wins ~93% -> direct mapping -> value 16 = GROUND_OUT (default).
      const card = createTestCard(16);
      const rng = new SeededRNG(42);
      let groundOuts = 0;
      const samples = 500;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 1, rng);
        if (result.outcome === OutcomeCategory.GROUND_OUT) {
          groundOuts++;
        }
      }

      // With grade 1, batter wins ~93% of time -> direct mapping -> mostly ground outs
      expect(groundOuts).toBeGreaterThan(samples * 0.70);
    });

    it('non-IDT values bypass IDT even when pitcher wins (value 1 = HR)', () => {
      // Card filled with value 1 (HOME_RUN, NOT IDT-active: 1 < 15).
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

    it('pitcher check value 7 produces GROUND_OUT when pitcher wins', () => {
      // Card filled with value 7 (SINGLE_CLEAN, pitcher-check value).
      // Grade 15 always wins. Pitcher wins = out for singles.
      const card = createTestCard(7);
      const rng = new SeededRNG(42);
      let groundOuts = 0;
      const samples = 500;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rng);
        if (result.outcome === OutcomeCategory.GROUND_OUT) {
          groundOuts++;
        }
      }

      // Grade 15 always wins -> all value-7 draws produce GROUND_OUT
      expect(groundOuts).toBe(samples);
    });

    it('pitcher check value 8 produces GROUND_OUT when pitcher wins', () => {
      const card = createTestCard(8);
      const rng = new SeededRNG(42);
      let groundOuts = 0;
      const samples = 200;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rng);
        if (result.outcome === OutcomeCategory.GROUND_OUT) groundOuts++;
      }

      expect(groundOuts).toBe(samples);
    });

    it('pitcher check value 11 produces FLY_OUT when pitcher wins', () => {
      const card = createTestCard(11);
      const rng = new SeededRNG(42);
      let flyOuts = 0;
      const samples = 200;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rng);
        if (result.outcome === OutcomeCategory.FLY_OUT) flyOuts++;
      }

      expect(flyOuts).toBe(samples);
    });

    it('value 9 (SINGLE_LOW) is never suppressed even with grade 15', () => {
      const card = createTestCard(9);
      const rng = new SeededRNG(42);
      let singles = 0;
      const samples = 200;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rng);
        if (result.outcome === OutcomeCategory.SINGLE_ADVANCE) singles++;
        expect(result.usedFallback).toBe(true);
      }

      expect(singles).toBe(samples);
    });

    it('value 10 (TRIPLE_1) is never suppressed even with grade 15', () => {
      const card = createTestCard(10);
      const rng = new SeededRNG(42);
      let triples = 0;
      const samples = 200;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rng);
        if (result.outcome === OutcomeCategory.TRIPLE) triples++;
        expect(result.usedFallback).toBe(true);
      }

      expect(triples).toBe(samples);
    });

    it('pitcher check values use direct mapping when batter wins (grade 1)', () => {
      // Card filled with value 7. Grade 1: pitcher wins only 1/15 of time.
      // Batter wins ~93% -> direct mapping -> SINGLE_CLEAN.
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

      // Batter wins ~93%: mostly direct-mapped singles
      expect(singles).toBeGreaterThan(samples * 0.70);
    });

    it('non-IDT values bypass IDT even when pitcher wins (value 13 = walk)', () => {
      // Card filled with value 13 (WALK, NOT IDT-active per Ghidra: 13 < 15).
      // Walks are NEVER remapped by IDT -- they always produce WALK.
      const card = createTestCard(13);
      const rng = new SeededRNG(42);
      let walks = 0;
      const samples = 200;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rng);
        if (result.outcome === OutcomeCategory.WALK) {
          walks++;
        }
        expect(result.usedFallback).toBe(true);
      }

      expect(walks).toBe(samples);
    });

    it('non-IDT out values always produce outs regardless of grade', () => {
      // Card filled with value 26 (GROUND_OUT, NOT IDT-active: 26 > 23).
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
      // IDT-active card (value 16, in [15,23]). Compare grade 15 vs grade 1.
      const card = createTestCard(16);
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

    it('higher pitcher grade produces more non-direct-mapping outcomes', () => {
      // Card filled with value 16 (GROUND_OUT default, IDT-active in [15,23]).
      // High grade pitcher triggers IDT more often, remapping GROUND_OUT to other types.
      const card = createTestCard(16);
      const samples = 500;

      const rngHigh = new SeededRNG(42);
      let nonGroundOutHigh = 0;
      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rngHigh);
        if (result.outcome !== OutcomeCategory.GROUND_OUT) nonGroundOutHigh++;
      }

      const rngLow = new SeededRNG(42);
      let nonGroundOutLow = 0;
      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 1, rngLow);
        if (result.outcome !== OutcomeCategory.GROUND_OUT) nonGroundOutLow++;
      }

      // High grade remaps more outcomes away from default GROUND_OUT via IDT
      expect(nonGroundOutHigh).toBeGreaterThan(nonGroundOutLow);
    });

    it('outcomeTableRow is set when IDT is used (rows 15-23)', () => {
      // Grade 15 + IDT-active value (16): BBW IDT always succeeds
      const card = createTestCard(16);
      const rng = new SeededRNG(42);

      for (let i = 0; i < 100; i++) {
        const result = resolvePlateAppearance(card, 15, rng);
        // BBW IDT always succeeds, so outcomeTableRow is always set
        expect(result.outcomeTableRow).toBeDefined();
        expect(result.outcomeTableRow).toBeGreaterThanOrEqual(15);
        expect(result.outcomeTableRow).toBeLessThanOrEqual(23);
      }
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
      const card = createTestCard(21);
      const rng = new SeededRNG(42);

      const result = resolvePlateAppearance(card, 10, rng);

      expect(result.pitcherGradeEffect.r2Roll).toBeGreaterThanOrEqual(1);
      expect(result.pitcherGradeEffect.r2Roll).toBeLessThanOrEqual(15);
      expect(result.pitcherGradeEffect.originalValue).toBe(result.cardValue);
    });
  });

  describe('resolveSymbolValue() -- BBW symbol table (Gap 5)', () => {
    it('resolves values 36-41 through the 10-entry symbol table', () => {
      const rng = new SeededRNG(42);
      const results = new Set<number>();
      for (let i = 0; i < 200; i++) {
        const resolved = resolveSymbolValue(36, rng);
        results.add(resolved);
      }
      // Symbol table contains {36,37,38,39,40,41}
      expect(results.size).toBeGreaterThanOrEqual(4);
      for (const v of results) {
        expect(v).toBeGreaterThanOrEqual(36);
        expect(v).toBeLessThanOrEqual(41);
      }
    });

    it('passes through non-symbol values unchanged', () => {
      const rng = new SeededRNG(42);
      for (const v of [0, 1, 7, 13, 14, 21, 35]) {
        expect(resolveSymbolValue(v, rng)).toBe(v);
      }
    });

    it('value 40 (reached on error) has ~30% weight in the table', () => {
      const rng = new SeededRNG(99);
      let count40 = 0;
      const samples = 1000;
      for (let i = 0; i < samples; i++) {
        if (resolveSymbolValue(38, rng) === 40) count40++;
      }
      // 3/10 slots = 30%, allow [20%, 40%]
      expect(count40 / samples).toBeGreaterThan(0.20);
      expect(count40 / samples).toBeLessThan(0.40);
    });

    it('is deterministic with same seed', () => {
      const rng1 = new SeededRNG(77);
      const rng2 = new SeededRNG(77);
      const seq1 = Array.from({ length: 50 }, () => resolveSymbolValue(39, rng1));
      const seq2 = Array.from({ length: 50 }, () => resolveSymbolValue(39, rng2));
      expect(seq1).toEqual(seq2);
    });
  });

  describe('pitcher card read in Path A (Gap 4)', () => {
    it('reads pitcher card when pitcher card is provided and pitcher wins', () => {
      // Batter card filled with value 7 (pitcher check value, single)
      const batterCard = createTestCard(7);
      // Pitcher card: use generated pitcher batting card (~58% walks, ~17% K, ~25% outs)
      const pitcherCard = generatePitcherBattingCard();

      const rng = new SeededRNG(42);
      const outcomes = new Map<OutcomeCategory, number>();
      const samples = 500;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(batterCard, pitcherCard, 15, rng);
        outcomes.set(result.outcome, (outcomes.get(result.outcome) ?? 0) + 1);
      }

      // Path A is pitcher suppression -- walks on pitcher card are filtered to ground outs.
      // So walks should be 0, and ground outs should be dominant.
      const walks = outcomes.get(OutcomeCategory.WALK) ?? 0;
      expect(walks).toBe(0);
      // Should see ground outs (from walk->ground_out filter + out values on pitcher card)
      const groundOuts = outcomes.get(OutcomeCategory.GROUND_OUT) ?? 0;
      expect(groundOuts).toBeGreaterThan(samples * 0.50);
      // Should also see strikeouts (from K values on pitcher card -- value 14 = STRIKEOUT_SWINGING)
      const strikeouts = outcomes.get(OutcomeCategory.STRIKEOUT_SWINGING) ?? 0;
      expect(strikeouts).toBeGreaterThan(0);
    });

    it('falls back to hardcoded outs when no pitcher card (legacy)', () => {
      const batterCard = createTestCard(7);
      const rng = new SeededRNG(42);
      let groundOuts = 0;
      const samples = 500;

      for (let i = 0; i < samples; i++) {
        // Old signature: no pitcher card
        const result = resolvePlateAppearance(batterCard, 15, rng);
        if (result.outcome === OutcomeCategory.GROUND_OUT) groundOuts++;
      }

      // Grade 15 always wins -> all value 7 -> GROUND_OUT (legacy behavior)
      expect(groundOuts).toBe(samples);
    });

    it('pitcher card produces mixed outcomes for value 8', () => {
      const batterCard = createTestCard(8);
      const pitcherCard = generatePitcherBattingCard();
      const rng = new SeededRNG(55);
      const outcomeSet = new Set<OutcomeCategory>();
      const samples = 500;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(batterCard, pitcherCard, 15, rng);
        outcomeSet.add(result.outcome);
      }

      // Should produce diverse outcomes (walks, Ks, outs from pitcher card)
      expect(outcomeSet.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Path A walk suppression (pitcher card reads never produce walks)', () => {
    it('Path A never produces walks from pitcher card', () => {
      // Batter card filled with value 7 (pitcher check value).
      // Pitcher card has ~58% walk values. Grade 15 always wins.
      // Path A is "pitcher suppression" -- walks should be mapped to outs.
      const batterCard = createTestCard(7);
      const pitcherCard = generatePitcherBattingCard();
      const rng = new SeededRNG(42);
      const samples = 1000;
      let walks = 0;
      let groundOuts = 0;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(batterCard, pitcherCard, 15, rng);
        if (result.outcome === OutcomeCategory.WALK) walks++;
        if (result.outcome === OutcomeCategory.GROUND_OUT) groundOuts++;
      }

      // Path A is pitcher suppression -- should NEVER produce walks
      expect(walks).toBe(0);
      // Walk values on pitcher card should become ground outs instead
      expect(groundOuts).toBeGreaterThan(samples * 0.40);
    });

    it('Path A walk suppression applies to all pitcher check values {7, 8, 11}', () => {
      const pitcherCard = generatePitcherBattingCard();

      for (const checkValue of [7, 8, 11]) {
        const batterCard = createTestCard(checkValue as CardValue);
        const rng = new SeededRNG(42);
        let walks = 0;
        const samples = 500;

        for (let i = 0; i < samples; i++) {
          const result = resolvePlateAppearance(batterCard, pitcherCard, 15, rng);
          if (result.outcome === OutcomeCategory.WALK) walks++;
        }

        expect(walks).toBe(0);
      }
    });
  });

  describe('IDT activation via power rating at position 24 (Gap 1+6)', () => {
    it('card value 17 (power rating) triggers IDT when pitcher wins', () => {
      // Card with all positions set to 17 (in IDT range [15,23])
      const card = createTestCard(17);
      const rng = new SeededRNG(42);
      let idtUsed = 0;
      const samples = 500;

      for (let i = 0; i < samples; i++) {
        const result = resolvePlateAppearance(card, 15, rng);
        if (!result.usedFallback) idtUsed++;
      }

      // Grade 15 always wins, value 17 is IDT-active, IDT always succeeds
      expect(idtUsed).toBe(samples);
    });

    it('power rating values 15-21 all trigger IDT', () => {
      for (let powerVal = 15; powerVal <= 21; powerVal++) {
        const card = createTestCard(powerVal as CardValue);
        const rng = new SeededRNG(42);
        let idtUsed = 0;
        const samples = 100;

        for (let i = 0; i < samples; i++) {
          const result = resolvePlateAppearance(card, 15, rng);
          if (!result.usedFallback) idtUsed++;
        }

        // Grade 15 always wins and IDT always succeeds
        expect(idtUsed).toBe(samples);
      }
    });
  });
});
