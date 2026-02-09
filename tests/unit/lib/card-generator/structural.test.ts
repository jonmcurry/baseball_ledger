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

  it('uses the correct position indices (0-indexed: 0,2,5,10,12,17,22,24,31)', () => {
    // SRD uses 1-indexed: 1,3,6,11,13,18,23,25,32
    // We use 0-indexed arrays
    expect(STRUCTURAL_POSITIONS).toEqual([0, 2, 5, 10, 12, 17, 22, 24, 31]);
  });

  it('maps to the correct values per SRD', () => {
    // card[1]=30, card[3]=28, card[6]=27, card[11]=26, card[13]=31,
    // card[18]=29, card[23]=25, card[25]=32, card[32]=35
    expect(STRUCTURAL_VALUES).toEqual(
      new Map([
        [0, 30],
        [2, 28],
        [5, 27],
        [10, 26],
        [12, 31],
        [17, 29],
        [22, 25],
        [24, 32],
        [31, 35],
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

    expect(card[0]).toBe(30);
    expect(card[2]).toBe(28);
    expect(card[5]).toBe(27);
    expect(card[10]).toBe(26);
    expect(card[12]).toBe(31);
    expect(card[17]).toBe(29);
    expect(card[22]).toBe(25);
    expect(card[24]).toBe(32);
    expect(card[31]).toBe(35);
  });

  it('does not modify variable positions', () => {
    const card = new Array(35).fill(99);
    applyStructuralConstants(card);

    // Variable positions should remain 99
    const variableIndices = [1, 3, 4, 6, 7, 8, 9, 11, 13, 14, 15, 16, 18, 19, 20, 21, 23, 25, 26, 27, 28, 29, 30, 32, 33, 34];
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
    for (const pos of [0, 2, 5, 10, 12, 17, 22, 24, 31]) {
      expect(isStructuralPosition(pos)).toBe(true);
    }
  });

  it('returns false for variable positions', () => {
    for (const pos of [1, 3, 4, 6, 7, 8, 9, 11, 13, 14, 15, 16, 18, 19, 20, 21, 23, 25, 26, 27, 28, 29, 30, 32, 33, 34]) {
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
