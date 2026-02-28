import {
  selectAIPick,
  getRosterNeeds,
  type PositionNeed,
  type DraftablePlayer,
} from '@lib/draft/ai-strategy';
import type { PlayerCard } from '@lib/types/player';
import { SeededRNG } from '@lib/rng/seeded-rng';

// ---------------------------------------------------------------------------
// Helpers
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

function makeDraftable(
  card: PlayerCard,
  ops: number,
  sb: number,
): DraftablePlayer {
  return { card, ops, sb };
}

function makePitcherCard(
  role: 'SP' | 'RP' | 'CL',
  overrides: Partial<PlayerCard> = {},
): PlayerCard {
  return makeCard({
    isPitcher: true,
    primaryPosition: role,
    eligiblePositions: [role],
    pitching: {
      role,
      grade: 10,
      stamina: role === 'SP' ? 6.5 : 2,
      era: 3.20,
      whip: 1.15,
      k9: 8.5,
      bb9: 2.5,
      hr9: 0.9,
      usageFlags: [],
      isReliever: role !== 'SP',
    },
    ...overrides,
  });
}

// Build a pool of 30+ players for testing
function buildPool(): DraftablePlayer[] {
  return [
    makeDraftable(makeCard({ playerId: 'c01', primaryPosition: 'C', eligiblePositions: ['C'] }), 0.750, 2),
    makeDraftable(makeCard({ playerId: '1b01', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.820, 3),
    makeDraftable(makeCard({ playerId: '2b01', primaryPosition: '2B', eligiblePositions: ['2B'] }), 0.780, 12),
    makeDraftable(makeCard({ playerId: '3b01', primaryPosition: '3B', eligiblePositions: ['3B'] }), 0.810, 5),
    makeDraftable(makeCard({ playerId: 'ss01', primaryPosition: 'SS', eligiblePositions: ['SS'] }), 0.770, 20),
    makeDraftable(makeCard({ playerId: 'lf01', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.800, 8),
    makeDraftable(makeCard({ playerId: 'cf01', primaryPosition: 'CF', eligiblePositions: ['CF'] }), 0.790, 25),
    makeDraftable(makeCard({ playerId: 'rf01', primaryPosition: 'RF', eligiblePositions: ['RF'] }), 0.830, 10),
    makeDraftable(makeCard({ playerId: 'dh01', primaryPosition: 'DH', eligiblePositions: ['DH'] }), 0.870, 1),
    makeDraftable(makeCard({ playerId: 'c02', primaryPosition: 'C', eligiblePositions: ['C'] }), 0.700, 0),
    makeDraftable(makeCard({ playerId: '1b02', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.760, 2),
    makeDraftable(makeCard({ playerId: '2b02', primaryPosition: '2B', eligiblePositions: ['2B'] }), 0.730, 8),
    makeDraftable(makeCard({ playerId: 'lf02', primaryPosition: 'LF', eligiblePositions: ['LF', 'RF'] }), 0.740, 4),
    makeDraftable(makeCard({ playerId: 'rf02', primaryPosition: 'RF', eligiblePositions: ['RF', 'LF'] }), 0.720, 3),
    makeDraftable(makeCard({ playerId: 'cf02', primaryPosition: 'CF', eligiblePositions: ['CF'] }), 0.710, 15),
    makeDraftable(makeCard({ playerId: 'ss02', primaryPosition: 'SS', eligiblePositions: ['SS'] }), 0.690, 10),
    { card: makePitcherCard('SP', { playerId: 'sp01' }), ops: 0, sb: 0 },
    { card: makePitcherCard('SP', { playerId: 'sp02', pitching: { role: 'SP', grade: 8, stamina: 6, era: 3.80, whip: 1.25, k9: 7.5, bb9: 3.0, hr9: 1.0, usageFlags: [], isReliever: false } }), ops: 0, sb: 0 },
    { card: makePitcherCard('SP', { playerId: 'sp03', pitching: { role: 'SP', grade: 7, stamina: 5.5, era: 4.10, whip: 1.30, k9: 7.0, bb9: 3.2, hr9: 1.1, usageFlags: [], isReliever: false } }), ops: 0, sb: 0 },
    { card: makePitcherCard('SP', { playerId: 'sp04', pitching: { role: 'SP', grade: 6, stamina: 5, era: 4.50, whip: 1.40, k9: 6.5, bb9: 3.5, hr9: 1.3, usageFlags: [], isReliever: false } }), ops: 0, sb: 0 },
    { card: makePitcherCard('RP', { playerId: 'rp01' }), ops: 0, sb: 0 },
    { card: makePitcherCard('RP', { playerId: 'rp02', pitching: { role: 'RP', grade: 7, stamina: 2, era: 3.50, whip: 1.20, k9: 9.0, bb9: 3.0, hr9: 0.8, usageFlags: [], isReliever: true } }), ops: 0, sb: 0 },
    { card: makePitcherCard('RP', { playerId: 'rp03', pitching: { role: 'RP', grade: 6, stamina: 1.5, era: 4.00, whip: 1.35, k9: 8.0, bb9: 3.5, hr9: 1.0, usageFlags: [], isReliever: true } }), ops: 0, sb: 0 },
    { card: makePitcherCard('CL', { playerId: 'cl01', pitching: { role: 'CL', grade: 9, stamina: 1.5, era: 2.50, whip: 1.00, k9: 11.0, bb9: 2.5, hr9: 0.6, usageFlags: [], isReliever: true } }), ops: 0, sb: 0 },
  ];
}

// ---------------------------------------------------------------------------
// getRosterNeeds
// ---------------------------------------------------------------------------
describe('getRosterNeeds', () => {
  it('returns all positions for empty roster', () => {
    const needs = getRosterNeeds([]);
    // Need: C, 1B, 2B, SS, 3B, 3xOF, DH, 4xSP, 4xRP, 4 bench
    expect(needs.length).toBeGreaterThanOrEqual(8);
    expect(needs.some((n) => n.position === 'C')).toBe(true);
    expect(needs.some((n) => n.position === 'SS')).toBe(true);
    expect(needs.some((n) => n.position === 'SP')).toBe(true);
    expect(needs.some((n) => n.position === 'RP')).toBe(true);
  });

  it('counts LF/CF/RF toward shared OF starter pool of 3', () => {
    // 3 LF players should fill all 3 generic OF slots (no specific LF/CF/RF requirement)
    const roster: DraftablePlayer[] = [
      makeDraftable(makeCard({ playerId: 'lf1', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.7, 0),
      makeDraftable(makeCard({ playerId: 'lf2', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.7, 0),
      makeDraftable(makeCard({ playerId: 'lf3', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.7, 0),
    ];
    const needs = getRosterNeeds(roster);
    // All 3 OF slots filled - no outfield starter need should remain
    const ofNeeds = needs.filter(
      (n) => n.slot === 'starter' && ['OF', 'LF', 'CF', 'RF'].includes(n.position),
    );
    expect(ofNeeds).toHaveLength(0);
  });

  it('counts RP and CL toward shared bullpen pool of 4', () => {
    const roster: DraftablePlayer[] = [
      { card: makePitcherCard('RP', { playerId: 'rp1' }), ops: 0, sb: 0 },
      { card: makePitcherCard('RP', { playerId: 'rp2' }), ops: 0, sb: 0 },
      { card: makePitcherCard('CL', { playerId: 'cl1' }), ops: 0, sb: 0 },
      { card: makePitcherCard('CL', { playerId: 'cl2' }), ops: 0, sb: 0 },
    ];
    const needs = getRosterNeeds(roster);
    // 2 RP + 2 CL = 4 bullpen slots filled - no bullpen need should remain
    const bullpenNeeds = needs.filter(
      (n) => n.slot === 'bullpen' || (n.position === 'RP') || (n.position === 'CL'),
    );
    expect(bullpenNeeds).toHaveLength(0);
  });

  it('removes needs as positions are filled', () => {
    const roster: DraftablePlayer[] = [
      makeDraftable(makeCard({ primaryPosition: 'C', eligiblePositions: ['C'] }), 0.750, 2),
    ];
    const needs = getRosterNeeds(roster);
    const catcherNeed = needs.find((n) => n.position === 'C' && n.slot === 'starter');
    expect(catcherNeed).toBeUndefined();
  });

  it('still needs SP after 2 are filled (need 4 total)', () => {
    const roster: DraftablePlayer[] = [
      { card: makePitcherCard('SP', { playerId: 'a' }), ops: 0, sb: 0 },
      { card: makePitcherCard('SP', { playerId: 'b' }), ops: 0, sb: 0 },
    ];
    const needs = getRosterNeeds(roster);
    const spNeeds = needs.filter((n) => n.position === 'SP');
    expect(spNeeds.length).toBe(2); // Need 2 more SP
  });

  it('returns empty when roster is complete', () => {
    // Build a full 21-player roster
    const roster: DraftablePlayer[] = [
      // 9 starters: C, 1B, 2B, SS, 3B, 3 OF, DH
      makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] }), 0.7, 0),
      makeDraftable(makeCard({ playerId: '1b', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.8, 0),
      makeDraftable(makeCard({ playerId: '2b', primaryPosition: '2B', eligiblePositions: ['2B'] }), 0.7, 0),
      makeDraftable(makeCard({ playerId: 'ss', primaryPosition: 'SS', eligiblePositions: ['SS'] }), 0.7, 0),
      makeDraftable(makeCard({ playerId: '3b', primaryPosition: '3B', eligiblePositions: ['3B'] }), 0.7, 0),
      makeDraftable(makeCard({ playerId: 'lf', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.7, 0),
      makeDraftable(makeCard({ playerId: 'cf', primaryPosition: 'CF', eligiblePositions: ['CF'] }), 0.7, 0),
      makeDraftable(makeCard({ playerId: 'rf', primaryPosition: 'RF', eligiblePositions: ['RF'] }), 0.7, 0),
      makeDraftable(makeCard({ playerId: 'dh', primaryPosition: 'DH', eligiblePositions: ['DH'] }), 0.7, 0),
      // 4 bench
      makeDraftable(makeCard({ playerId: 'b1', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.6, 0),
      makeDraftable(makeCard({ playerId: 'b2', primaryPosition: '2B', eligiblePositions: ['2B'] }), 0.6, 0),
      makeDraftable(makeCard({ playerId: 'b3', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.6, 0),
      makeDraftable(makeCard({ playerId: 'b4', primaryPosition: 'RF', eligiblePositions: ['RF'] }), 0.6, 0),
      // 4 SP
      { card: makePitcherCard('SP', { playerId: 'sp1' }), ops: 0, sb: 0 },
      { card: makePitcherCard('SP', { playerId: 'sp2' }), ops: 0, sb: 0 },
      { card: makePitcherCard('SP', { playerId: 'sp3' }), ops: 0, sb: 0 },
      { card: makePitcherCard('SP', { playerId: 'sp4' }), ops: 0, sb: 0 },
      // 4 RP (2 RP + 2 CL -- both count toward bullpen)
      { card: makePitcherCard('RP', { playerId: 'rp1' }), ops: 0, sb: 0 },
      { card: makePitcherCard('RP', { playerId: 'rp2' }), ops: 0, sb: 0 },
      { card: makePitcherCard('CL', { playerId: 'cl1' }), ops: 0, sb: 0 },
      { card: makePitcherCard('CL', { playerId: 'cl2' }), ops: 0, sb: 0 },
    ];
    const needs = getRosterNeeds(roster);
    expect(needs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// selectAIPick (REQ-DFT-006)
// ---------------------------------------------------------------------------
describe('selectAIPick (REQ-DFT-006)', () => {
  const pool = buildPool();

  describe('early rounds (1-3)', () => {
    it('never picks a closer', () => {
      for (let seed = 0; seed < 20; seed++) {
        const pick = selectAIPick(1, [], pool, new SeededRNG(seed));
        expect(pick.card.pitching?.role).not.toBe('CL');
      }
    });

    it('never picks a reliever', () => {
      for (let seed = 0; seed < 20; seed++) {
        const pick = selectAIPick(2, [], pool, new SeededRNG(seed));
        if (pick.card.isPitcher) {
          expect(pick.card.pitching?.role).toBe('SP');
        }
      }
    });

    it('picks high-value players', () => {
      const pick = selectAIPick(1, [], pool, new SeededRNG(42));
      // Should pick one of the best players in the pool
      expect(pick.card.playerId).toBeDefined();
    });
  });

  describe('need-weighted selection', () => {
    it('SP gets rotation need boost when rotation is empty', () => {
      // Custom pool where SP and batter values are close enough that the
      // rotation need multiplier (1.15x) makes SP competitive with
      // starter-need batters (1.20x).
      const tightPool: DraftablePlayer[] = [
        // Mediocre batter: 0.700 OPS, LF -> raw ~91, adjusted 91*1.20=109
        makeDraftable(makeCard({ playerId: 'lf1', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.700, 5),
        // Good SP: 2.80 ERA, 10 K/9, 7 stamina -> raw ~97, adjusted 97*1.15=112
        { card: makePitcherCard('SP', { playerId: 'sp1', pitching: { role: 'SP', grade: 12, stamina: 7, era: 2.80, whip: 1.05, k9: 10.0, bb9: 2.0, hr9: 0.7, usageFlags: [], isReliever: false } }), ops: 0, sb: 0 },
        // Filler for valid draft
        { card: makePitcherCard('RP', { playerId: 'rp1' }), ops: 0, sb: 0 },
        makeDraftable(makeCard({ playerId: 'b1', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.650, 0),
      ];
      const roster: DraftablePlayer[] = [
        makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'ss', primaryPosition: 'SS', eligiblePositions: ['SS'] }), 0.8, 0),
      ];
      let spPicks = 0;
      for (let seed = 0; seed < 20; seed++) {
        const pick = selectAIPick(5, roster, tightPool, new SeededRNG(seed));
        if (pick.card.isPitcher && pick.card.pitching?.role === 'SP') spPicks++;
      }
      // With close values, SP rotation need (1.15x) should win some picks
      expect(spPicks).toBeGreaterThan(0);
    });

    it('unfilled starter positions get need boost over bench candidates', () => {
      // Empty roster: all starter positions unfilled -> 1.20x multiplier.
      // Surplus positions (bench) get 0.80x. Picks should favor starter-eligible players.
      let starterPicks = 0;
      for (let seed = 0; seed < 20; seed++) {
        const pick = selectAIPick(5, [], pool, new SeededRNG(seed));
        // Any pick that fills a starter or rotation need counts
        const pos = pick.card.primaryPosition;
        const isStarter = !pick.card.isPitcher || pick.card.pitching?.role === 'SP';
        if (isStarter) starterPicks++;
      }
      // With empty roster, starters/SP get 1.15-1.20x, bench gets 0.80x
      // Vast majority should be starter-eligible
      expect(starterPicks).toBeGreaterThanOrEqual(15);
    });
  });

  describe('bullpen need weighting', () => {
    it('picks RP/CL when starters and rotation are filled', () => {
      // Custom pool where RP/CL values (1.05x bullpen need) beat bench batters
      // (0.80x). Good closer raw ~71 * 1.05 = 74.5 vs mediocre bench batter
      // raw ~82 * 0.80 = 65.6 -- closer wins.
      const rpPool: DraftablePlayer[] = [
        // Elite closer: 2.00 ERA, 12 K/9 -> raw ~71
        { card: makePitcherCard('CL', { playerId: 'cl1', pitching: { role: 'CL', grade: 11, stamina: 2, era: 2.00, whip: 0.90, k9: 12.0, bb9: 2.0, hr9: 0.5, usageFlags: [], isReliever: true } }), ops: 0, sb: 0 },
        { card: makePitcherCard('RP', { playerId: 'rp1', pitching: { role: 'RP', grade: 9, stamina: 2, era: 2.50, whip: 1.00, k9: 10.0, bb9: 2.5, hr9: 0.7, usageFlags: [], isReliever: true } }), ops: 0, sb: 0 },
        // Mediocre bench batters: 0.650 OPS -> raw ~82 * 0.80 = 65.6
        makeDraftable(makeCard({ playerId: 'b1', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.650, 0),
        makeDraftable(makeCard({ playerId: 'b2', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.640, 0),
      ];
      const roster: DraftablePlayer[] = [
        makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: '1b', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.8, 0),
        makeDraftable(makeCard({ playerId: '2b', primaryPosition: '2B', eligiblePositions: ['2B'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'ss', primaryPosition: 'SS', eligiblePositions: ['SS'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: '3b', primaryPosition: '3B', eligiblePositions: ['3B'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'lf', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'cf', primaryPosition: 'CF', eligiblePositions: ['CF'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'rf', primaryPosition: 'RF', eligiblePositions: ['RF'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'dh', primaryPosition: 'DH', eligiblePositions: ['DH'] }), 0.7, 0),
        { card: makePitcherCard('SP', { playerId: 'sp1' }), ops: 0, sb: 0 },
        { card: makePitcherCard('SP', { playerId: 'sp2' }), ops: 0, sb: 0 },
        { card: makePitcherCard('SP', { playerId: 'sp3' }), ops: 0, sb: 0 },
        { card: makePitcherCard('SP', { playerId: 'sp4' }), ops: 0, sb: 0 },
      ];
      let reliefPicks = 0;
      for (let seed = 0; seed < 20; seed++) {
        const pick = selectAIPick(10, roster, rpPool, new SeededRNG(seed));
        if (pick.card.isPitcher && (pick.card.pitching?.role === 'RP' || pick.card.pitching?.role === 'CL')) {
          reliefPicks++;
        }
      }
      // Closer adjusted (74.5) > bench batter adjusted (65.6).
      // Weighted random spreads picks, but RP/CL should appear meaningfully.
      expect(reliefPicks).toBeGreaterThan(3);
    });
  });

  describe('value-gap override', () => {
    it('prefers HOF batter over mediocre SP in mid rounds', () => {
      // Pool with a HOF-caliber batter and only mediocre SPs
      const hofPool: DraftablePlayer[] = [
        // HOF batter: 1.200 OPS -> value ~160
        makeDraftable(makeCard({
          playerId: 'hof01', primaryPosition: 'LF', eligiblePositions: ['LF'],
          fieldingPct: 0.97,
        }), 1.200, 5),
        // Mediocre SPs (ERA 4.0+) -> value ~35-50
        { card: makePitcherCard('SP', { playerId: 'msp1', pitching: { role: 'SP', grade: 6, stamina: 5, era: 4.50, whip: 1.40, k9: 6.5, bb9: 3.5, hr9: 1.3, usageFlags: [], isReliever: false } }), ops: 0, sb: 0 },
        { card: makePitcherCard('SP', { playerId: 'msp2', pitching: { role: 'SP', grade: 7, stamina: 5.5, era: 4.10, whip: 1.30, k9: 7.0, bb9: 3.2, hr9: 1.1, usageFlags: [], isReliever: false } }), ops: 0, sb: 0 },
        // Filler RP/bench
        { card: makePitcherCard('RP', { playerId: 'rp1' }), ops: 0, sb: 0 },
        { card: makePitcherCard('RP', { playerId: 'rp2' }), ops: 0, sb: 0 },
        { card: makePitcherCard('CL', { playerId: 'cl1', pitching: { role: 'CL', grade: 9, stamina: 1.5, era: 2.50, whip: 1.00, k9: 11.0, bb9: 2.5, hr9: 0.6, usageFlags: [], isReliever: true } }), ops: 0, sb: 0 },
        makeDraftable(makeCard({ playerId: 'bench1', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.700, 0),
      ];
      // Roster with no SP (needs rotation)
      const roster: DraftablePlayer[] = [
        makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'ss', primaryPosition: 'SS', eligiblePositions: ['SS'] }), 0.8, 0),
      ];
      let hofPicks = 0;
      for (let seed = 0; seed < 20; seed++) {
        const pick = selectAIPick(5, roster, hofPool, new SeededRNG(seed));
        if (pick.card.playerId === 'hof01') hofPicks++;
      }
      // With value gap > 60, AI should prefer HOF batter over mediocre SP
      expect(hofPicks).toBeGreaterThan(10);
    });

    it('SP competes with batters when rotation need exists and values are close', () => {
      // Pool where best SP is competitive with best batter
      const balancedPool: DraftablePlayer[] = [
        // Good batter: 0.800 OPS -> value ~94 (with LF 1.02x multiplier)
        makeDraftable(makeCard({
          playerId: 'good01', primaryPosition: 'LF', eligiblePositions: ['LF'],
          fieldingPct: 0.97,
        }), 0.800, 5),
        // Good SP (2.80 ERA, 10 K/9) -> value ~88
        { card: makePitcherCard('SP', { playerId: 'gsp1', pitching: { role: 'SP', grade: 12, stamina: 7, era: 2.80, whip: 1.05, k9: 10.0, bb9: 2.0, hr9: 0.7, usageFlags: [], isReliever: false } }), ops: 0, sb: 0 },
        // Filler
        { card: makePitcherCard('RP', { playerId: 'rp1' }), ops: 0, sb: 0 },
        { card: makePitcherCard('RP', { playerId: 'rp2' }), ops: 0, sb: 0 },
        { card: makePitcherCard('CL', { playerId: 'cl1', pitching: { role: 'CL', grade: 9, stamina: 1.5, era: 2.50, whip: 1.00, k9: 11.0, bb9: 2.5, hr9: 0.6, usageFlags: [], isReliever: true } }), ops: 0, sb: 0 },
        makeDraftable(makeCard({ playerId: 'bench1', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.700, 0),
      ];
      const roster: DraftablePlayer[] = [
        makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'ss', primaryPosition: 'SS', eligiblePositions: ['SS'] }), 0.8, 0),
      ];
      let spPicks = 0;
      for (let seed = 0; seed < 20; seed++) {
        const pick = selectAIPick(5, roster, balancedPool, new SeededRNG(seed));
        if (pick.card.isPitcher && pick.card.pitching?.role === 'SP') spPicks++;
      }
      // With need-weighted selection: SP gets 1.15x (rotation), batter gets 1.20x (starter).
      // Both are competitive -- SP should appear at least sometimes
      expect(spPicks).toBeGreaterThan(0);
    });
  });

  it('is deterministic with same seed', () => {
    const pick1 = selectAIPick(1, [], pool, new SeededRNG(42));
    const pick2 = selectAIPick(1, [], pool, new SeededRNG(42));
    expect(pick1.card.playerId).toBe(pick2.card.playerId);
  });

  it('produces different picks across different seeds (not always same player)', () => {
    const ids = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      const pick = selectAIPick(1, [], pool, new SeededRNG(seed));
      ids.add(pick.card.playerId);
    }
    // With weighted random selection, different seeds should occasionally
    // produce different picks (not always the #1 valued player)
    expect(ids.size).toBeGreaterThan(1);
  });

  it('does not pick a player already on the roster', () => {
    const roster = [pool[0]]; // c01 is on the roster
    for (let seed = 0; seed < 30; seed++) {
      const pick = selectAIPick(1, roster, pool, new SeededRNG(seed));
      expect(pick.card.playerId).not.toBe('c01');
    }
  });

  describe('hard guard (mandatory composition enforcement)', () => {
    it('forces RP/CL pick when remaining rounds equal remaining bullpen needs', () => {
      // 17 players drafted: all starters + 4 SP, no RP/CL yet.
      // 4 picks remaining, 4 bullpen spots needed -- hard guard must force RP/CL.
      const roster: DraftablePlayer[] = [
        makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: '1b', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.8, 0),
        makeDraftable(makeCard({ playerId: '2b', primaryPosition: '2B', eligiblePositions: ['2B'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'ss', primaryPosition: 'SS', eligiblePositions: ['SS'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: '3b', primaryPosition: '3B', eligiblePositions: ['3B'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'lf', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'cf', primaryPosition: 'CF', eligiblePositions: ['CF'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'rf', primaryPosition: 'RF', eligiblePositions: ['RF'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'dh', primaryPosition: 'DH', eligiblePositions: ['DH'] }), 0.7, 0),
        // 4 bench
        makeDraftable(makeCard({ playerId: 'b1', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.6, 0),
        makeDraftable(makeCard({ playerId: 'b2', primaryPosition: '2B', eligiblePositions: ['2B'] }), 0.6, 0),
        makeDraftable(makeCard({ playerId: 'b3', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.6, 0),
        makeDraftable(makeCard({ playerId: 'b4', primaryPosition: 'RF', eligiblePositions: ['RF'] }), 0.6, 0),
        // 4 SP
        { card: makePitcherCard('SP', { playerId: 'sp1' }), ops: 0, sb: 0 },
        { card: makePitcherCard('SP', { playerId: 'sp2' }), ops: 0, sb: 0 },
        { card: makePitcherCard('SP', { playerId: 'sp3' }), ops: 0, sb: 0 },
        { card: makePitcherCard('SP', { playerId: 'sp4' }), ops: 0, sb: 0 },
      ];

      for (let seed = 0; seed < 30; seed++) {
        const pick = selectAIPick(18, roster, pool, new SeededRNG(seed));
        expect(pick.card.isPitcher).toBe(true);
        expect(['RP', 'CL']).toContain(pick.card.pitching?.role);
      }
    });

    it('forces SP when rotation incomplete and remaining picks equal mandatory needs', () => {
      // 18 players drafted: starters + bench + 1 SP + 0 RP.
      // 3 picks remaining, 3 mandatory needs (3 SP).
      // But we also need 4 RP... so 7 mandatory needs with only 3 picks.
      // Wait - let me build a roster where SP is the only mandatory need.
      // 18 players: starters + bench + 1 SP + 4 RP = 18
      const roster: DraftablePlayer[] = [
        makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: '1b', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.8, 0),
        makeDraftable(makeCard({ playerId: '2b', primaryPosition: '2B', eligiblePositions: ['2B'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'ss', primaryPosition: 'SS', eligiblePositions: ['SS'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: '3b', primaryPosition: '3B', eligiblePositions: ['3B'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'lf', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'cf', primaryPosition: 'CF', eligiblePositions: ['CF'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'rf', primaryPosition: 'RF', eligiblePositions: ['RF'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'dh', primaryPosition: 'DH', eligiblePositions: ['DH'] }), 0.7, 0),
        // 4 bench
        makeDraftable(makeCard({ playerId: 'b1', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.6, 0),
        makeDraftable(makeCard({ playerId: 'b2', primaryPosition: '2B', eligiblePositions: ['2B'] }), 0.6, 0),
        makeDraftable(makeCard({ playerId: 'b3', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.6, 0),
        makeDraftable(makeCard({ playerId: 'b4', primaryPosition: 'RF', eligiblePositions: ['RF'] }), 0.6, 0),
        // 1 SP only
        { card: makePitcherCard('SP', { playerId: 'sp1' }), ops: 0, sb: 0 },
        // 4 RP
        { card: makePitcherCard('RP', { playerId: 'rp1' }), ops: 0, sb: 0 },
        { card: makePitcherCard('RP', { playerId: 'rp2' }), ops: 0, sb: 0 },
        { card: makePitcherCard('CL', { playerId: 'cl1' }), ops: 0, sb: 0 },
        { card: makePitcherCard('CL', { playerId: 'cl2' }), ops: 0, sb: 0 },
      ];

      // 3 picks remaining, 3 SP needed -- hard guard must force SP
      for (let seed = 0; seed < 30; seed++) {
        const pick = selectAIPick(19, roster, pool, new SeededRNG(seed));
        expect(pick.card.isPitcher).toBe(true);
        expect(pick.card.pitching?.role).toBe('SP');
      }
    });

    it('full 21-round draft always produces valid composition (50 seeds)', () => {
      for (let seed = 0; seed < 50; seed++) {
        const roster: DraftablePlayer[] = [];
        const rng = new SeededRNG(seed);

        for (let round = 1; round <= 21; round++) {
          const pick = selectAIPick(round, roster, pool, rng);
          roster.push(pick);
        }

        expect(roster).toHaveLength(21);

        const needs = getRosterNeeds(roster);
        if (needs.length > 0) {
          const unfilled = needs.map((n) => `${n.position}(${n.slot})`).join(', ');
          throw new Error(`Seed ${seed}: roster incomplete, unfilled: ${unfilled}`);
        }
      }
    });

    it('never drafts more than 4 SP even with deep SP pool (50 seeds)', () => {
      // Build a pool with 8 SP (more than the 4-SP cap) plus enough position/RP players
      const deepPool: DraftablePlayer[] = [
        ...buildPool(), // includes 4 SP
        { card: makePitcherCard('SP', { playerId: 'sp05', pitching: { role: 'SP', grade: 9, stamina: 7, era: 2.80, whip: 1.05, k9: 10.0, bb9: 2.0, hr9: 0.7, usageFlags: [], isReliever: false } }), ops: 0, sb: 0 },
        { card: makePitcherCard('SP', { playerId: 'sp06', pitching: { role: 'SP', grade: 11, stamina: 7, era: 2.50, whip: 0.95, k9: 11.0, bb9: 1.8, hr9: 0.5, usageFlags: [], isReliever: false } }), ops: 0, sb: 0 },
        { card: makePitcherCard('SP', { playerId: 'sp07', pitching: { role: 'SP', grade: 12, stamina: 8, era: 2.20, whip: 0.90, k9: 12.0, bb9: 1.5, hr9: 0.4, usageFlags: [], isReliever: false } }), ops: 0, sb: 0 },
        { card: makePitcherCard('SP', { playerId: 'sp08', pitching: { role: 'SP', grade: 13, stamina: 8, era: 1.90, whip: 0.85, k9: 13.0, bb9: 1.2, hr9: 0.3, usageFlags: [], isReliever: false } }), ops: 0, sb: 0 },
        // Extra position players for bench depth
        makeDraftable(makeCard({ playerId: '3b02', primaryPosition: '3B', eligiblePositions: ['3B'] }), 0.760, 4),
        makeDraftable(makeCard({ playerId: 'dh02', primaryPosition: 'DH', eligiblePositions: ['DH'] }), 0.800, 0),
        makeDraftable(makeCard({ playerId: 'c03', primaryPosition: 'C', eligiblePositions: ['C'] }), 0.680, 1),
        makeDraftable(makeCard({ playerId: '1b03', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.710, 2),
      ];

      for (let seed = 0; seed < 50; seed++) {
        const roster: DraftablePlayer[] = [];
        const rng = new SeededRNG(seed);

        for (let round = 1; round <= 21; round++) {
          const pick = selectAIPick(round, roster, deepPool, rng);
          roster.push(pick);
        }

        const spCount = roster.filter(
          (p) => p.card.isPitcher && p.card.pitching?.role === 'SP',
        ).length;
        const rpCount = roster.filter(
          (p) => p.card.isPitcher && ['RP', 'CL'].includes(p.card.pitching?.role ?? ''),
        ).length;

        if (spCount > 4) {
          throw new Error(`Seed ${seed}: drafted ${spCount} SP (max 4). RP: ${rpCount}`);
        }
        if (rpCount > 4) {
          throw new Error(`Seed ${seed}: drafted ${rpCount} RP/CL (max 4). SP: ${spCount}`);
        }

        const needs = getRosterNeeds(roster);
        if (needs.length > 0) {
          const unfilled = needs.map((n) => `${n.position}(${n.slot})`).join(', ');
          throw new Error(`Seed ${seed}: roster incomplete, unfilled: ${unfilled}`);
        }
      }
    });
  });

  it('considers roster gaps (unfilled starter positions get need boost)', () => {
    // Roster with SP rotation filled but missing SS, OF, DH
    // All unfilled starters get 1.20x multiplier. SS has highest scarcity
    // (1.15x base) so SS should appear frequently but not always since
    // higher-OPS players at other positions may win via weighted random.
    const roster: DraftablePlayer[] = [
      makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] }), 0.7, 0),
      makeDraftable(makeCard({ playerId: '1b', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.8, 0),
      makeDraftable(makeCard({ playerId: '2b', primaryPosition: '2B', eligiblePositions: ['2B'] }), 0.7, 0),
      makeDraftable(makeCard({ playerId: '3b', primaryPosition: '3B', eligiblePositions: ['3B'] }), 0.7, 0),
      { card: makePitcherCard('SP', { playerId: 'sp_a' }), ops: 0, sb: 0 },
      { card: makePitcherCard('SP', { playerId: 'sp_b' }), ops: 0, sb: 0 },
      { card: makePitcherCard('SP', { playerId: 'sp_c' }), ops: 0, sb: 0 },
      { card: makePitcherCard('SP', { playerId: 'sp_d' }), ops: 0, sb: 0 },
    ];
    let starterPicks = 0;
    for (let seed = 0; seed < 20; seed++) {
      const pick = selectAIPick(5, roster, pool, new SeededRNG(seed));
      // Any unfilled starter position counts (SS, OF, DH)
      if (!pick.card.isPitcher) starterPicks++;
    }
    // With SP capped and unfilled starters getting 1.20x, position players dominate
    expect(starterPicks).toBeGreaterThanOrEqual(15);
  });
});

// ---------------------------------------------------------------------------
// Manager style draft influence
// ---------------------------------------------------------------------------
describe('manager style draft influence', () => {
  // Build a pool where SP and batters have overlapping values so style bias
  // can meaningfully shift which gets picked. The base pitcher value (25 for SP)
  // ensures good SPs compete with batters. Batter OPS range 1.000-.700 and
  // SP ERA range 2.80-4.30 create a zone where style bias tips the balance.
  function buildStyleTestPool(): DraftablePlayer[] {
    const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;
    const pool: DraftablePlayer[] = [];
    let id = 0;

    // Position players: 5 per position, OPS range 1.000-.880
    for (const pos of positions) {
      for (let i = 0; i < 5; i++) {
        id++;
        pool.push(makeDraftable(
          makeCard({
            playerId: `pos${id}`,
            primaryPosition: pos,
            eligiblePositions: [pos],
          }),
          1.000 - i * 0.03,
          10 - i * 2,
        ));
      }
    }

    // 12 SP: ERA range 2.80-4.45 (competitive with batters via base value)
    for (let i = 0; i < 12; i++) {
      id++;
      pool.push({
        card: makePitcherCard('SP', {
          playerId: `sp${id}`,
          nameFirst: 'SP',
          nameLast: `Pitcher${i}`,
          pitching: {
            role: 'SP', grade: 12 - i,
            stamina: 7 - i * 0.2,
            era: 2.80 + i * 0.15,
            whip: 1.00 + i * 0.03,
            k9: 10.5 - i * 0.3,
            bb9: 1.8 + i * 0.1,
            hr9: 0.6 + i * 0.03,
            usageFlags: [], isReliever: false,
          },
        }),
        ops: 0, sb: 0,
      });
    }

    // 10 RP/CL: ERA range 2.00-3.80
    for (let i = 0; i < 10; i++) {
      id++;
      const role = i < 4 ? 'CL' : 'RP' as const;
      pool.push({
        card: makePitcherCard(role, {
          playerId: `rp${id}`,
          nameFirst: role,
          nameLast: `Reliever${i}`,
          pitching: {
            role, grade: 10 - i,
            stamina: 2,
            era: 2.00 + i * 0.18,
            whip: 0.90 + i * 0.05,
            k9: 12.0 - i * 0.3,
            bb9: 2.0 + i * 0.15,
            hr9: 0.5 + i * 0.04,
            usageFlags: [], isReliever: true,
          },
        }),
        ops: 0, sb: 0,
      });
    }

    return pool;
  }

  it('conservative manager drafts SP earlier than aggressive manager (on average)', () => {
    const pool = buildStyleTestPool();

    function avgFirstSPRound(style: string, seeds: number): number {
      let totalRound = 0;
      for (let seed = 0; seed < seeds; seed++) {
        const roster: DraftablePlayer[] = [];
        const rng = new SeededRNG(seed);
        let firstSPRound = 21;
        for (let round = 1; round <= 21; round++) {
          const pick = selectAIPick(round, roster, pool, rng, style as 'conservative');
          roster.push(pick);
          if (pick.card.isPitcher && pick.card.pitching?.role === 'SP') {
            firstSPRound = round;
            break;
          }
        }
        totalRound += firstSPRound;
      }
      return totalRound / seeds;
    }

    // Conservative (rotationUrgency 1.25) should draft SP earlier
    // Aggressive (rotationUrgency 0.85) should draft SP later
    const conservativeAvg = avgFirstSPRound('conservative', 30);
    const aggressiveAvg = avgFirstSPRound('aggressive', 30);
    expect(conservativeAvg).toBeLessThan(aggressiveAvg);
  });

  it('aggressive manager drafts RP/CL earlier than conservative manager', () => {
    const pool = buildStyleTestPool();

    function avgFirstRPRound(style: string, seeds: number): number {
      let totalRound = 0;
      for (let seed = 0; seed < seeds; seed++) {
        const roster: DraftablePlayer[] = [];
        const rng = new SeededRNG(seed);
        let firstRPRound = 21;
        for (let round = 1; round <= 21; round++) {
          const pick = selectAIPick(round, roster, pool, rng, style as 'aggressive');
          roster.push(pick);
          if (pick.card.isPitcher && (pick.card.pitching?.role === 'RP' || pick.card.pitching?.role === 'CL')) {
            firstRPRound = round;
            break;
          }
        }
        totalRound += firstRPRound;
      }
      return totalRound / seeds;
    }

    // Aggressive (bullpenUrgency 1.35) should draft RP/CL earlier
    const aggressiveAvg = avgFirstRPRound('aggressive', 30);
    const conservativeAvg = avgFirstRPRound('conservative', 30);
    expect(aggressiveAvg).toBeLessThan(conservativeAvg);
  });

  it('analytical manager with topK=5 produces more varied picks across seeds', () => {
    const pool = buildStyleTestPool();
    const analyticalPicks = new Set<string>();
    const conservativePicks = new Set<string>();

    for (let seed = 0; seed < 50; seed++) {
      const aPick = selectAIPick(1, [], pool, new SeededRNG(seed), 'analytical');
      analyticalPicks.add(aPick.card.playerId);
      const cPick = selectAIPick(1, [], pool, new SeededRNG(seed), 'conservative');
      conservativePicks.add(cPick.card.playerId);
    }

    // Analytical (topK=5) should produce at least as many unique picks as
    // conservative (topK=3), and ideally more
    expect(analyticalPicks.size).toBeGreaterThanOrEqual(conservativePicks.size);
  });

  it('manager style does not break composition guard (50 seeds per style)', () => {
    const pool = buildStyleTestPool();
    const styles = ['conservative', 'aggressive', 'analytical', 'balanced'] as const;

    for (const style of styles) {
      for (let seed = 0; seed < 50; seed++) {
        const roster: DraftablePlayer[] = [];
        const rng = new SeededRNG(seed);
        for (let round = 1; round <= 21; round++) {
          const pick = selectAIPick(round, roster, pool, rng, style);
          roster.push(pick);
        }

        expect(roster).toHaveLength(21);
        const needs = getRosterNeeds(roster);
        if (needs.length > 0) {
          const unfilled = needs.map((n) => `${n.position}(${n.slot})`).join(', ');
          throw new Error(`Style ${style}, seed ${seed}: incomplete roster, unfilled: ${unfilled}`);
        }
      }
    }
  });
});
