/**
 * Tests for Lineup Generation (REQ-RST-003, REQ-RST-004)
 *
 * AI lineup generation algorithm:
 *   1. Place each player at their primary position in the starting 9
 *   2. Set batting order with specific slot assignments:
 *      - #1 Leadoff: Highest OBP with speed > 0.5
 *      - #2: Highest contact rate
 *      - #3: Highest OPS overall
 *      - #4: Highest SLG (power hitter)
 *      - #5-7: Next highest OPS
 *      - #8: Weakest hitter (often catcher)
 *      - #9: Second weakest or pitcher's spot equivalent
 *
 * Lineup validation (REQ-RST-004):
 *   - Exactly 9 batting slots
 *   - Each defensive position filled exactly once (C, 1B, 2B, SS, 3B, LF, CF, RF)
 *   - DH fills the 9th batting slot
 */

import type { PlayerCard, Position, PitcherAttributes } from '@lib/types/player';
import type { LineupSlot } from '@lib/types/game';
import {
  generateLineup,
  validateLineup,
  type LineupInput,
} from '@lib/roster/lineup-generator';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeStarter(
  id: string,
  position: Position,
  overrides: Partial<{
    ops: number;
    obp: number;
    slg: number;
    speed: number;
    contactRate: number;
  }> = {},
): LineupInput {
  const defaults = { ops: 0.750, obp: 0.330, slg: 0.420, speed: 0.50, contactRate: 0.75 };
  const merged = { ...defaults, ...overrides };

  const card: PlayerCard = {
    playerId: id,
    nameFirst: id.slice(0, 3),
    nameLast: id.slice(3),
    seasonYear: 2020,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: position,
    eligiblePositions: [position],
    isPitcher: false,
    card: Array(35).fill(7),
    powerRating: 17,
    archetype: { byte33: 7, byte34: 0 },
    speed: merged.speed,
    power: 0.150,
    discipline: 0.5,
    contactRate: merged.contactRate,
    fieldingPct: 0.980,
    range: 0.5,
    arm: 0.5,
  };

  return {
    card,
    ops: merged.ops,
    obp: merged.obp,
    slg: merged.slg,
  };
}

/**
 * Build a set of 9 starting lineup inputs with distinct stat profiles.
 * Each player is designed to fit a specific batting order slot.
 */
function makeStartingNine(): LineupInput[] {
  return [
    // High OBP + fast -> Leadoff (#1)
    makeStarter('leadoff1', 'CF', { ops: 0.780, obp: 0.400, slg: 0.380, speed: 0.80, contactRate: 0.82 }),
    // Highest contact rate -> #2
    makeStarter('contact2', '2B', { ops: 0.760, obp: 0.360, slg: 0.400, speed: 0.55, contactRate: 0.90 }),
    // Highest OPS overall -> #3
    makeStarter('slugger3', 'RF', { ops: 0.950, obp: 0.380, slg: 0.570, speed: 0.40, contactRate: 0.75 }),
    // Highest SLG (power) -> #4
    makeStarter('power004', '1B', { ops: 0.900, obp: 0.340, slg: 0.560, speed: 0.30, contactRate: 0.70 }),
    // Solid hitter -> #5
    makeStarter('solid005', 'LF', { ops: 0.820, obp: 0.350, slg: 0.470, speed: 0.45, contactRate: 0.76 }),
    // Good hitter -> #6
    makeStarter('good0006', '3B', { ops: 0.800, obp: 0.340, slg: 0.460, speed: 0.42, contactRate: 0.74 }),
    // Average -> #7
    makeStarter('avg00007', 'SS', { ops: 0.770, obp: 0.330, slg: 0.440, speed: 0.50, contactRate: 0.72 }),
    // Weakest -> #8 (often catcher)
    makeStarter('weak0008', 'C', { ops: 0.650, obp: 0.290, slg: 0.360, speed: 0.25, contactRate: 0.68 }),
    // DH, second weakest -> #9
    makeStarter('dh000009', 'DH', { ops: 0.700, obp: 0.310, slg: 0.390, speed: 0.35, contactRate: 0.70 }),
  ];
}

// ---------------------------------------------------------------------------
// generateLineup
// ---------------------------------------------------------------------------

