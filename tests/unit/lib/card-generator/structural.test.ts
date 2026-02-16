import {
  STRUCTURAL_POSITIONS,
  STRUCTURAL_VALUES,
  CARD_LENGTH,
  applyStructuralConstants,
  isStructuralPosition,
  getVariablePositions,
  POWER_POSITION,
  GATE_POSITIONS,
  ARCHETYPE_POSITIONS,
  getOutcomePositions,
  OUTCOME_POSITION_COUNT,
  NON_DRAWABLE_POSITIONS,
  DRAWABLE_COUNT,
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

describe('POWER_POSITION (BBW card[24])', () => {
  it('is position 24', () => {
    expect(POWER_POSITION).toBe(24);
  });

  it('is not a structural position', () => {
    expect(STRUCTURAL_POSITIONS).not.toContain(POWER_POSITION);
  });

  it('is not an archetype position', () => {
    expect(ARCHETYPE_POSITIONS).not.toContain(POWER_POSITION);
  });
});

describe('GATE_POSITIONS (BBW fixed-value positions)', () => {
  it('defines exactly 3 gate positions', () => {
    expect(GATE_POSITIONS).toHaveLength(3);
  });

  it('uses positions 0, 15, 20', () => {
    expect([...GATE_POSITIONS]).toEqual([0, 15, 20]);
  });

  it('gate positions are not structural positions', () => {
    for (const pos of GATE_POSITIONS) {
      expect(STRUCTURAL_POSITIONS).not.toContain(pos);
    }
  });

  it('gate positions are not archetype positions', () => {
    for (const pos of GATE_POSITIONS) {
      expect(ARCHETYPE_POSITIONS).not.toContain(pos);
    }
  });
});

describe('getOutcomePositions (20 outcome fill positions)', () => {
  it('returns exactly 20 positions', () => {
    const positions = getOutcomePositions();
    expect(positions).toHaveLength(20);
  });

  it('OUTCOME_POSITION_COUNT matches getOutcomePositions length', () => {
    expect(OUTCOME_POSITION_COUNT).toBe(20);
    expect(getOutcomePositions()).toHaveLength(OUTCOME_POSITION_COUNT);
  });

  it('excludes structural positions', () => {
    const positions = getOutcomePositions();
    for (const pos of STRUCTURAL_POSITIONS) {
      expect(positions).not.toContain(pos);
    }
  });

  it('excludes archetype positions (33, 34)', () => {
    const positions = getOutcomePositions();
    expect(positions).not.toContain(33);
    expect(positions).not.toContain(34);
  });

  it('excludes power position (24)', () => {
    const positions = getOutcomePositions();
    expect(positions).not.toContain(POWER_POSITION);
  });

  it('excludes gate positions (0, 15, 20)', () => {
    const positions = getOutcomePositions();
    for (const pos of GATE_POSITIONS) {
      expect(positions).not.toContain(pos);
    }
  });

  it('is sorted ascending', () => {
    const positions = getOutcomePositions();
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it('all positions are within card bounds [0, 34]', () => {
    const positions = getOutcomePositions();
    for (const pos of positions) {
      expect(pos).toBeGreaterThanOrEqual(0);
      expect(pos).toBeLessThan(CARD_LENGTH);
    }
  });
});

describe('card position math', () => {
  it('35 total - 9 structural - 2 archetype = 24 drawable', () => {
    expect(DRAWABLE_COUNT).toBe(24);
  });

  it('35 total - 9 structural - 2 archetype - 1 power - 3 gates = 20 outcome', () => {
    expect(OUTCOME_POSITION_COUNT).toBe(20);
  });

  it('non-drawable set has 11 positions (9 structural + 2 archetype)', () => {
    expect(NON_DRAWABLE_POSITIONS).toHaveLength(11);
  });

  it('no position appears in multiple categories', () => {
    const allExcluded = new Set([
      ...STRUCTURAL_POSITIONS,
      ...ARCHETYPE_POSITIONS,
      POWER_POSITION,
      ...GATE_POSITIONS,
    ]);
    // Total excluded should be 9 + 2 + 1 + 3 = 15
    expect(allExcluded.size).toBe(15);
  });
});
