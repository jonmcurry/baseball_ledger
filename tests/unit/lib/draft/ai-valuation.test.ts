import {
  calculateBatterValue,
  calculatePitcherValue,
  getPositionMultiplier,
  getBestPositionMultiplier,
  getBestEligiblePosition,
  calculatePlayerValue,
  selectBestSeason,
  computeIpScaleFactor,
  computePaScaleFactor,
} from '@lib/draft/ai-valuation';
import type { PlayerCard, PitcherAttributes } from '@lib/types/player';

// ---------------------------------------------------------------------------
// Helper: minimal PlayerCard for testing
// ---------------------------------------------------------------------------
function makeCard(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    playerId: 'test01',
    nameFirst: 'Test',
    nameLast: 'Player',
    seasonYear: 2000,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: '1B',
    eligiblePositions: ['1B'],
    isPitcher: false,
    card: new Array(35).fill(0),
    powerRating: 17,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.5,
    power: 0.15,
    discipline: 0.5,
    contactRate: 0.8,
    fieldingPct: 0.98,
    range: 0.5,
    arm: 0.5,
    ...overrides,
  };
}

function makePitcherCard(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return makeCard({
    isPitcher: true,
    primaryPosition: 'SP',
    eligiblePositions: ['SP'],
    pitching: {
      role: 'SP',
      grade: 10,
      stamina: 6.5,
      era: 3.20,
      whip: 1.15,
      k9: 8.5,
      bb9: 2.5,
      hr9: 0.9,
      usageFlags: [],
      isReliever: false,
    },
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// getPositionMultiplier (REQ-DFT-007)
// ---------------------------------------------------------------------------
describe('getPositionMultiplier (REQ-DFT-007)', () => {
  it('SS = 1.15 (highest scarcity)', () => expect(getPositionMultiplier('SS')).toBe(1.15));
  it('C = 1.12', () => expect(getPositionMultiplier('C')).toBe(1.12));
  it('CF = 1.08', () => expect(getPositionMultiplier('CF')).toBe(1.08));
  it('2B = 1.06', () => expect(getPositionMultiplier('2B')).toBe(1.06));
  it('3B = 1.04', () => expect(getPositionMultiplier('3B')).toBe(1.04));
  it('RF = 1.03', () => expect(getPositionMultiplier('RF')).toBe(1.03));
  it('LF = 1.02', () => expect(getPositionMultiplier('LF')).toBe(1.02));
  it('1B = 1.00', () => expect(getPositionMultiplier('1B')).toBe(1.00));
  it('DH = 0.95', () => expect(getPositionMultiplier('DH')).toBe(0.95));
  it('pitcher positions return 1.00', () => {
    expect(getPositionMultiplier('SP')).toBe(1.00);
    expect(getPositionMultiplier('RP')).toBe(1.00);
    expect(getPositionMultiplier('CL')).toBe(1.00);
  });
});

// ---------------------------------------------------------------------------
// getBestPositionMultiplier
// ---------------------------------------------------------------------------
describe('getBestPositionMultiplier', () => {
  it('returns highest multiplier from eligible positions', () => {
    expect(getBestPositionMultiplier(['1B', 'RF'])).toBe(1.03); // RF > 1B
    expect(getBestPositionMultiplier(['SS', '2B'])).toBe(1.15); // SS > 2B
  });

  it('returns 1.00 for empty array', () => {
    expect(getBestPositionMultiplier([])).toBe(1.00);
  });
});

// ---------------------------------------------------------------------------
// getBestEligiblePosition
// ---------------------------------------------------------------------------
describe('getBestEligiblePosition', () => {
  it('returns position with highest multiplier', () => {
    expect(getBestEligiblePosition(['1B', 'RF'], '1B')).toBe('RF');
    expect(getBestEligiblePosition(['SS', '2B'], 'SS')).toBe('SS');
  });

  it('falls back to primaryPosition when eligiblePositions is empty', () => {
    expect(getBestEligiblePosition([], 'CF')).toBe('CF');
  });
});

// ---------------------------------------------------------------------------
// calculateBatterValue (REQ-DFT-007)
// ---------------------------------------------------------------------------
describe('calculateBatterValue (REQ-DFT-007)', () => {
  it('applies multiplicative formula: (OPS*115 + SB*0.3 + defenseRating*15) * multiplier', () => {
    // C with .850 OPS, 10 SB, 0.80 defense rating
    const value = calculateBatterValue('C', 0.850, 10, 0.80);
    const baseValue = (0.850 * 115) + (10 * 0.3) + (0.80 * 15);
    const expected = baseValue * 1.12; // C multiplier
    expect(value).toBeCloseTo(expected, 4);
  });

  it('values catcher higher than DH with same stats', () => {
    const catcher = calculateBatterValue('C', 0.800, 5, 0.70);
    const dh = calculateBatterValue('DH', 0.800, 5, 0.70);
    expect(catcher).toBeGreaterThan(dh);
    // Multiplicative gap: base * (1.12 - 0.95) = base * 0.17
    const base = (0.800 * 115) + (5 * 0.3) + (0.70 * 15);
    expect(catcher - dh).toBeCloseTo(base * 0.17, 1);
  });

  it('values speed contributors higher (more SB)', () => {
    const fast = calculateBatterValue('CF', 0.780, 40, 0.70);
    const slow = calculateBatterValue('CF', 0.780, 2, 0.70);
    expect(fast).toBeGreaterThan(slow);
    // SB difference * 0.3 * CF multiplier = 38 * 0.3 * 1.08 = 12.312
    expect(fast - slow).toBeCloseTo(38 * 0.3 * 1.08, 1);
  });

  it('returns 0 for zero stats', () => {
    const value = calculateBatterValue('DH', 0, 0, 0);
    expect(value).toBe(0);
  });

  it('differentiates elite defenders from poor defenders', () => {
    const elite = calculateBatterValue('SS', 0.800, 10, 0.90);
    const poor = calculateBatterValue('SS', 0.800, 10, 0.20);
    // Spread: (0.90 - 0.20) * 15 * 1.15 = 12.075 pts
    expect(elite - poor).toBeCloseTo(0.70 * 15 * 1.15, 1);
    expect(elite - poor).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// calculatePitcherValue (REQ-DFT-007)
// ---------------------------------------------------------------------------
describe('calculatePitcherValue (REQ-DFT-007)', () => {
  it('SP formula: 25 + (4.50-ERA)*25 + K9*5 - BB9*8 + stamina*3', () => {
    const pitching: PitcherAttributes = {
      role: 'SP', grade: 10, stamina: 6.5, era: 3.20, whip: 1.15,
      k9: 8.5, bb9: 2.5, hr9: 0.9, usageFlags: [], isReliever: false,
    };
    const expected = 25 + ((4.50 - 3.20) * 25) + (8.5 * 5) - (2.5 * 8) + (6.5 * 3);
    const value = calculatePitcherValue(pitching);
    expect(value).toBeCloseTo(expected, 4);
  });

  it('RP formula: 15 + (3.50-ERA)*18 + K9*5 - BB9*8', () => {
    const pitching: PitcherAttributes = {
      role: 'RP', grade: 8, stamina: 2, era: 2.80, whip: 1.05,
      k9: 10.0, bb9: 3.0, hr9: 0.7, usageFlags: [], isReliever: true,
    };
    const expected = 15 + ((3.50 - 2.80) * 18) + (10.0 * 5) - (3.0 * 8);
    const value = calculatePitcherValue(pitching);
    expect(value).toBeCloseTo(expected, 4);
  });

  it('CL uses RP formula', () => {
    const pitching: PitcherAttributes = {
      role: 'CL', grade: 9, stamina: 1.5, era: 2.50, whip: 1.00,
      k9: 11.0, bb9: 2.5, hr9: 0.6, usageFlags: [], isReliever: true,
    };
    const expected = 15 + ((3.50 - 2.50) * 18) + (11.0 * 5) - (2.5 * 8);
    const value = calculatePitcherValue(pitching);
    expect(value).toBeCloseTo(expected, 4);
  });

  it('high ERA pitcher has lower value', () => {
    const good: PitcherAttributes = {
      role: 'SP', grade: 12, stamina: 7, era: 2.50, whip: 1.0,
      k9: 9.0, bb9: 2.0, hr9: 0.7, usageFlags: [], isReliever: false,
    };
    const bad: PitcherAttributes = {
      role: 'SP', grade: 5, stamina: 5, era: 5.50, whip: 1.5,
      k9: 6.0, bb9: 4.0, hr9: 1.5, usageFlags: [], isReliever: false,
    };
    expect(calculatePitcherValue(good)).toBeGreaterThan(calculatePitcherValue(bad));
  });
});

// ---------------------------------------------------------------------------
// calculatePlayerValue (convenience wrapper)
// ---------------------------------------------------------------------------
describe('calculatePlayerValue', () => {
  it('calculates batter value when card is a position player', () => {
    const card = makeCard({
      primaryPosition: 'SS',
      eligiblePositions: ['SS'],
      range: 0.70,
      arm: 0.60,
    });
    const value = calculatePlayerValue(card, { ops: 0.800, sb: 15 });
    expect(value).toBeGreaterThan(0);
    // defenseRating = (0.70 + 0.60) / 2 = 0.65
    // baseValue = (0.800 * 115) + (15 * 0.3) + (0.65 * 15) = 106.25
    // * SS multiplier 1.15 = 122.19
    const baseValue = (0.800 * 115) + (15 * 0.3) + (0.65 * 15);
    expect(value).toBeCloseTo(baseValue * 1.15, 4);
  });

  it('calculates pitcher value when card is a pitcher', () => {
    const card = makePitcherCard();
    const value = calculatePlayerValue(card);
    expect(value).toBeGreaterThan(0);
  });

  it('returns positive fallback value for batter without stats (uses card attributes)', () => {
    const card = makeCard();
    const value = calculatePlayerValue(card);
    // Fallback derives value from card attributes (power, contactRate, discipline, speed)
    expect(value).toBeGreaterThan(0);
  });

  it('uses range+arm for defense rating instead of fieldingPct', () => {
    const goodDefense = makeCard({
      primaryPosition: 'SS', eligiblePositions: ['SS'],
      range: 0.90, arm: 0.85, fieldingPct: 0.95,
    });
    const poorDefense = makeCard({
      primaryPosition: 'SS', eligiblePositions: ['SS'],
      range: 0.20, arm: 0.25, fieldingPct: 0.99,
    });
    const goodVal = calculatePlayerValue(goodDefense, { ops: 0.800, sb: 10 });
    const poorVal = calculatePlayerValue(poorDefense, { ops: 0.800, sb: 10 });
    expect(goodVal).toBeGreaterThan(poorVal);
  });

  it('uses best eligible position for scarcity multiplier', () => {
    // Vladimir Guerrero scenario: 1B/RF -- RF multiplier (1.03) > 1B (1.00)
    const multiPos = makeCard({
      primaryPosition: '1B',
      eligiblePositions: ['1B', 'RF'],
      range: 0.50, arm: 0.50,
    });
    const singlePos = makeCard({
      primaryPosition: '1B',
      eligiblePositions: ['1B'],
      range: 0.50, arm: 0.50,
    });
    const multiVal = calculatePlayerValue(multiPos, { ops: 0.900, sb: 5 });
    const singleVal = calculatePlayerValue(singlePos, { ops: 0.900, sb: 5 });
    expect(multiVal).toBeGreaterThan(singleVal);
    // Difference should be base * (1.03 - 1.00) = base * 0.03
    const base = (0.900 * 115) + (5 * 0.3) + (0.50 * 15);
    expect(multiVal - singleVal).toBeCloseTo(base * 0.03, 1);
  });
});

// ---------------------------------------------------------------------------
// calculatePlayerValue uses mlbBattingStats from card (REQ-DFT-007)
// ---------------------------------------------------------------------------
describe('calculatePlayerValue with mlbBattingStats', () => {
  it('uses card.mlbBattingStats when no external stats provided', () => {
    const card = makeCard({
      primaryPosition: 'LF',
      eligiblePositions: ['LF'],
      range: 0.50, arm: 0.50,
      mlbBattingStats: {
        G: 150, AB: 500, R: 120, H: 180, doubles: 35, triples: 5,
        HR: 45, RBI: 120, SB: 6, CS: 2, BB: 100, SO: 85,
        BA: 0.360, OBP: 0.500, SLG: 0.800, OPS: 1.300,
      },
    });
    const value = calculatePlayerValue(card);
    // defenseRating = (0.50 + 0.50) / 2 = 0.50
    // baseValue = (1.300 * 115) + (6 * 0.3) + (0.50 * 15) = 149.5 + 1.8 + 7.5 = 158.8
    // * LF multiplier 1.02 = 161.976
    // PA = 500 + 100 = 600 -> scale = 1.0
    const baseValue = (1.300 * 115) + (6 * 0.3) + (0.50 * 15);
    expect(value).toBeCloseTo(baseValue * 1.02, 0);
  });

  it('elite batter (1.300 OPS) outvalues average batter (0.700 OPS)', () => {
    const elite = makeCard({
      primaryPosition: 'LF',
      eligiblePositions: ['LF'],
      mlbBattingStats: {
        G: 150, AB: 500, R: 120, H: 180, doubles: 35, triples: 5,
        HR: 45, RBI: 120, SB: 6, CS: 2, BB: 100, SO: 85,
        BA: 0.360, OBP: 0.500, SLG: 0.800, OPS: 1.300,
      },
    });
    const average = makeCard({
      primaryPosition: 'LF',
      eligiblePositions: ['LF'],
      mlbBattingStats: {
        G: 140, AB: 480, R: 60, H: 130, doubles: 20, triples: 2,
        HR: 10, RBI: 50, SB: 3, CS: 3, BB: 40, SO: 120,
        BA: 0.270, OBP: 0.320, SLG: 0.380, OPS: 0.700,
      },
    });
    const diff = calculatePlayerValue(elite) - calculatePlayerValue(average);
    // 60+ point difference ensures sorting will not be ambiguous
    expect(diff).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// computeIpScaleFactor
// ---------------------------------------------------------------------------
describe('computeIpScaleFactor', () => {
  it('returns 1.0 for SP with 150+ IP', () => {
    expect(computeIpScaleFactor(200, 'SP')).toBe(1.0);
    expect(computeIpScaleFactor(150, 'SP')).toBe(1.0);
  });

  it('returns proportional factor for SP under 150 IP', () => {
    expect(computeIpScaleFactor(75, 'SP')).toBeCloseTo(0.5, 4);
    expect(computeIpScaleFactor(100, 'SP')).toBeCloseTo(0.667, 2);
  });

  it('returns 1.0 for RP with 60+ IP', () => {
    expect(computeIpScaleFactor(60, 'RP')).toBe(1.0);
    expect(computeIpScaleFactor(70, 'CL')).toBe(1.0);
  });

  it('returns proportional factor for RP under 60 IP', () => {
    expect(computeIpScaleFactor(30, 'RP')).toBeCloseTo(0.5, 4);
    expect(computeIpScaleFactor(50, 'CL')).toBeCloseTo(50 / 60, 4);
  });
});

// ---------------------------------------------------------------------------
// ERA floor in calculatePitcherValue
// ---------------------------------------------------------------------------
describe('ERA floor', () => {
  it('floors ERA at 1.50 for SP (dead-ball era protection)', () => {
    const subFloor: PitcherAttributes = {
      role: 'SP', grade: 12, stamina: 7, era: 0.96, whip: 0.96,
      k9: 5.0, bb9: 2.0, hr9: 0.1, usageFlags: [], isReliever: false,
    };
    const atFloor: PitcherAttributes = {
      ...subFloor, era: 1.50,
    };
    // Both should produce the same value since 0.96 is floored to 1.50
    expect(calculatePitcherValue(subFloor)).toBeCloseTo(calculatePitcherValue(atFloor), 4);
  });

  it('does not affect ERA above 1.50', () => {
    const normal: PitcherAttributes = {
      role: 'SP', grade: 10, stamina: 6.5, era: 3.20, whip: 1.15,
      k9: 8.5, bb9: 2.5, hr9: 0.9, usageFlags: [], isReliever: false,
    };
    // Formula should use actual ERA, not the floor
    const expected = 25 + ((4.50 - 3.20) * 25) + (8.5 * 5) - (2.5 * 8) + (6.5 * 3);
    expect(calculatePitcherValue(normal)).toBeCloseTo(expected, 4);
  });
});

// ---------------------------------------------------------------------------
// Regression: speed player must not outscore all-time great (SB overweight bug)
// ---------------------------------------------------------------------------
describe('SB overweight regression', () => {
  it('all-time great (1.250+ OPS, low SB) outscores speed player (.992 OPS, 50 SB)', () => {
    // Eric Davis 1987: .992 OPS, 50 SB, CF, average defense
    const speedPlayer = calculateBatterValue('CF', 0.992, 50, 0.70);
    // Ted Williams 1941: 1.287 OPS, 2 SB, LF, average defense
    const allTimeGreat = calculateBatterValue('LF', 1.287, 2, 0.70);
    expect(allTimeGreat).toBeGreaterThan(speedPlayer);
    // OPS gap overcomes SB gap and position gap
    expect(allTimeGreat - speedPlayer).toBeGreaterThan(5);
  });

  it('SB bonus for 50 steals is meaningful but not dominant', () => {
    const withSB = calculateBatterValue('CF', 0.800, 50, 0.70);
    const withoutSB = calculateBatterValue('CF', 0.800, 0, 0.70);
    // 50 * 0.3 * 1.08 (CF) = 16.2 pts
    expect(withSB - withoutSB).toBeCloseTo(50 * 0.3 * 1.08, 1);
    expect(withSB - withoutSB).toBeLessThan(25);
  });
});

// ---------------------------------------------------------------------------
// Regression: short-season and dead-ball era pitcher overvaluation
// ---------------------------------------------------------------------------
describe('pitcher overvaluation regression', () => {
  it('full-season ace (200+ IP) outscores short-season outlier (77 IP) with better rate stats', () => {
    // Shane Bieber 2020: 1.63 ERA, 14.2 K/9, 1.42 BB/9, 77 IP
    const shortSeason = makePitcherCard({
      pitching: {
        role: 'SP', grade: 14, stamina: 6.4, era: 1.63, whip: 0.87,
        k9: 14.2, bb9: 1.42, hr9: 0.5, usageFlags: [], isReliever: false,
      },
      mlbPitchingStats: {
        G: 12, GS: 12, W: 8, L: 1, SV: 0, IP: 77,
        H: 46, ER: 14, HR: 6, BB: 12, SO: 122, ERA: 1.63, WHIP: 0.87,
      },
    });
    // Pedro Martinez 2000: 1.74 ERA, 11.78 K/9, 1.33 BB/9, 217 IP
    const fullSeason = makePitcherCard({
      pitching: {
        role: 'SP', grade: 14, stamina: 7.0, era: 1.74, whip: 0.74,
        k9: 11.78, bb9: 1.33, hr9: 0.6, usageFlags: [], isReliever: false,
      },
      mlbPitchingStats: {
        G: 29, GS: 29, W: 18, L: 6, SV: 0, IP: 217,
        H: 128, ER: 42, HR: 17, BB: 32, SO: 284, ERA: 1.74, WHIP: 0.74,
      },
    });
    expect(calculatePlayerValue(fullSeason)).toBeGreaterThan(calculatePlayerValue(shortSeason));
  });

  it('dead-ball era pitcher (sub-1.00 ERA) does not outscore modern ace', () => {
    const deadBall = makePitcherCard({
      pitching: {
        role: 'SP', grade: 12, stamina: 7.5, era: 0.96, whip: 0.96,
        k9: 3.6, bb9: 2.0, hr9: 0.1, usageFlags: [], isReliever: false,
      },
      mlbPitchingStats: {
        G: 36, GS: 36, W: 19, L: 5, SV: 0, IP: 295,
        H: 221, ER: 31, HR: 1, BB: 60, SO: 176, ERA: 0.96, WHIP: 0.96,
      },
    });
    const modernAce = makePitcherCard({
      pitching: {
        role: 'SP', grade: 14, stamina: 7.0, era: 1.74, whip: 0.74,
        k9: 11.78, bb9: 1.33, hr9: 0.6, usageFlags: [], isReliever: false,
      },
      mlbPitchingStats: {
        G: 29, GS: 29, W: 18, L: 6, SV: 0, IP: 217,
        H: 128, ER: 42, HR: 17, BB: 32, SO: 284, ERA: 1.74, WHIP: 0.74,
      },
    });
    expect(calculatePlayerValue(modernAce)).toBeGreaterThan(calculatePlayerValue(deadBall));
  });

  it('SP with under 100 IP gets significantly penalized', () => {
    const fullIP = makePitcherCard({
      pitching: {
        role: 'SP', grade: 12, stamina: 7.0, era: 2.50, whip: 1.05,
        k9: 10.0, bb9: 2.0, hr9: 0.8, usageFlags: [], isReliever: false,
      },
      mlbPitchingStats: {
        G: 30, GS: 30, W: 16, L: 8, SV: 0, IP: 200,
        H: 150, ER: 55, HR: 18, BB: 44, SO: 222, ERA: 2.50, WHIP: 1.05,
      },
    });
    const lowIP = makePitcherCard({
      pitching: {
        role: 'SP', grade: 12, stamina: 7.0, era: 2.50, whip: 1.05,
        k9: 10.0, bb9: 2.0, hr9: 0.8, usageFlags: [], isReliever: false,
      },
      mlbPitchingStats: {
        G: 10, GS: 10, W: 6, L: 2, SV: 0, IP: 65,
        H: 45, ER: 18, HR: 6, BB: 14, SO: 72, ERA: 2.50, WHIP: 1.05,
      },
    });
    const fullValue = calculatePlayerValue(fullIP);
    const lowValue = calculatePlayerValue(lowIP);
    expect(fullValue).toBeGreaterThan(lowValue * 1.5);
  });
});

// ---------------------------------------------------------------------------
// Cross-position valuation regression: batters vs pitchers
// ---------------------------------------------------------------------------
describe('cross-position valuation regression', () => {
  it('HOF batter outscores average SP by 50+ points', () => {
    const hofBatter = calculateBatterValue('LF', 1.200, 5, 0.80);
    const avgSP = calculatePitcherValue({
      role: 'SP', grade: 10, stamina: 6.5, era: 3.50,
      whip: 1.20, k9: 8.0, bb9: 3.0, hr9: 1.0,
      usageFlags: [], isReliever: false,
    });
    expect(hofBatter).toBeGreaterThan(avgSP);
    expect(hofBatter - avgSP).toBeGreaterThan(50);
  });

  it('good batter outscores elite closer', () => {
    const goodBatter = calculateBatterValue('SS', 0.850, 10, 0.75);
    const eliteCL = calculatePitcherValue({
      role: 'CL', grade: 12, stamina: 1.5, era: 2.00,
      whip: 0.90, k9: 12.0, bb9: 2.0, hr9: 0.4,
      usageFlags: [], isReliever: true,
    });
    expect(goodBatter).toBeGreaterThan(eliteCL);
  });

  it('average batter outscores average reliever', () => {
    const avgBatter = calculateBatterValue('3B', 0.750, 5, 0.60);
    const avgRP = calculatePitcherValue({
      role: 'RP', grade: 8, stamina: 2, era: 3.20,
      whip: 1.20, k9: 8.5, bb9: 2.5, hr9: 0.9,
      usageFlags: [], isReliever: true,
    });
    expect(avgBatter).toBeGreaterThan(avgRP);
    expect(avgBatter - avgRP).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// selectBestSeason (REQ-DFT-001a)
// ---------------------------------------------------------------------------
describe('selectBestSeason (REQ-DFT-001a)', () => {
  it('selects the highest-value season for a player', () => {
    const card2019 = makeCard({
      playerId: 'trout01', seasonYear: 2019, primaryPosition: 'CF',
      eligiblePositions: ['CF'],
    });
    const card2020 = makeCard({
      playerId: 'trout01', seasonYear: 2020, primaryPosition: 'CF',
      eligiblePositions: ['CF'],
    });
    const stats = new Map<string, { ops: number; sb: number }>();
    stats.set('trout01_2019', { ops: 1.083, sb: 11 });
    stats.set('trout01_2020', { ops: 0.750, sb: 1 });

    const best = selectBestSeason([card2019, card2020], stats);
    expect(best.seasonYear).toBe(2019);
  });

  it('returns the only card if single season', () => {
    const card = makeCard({ playerId: 'one01', seasonYear: 2005 });
    const stats = new Map<string, { ops: number; sb: number }>();
    stats.set('one01_2005', { ops: 0.800, sb: 5 });
    const best = selectBestSeason([card], stats);
    expect(best.seasonYear).toBe(2005);
  });

  it('selects best pitcher season', () => {
    const card2018 = makePitcherCard({
      playerId: 'pitcher01', seasonYear: 2018,
      pitching: {
        role: 'SP', grade: 12, stamina: 7, era: 2.10, whip: 0.95,
        k9: 11.0, bb9: 1.8, hr9: 0.6, usageFlags: [], isReliever: false,
      },
    });
    const card2021 = makePitcherCard({
      playerId: 'pitcher01', seasonYear: 2021,
      pitching: {
        role: 'SP', grade: 6, stamina: 5, era: 4.80, whip: 1.40,
        k9: 7.0, bb9: 3.5, hr9: 1.2, usageFlags: [], isReliever: false,
      },
    });
    const stats = new Map<string, { ops: number; sb: number }>();
    const best = selectBestSeason([card2018, card2021], stats);
    expect(best.seasonYear).toBe(2018);
  });
});

// ---------------------------------------------------------------------------
// computePaScaleFactor (PA scaling for batters)
// ---------------------------------------------------------------------------
describe('computePaScaleFactor', () => {
  it('returns 1.0 for 400+ PA', () => {
    expect(computePaScaleFactor(400)).toBe(1.0);
    expect(computePaScaleFactor(600)).toBe(1.0);
  });

  it('returns proportional factor for under 400 PA', () => {
    expect(computePaScaleFactor(200)).toBeCloseTo(0.5, 4);
    expect(computePaScaleFactor(100)).toBeCloseTo(0.25, 4);
    expect(computePaScaleFactor(300)).toBeCloseTo(0.75, 4);
  });

  it('returns 0 for 0 PA', () => {
    expect(computePaScaleFactor(0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Position scarcity differentiation
// ---------------------------------------------------------------------------
describe('position scarcity differentiation', () => {
  it('SS outvalues C with same stats (SS scarcity > C scarcity)', () => {
    const ss = calculateBatterValue('SS', 0.800, 5, 0.70);
    const catcher = calculateBatterValue('C', 0.800, 5, 0.70);
    expect(ss).toBeGreaterThan(catcher);
  });

  it('scarcity gap scales with player quality (multiplicative)', () => {
    // Weak player: small gap between SS and DH
    const weakSS = calculateBatterValue('SS', 0.600, 2, 0.40);
    const weakDH = calculateBatterValue('DH', 0.600, 2, 0.40);
    const weakGap = weakSS - weakDH;

    // Elite player: larger gap between SS and DH
    const eliteSS = calculateBatterValue('SS', 1.000, 30, 0.90);
    const eliteDH = calculateBatterValue('DH', 1.000, 30, 0.90);
    const eliteGap = eliteSS - eliteDH;

    expect(eliteGap).toBeGreaterThan(weakGap * 1.5);
  });
});

// ---------------------------------------------------------------------------
// PA scaling in calculatePlayerValue (batter equivalent of IP scaling)
// ---------------------------------------------------------------------------
describe('batter PA scaling in calculatePlayerValue', () => {
  it('full-season batter (500+ PA) outscores same-stats low-PA batter (150 PA)', () => {
    const fullSeason = makeCard({
      primaryPosition: 'LF',
      eligiblePositions: ['LF'],
      mlbBattingStats: {
        G: 150, AB: 550, R: 90, H: 165, doubles: 30, triples: 3,
        HR: 25, RBI: 90, SB: 10, CS: 3, BB: 60, SO: 100,
        BA: 0.300, OBP: 0.370, SLG: 0.500, OPS: 0.870,
      },
    });
    const callUp = makeCard({
      primaryPosition: 'LF',
      eligiblePositions: ['LF'],
      mlbBattingStats: {
        G: 40, AB: 130, R: 25, H: 45, doubles: 8, triples: 1,
        HR: 8, RBI: 25, SB: 2, CS: 1, BB: 20, SO: 30,
        BA: 0.346, OBP: 0.427, SLG: 0.600, OPS: 1.027,
      },
    });
    // Call-up has higher OPS but much less playing time
    expect(calculatePlayerValue(fullSeason)).toBeGreaterThan(calculatePlayerValue(callUp));
  });

  it('Don Padgett (low PA, fluky OPS) does NOT outvalue Johnny Bench (full season HOF)', () => {
    const padgett = makeCard({
      primaryPosition: 'C',
      eligiblePositions: ['C'],
      mlbBattingStats: {
        G: 92, AB: 233, R: 46, H: 85, doubles: 17, triples: 6,
        HR: 10, RBI: 59, SB: 1, CS: 0, BB: 47, SO: 20,
        BA: 0.365, OBP: 0.449, SLG: 0.600, OPS: 1.049,
      },
    });
    const bench = makeCard({
      primaryPosition: 'C',
      eligiblePositions: ['C'],
      mlbBattingStats: {
        G: 147, AB: 538, R: 87, H: 145, doubles: 22, triples: 2,
        HR: 40, RBI: 125, SB: 6, CS: 5, BB: 82, SO: 96,
        BA: 0.270, OBP: 0.367, SLG: 0.470, OPS: 0.837,
      },
    });
    expect(calculatePlayerValue(bench)).toBeGreaterThan(calculatePlayerValue(padgett));
  });

  it('applies PA scaling when mlbBattingStats available', () => {
    const card = makeCard({
      primaryPosition: '1B',
      eligiblePositions: ['1B'],
      range: 0.50, arm: 0.50,
      mlbBattingStats: {
        G: 40, AB: 100, R: 15, H: 30, doubles: 5, triples: 0,
        HR: 5, RBI: 15, SB: 0, CS: 0, BB: 10, SO: 25,
        BA: 0.300, OBP: 0.364, SLG: 0.500, OPS: 0.864,
      },
    });
    // defenseRating = (0.50 + 0.50) / 2 = 0.50
    const rawValue = calculateBatterValue('1B', 0.864, 0, 0.50);
    const scaledValue = calculatePlayerValue(card);
    // PA = 100 + 10 = 110 -> scale = 110/400 = 0.275
    const expectedScale = 110 / 400;
    expect(scaledValue).toBeCloseTo(rawValue * expectedScale, 1);
  });

  it('does not apply PA scaling when no mlbBattingStats (fallback path)', () => {
    const card = makeCard({ primaryPosition: '1B' });
    const value = calculatePlayerValue(card);
    // Should still return a positive fallback value, no PA scaling applied
    expect(value).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Complete player vs one-year wonder (draft hole regression)
// ---------------------------------------------------------------------------
describe('complete player vs one-year wonder regression', () => {
  it('Hank Aaron (complete player) outscores Babe Herman (one-year wonder) via defense', () => {
    // Aaron: 1.013 OPS peak, 30 SB, good defense, RF
    const aaron = calculateBatterValue('RF', 1.013, 30, 0.75);
    // Herman: 1.067 OPS peak, 16 SB, poor defense, RF
    const herman = calculateBatterValue('RF', 1.067, 16, 0.30);
    // Aaron's defense + speed overcome Herman's slight OPS advantage
    expect(aaron).toBeGreaterThan(herman);
  });

  it('Willie Mays (elite defense + speed) ranks near the top', () => {
    // Mays 1955: 1.002 OPS, 24 SB, elite defense, CF
    const mays = calculateBatterValue('CF', 1.002, 24, 0.92);
    // Norm Cash 1961: 1.149 OPS, 11 SB, average defense, 1B
    const cash = calculateBatterValue('1B', 1.149, 11, 0.40);
    // Mays should outrank Cash via defense + position + speed
    expect(mays).toBeGreaterThan(cash);
  });

  it('defense rating creates 10+ point spread between elite and poor defenders', () => {
    const elite = calculateBatterValue('SS', 0.800, 10, 0.90);
    const poor = calculateBatterValue('SS', 0.800, 10, 0.20);
    expect(elite - poor).toBeGreaterThan(10);
  });

  it('SB * 0.3 differentiates speed players meaningfully', () => {
    // Henderson-type: 130 SB
    const fast = calculateBatterValue('LF', 0.850, 130, 0.60);
    // Slow slugger: 2 SB
    const slow = calculateBatterValue('LF', 0.850, 2, 0.60);
    // 128 * 0.3 * 1.02 (LF) = ~39.2 pts difference
    expect(fast - slow).toBeGreaterThan(35);
    expect(fast - slow).toBeLessThan(50);
  });
});