describe('generateLineup', () => {
  it('produces exactly 9 lineup slots', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    expect(lineup).toHaveLength(9);
  });

  it('assigns each defensive position exactly once', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    const positions = lineup.map((s) => s.position);
    const uniquePositions = new Set(positions);
    // 8 field positions + DH = 9 unique
    expect(uniquePositions.size).toBe(9);
    expect(positions).toContain('C');
    expect(positions).toContain('1B');
    expect(positions).toContain('2B');
    expect(positions).toContain('SS');
    expect(positions).toContain('3B');
    expect(positions).toContain('LF');
    expect(positions).toContain('CF');
    expect(positions).toContain('RF');
    expect(positions).toContain('DH');
  });

  it('places leadoff (#1) as highest OBP with speed > 0.5', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    expect(lineup[0].playerId).toBe('leadoff1');
  });

  it('places #2 as highest contact rate', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    expect(lineup[1].playerId).toBe('contact2');
  });

  it('places #3 as highest OPS overall', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    expect(lineup[2].playerId).toBe('slugger3');
  });

  it('places #4 as highest SLG (cleanup)', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    expect(lineup[3].playerId).toBe('power004');
  });

  it('places weakest hitter at #8', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    expect(lineup[7].playerId).toBe('weak0008');
  });

  it('places second weakest at #9', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    expect(lineup[8].playerId).toBe('dh000009');
  });

  it('fills #5-#7 with remaining players sorted by OPS descending', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    // #5-#7 should be solid005, good0006, avg00007 in OPS order
    const middle = [lineup[4].playerId, lineup[5].playerId, lineup[6].playerId];
    expect(middle).toContain('solid005');
    expect(middle).toContain('good0006');
    expect(middle).toContain('avg00007');
    // Should be in descending OPS order
    expect(middle[0]).toBe('solid005');  // OPS 0.820
    expect(middle[1]).toBe('good0006');  // OPS 0.800
    expect(middle[2]).toBe('avg00007');  // OPS 0.770
  });

  it('handles tie in OBP for leadoff by using higher speed', () => {
    const starters = [
      makeStarter('fast0001', 'CF', { ops: 0.760, obp: 0.380, slg: 0.380, speed: 0.85, contactRate: 0.80 }),
      makeStarter('slow0002', 'LF', { ops: 0.760, obp: 0.380, slg: 0.380, speed: 0.60, contactRate: 0.78 }),
      makeStarter('third003', 'RF', { ops: 0.900, obp: 0.360, slg: 0.540, speed: 0.40, contactRate: 0.75 }),
      makeStarter('clean004', '1B', { ops: 0.850, obp: 0.330, slg: 0.520, speed: 0.30, contactRate: 0.72 }),
      makeStarter('fifth005', '2B', { ops: 0.780, obp: 0.340, slg: 0.440, speed: 0.50, contactRate: 0.74 }),
      makeStarter('sixth006', '3B', { ops: 0.770, obp: 0.330, slg: 0.440, speed: 0.45, contactRate: 0.73 }),
      makeStarter('seven07', 'SS', { ops: 0.750, obp: 0.320, slg: 0.430, speed: 0.50, contactRate: 0.71 }),
      makeStarter('eight08', 'C', { ops: 0.680, obp: 0.300, slg: 0.380, speed: 0.25, contactRate: 0.68 }),
      makeStarter('nine0009', 'DH', { ops: 0.700, obp: 0.310, slg: 0.390, speed: 0.35, contactRate: 0.70 }),
    ];
    const lineup = generateLineup(starters);
    // fast0001 should be leadoff (same OBP but faster)
    expect(lineup[0].playerId).toBe('fast0001');
  });

  it('falls back to highest OBP regardless of speed when no one has speed > 0.5', () => {
    const starters = [
      // All slow players
      makeStarter('highobp1', 'CF', { ops: 0.780, obp: 0.400, slg: 0.380, speed: 0.40, contactRate: 0.80 }),
      makeStarter('player02', 'LF', { ops: 0.760, obp: 0.350, slg: 0.410, speed: 0.35, contactRate: 0.78 }),
      makeStarter('player03', 'RF', { ops: 0.900, obp: 0.370, slg: 0.530, speed: 0.30, contactRate: 0.75 }),
      makeStarter('player04', '1B', { ops: 0.850, obp: 0.340, slg: 0.510, speed: 0.25, contactRate: 0.72 }),
      makeStarter('player05', '2B', { ops: 0.780, obp: 0.340, slg: 0.440, speed: 0.40, contactRate: 0.74 }),
      makeStarter('player06', '3B', { ops: 0.770, obp: 0.330, slg: 0.440, speed: 0.35, contactRate: 0.73 }),
      makeStarter('player07', 'SS', { ops: 0.750, obp: 0.320, slg: 0.430, speed: 0.45, contactRate: 0.71 }),
      makeStarter('player08', 'C', { ops: 0.680, obp: 0.300, slg: 0.380, speed: 0.20, contactRate: 0.68 }),
      makeStarter('player09', 'DH', { ops: 0.700, obp: 0.310, slg: 0.390, speed: 0.30, contactRate: 0.70 }),
    ];
    const lineup = generateLineup(starters);
    // highobp1 has highest OBP (0.400), should be leadoff even without speed > 0.5
    expect(lineup[0].playerId).toBe('highobp1');
  });

  it('includes player name from card', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    for (const slot of lineup) {
      expect(slot.playerName).toBeTruthy();
      expect(typeof slot.playerName).toBe('string');
    }
  });

  it('assigns each player to their primary position (or outfield slot for OF)', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    for (const slot of lineup) {
      const input = starters.find((s) => s.card.playerId === slot.playerId);
      expect(input).toBeDefined();
      if (input!.card.primaryPosition === 'OF') {
        expect(['LF', 'CF', 'RF']).toContain(slot.position);
      } else {
        expect(slot.position).toBe(input!.card.primaryPosition);
      }
    }
  });

  it('distributes OF players across LF, CF, RF slots', () => {
    const starters = [
      makeStarter('of1_____', 'OF' as Position, { ops: 0.950, obp: 0.400, slg: 0.550, speed: 0.80, contactRate: 0.85 }),
      makeStarter('of2_____', 'OF' as Position, { ops: 0.820, obp: 0.360, slg: 0.460, speed: 0.55, contactRate: 0.78 }),
      makeStarter('of3_____', 'OF' as Position, { ops: 0.780, obp: 0.340, slg: 0.440, speed: 0.50, contactRate: 0.76 }),
      makeStarter('catcher_', 'C', { ops: 0.680, obp: 0.300, slg: 0.380, speed: 0.25, contactRate: 0.68 }),
      makeStarter('first___', '1B', { ops: 0.850, obp: 0.350, slg: 0.500, speed: 0.30, contactRate: 0.72 }),
      makeStarter('second__', '2B', { ops: 0.760, obp: 0.340, slg: 0.420, speed: 0.50, contactRate: 0.90 }),
      makeStarter('short___', 'SS', { ops: 0.750, obp: 0.330, slg: 0.420, speed: 0.60, contactRate: 0.74 }),
      makeStarter('third___', '3B', { ops: 0.770, obp: 0.330, slg: 0.440, speed: 0.42, contactRate: 0.73 }),
      makeStarter('dh______', 'DH', { ops: 0.700, obp: 0.310, slg: 0.390, speed: 0.35, contactRate: 0.70 }),
    ];
    const lineup = generateLineup(starters);
    const positions = lineup.map((s) => s.position);
    expect(positions).toContain('LF');
    expect(positions).toContain('CF');
    expect(positions).toContain('RF');
    // No duplicates
    const unique = new Set(positions);
    expect(unique.size).toBe(9);
  });

  it('throws when given fewer than 9 players', () => {
    const starters = makeStartingNine().slice(0, 7);
    expect(() => generateLineup(starters)).toThrow();
  });

  it('throws when given more than 9 players', () => {
    const starters = [
      ...makeStartingNine(),
      makeStarter('extra001', 'DH', { ops: 0.700 }),
    ];
    expect(() => generateLineup(starters)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// validateLineup
// ---------------------------------------------------------------------------

describe('validateLineup', () => {
  it('returns valid for a correct lineup', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    const result = validateLineup(lineup);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects wrong number of slots', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters).slice(0, 8);
    const result = validateLineup(lineup);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('9'))).toBe(true);
  });

  it('detects duplicate position', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    // Force duplicate position
    lineup[0] = { ...lineup[0], position: lineup[1].position };
    const result = validateLineup(lineup);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('duplicate'))).toBe(true);
  });

  it('detects missing required position', () => {
    const starters = makeStartingNine();
    const lineup = generateLineup(starters);
    // Replace CF with a second DH (invalid -- missing CF)
    const cfIdx = lineup.findIndex((s) => s.position === 'CF');
    lineup[cfIdx] = { ...lineup[cfIdx], position: 'DH' as Position };
    const result = validateLineup(lineup);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('CF'))).toBe(true);
  });
});
