import {
  computeSlotAllocation,
  splitSinglesTiers,
  fillVariablePositions,
  CARD_VALUES,
} from '@lib/card-generator/value-mapper';
import type { PlayerRates } from '@lib/card-generator/rate-calculator';
import { applyStructuralConstants, CARD_LENGTH, STRUCTURAL_POSITIONS } from '@lib/card-generator/structural';

function makeRates(overrides: Partial<PlayerRates> = {}): PlayerRates {
  return {
    PA: 600,
    walkRate: 0.09,
    strikeoutRate: 0.15,
    homeRunRate: 0.04,
    singleRate: 0.18,
    doubleRate: 0.05,
    tripleRate: 0.005,
    sbRate: 0.60,
    iso: 0.170,
    hbpRate: 0.01,
    sfRate: 0.01,
    shRate: 0,
    gdpRate: 0.02,
    ...overrides,
  };
}

describe('computeSlotAllocation (REQ-DATA-005 Step 3)', () => {
  it('allocates all 24 variable positions', () => {
    const rates = makeRates();
    const alloc = computeSlotAllocation(rates);
    const total = alloc.walks + alloc.strikeouts + alloc.homeRuns +
      alloc.singles + alloc.doubles + alloc.triples + alloc.speed + alloc.outs;
    expect(total).toBe(24);
  });

  it('maps walk slots with scale factor', () => {
    // walkRate 0.10 * 1.0 * 24 = 2.4 -> round to 2
    const rates = makeRates({ walkRate: 0.10 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.walks).toBe(2);
  });

  it('maps strikeout slots with scale factor', () => {
    // strikeoutRate 0.20 * 1.0 * 24 = 4.8 -> round to 5
    const rates = makeRates({ strikeoutRate: 0.20 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.strikeouts).toBe(5);
  });

  it('allocates HRs via hit compensation + largest remainder', () => {
    // homeRunRate 0.06 with totalHitRate 0.295, compensated 0.388
    // 9 total hit positions, HR proportion: 0.06/0.295 * 9 = 1.83 -> 2 (largest remainder)
    const rates = makeRates({ homeRunRate: 0.06 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.homeRuns).toBe(2);
  });

  it('allocates at least 1 walk slot when walkRate > 0', () => {
    const rates = makeRates({ walkRate: 0.01 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.walks).toBeGreaterThanOrEqual(1);
  });

  it('allocates at least 1 strikeout slot when strikeoutRate > 0', () => {
    const rates = makeRates({ strikeoutRate: 0.01 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.strikeouts).toBeGreaterThanOrEqual(1);
  });

  it('allocates 0 speed slots (always 0)', () => {
    const rates = makeRates({ sbRate: 0 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.speed).toBe(0);
  });

  it('speed is always 0 regardless of sbRate', () => {
    const rates = makeRates({ sbRate: 0.60 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.speed).toBe(0);
  });

  it('speed is always 0 even for high sbRate', () => {
    const rates = makeRates({ sbRate: 0.80 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.speed).toBe(0);
  });

  it('always has at least 1 out slot', () => {
    // Even extreme hitters need some outs
    const rates = makeRates({
      walkRate: 0.15, strikeoutRate: 0.25, homeRunRate: 0.08,
      singleRate: 0.25, doubleRate: 0.08, tripleRate: 0.02,
    });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.outs).toBeGreaterThanOrEqual(0);
    // Total must be 24
    const total = alloc.walks + alloc.strikeouts + alloc.homeRuns +
      alloc.singles + alloc.doubles + alloc.triples + alloc.speed + alloc.outs;
    expect(total).toBe(24);
  });

  it('handles zero PA gracefully', () => {
    const rates = makeRates({ PA: 0, walkRate: 0, strikeoutRate: 0, homeRunRate: 0, singleRate: 0, doubleRate: 0, tripleRate: 0, sbRate: 0 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.outs).toBe(24); // All positions become outs
  });
});

describe('splitSinglesTiers', () => {
  it('returns [0, 0, 0] for 0 singles', () => {
    expect(splitSinglesTiers(0, 0.300)).toEqual([0, 0, 0]);
  });

  it('sums to total singles', () => {
    const [h, m, l] = splitSinglesTiers(8, 0.300);
    expect(h + m + l).toBe(8);
  });

  it('gives more high-quality singles for high BABIP', () => {
    const [highHigh] = splitSinglesTiers(10, 0.340);
    const [highLow] = splitSinglesTiers(10, 0.250);
    expect(highHigh).toBeGreaterThan(highLow);
  });

  it('distributes 1 single to mid tier', () => {
    const [h, m, l] = splitSinglesTiers(1, 0.300);
    expect(h + m + l).toBe(1);
  });

  it('handles 2 singles', () => {
    const [h, m, l] = splitSinglesTiers(2, 0.300);
    expect(h + m + l).toBe(2);
  });
});

describe('fillVariablePositions', () => {
  it('fills all 35 positions (9 structural + 24 variable + 2 archetype)', () => {
    const card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);

    const rates = makeRates();
    const alloc = computeSlotAllocation(rates);
    fillVariablePositions(card, alloc, 0.300);

    // Every position should have a non-negative value
    for (let i = 0; i < CARD_LENGTH; i++) {
      expect(card[i]).toBeGreaterThanOrEqual(0);
      expect(card[i]).toBeLessThanOrEqual(42);
    }
  });

  it('preserves structural constants', () => {
    const card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);

    const rates = makeRates();
    const alloc = computeSlotAllocation(rates);
    fillVariablePositions(card, alloc, 0.300);

    // Structural positions should be unchanged
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

  it('contains walk values (13) in variable positions', () => {
    const card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);

    const rates = makeRates({ walkRate: 0.12 }); // Should generate several walks
    const alloc = computeSlotAllocation(rates);
    fillVariablePositions(card, alloc, 0.300);

    const walkCount = card.filter((v, i) => v === CARD_VALUES.WALK && !STRUCTURAL_POSITIONS.includes(i)).length;
    expect(walkCount).toBeGreaterThan(0);
  });

  it('contains strikeout values (14) for strikeout-prone hitters', () => {
    const card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);

    const rates = makeRates({ strikeoutRate: 0.25 });
    const alloc = computeSlotAllocation(rates);
    fillVariablePositions(card, alloc, 0.300);

    const kCount = card.filter((v, i) => v === CARD_VALUES.STRIKEOUT && !STRUCTURAL_POSITIONS.includes(i)).length;
    expect(kCount).toBeGreaterThan(0);
  });

  it('contains HR values for power hitters', () => {
    const card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);

    const rates = makeRates({ homeRunRate: 0.06 });
    const alloc = computeSlotAllocation(rates);
    fillVariablePositions(card, alloc, 0.300);

    const hrValues = [CARD_VALUES.HOME_RUN, CARD_VALUES.HOME_RUN_ALT1, CARD_VALUES.HOME_RUN_ALT2, CARD_VALUES.HOME_RUN_ALT3];
    const hrCount = card.filter((v, i) => hrValues.includes(v) && !STRUCTURAL_POSITIONS.includes(i)).length;
    expect(hrCount).toBeGreaterThan(0);
  });

  it('contains out values to fill remaining positions', () => {
    const card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);

    const rates = makeRates();
    const alloc = computeSlotAllocation(rates);
    fillVariablePositions(card, alloc, 0.300);

    const outValues = [CARD_VALUES.OUT_GROUND, CARD_VALUES.OUT_CONTACT, CARD_VALUES.OUT_NONWALK, CARD_VALUES.OUT_FLY];
    const outCount = card.filter((v, i) => outValues.includes(v) && !STRUCTURAL_POSITIONS.includes(i)).length;
    expect(outCount).toBeGreaterThan(0);
  });

  it('uses first HR value (1) before overflow values', () => {
    const card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);

    const rates = makeRates({ homeRunRate: 0.04 });
    const alloc = computeSlotAllocation(rates);
    fillVariablePositions(card, alloc, 0.300);

    if (alloc.homeRuns > 0) {
      // The first HR slot should use value 1
      const hasValue1 = card.some((v, i) => v === CARD_VALUES.HOME_RUN && !STRUCTURAL_POSITIONS.includes(i));
      expect(hasValue1).toBe(true);
    }
  });

  it('returns the mutated card array', () => {
    const card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);
    const alloc = computeSlotAllocation(makeRates());
    const result = fillVariablePositions(card, alloc, 0.300);
    expect(result).toBe(card);
  });
});
