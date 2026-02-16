import {
  computePowerRating,
  getPowerLabel,
  POWER_TIERS,
} from '@lib/card-generator/power-rating';
import { IDT_ACTIVE_LOW, IDT_ACTIVE_HIGH } from '@lib/simulation/plate-appearance';

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

  it('all card values are IDT-active [15-21], never walk value 13', () => {
    for (const tier of POWER_TIERS) {
      expect(tier.cardValue).toBeGreaterThanOrEqual(IDT_ACTIVE_LOW);
      expect(tier.cardValue).toBeLessThanOrEqual(IDT_ACTIVE_HIGH);
      expect(tier.cardValue).not.toBe(13); // 13 = WALK, must never be a power rating
    }
  });
});

describe('computePowerRating (REQ-DATA-005 Step 4)', () => {
  it('returns 15 for ISO < 0.050 (no power -- IDT-active, not walk)', () => {
    expect(computePowerRating(0)).toBe(15);
    expect(computePowerRating(0.030)).toBe(15);
    expect(computePowerRating(0.049)).toBe(15);
  });

  it('returns 15 for ISO 0.050-0.079 (minimal)', () => {
    expect(computePowerRating(0.050)).toBe(15);
    expect(computePowerRating(0.065)).toBe(15);
    expect(computePowerRating(0.079)).toBe(15);
  });

  it('returns 16 for ISO 0.080-0.109 (below average)', () => {
    expect(computePowerRating(0.080)).toBe(16);
    expect(computePowerRating(0.100)).toBe(16);
    expect(computePowerRating(0.109)).toBe(16);
  });

  it('returns 17 for ISO 0.110-0.149 (average)', () => {
    expect(computePowerRating(0.110)).toBe(17);
    expect(computePowerRating(0.130)).toBe(17);
    expect(computePowerRating(0.149)).toBe(17);
  });

  it('returns 18 for ISO 0.150-0.189 (above average)', () => {
    expect(computePowerRating(0.150)).toBe(18);
    expect(computePowerRating(0.170)).toBe(18);
    expect(computePowerRating(0.189)).toBe(18);
  });

  it('returns 19 for ISO 0.190-0.229 (good)', () => {
    expect(computePowerRating(0.190)).toBe(19);
    expect(computePowerRating(0.210)).toBe(19);
    expect(computePowerRating(0.229)).toBe(19);
  });

  it('returns 20 for ISO 0.230-0.279 (very good)', () => {
    expect(computePowerRating(0.230)).toBe(20);
    expect(computePowerRating(0.260)).toBe(20);
    expect(computePowerRating(0.279)).toBe(20);
  });

  it('returns 21 for ISO >= 0.280 (excellent)', () => {
    expect(computePowerRating(0.280)).toBe(21);
    expect(computePowerRating(0.350)).toBe(21);
    expect(computePowerRating(0.500)).toBe(21);
  });

  it('handles negative ISO (should return 15 -- no power tier)', () => {
    expect(computePowerRating(-0.010)).toBe(15);
  });

  // Realistic examples
  it('rates Hank Aaron 1971 (ISO ~0.342) as excellent', () => {
    expect(computePowerRating(0.342)).toBe(21);
  });

  it('rates a slap hitter (ISO ~0.040) as no power', () => {
    expect(computePowerRating(0.040)).toBe(15);
  });

  it('rates an average hitter (ISO ~0.130) as average', () => {
    expect(computePowerRating(0.130)).toBe(17);
  });
});

describe('getPowerLabel', () => {
  it('returns correct label for each tier value', () => {
    // No power and Minimal power share cardValue 15; getPowerLabel returns
    // the first match which is 'No power'.
    expect(getPowerLabel(15)).toBe('No power');
    expect(getPowerLabel(16)).toBe('Below average');
    expect(getPowerLabel(17)).toBe('Average power');
    expect(getPowerLabel(18)).toBe('Above average');
    expect(getPowerLabel(19)).toBe('Good power');
    expect(getPowerLabel(20)).toBe('Very good');
    expect(getPowerLabel(21)).toBe('Excellent power');
  });

  it('returns Unknown for invalid card value', () => {
    expect(getPowerLabel(13)).toBe('Unknown'); // 13 = walk, not a valid power tier
    expect(getPowerLabel(14)).toBe('Unknown');
    expect(getPowerLabel(99)).toBe('Unknown');
  });
});
