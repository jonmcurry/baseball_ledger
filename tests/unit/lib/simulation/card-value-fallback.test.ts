/**
 * Direct Card Value Fallback Unit Tests
 *
 * REQ-SIM-004a: Direct card value to outcome fallback mapping
 * When OutcomeTable lookup fails after 3 attempts, use this direct mapping.
 *
 * TDD: These tests are written FIRST before the implementation.
 */

import {
  getDirectOutcome,
  CARD_VALUE_TO_OUTCOME,
  isCardValueMapped,
} from '@lib/simulation/card-value-fallback';
import { OutcomeCategory } from '@lib/types/game';

describe('REQ-SIM-004a: Direct Card Value Fallback Mapping', () => {
  describe('CARD_VALUE_TO_OUTCOME constant', () => {
    it('maps card value 0 to DOUBLE', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(0)).toBe(OutcomeCategory.DOUBLE);
    });

    it('maps card value 1 to HOME_RUN', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(1)).toBe(OutcomeCategory.HOME_RUN);
    });

    it('maps card value 5 to HOME_RUN_VARIANT', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(5)).toBe(OutcomeCategory.HOME_RUN_VARIANT);
    });

    it('maps card values 7 and 8 to SINGLE_CLEAN', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(7)).toBe(OutcomeCategory.SINGLE_CLEAN);
      expect(CARD_VALUE_TO_OUTCOME.get(8)).toBe(OutcomeCategory.SINGLE_CLEAN);
    });

    it('maps card value 9 to SINGLE_ADVANCE', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(9)).toBe(OutcomeCategory.SINGLE_ADVANCE);
    });

    it('maps card values 10 and 11 to TRIPLE', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(10)).toBe(OutcomeCategory.TRIPLE);
      expect(CARD_VALUE_TO_OUTCOME.get(11)).toBe(OutcomeCategory.TRIPLE);
    });

    it('maps card value 13 to WALK', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(13)).toBe(OutcomeCategory.WALK);
    });

    it('maps card value 14 to STRIKEOUT_SWINGING', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(14)).toBe(OutcomeCategory.STRIKEOUT_SWINGING);
    });

    it('maps card values 21, 23, 36 to STOLEN_BASE_OPP (speed plays)', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(21)).toBe(OutcomeCategory.STOLEN_BASE_OPP);
      expect(CARD_VALUE_TO_OUTCOME.get(23)).toBe(OutcomeCategory.STOLEN_BASE_OPP);
      expect(CARD_VALUE_TO_OUTCOME.get(36)).toBe(OutcomeCategory.STOLEN_BASE_OPP);
    });

    it('maps card value 22 to FLY_OUT', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(22)).toBe(OutcomeCategory.FLY_OUT);
    });

    it('maps card value 24 to LINE_OUT', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(24)).toBe(OutcomeCategory.LINE_OUT);
    });

    it('maps card value 26 to GROUND_OUT', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(26)).toBe(OutcomeCategory.GROUND_OUT);
    });

    it('maps card value 30 to GROUND_OUT_ADVANCE', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(30)).toBe(OutcomeCategory.GROUND_OUT_ADVANCE);
    });

    it('maps card value 31 to FLY_OUT', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(31)).toBe(OutcomeCategory.FLY_OUT);
    });

    it('maps card values 37 and 41 to HOME_RUN_VARIANT', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(37)).toBe(OutcomeCategory.HOME_RUN_VARIANT);
      expect(CARD_VALUE_TO_OUTCOME.get(41)).toBe(OutcomeCategory.HOME_RUN_VARIANT);
    });

    it('maps card value 40 to REACHED_ON_ERROR', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(40)).toBe(OutcomeCategory.REACHED_ON_ERROR);
    });

    it('maps card value 42 to SPECIAL_EVENT', () => {
      expect(CARD_VALUE_TO_OUTCOME.get(42)).toBe(OutcomeCategory.SPECIAL_EVENT);
    });
  });

  describe('isCardValueMapped()', () => {
    it('returns true for mapped card values', () => {
      const mappedValues = [0, 1, 5, 7, 8, 9, 10, 11, 13, 14, 21, 22, 23, 24, 26, 30, 31, 36, 37, 40, 41, 42];
      for (const value of mappedValues) {
        expect(isCardValueMapped(value)).toBe(true);
      }
    });

    it('returns false for unmapped card values', () => {
      // Structural constants and other unmapped values
      const unmappedValues = [2, 3, 4, 6, 12, 15, 16, 17, 18, 19, 20, 25, 27, 28, 29, 32, 33, 34, 35, 38, 39];
      for (const value of unmappedValues) {
        expect(isCardValueMapped(value)).toBe(false);
      }
    });
  });

  describe('getDirectOutcome()', () => {
    it('returns the mapped outcome for valid card values', () => {
      expect(getDirectOutcome(1)).toBe(OutcomeCategory.HOME_RUN);
      expect(getDirectOutcome(7)).toBe(OutcomeCategory.SINGLE_CLEAN);
      expect(getDirectOutcome(13)).toBe(OutcomeCategory.WALK);
      expect(getDirectOutcome(14)).toBe(OutcomeCategory.STRIKEOUT_SWINGING);
    });

    it('returns GROUND_OUT as default for unmapped card values', () => {
      // Unmapped values should default to GROUND_OUT
      expect(getDirectOutcome(2)).toBe(OutcomeCategory.GROUND_OUT);
      expect(getDirectOutcome(3)).toBe(OutcomeCategory.GROUND_OUT);
      expect(getDirectOutcome(4)).toBe(OutcomeCategory.GROUND_OUT);
      expect(getDirectOutcome(6)).toBe(OutcomeCategory.GROUND_OUT);
    });

    it('returns GROUND_OUT for structural constants (25-32, 35)', () => {
      // Structural constants should not normally reach fallback, but if they do, default to out
      expect(getDirectOutcome(25)).toBe(OutcomeCategory.GROUND_OUT);
      expect(getDirectOutcome(27)).toBe(OutcomeCategory.GROUND_OUT);
      expect(getDirectOutcome(28)).toBe(OutcomeCategory.GROUND_OUT);
      expect(getDirectOutcome(29)).toBe(OutcomeCategory.GROUND_OUT);
      expect(getDirectOutcome(32)).toBe(OutcomeCategory.GROUND_OUT);
      expect(getDirectOutcome(35)).toBe(OutcomeCategory.GROUND_OUT);
    });

    it('handles edge case of negative card values', () => {
      expect(getDirectOutcome(-1)).toBe(OutcomeCategory.GROUND_OUT);
    });

    it('handles edge case of card values above 42', () => {
      expect(getDirectOutcome(43)).toBe(OutcomeCategory.GROUND_OUT);
      expect(getDirectOutcome(100)).toBe(OutcomeCategory.GROUND_OUT);
    });
  });

  describe('complete mapping coverage from SRD', () => {
    // REQ-SIM-004a table from SRD
    const srdMapping: [number, OutcomeCategory][] = [
      [0, OutcomeCategory.DOUBLE],
      [1, OutcomeCategory.HOME_RUN],
      [5, OutcomeCategory.HOME_RUN_VARIANT],
      [7, OutcomeCategory.SINGLE_CLEAN],
      [8, OutcomeCategory.SINGLE_CLEAN],
      [9, OutcomeCategory.SINGLE_ADVANCE],
      [10, OutcomeCategory.TRIPLE],
      [11, OutcomeCategory.TRIPLE],
      [13, OutcomeCategory.WALK],
      [14, OutcomeCategory.STRIKEOUT_SWINGING],
      [21, OutcomeCategory.STOLEN_BASE_OPP],
      [22, OutcomeCategory.FLY_OUT],
      [23, OutcomeCategory.STOLEN_BASE_OPP],
      [24, OutcomeCategory.LINE_OUT],
      [26, OutcomeCategory.GROUND_OUT],
      [30, OutcomeCategory.GROUND_OUT_ADVANCE],
      [31, OutcomeCategory.FLY_OUT],
      [36, OutcomeCategory.STOLEN_BASE_OPP],
      [37, OutcomeCategory.HOME_RUN_VARIANT],
      [40, OutcomeCategory.REACHED_ON_ERROR],
      [41, OutcomeCategory.HOME_RUN_VARIANT],
      [42, OutcomeCategory.SPECIAL_EVENT],
    ];

    it.each(srdMapping)(
      'card value %i maps to correct outcome',
      (cardValue, expected) => {
        expect(getDirectOutcome(cardValue)).toBe(expected);
      }
    );

    it('contains exactly 22 explicit mappings', () => {
      expect(CARD_VALUE_TO_OUTCOME.size).toBe(22);
    });
  });
});
