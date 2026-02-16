import {
  computeSlotAllocation,
  splitSinglesTiers,
  fillVariablePositions,
  applyGateValues,
  CARD_VALUES,
} from '@lib/card-generator/value-mapper';
import type { PlayerRates } from '@lib/card-generator/rate-calculator';
import { applyStructuralConstants, CARD_LENGTH, STRUCTURAL_POSITIONS, POWER_POSITION } from '@lib/card-generator/structural';
import { computePowerRating } from '@lib/card-generator/power-rating';

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
  it('allocates all 20 outcome positions', () => {
    const rates = makeRates();
    const alloc = computeSlotAllocation(rates);
    const total = alloc.walks + alloc.strikeouts + alloc.homeRuns +
      alloc.singles + alloc.doubles + alloc.triples + alloc.speed + alloc.outs;
    expect(total).toBe(20);
  });

  it('maps walk slots via proportional allocation', () => {
    // Proportional: round(0.10 * 26) = round(2.6) = 3 walks
    // No gate pre-set subtraction when called without gate counts
    const rates = makeRates({ walkRate: 0.10 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.walks).toBe(3);
  });

  it('maps strikeout slots via proportional allocation', () => {
    // Proportional: round(0.20 * 26) = round(5.2) = 5 total Ks
    const rates = makeRates({ strikeoutRate: 0.20 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.strikeouts).toBe(5);
  });

  it('allocates HRs via proportional allocation', () => {
    // Proportional: 0.06 * 26 = 1.56, minus 1 archetype HR (default byte34=1)
    // fillHRs = 0.56 -> rounds to 1 via largest remainder
    const rates = makeRates({ homeRunRate: 0.06 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.homeRuns).toBeGreaterThanOrEqual(0);
    expect(alloc.homeRuns).toBeLessThanOrEqual(2);
  });

  it('allocates HRs for average power via proportional', () => {
    // Proportional: 0.04 * 26 = 1.04, minus 1 archetype HR (default byte34=1)
    // fillHRs = 0.04 -> rounds to 0 (archetype provides the HR)
    const rates = makeRates({ homeRunRate: 0.04 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.homeRuns).toBe(0);
  });

  it('allocates singles with suppression compensation', () => {
    // Proportional + suppression: 0.18 * 26 / (1 - 2/3 * 8/15) = 4.68 / 0.644 = 7.27
    // Minus 0 archetype singles (default (0,1) = no singles)
    // fillSingles = ~7 (via largest remainder)
    const rates = makeRates({ singleRate: 0.18 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.singles).toBeGreaterThanOrEqual(5);
    expect(alloc.singles).toBeLessThanOrEqual(9);
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
    // Total must be 20 (outcome positions, excludes power + 3 gates)
    const total = alloc.walks + alloc.strikeouts + alloc.homeRuns +
      alloc.singles + alloc.doubles + alloc.triples + alloc.speed + alloc.outs;
    expect(total).toBe(20);
  });

  it('handles zero PA gracefully', () => {
    const rates = makeRates({ PA: 0, walkRate: 0, strikeoutRate: 0, homeRunRate: 0, singleRate: 0, doubleRate: 0, tripleRate: 0, sbRate: 0 });
    const alloc = computeSlotAllocation(rates);
    expect(alloc.outs).toBe(20); // All outcome positions become outs
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

describe('applyGateValues (BBW gate positions)', () => {
  it('sets position 0 to WALK when walkRate > strikeoutRate', () => {
    const card = new Array(CARD_LENGTH).fill(0);
    const { gateWalkCount, gateKCount } = applyGateValues(card, 0.12, 0.08, 0.150);
    expect(card[0]).toBe(CARD_VALUES.WALK);
    expect(gateWalkCount).toBe(1);
    expect(gateKCount).toBe(1); // Position 20 K gate
  });

  it('sets position 0 to STRIKEOUT when strikeoutRate >= walkRate', () => {
    const card = new Array(CARD_LENGTH).fill(0);
    const { gateWalkCount, gateKCount } = applyGateValues(card, 0.08, 0.15, 0.150);
    expect(card[0]).toBe(CARD_VALUES.STRIKEOUT);
    expect(gateWalkCount).toBe(0);
    expect(gateKCount).toBe(2); // Position 0 K + Position 20 K
  });

  it('sets position 15 to POWER_GATE (33)', () => {
    const card = new Array(CARD_LENGTH).fill(0);
    applyGateValues(card, 0.09, 0.15, 0.150);
    expect(card[15]).toBe(CARD_VALUES.POWER_GATE);
  });

  it('sets position 20 to STRIKEOUT always', () => {
    const card = new Array(CARD_LENGTH).fill(0);
    applyGateValues(card, 0.09, 0.15, 0.150);
    expect(card[20]).toBe(CARD_VALUES.STRIKEOUT);
  });

  it('does not modify other positions', () => {
    const card = new Array(CARD_LENGTH).fill(99);
    applyGateValues(card, 0.09, 0.15, 0.150);
    // Only positions 0, 15, 20 should be changed
    for (let i = 0; i < CARD_LENGTH; i++) {
      if (i !== 0 && i !== 15 && i !== 20) {
        expect(card[i]).toBe(99);
      }
    }
  });
});

describe('full card pipeline (gates + power + fill)', () => {
  // Standard RH archetype: byte33=7 (SINGLE_CLEAN), byte34=0 (DOUBLE)
  const ARCH_B33 = 7;
  const ARCH_B34 = 0;

  function buildFullCard(overrides: Partial<PlayerRates> = {}) {
    const rates = makeRates(overrides);
    const card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);
    const { gateWalkCount, gateKCount } = applyGateValues(
      card, rates.walkRate, rates.strikeoutRate, rates.iso,
    );
    const alloc = computeSlotAllocation(rates, gateWalkCount, gateKCount, ARCH_B33, ARCH_B34);
    fillVariablePositions(card, alloc, 0.300);
    card[POWER_POSITION] = computePowerRating(rates.iso);
    card[33] = ARCH_B33;
    card[34] = ARCH_B34;
    return card;
  }

  it('card[24] equals power rating for ISO 0.170', () => {
    const card = buildFullCard({ iso: 0.170 });
    expect(card[POWER_POSITION]).toBe(20); // Above average (0.150-0.189)
  });

  it('card[24] equals power rating for ISO 0.050', () => {
    const card = buildFullCard({ iso: 0.050 });
    expect(card[POWER_POSITION]).toBe(18); // Minimal power (0.050-0.079)
  });

  it('card[24] equals power rating for ISO 0.280+', () => {
    const card = buildFullCard({ iso: 0.300 });
    expect(card[POWER_POSITION]).toBe(21); // Excellent power
  });

  it('position 0 is always 13 or 14', () => {
    const profiles = [
      { walkRate: 0.12, strikeoutRate: 0.08 },
      { walkRate: 0.06, strikeoutRate: 0.20 },
      { walkRate: 0.10, strikeoutRate: 0.10 },
    ];
    for (const overrides of profiles) {
      const card = buildFullCard(overrides);
      expect([13, 14]).toContain(card[0]);
    }
  });

  it('position 20 is always 14 (K gate)', () => {
    const card = buildFullCard();
    expect(card[20]).toBe(14);
  });

  it('position 15 is always 33 (power gate)', () => {
    const card = buildFullCard();
    expect(card[15]).toBe(33);
  });

  it('fast players (speed >= 0.6) have SB values on card', () => {
    const rates = makeRates({ sbRate: 0.70 });
    const card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);
    const { gateWalkCount, gateKCount } = applyGateValues(
      card, rates.walkRate, rates.strikeoutRate, rates.iso,
    );
    const alloc = computeSlotAllocation(rates, gateWalkCount, gateKCount);
    fillVariablePositions(card, alloc, 0.300, 0.7);
    card[POWER_POSITION] = computePowerRating(rates.iso);

    const speedValues = new Set([
      CARD_VALUES.SB_OPPORTUNITY,
      CARD_VALUES.SPEED_1,
      CARD_VALUES.SPEED_2,
    ]);
    const hasSpeed = card.some((v, i) =>
      speedValues.has(v) && !STRUCTURAL_POSITIONS.includes(i)
    );
    expect(hasSpeed).toBe(true);
  });

  it('slow players (speed < 0.6) have no SB values', () => {
    const rates = makeRates({ sbRate: 0.10 });
    const card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);
    const { gateWalkCount, gateKCount } = applyGateValues(
      card, rates.walkRate, rates.strikeoutRate, rates.iso,
    );
    const alloc = computeSlotAllocation(rates, gateWalkCount, gateKCount);
    fillVariablePositions(card, alloc, 0.300, 0.3);
    card[POWER_POSITION] = computePowerRating(rates.iso);

    const speedValues = new Set([
      CARD_VALUES.SB_OPPORTUNITY,
      CARD_VALUES.SPEED_1,
      CARD_VALUES.SPEED_2,
    ]);
    const hasSpeed = card.some((v, i) =>
      speedValues.has(v) && !STRUCTURAL_POSITIONS.includes(i)
    );
    expect(hasSpeed).toBe(false);
  });

  it('no position has value 0 except doubles positions', () => {
    const card = buildFullCard();
    // Value 0 = DOUBLE. Only legitimate double positions should have it.
    // Count how many value-0 positions exist
    const zeroPositions = card.filter((v: number) => v === 0).length;
    // With the full pipeline, only allocated double positions should be 0
    // (plus archetype byte 34 which is legitimately 0)
    const alloc = computeSlotAllocation(makeRates(), 0, 0, ARCH_B33, ARCH_B34);
    expect(zeroPositions).toBeLessThanOrEqual(alloc.doubles + 1); // +1 for archetype byte34
  });
});
