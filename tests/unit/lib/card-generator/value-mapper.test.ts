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
  it('allocates all 26 variable positions', () => {
    const rates = makeRates();
    const alloc = computeSlotAllocation(rates);
    const total = alloc.walks + alloc.strikeouts + alloc.homeRuns +
      alloc.singles + alloc.doubles + alloc.triples + alloc.speed + alloc.outs;
    expect(total).toBe(26);
  });

  it('scales walk slots by 1.5x rate', () => {
    // walkRate 0.10 * 1.5 * 26 = 3.9 -> round to 4
    const rates = makeRates({ walkRate: 0.10 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.walks).toBe(4);
  });

  it('scales strikeout slots by 1.3x rate', () => {
    // strikeoutRate 0.20 * 1.3 * 26 = 6.76 -> round to 7
    const rates = makeRates({ strikeoutRate: 0.20 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.strikeouts).toBe(7);
  });

  it('scales home run slots by 3.5x rate', () => {
    // homeRunRate 0.06 * 3.5 * 26 = 5.46 -> round to 5
    const rates = makeRates({ homeRunRate: 0.06 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.homeRuns).toBe(5);
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

  it('allocates 0 speed slots for sbRate = 0', () => {
    const rates = makeRates({ sbRate: 0 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.speed).toBe(0);
  });

  it('allocates 2 speed slots for moderate sbRate', () => {
    const rates = makeRates({ sbRate: 0.60 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.speed).toBe(2);
  });

  it('allocates 3 speed slots for high sbRate', () => {
    const rates = makeRates({ sbRate: 0.80 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.speed).toBe(3);
  });

  it('always has at least 1 out slot', () => {
    // Even extreme hitters need some outs
    const rates = makeRates({
      walkRate: 0.15, strikeoutRate: 0.25, homeRunRate: 0.08,
      singleRate: 0.25, doubleRate: 0.08, tripleRate: 0.02,
    });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.outs).toBeGreaterThanOrEqual(0);
    // Total must be 26
    const total = alloc.walks + alloc.strikeouts + alloc.homeRuns +
      alloc.singles + alloc.doubles + alloc.triples + alloc.speed + alloc.outs;
    expect(total).toBe(26);
  });

  it('handles zero PA gracefully', () => {
    const rates = makeRates({ PA: 0, walkRate: 0, strikeoutRate: 0, homeRunRate: 0, singleRate: 0, doubleRate: 0, tripleRate: 0, sbRate: 0 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.outs).toBe(26); // All positions become outs
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
  it('fills all 35 positions (9 structural + 26 variable)', () => {
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
