import {
  STRUCTURAL_POSITIONS,
  STRUCTURAL_VALUES,
  CARD_LENGTH,
  applyStructuralConstants,
  isStructuralPosition,
  getVariablePositions,
} from '@lib/card-generator/structural';

describe('structural constants (REQ-DATA-005 Step 2)', () => {
  it('defines exactly 9 structural positions', () => {
    expect(STRUCTURAL_POSITIONS).toHaveLength(9);
  });

  it('uses the correct position indices (0-indexed from APBA PLAYERS.DAT analysis)', () => {
    // These positions are already 0-indexed from reverse engineering.
    // Verified against 828 real APBA cards in 1971S.WDD PLAYERS.DAT.
    expect(STRUCTURAL_POSITIONS).toEqual([1, 3, 6, 11, 13, 18, 23, 25, 32]);
  });

  it('maps to the correct values per SRD', () => {
    // card[1]=30, card[3]=28, card[6]=27, card[11]=26, card[13]=31,
    // card[18]=29, card[23]=25, card[25]=32, card[32]=35
    expect(STRUCTURAL_VALUES).toEqual(
      new Map([
        [1, 30],
        [3, 28],
        [6, 27],
        [11, 26],
        [13, 31],
        [18, 29],
        [23, 25],
        [25, 32],
        [32, 35],
      ]),
    );
  });

  it('card length is 35', () => {
    expect(CARD_LENGTH).toBe(35);
  });
});

describe('applyStructuralConstants', () => {
  it('sets the 9 structural positions on a 35-element array', () => {
    const card = new Array(35).fill(0);
    applyStructuralConstants(card);

    expect(card[1]).toBe(30);
    expect(card[3]).toBe(28);
    expect(card[6]).toBe(27);
    expect(card[11]).toBe(26);
    expect(card[13]).toBe(31);
    expect(card[18]).toBe(29);
    expect(card[23]).toBe(25);
    expect(card[25]).toBe(32);
    expect(card[32]).toBe(35);
  });

  it('does not modify variable positions', () => {
    const card = new Array(35).fill(99);
    applyStructuralConstants(card);

    // Variable positions should remain 99
    const variableIndices = [0, 2, 4, 5, 7, 8, 9, 10, 12, 14, 15, 16, 17, 19, 20, 21, 22, 24, 26, 27, 28, 29, 30, 31, 33, 34];
    for (const i of variableIndices) {
      expect(card[i]).toBe(99);
    }
  });

  it('returns the card array for chaining', () => {
    const card = new Array(35).fill(0);
    const result = applyStructuralConstants(card);
    expect(result).toBe(card);
  });
});

describe('isStructuralPosition', () => {
  it('returns true for all 9 structural positions', () => {
    for (const pos of [1, 3, 6, 11, 13, 18, 23, 25, 32]) {
      expect(isStructuralPosition(pos)).toBe(true);
    }
  });

  it('returns false for variable positions', () => {
    for (const pos of [0, 2, 4, 5, 7, 8, 9, 10, 12, 14, 15, 16, 17, 19, 20, 21, 22, 24, 26, 27, 28, 29, 30, 31, 33, 34]) {
      expect(isStructuralPosition(pos)).toBe(false);
    }
  });
});

describe('getVariablePositions', () => {
  it('returns exactly 26 variable positions', () => {
    const positions = getVariablePositions();
    expect(positions).toHaveLength(26);
  });

  it('excludes all structural positions', () => {
    const positions = getVariablePositions();
    for (const pos of STRUCTURAL_POSITIONS) {
      expect(positions).not.toContain(pos);
    }
  });

  it('is sorted ascending', () => {
    const positions = getVariablePositions();
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });
});
