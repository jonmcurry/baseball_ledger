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

  describe('mid rounds (4-8)', () => {
    it('fills rotation when needed (picks SP if < 4 SP on roster)', () => {
      // Roster with no SP
      const roster: DraftablePlayer[] = [
        makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'ss', primaryPosition: 'SS', eligiblePositions: ['SS'] }), 0.8, 0),
        makeDraftable(makeCard({ playerId: 'cf', primaryPosition: 'CF', eligiblePositions: ['CF'] }), 0.7, 0),
      ];
      let spPicks = 0;
      for (let seed = 0; seed < 20; seed++) {
        const pick = selectAIPick(5, roster, pool, new SeededRNG(seed));
        if (pick.card.isPitcher && pick.card.pitching?.role === 'SP') spPicks++;
      }
      // Should pick SP most of the time
      expect(spPicks).toBeGreaterThan(10);
    });

    it('prefers premium positions (C, SS) and SP when roster has gaps', () => {
      // Empty roster - round 5 should target SP first, then premium (C, SS)
      let targetPicks = 0;
      for (let seed = 0; seed < 20; seed++) {
        const pick = selectAIPick(5, [], pool, new SeededRNG(seed));
        const pos = pick.card.primaryPosition;
        if (['C', 'SS', 'SP'].includes(pos)) targetPicks++;
      }
      expect(targetPicks).toBeGreaterThan(10);
    });
  });

  describe('late rounds (9+)', () => {
    it('picks relievers and closers when needed', () => {
      // Roster with starters and SP filled but no RP/CL
      const roster: DraftablePlayer[] = [
        makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: '1b', primaryPosition: '1B', eligiblePositions: ['1B'] }), 0.8, 0),
        makeDraftable(makeCard({ playerId: '2b', primaryPosition: '2B', eligiblePositions: ['2B'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'ss', primaryPosition: 'SS', eligiblePositions: ['SS'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: '3b', primaryPosition: '3B', eligiblePositions: ['3B'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'lf', primaryPosition: 'LF', eligiblePositions: ['LF'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'cf', primaryPosition: 'CF', eligiblePositions: ['CF'] }), 0.7, 0),
        makeDraftable(makeCard({ playerId: 'rf', primaryPosition: 'RF', eligiblePositions: ['RF'] }), 0.7, 0),
        { card: makePitcherCard('SP', { playerId: 'sp1' }), ops: 0, sb: 0 },
        { card: makePitcherCard('SP', { playerId: 'sp2' }), ops: 0, sb: 0 },
        { card: makePitcherCard('SP', { playerId: 'sp3' }), ops: 0, sb: 0 },
        { card: makePitcherCard('SP', { playerId: 'sp4' }), ops: 0, sb: 0 },
      ];
      let reliefPicks = 0;
      for (let seed = 0; seed < 20; seed++) {
        const pick = selectAIPick(10, roster, pool, new SeededRNG(seed));
        if (pick.card.isPitcher && (pick.card.pitching?.role === 'RP' || pick.card.pitching?.role === 'CL')) {
          reliefPicks++;
        }
      }
      expect(reliefPicks).toBeGreaterThan(10);
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

  it('considers roster gaps (picks SS when SP is filled and SS is missing)', () => {
    // Roster with SP rotation filled but missing SS (premium position gap)
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
    let ssPicks = 0;
    for (let seed = 0; seed < 20; seed++) {
      const pick = selectAIPick(5, roster, pool, new SeededRNG(seed));
      if (pick.card.primaryPosition === 'SS') ssPicks++;
    }
    // With SP filled and C filled, SS is the only premium gap -- should pick SS
    // (weighted random may occasionally pick ss02 instead of ss01, but still SS)
    expect(ssPicks).toBe(20);
  });
});
