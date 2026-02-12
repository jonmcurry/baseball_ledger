import {
  calculateBatterValue,
  calculatePitcherValue,
  getPositionBonus,
  calculatePlayerValue,
  selectBestSeason,
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
// getPositionBonus (REQ-DFT-007)
// ---------------------------------------------------------------------------
describe('getPositionBonus (REQ-DFT-007)', () => {
  it('C = 15', () => expect(getPositionBonus('C')).toBe(15));
  it('SS = 12', () => expect(getPositionBonus('SS')).toBe(12));
  it('CF = 10', () => expect(getPositionBonus('CF')).toBe(10));
  it('2B = 8', () => expect(getPositionBonus('2B')).toBe(8));
  it('3B = 5', () => expect(getPositionBonus('3B')).toBe(5));
  it('RF = 3', () => expect(getPositionBonus('RF')).toBe(3));
  it('LF = 2', () => expect(getPositionBonus('LF')).toBe(2));
  it('1B = 1', () => expect(getPositionBonus('1B')).toBe(1));
  it('DH = 0', () => expect(getPositionBonus('DH')).toBe(0));
  it('pitcher positions return 0', () => {
    expect(getPositionBonus('SP')).toBe(0);
    expect(getPositionBonus('RP')).toBe(0);
    expect(getPositionBonus('CL')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateBatterValue (REQ-DFT-007)
// ---------------------------------------------------------------------------
describe('calculateBatterValue (REQ-DFT-007)', () => {
  it('applies formula: OPS*100 + SB*0.5 + fieldingPct*20 + positionBonus', () => {
    // C with .850 OPS, 10 SB, .995 fielding
    const value = calculateBatterValue('C', 0.850, 10, 0.995);
    const expected = (0.850 * 100) + (10 * 0.5) + (0.995 * 20) + 15;
    expect(value).toBeCloseTo(expected, 4);
  });

  it('values catcher higher than DH with same stats', () => {
    const catcher = calculateBatterValue('C', 0.800, 5, 0.99);
    const dh = calculateBatterValue('DH', 0.800, 5, 0.99);
    expect(catcher).toBeGreaterThan(dh);
    expect(catcher - dh).toBeCloseTo(15, 4); // position bonus difference
  });

  it('values speed contributors higher (more SB)', () => {
    const fast = calculateBatterValue('CF', 0.780, 40, 0.98);
    const slow = calculateBatterValue('CF', 0.780, 2, 0.98);
    expect(fast).toBeGreaterThan(slow);
  });

  it('returns 0 for zero stats', () => {
    const value = calculateBatterValue('DH', 0, 0, 0);
    expect(value).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculatePitcherValue (REQ-DFT-007)
// ---------------------------------------------------------------------------
describe('calculatePitcherValue (REQ-DFT-007)', () => {
  it('SP formula: (4.50-ERA)*30 + K9*5 - BB9*8 + stamina*3', () => {
    const pitching: PitcherAttributes = {
      role: 'SP', grade: 10, stamina: 6.5, era: 3.20, whip: 1.15,
      k9: 8.5, bb9: 2.5, hr9: 0.9, usageFlags: [], isReliever: false,
    };
    const expected = ((4.50 - 3.20) * 30) + (8.5 * 5) - (2.5 * 8) + (6.5 * 3);
    const value = calculatePitcherValue(pitching);
    expect(value).toBeCloseTo(expected, 4);
  });

  it('RP formula: (3.50-ERA)*25 + K9*6 - BB9*10', () => {
    const pitching: PitcherAttributes = {
      role: 'RP', grade: 8, stamina: 2, era: 2.80, whip: 1.05,
      k9: 10.0, bb9: 3.0, hr9: 0.7, usageFlags: [], isReliever: true,
    };
    const expected = ((3.50 - 2.80) * 25) + (10.0 * 6) - (3.0 * 10);
    const value = calculatePitcherValue(pitching);
    expect(value).toBeCloseTo(expected, 4);
  });

  it('CL uses RP formula', () => {
    const pitching: PitcherAttributes = {
      role: 'CL', grade: 9, stamina: 1.5, era: 2.50, whip: 1.00,
      k9: 11.0, bb9: 2.5, hr9: 0.6, usageFlags: [], isReliever: true,
    };
    const expected = ((3.50 - 2.50) * 25) + (11.0 * 6) - (2.5 * 10);
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
    const card = makeCard({ primaryPosition: 'SS', fieldingPct: 0.97 });
    const value = calculatePlayerValue(card, { ops: 0.800, sb: 15 });
    expect(value).toBeGreaterThan(0);
    // Should include SS bonus (12)
    const expected = (0.800 * 100) + (15 * 0.5) + (0.97 * 20) + 12;
    expect(value).toBeCloseTo(expected, 4);
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
});

// ---------------------------------------------------------------------------
// calculatePlayerValue uses mlbBattingStats from card (REQ-DFT-007)
// ---------------------------------------------------------------------------
describe('calculatePlayerValue with mlbBattingStats', () => {
  it('uses card.mlbBattingStats when no external stats provided', () => {
    const card = makeCard({
      primaryPosition: 'LF',
      fieldingPct: 0.98,
      mlbBattingStats: {
        G: 150, AB: 500, R: 120, H: 180, doubles: 35, triples: 5,
        HR: 45, RBI: 120, SB: 6, CS: 2, BB: 100, SO: 85,
        BA: 0.360, OBP: 0.500, SLG: 0.800, OPS: 1.300,
      },
    });
    const value = calculatePlayerValue(card);
    // (1.300 * 100) + (6 * 0.5) + (0.98 * 20) + 2 = 130 + 3 + 19.6 + 2 = 154.6
    expect(value).toBeCloseTo(154.6, 0);
  });

  it('elite batter (1.300 OPS) outvalues average batter (0.700 OPS)', () => {
    const elite = makeCard({
      primaryPosition: 'LF',
      mlbBattingStats: {
        G: 150, AB: 500, R: 120, H: 180, doubles: 35, triples: 5,
        HR: 45, RBI: 120, SB: 6, CS: 2, BB: 100, SO: 85,
        BA: 0.360, OBP: 0.500, SLG: 0.800, OPS: 1.300,
      },
    });
    const average = makeCard({
      primaryPosition: 'LF',
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
// selectBestSeason (REQ-DFT-001a)
// ---------------------------------------------------------------------------
describe('selectBestSeason (REQ-DFT-001a)', () => {
  it('selects the highest-value season for a player', () => {
    const card2019 = makeCard({
      playerId: 'trout01', seasonYear: 2019, primaryPosition: 'CF',
    });
    const card2020 = makeCard({
      playerId: 'trout01', seasonYear: 2020, primaryPosition: 'CF',
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
