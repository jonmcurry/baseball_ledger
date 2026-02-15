import {
  generatePitcherBattingCard,
  determinePitcherRole,
  computeStamina,
  determinePitcherUsageFlags,
  buildPitcherAttributes,
} from '@lib/card-generator/pitcher-card';
import { STRUCTURAL_POSITIONS, CARD_LENGTH } from '@lib/card-generator/structural';
import { CARD_VALUES } from '@lib/card-generator/value-mapper';
import type { PitchingStats } from '@lib/types';

function makePitchingStats(overrides: Partial<PitchingStats> = {}): PitchingStats {
  return {
    G: 0, GS: 0, W: 0, L: 0, SV: 0, IP: 0, H: 0, R: 0, ER: 0, HR: 0,
    BB: 0, SO: 0, HBP: 0, BF: 0, WP: 0, BK: 0, CG: 0, SHO: 0, HLD: 0, BS: 0,
    ERA: 0, WHIP: 0, FIP: 0,
    ...overrides,
  };
}

describe('generatePitcherBattingCard (REQ-DATA-005 Step 6)', () => {
  it('returns a 35-element card', () => {
    const card = generatePitcherBattingCard();
    expect(card).toHaveLength(CARD_LENGTH);
  });

  it('preserves structural constants', () => {
    const card = generatePitcherBattingCard();
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

  it('floods variable positions with walks (14-18 of 26)', () => {
    const card = generatePitcherBattingCard();
    const walkCount = card.filter((v, i) =>
      v === CARD_VALUES.WALK && !STRUCTURAL_POSITIONS.includes(i),
    ).length;
    expect(walkCount).toBeGreaterThanOrEqual(14);
    expect(walkCount).toBeLessThanOrEqual(18);
  });

  it('includes strikeout values (3-5 of 26)', () => {
    const card = generatePitcherBattingCard();
    const kCount = card.filter((v, i) =>
      v === CARD_VALUES.STRIKEOUT && !STRUCTURAL_POSITIONS.includes(i),
    ).length;
    expect(kCount).toBeGreaterThanOrEqual(3);
    expect(kCount).toBeLessThanOrEqual(5);
  });

  it('fills remaining with out values', () => {
    const card = generatePitcherBattingCard();
    const outValues = [CARD_VALUES.OUT_GROUND, CARD_VALUES.OUT_CONTACT, CARD_VALUES.OUT_NONWALK, CARD_VALUES.OUT_FLY];
    const outCount = card.filter((v, i) =>
      outValues.includes(v) && !STRUCTURAL_POSITIONS.includes(i),
    ).length;
    expect(outCount).toBeGreaterThan(0);
  });

  it('has no hit values (no singles, doubles, triples, HRs)', () => {
    const card = generatePitcherBattingCard();
    const hitValues = [
      CARD_VALUES.HOME_RUN, CARD_VALUES.HOME_RUN_ALT1, CARD_VALUES.HOME_RUN_ALT2, CARD_VALUES.HOME_RUN_ALT3,
      CARD_VALUES.SINGLE_HIGH, CARD_VALUES.SINGLE_MID, CARD_VALUES.SINGLE_LOW,
      CARD_VALUES.DOUBLE, CARD_VALUES.TRIPLE_1, CARD_VALUES.TRIPLE_2,
    ];
    for (let i = 0; i < CARD_LENGTH; i++) {
      if (STRUCTURAL_POSITIONS.includes(i)) continue;
      expect(hitValues).not.toContain(card[i]);
    }
  });
});

describe('determinePitcherRole', () => {
  it('returns SP when GS/G >= 0.50', () => {
    const stats = makePitchingStats({ G: 35, GS: 35 });
    expect(determinePitcherRole(stats)).toBe('SP');
  });

  it('returns CL when SV >= 10', () => {
    const stats = makePitchingStats({ G: 60, GS: 0, SV: 25 });
    expect(determinePitcherRole(stats)).toBe('CL');
  });

  it('returns RP for middle relievers', () => {
    const stats = makePitchingStats({ G: 50, GS: 5, SV: 3 });
    expect(determinePitcherRole(stats)).toBe('RP');
  });

  it('prioritizes CL over SP when both criteria met', () => {
    // Unusual case: starter with saves
    const stats = makePitchingStats({ G: 30, GS: 20, SV: 12 });
    expect(determinePitcherRole(stats)).toBe('CL');
  });

  it('returns RP for zero games', () => {
    const stats = makePitchingStats({ G: 0, GS: 0 });
    expect(determinePitcherRole(stats)).toBe('RP');
  });
});

describe('computeStamina', () => {
  it('returns 0 for zero games', () => {
    const stats = makePitchingStats({ G: 0, IP: 0 });
    expect(computeStamina(stats)).toBe(0);
  });

  it('computes IP/G for a starter', () => {
    // 312 IP in 39 games = 8.0 IP/G
    const stats = makePitchingStats({ G: 39, IP: 312 });
    expect(computeStamina(stats)).toBeCloseTo(8.0, 1);
  });

  it('handles baseball notation IP correctly', () => {
    // 200.1 in baseball notation = 200 + 1/3 = 200.333 decimal
    // 200.333 / 30 games = 6.678
    const stats = makePitchingStats({ G: 30, IP: 200.1 });
    expect(computeStamina(stats)).toBeCloseTo(200.333 / 30, 2);
  });

  it('gives low stamina for relievers', () => {
    const stats = makePitchingStats({ G: 60, IP: 80 });
    expect(computeStamina(stats)).toBeCloseTo(80 / 60, 2);
  });
});

describe('determinePitcherUsageFlags', () => {
  it('returns empty for zero IP', () => {
    const stats = makePitchingStats({ IP: 0, G: 0 });
    expect(determinePitcherUsageFlags(stats)).toEqual([]);
  });

  it('returns ["strikeout"] for K/9 > 9.0', () => {
    // 250 SO in 200 IP = K/9 of 11.25
    const stats = makePitchingStats({ IP: 200, SO: 250, HR: 15, BB: 50, H: 150 });
    const flags = determinePitcherUsageFlags(stats);
    expect(flags).toContain('strikeout');
  });

  it('does not include "strikeout" for low K rate', () => {
    const stats = makePitchingStats({ IP: 200, SO: 100, HR: 10, BB: 50, H: 180 });
    const flags = determinePitcherUsageFlags(stats);
    expect(flags).not.toContain('strikeout');
  });

  it('returns ["flyball"] for high HR/9', () => {
    // 30 HR in 200 IP = HR/9 of 1.35
    const stats = makePitchingStats({ IP: 200, SO: 100, HR: 30, BB: 50, H: 180 });
    const flags = determinePitcherUsageFlags(stats);
    expect(flags).toContain('flyball');
  });

  it('returns ["groundball"] for low HR/9 and high WHIP', () => {
    // 5 HR in 200 IP = HR/9 of 0.225, WHIP = (50+200)/200 = 1.25
    const stats = makePitchingStats({ IP: 200, SO: 100, HR: 5, BB: 50, H: 200 });
    const flags = determinePitcherUsageFlags(stats);
    expect(flags).toContain('groundball');
  });
});

describe('buildPitcherAttributes', () => {
  const allERAs = [1.82, 2.50, 3.00, 3.50, 4.00, 4.50, 5.00, 5.50, 6.00, 6.50];

  it('builds complete attributes for a starter', () => {
    const stats = makePitchingStats({
      G: 39, GS: 39, W: 24, L: 8, IP: 312, ER: 63,
      H: 209, BB: 88, SO: 301, HR: 12, SV: 0,
      ERA: 1.82, WHIP: 0.952, BF: 1200,
    });
    const attrs = buildPitcherAttributes(stats, allERAs);

    expect(attrs.role).toBe('SP');
    expect(attrs.grade).toBeGreaterThanOrEqual(13); // Best ERA in list
    expect(attrs.stamina).toBeCloseTo(8.0, 1);
    expect(attrs.era).toBe(1.82);
    expect(attrs.whip).toBe(0.952);
    expect(attrs.k9).toBeCloseTo(8.68, 1);
    expect(attrs.bb9).toBeCloseTo(2.54, 1);
    expect(attrs.isReliever).toBe(false);
  });

  it('builds complete attributes for a closer', () => {
    const stats = makePitchingStats({
      G: 60, GS: 0, SV: 30, IP: 80, ER: 20,
      H: 50, BB: 25, SO: 90, HR: 5,
      ERA: 2.25, WHIP: 0.938, BF: 300,
    });
    const attrs = buildPitcherAttributes(stats, allERAs);

    expect(attrs.role).toBe('CL');
    expect(attrs.isReliever).toBe(true);
    expect(attrs.stamina).toBeCloseTo(80 / 60, 2);
    expect(attrs.k9).toBeCloseTo(10.125, 1);
    expect(attrs.usageFlags).toContain('strikeout');
  });

  it('sets isReliever for RP', () => {
    const stats = makePitchingStats({
      G: 50, GS: 3, SV: 2, IP: 70, ER: 30,
      H: 60, BB: 25, SO: 50, HR: 8,
      ERA: 3.86, WHIP: 1.214,
    });
    const attrs = buildPitcherAttributes(stats, allERAs);

    expect(attrs.role).toBe('RP');
    expect(attrs.isReliever).toBe(true);
  });

  it('handles edge case of 0 IP', () => {
    const stats = makePitchingStats({ G: 1, IP: 0, ERA: 99.99, WHIP: 99.99 });
    const attrs = buildPitcherAttributes(stats, allERAs);

    expect(attrs.k9).toBe(0);
    expect(attrs.bb9).toBe(0);
    expect(attrs.hr9).toBe(0);
    expect(attrs.stamina).toBe(0);
  });
});
