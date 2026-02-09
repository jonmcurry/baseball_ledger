/**
 * Platoon Adjustment Unit Tests
 *
 * REQ-SIM-004b: Platoon adjustment (from APBA's L/R handling).
 * Applied BEFORE the card lookup by temporarily modifying the card.
 *
 * TDD: These tests are written FIRST before the implementation.
 */

import {
  applyPlatoonAdjustment,
  hasPlatoonAdvantage,
  OUT_VALUES,
  HIT_VALUE,
  STRIKEOUT_VALUE,
  CONTACT_VALUE,
} from '@lib/simulation/platoon';
import type { CardValue } from '@lib/types/player';

describe('REQ-SIM-004b: Platoon Adjustment', () => {
  // Structural positions (0-indexed) from card-generator/structural.ts
  const STRUCTURAL_POSITIONS = [0, 2, 5, 10, 12, 17, 22, 24, 31];
  const STRUCTURAL_VALUES = [30, 28, 27, 26, 31, 29, 25, 32, 35];

  // Helper to create a test card with specific values
  function createTestCard(baseValue: number = 24): CardValue[] {
    const card: CardValue[] = [];
    // Create a 35-element card with structural constants in correct positions
    for (let i = 0; i < 35; i++) {
      const structuralIndex = STRUCTURAL_POSITIONS.indexOf(i);
      if (structuralIndex !== -1) {
        card.push(STRUCTURAL_VALUES[structuralIndex]);
      } else {
        card.push(baseValue);
      }
    }
    return card;
  }

  // Helper to create a card with specific out values for testing
  function createCardWithOutValues(): CardValue[] {
    const card = createTestCard(7); // Base hit value
    // Add some out values at non-structural positions
    // Structural positions are: 0, 2, 5, 10, 12, 17, 22, 24, 31
    // So use non-structural positions: 1, 3, 4, 6, 7, 8, etc.
    card[1] = 24;  // LINE_OUT at position 1 (non-structural)
    card[3] = 26;  // GROUND_OUT at position 3 (non-structural)
    card[4] = 30;  // GROUND_OUT_ADVANCE at position 4 (non-structural)
    card[6] = 31;  // FLY_OUT at position 6 (non-structural)
    card[7] = 14;  // STRIKEOUT at position 7 (non-structural)
    card[8] = 14;  // STRIKEOUT at position 8 (non-structural)
    return card;
  }

  describe('OUT_VALUES constant', () => {
    it('contains the four out-value card values', () => {
      expect(OUT_VALUES).toContain(24); // LINE_OUT
      expect(OUT_VALUES).toContain(26); // GROUND_OUT
      expect(OUT_VALUES).toContain(30); // GROUND_OUT_ADVANCE
      expect(OUT_VALUES).toContain(31); // FLY_OUT
      expect(OUT_VALUES).toHaveLength(4);
    });
  });

  describe('HIT_VALUE constant', () => {
    it('is card value 8 (SINGLE_CLEAN)', () => {
      expect(HIT_VALUE).toBe(8);
    });
  });

  describe('STRIKEOUT_VALUE constant', () => {
    it('is card value 14 (STRIKEOUT_SWINGING)', () => {
      expect(STRIKEOUT_VALUE).toBe(14);
    });
  });

  describe('CONTACT_VALUE constant', () => {
    it('is card value 9 (SINGLE_ADVANCE)', () => {
      expect(CONTACT_VALUE).toBe(9);
    });
  });

  describe('hasPlatoonAdvantage()', () => {
    it('returns true for LHB vs RHP', () => {
      expect(hasPlatoonAdvantage('L', 'R')).toBe(true);
    });

    it('returns true for RHB vs LHP', () => {
      expect(hasPlatoonAdvantage('R', 'L')).toBe(true);
    });

    it('returns false for LHB vs LHP (same-hand)', () => {
      expect(hasPlatoonAdvantage('L', 'L')).toBe(false);
    });

    it('returns false for RHB vs RHP (same-hand)', () => {
      expect(hasPlatoonAdvantage('R', 'R')).toBe(false);
    });

    it('returns true for switch hitter (S) vs any pitcher', () => {
      expect(hasPlatoonAdvantage('S', 'L')).toBe(true);
      expect(hasPlatoonAdvantage('S', 'R')).toBe(true);
    });
  });

  describe('applyPlatoonAdjustment()', () => {
    it('returns a new array (does not mutate original)', () => {
      const original = createCardWithOutValues();
      const originalCopy = [...original];
      const adjusted = applyPlatoonAdjustment(original, 'L', 'R');

      // Original unchanged
      expect(original).toEqual(originalCopy);
      // Returns a new array
      expect(adjusted).not.toBe(original);
    });

    it('does not modify card for same-hand matchup (LHB vs LHP)', () => {
      const original = createCardWithOutValues();
      const adjusted = applyPlatoonAdjustment(original, 'L', 'L');

      expect(adjusted).toEqual(original);
    });

    it('does not modify card for same-hand matchup (RHB vs RHP)', () => {
      const original = createCardWithOutValues();
      const adjusted = applyPlatoonAdjustment(original, 'R', 'R');

      expect(adjusted).toEqual(original);
    });

    it('modifies card for opposite-hand matchup (LHB vs RHP)', () => {
      const original = createCardWithOutValues();
      const adjusted = applyPlatoonAdjustment(original, 'L', 'R');

      // Should not be identical
      expect(adjusted).not.toEqual(original);
    });

    it('modifies card for opposite-hand matchup (RHB vs LHP)', () => {
      const original = createCardWithOutValues();
      const adjusted = applyPlatoonAdjustment(original, 'R', 'L');

      expect(adjusted).not.toEqual(original);
    });

    it('modifies card for switch hitter (always has advantage)', () => {
      const original = createCardWithOutValues();
      const adjustedVsRHP = applyPlatoonAdjustment(original, 'S', 'R');
      const adjustedVsLHP = applyPlatoonAdjustment(original, 'S', 'L');

      expect(adjustedVsRHP).not.toEqual(original);
      expect(adjustedVsLHP).not.toEqual(original);
    });

    describe('opposite-hand modification details', () => {
      it('replaces one out-value position with hit value (8)', () => {
        const original = createCardWithOutValues();
        const adjusted = applyPlatoonAdjustment(original, 'L', 'R');

        // Count how many out values were replaced with hit value
        const originalOutCount = original.filter(v => OUT_VALUES.includes(v)).length;
        const adjustedOutCount = adjusted.filter(v => OUT_VALUES.includes(v)).length;
        const adjustedHitCount = adjusted.filter(v => v === HIT_VALUE).length;
        const originalHitCount = original.filter(v => v === HIT_VALUE).length;

        expect(adjustedOutCount).toBe(originalOutCount - 1);
        expect(adjustedHitCount).toBe(originalHitCount + 1);
      });

      it('replaces one strikeout position (14) with contact value (9)', () => {
        const original = createCardWithOutValues();
        const adjusted = applyPlatoonAdjustment(original, 'L', 'R');

        // Count strikeouts and contact values
        const originalSOCount = original.filter(v => v === STRIKEOUT_VALUE).length;
        const adjustedSOCount = adjusted.filter(v => v === STRIKEOUT_VALUE).length;
        const adjustedContactCount = adjusted.filter(v => v === CONTACT_VALUE).length;
        const originalContactCount = original.filter(v => v === CONTACT_VALUE).length;

        expect(adjustedSOCount).toBe(originalSOCount - 1);
        expect(adjustedContactCount).toBe(originalContactCount + 1);
      });
    });

    describe('edge cases', () => {
      it('handles card with no out values gracefully', () => {
        // Card with all hit values
        const allHits = createTestCard(7); // All position 7 (SINGLE_CLEAN)
        const adjusted = applyPlatoonAdjustment(allHits, 'L', 'R');

        // Should still work, just won't replace out values
        expect(adjusted.length).toBe(35);
      });

      it('handles card with no strikeout values gracefully', () => {
        const noStrikeouts = createTestCard(7); // No value 14
        const adjusted = applyPlatoonAdjustment(noStrikeouts, 'L', 'R');

        expect(adjusted.length).toBe(35);
      });

      it('does not modify structural constant positions', () => {
        const original = createCardWithOutValues();
        const adjusted = applyPlatoonAdjustment(original, 'L', 'R');

        // Structural positions (0-indexed): 0, 2, 5, 10, 12, 17, 22, 24, 31
        for (const pos of STRUCTURAL_POSITIONS) {
          expect(adjusted[pos]).toBe(original[pos]);
        }
      });

      it('preserves card length of 35', () => {
        const original = createCardWithOutValues();
        const adjusted = applyPlatoonAdjustment(original, 'L', 'R');

        expect(adjusted).toHaveLength(35);
      });
    });
  });
});
