import {
  computePowerRating,
  getPowerLabel,
  POWER_TIERS,
} from '@lib/card-generator/power-rating';

describe('POWER_TIERS', () => {
  it('defines exactly 8 tiers', () => {
    expect(POWER_TIERS).toHaveLength(8);
  });

  it('tiers are in ascending ISO order', () => {
    for (let i = 1; i < POWER_TIERS.length; i++) {
      expect(POWER_TIERS[i].maxISO).toBeGreaterThan(POWER_TIERS[i - 1].maxISO);
    }
  });

  it('last tier has Infinity upper bound', () => {
    expect(POWER_TIERS[POWER_TIERS.length - 1].maxISO).toBe(Infinity);
  });

  it('all card values are in {13, 15-21} (BBW power range, no value 14)', () => {
    const validValues = new Set([13, 15, 16, 17, 18, 19, 20, 21]);
    for (const tier of POWER_TIERS) {
      expect(validValues.has(tier.cardValue)).toBe(true);
    }
  });

  it('uses 8 distinct card values', () => {
    const uniqueValues = new Set(POWER_TIERS.map(t => t.cardValue));
    expect(uniqueValues.size).toBe(8);
  });
});

describe('computePowerRating (REQ-DATA-005 Step 4, BBW-calibrated)', () => {
  it('returns 13 for ISO < 0.040 (no power -- pitchers, slap hitters)', () => {
    expect(computePowerRating(0)).toBe(13);
    expect(computePowerRating(0.020)).toBe(13);
    expect(computePowerRating(0.039)).toBe(13);
  });

  it('returns 15 for ISO 0.040-0.069 (minimal)', () => {
    expect(computePowerRating(0.040)).toBe(15);
    expect(computePowerRating(0.055)).toBe(15);
    expect(computePowerRating(0.069)).toBe(15);
  });

  it('returns 16 for ISO 0.070-0.099 (below average)', () => {
    expect(computePowerRating(0.070)).toBe(16);
    expect(computePowerRating(0.085)).toBe(16);
    expect(computePowerRating(0.099)).toBe(16);
  });

  it('returns 17 for ISO 0.100-0.129 (average)', () => {
    expect(computePowerRating(0.100)).toBe(17);
    expect(computePowerRating(0.115)).toBe(17);
    expect(computePowerRating(0.129)).toBe(17);
  });

  it('returns 18 for ISO 0.130-0.169 (above average)', () => {
    expect(computePowerRating(0.130)).toBe(18);
    expect(computePowerRating(0.150)).toBe(18);
    expect(computePowerRating(0.169)).toBe(18);
  });

  it('returns 19 for ISO 0.170-0.209 (good)', () => {
    expect(computePowerRating(0.170)).toBe(19);
    expect(computePowerRating(0.190)).toBe(19);
    expect(computePowerRating(0.209)).toBe(19);
  });

  it('returns 20 for ISO 0.210-0.259 (very good)', () => {
    expect(computePowerRating(0.210)).toBe(20);
    expect(computePowerRating(0.240)).toBe(20);
    expect(computePowerRating(0.259)).toBe(20);
  });

  it('returns 21 for ISO >= 0.260 (excellent)', () => {
    expect(computePowerRating(0.260)).toBe(21);
    expect(computePowerRating(0.350)).toBe(21);
    expect(computePowerRating(0.500)).toBe(21);
  });

  it('handles negative ISO (returns 13 -- no power tier)', () => {
    expect(computePowerRating(-0.010)).toBe(13);
  });

  // Realistic examples
  it('rates Hank Aaron 1971 (ISO ~0.342) as excellent', () => {
    expect(computePowerRating(0.342)).toBe(21);
  });

  it('rates a slap hitter (ISO ~0.030) as no power', () => {
    expect(computePowerRating(0.030)).toBe(13);
  });

  it('rates an average hitter (ISO ~0.115) as average', () => {
    expect(computePowerRating(0.115)).toBe(17);
  });
});

describe('getPowerLabel', () => {
  it('returns correct label for each tier value', () => {
    expect(getPowerLabel(13)).toBe('No power');
    expect(getPowerLabel(15)).toBe('Minimal power');
    expect(getPowerLabel(16)).toBe('Below average');
    expect(getPowerLabel(17)).toBe('Average power');
    expect(getPowerLabel(18)).toBe('Above average');
    expect(getPowerLabel(19)).toBe('Good power');
    expect(getPowerLabel(20)).toBe('Very good');
    expect(getPowerLabel(21)).toBe('Excellent power');
  });

  it('returns Unknown for invalid card value', () => {
    expect(getPowerLabel(14)).toBe('Unknown'); // 14 never used per BBW
    expect(getPowerLabel(99)).toBe('Unknown');
  });
});
