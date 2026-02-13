import { wouldViolateComposition } from '@lib/draft/composition-guard';
import type { DraftablePlayer } from '@lib/draft/ai-strategy';
import type { PlayerCard } from '@lib/types/player';

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
  ops: number = 0.7,
  sb: number = 0,
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('wouldViolateComposition', () => {
  it('allows picks that maintain valid composition path', () => {
    // Empty roster, picking a catcher -- plenty of room
    const result = wouldViolateComposition(
      [],
      makeDraftable(makeCard({ playerId: 'c1', primaryPosition: 'C', eligiblePositions: ['C'] })),
    );
    expect(result.allowed).toBe(true);
  });

  it('allows picks for any position when many slots remain', () => {
    const roster: DraftablePlayer[] = [
      makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] })),
      makeDraftable(makeCard({ playerId: '1b', primaryPosition: '1B', eligiblePositions: ['1B'] })),
    ];
    // 19 picks remain, picking another batter is fine
    const result = wouldViolateComposition(
      roster,
      makeDraftable(makeCard({ playerId: 'dh1', primaryPosition: 'DH', eligiblePositions: ['DH'] })),
    );
    expect(result.allowed).toBe(true);
  });

  it('rejects pick that makes valid roster impossible (too many batters, no room for pitchers)', () => {
    // Build a roster with 13 position players (starters + bench), 0 pitchers.
    // 8 picks remain. Need: 4 SP + 4 RP = 8 mandatory pitching spots.
    // Trying to add ANOTHER position player would leave only 7 picks for 8 mandatory.
    const roster: DraftablePlayer[] = [
      makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] })),
      makeDraftable(makeCard({ playerId: '1b', primaryPosition: '1B', eligiblePositions: ['1B'] })),
      makeDraftable(makeCard({ playerId: '2b', primaryPosition: '2B', eligiblePositions: ['2B'] })),
      makeDraftable(makeCard({ playerId: 'ss', primaryPosition: 'SS', eligiblePositions: ['SS'] })),
      makeDraftable(makeCard({ playerId: '3b', primaryPosition: '3B', eligiblePositions: ['3B'] })),
      makeDraftable(makeCard({ playerId: 'lf', primaryPosition: 'LF', eligiblePositions: ['LF'] })),
      makeDraftable(makeCard({ playerId: 'cf', primaryPosition: 'CF', eligiblePositions: ['CF'] })),
      makeDraftable(makeCard({ playerId: 'rf', primaryPosition: 'RF', eligiblePositions: ['RF'] })),
      makeDraftable(makeCard({ playerId: 'dh', primaryPosition: 'DH', eligiblePositions: ['DH'] })),
      // 4 bench
      makeDraftable(makeCard({ playerId: 'b1', primaryPosition: '1B', eligiblePositions: ['1B'] })),
      makeDraftable(makeCard({ playerId: 'b2', primaryPosition: '2B', eligiblePositions: ['2B'] })),
      makeDraftable(makeCard({ playerId: 'b3', primaryPosition: 'LF', eligiblePositions: ['LF'] })),
      makeDraftable(makeCard({ playerId: 'b4', primaryPosition: 'RF', eligiblePositions: ['RF'] })),
    ];

    // 8 picks remain. 8 mandatory (4 SP + 4 RP).
    // Picking another batter -> 7 picks left, 8 mandatory -> reject
    const result = wouldViolateComposition(
      roster,
      makeDraftable(makeCard({ playerId: 'extra', primaryPosition: 'SS', eligiblePositions: ['SS'] })),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('mandatory');
  });

  it('allows picking a pitcher when pitching slots are needed', () => {
    // Same 13-player roster as above, but picking an SP this time
    const roster: DraftablePlayer[] = [
      makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] })),
      makeDraftable(makeCard({ playerId: '1b', primaryPosition: '1B', eligiblePositions: ['1B'] })),
      makeDraftable(makeCard({ playerId: '2b', primaryPosition: '2B', eligiblePositions: ['2B'] })),
      makeDraftable(makeCard({ playerId: 'ss', primaryPosition: 'SS', eligiblePositions: ['SS'] })),
      makeDraftable(makeCard({ playerId: '3b', primaryPosition: '3B', eligiblePositions: ['3B'] })),
      makeDraftable(makeCard({ playerId: 'lf', primaryPosition: 'LF', eligiblePositions: ['LF'] })),
      makeDraftable(makeCard({ playerId: 'cf', primaryPosition: 'CF', eligiblePositions: ['CF'] })),
      makeDraftable(makeCard({ playerId: 'rf', primaryPosition: 'RF', eligiblePositions: ['RF'] })),
      makeDraftable(makeCard({ playerId: 'dh', primaryPosition: 'DH', eligiblePositions: ['DH'] })),
      makeDraftable(makeCard({ playerId: 'b1', primaryPosition: '1B', eligiblePositions: ['1B'] })),
      makeDraftable(makeCard({ playerId: 'b2', primaryPosition: '2B', eligiblePositions: ['2B'] })),
      makeDraftable(makeCard({ playerId: 'b3', primaryPosition: 'LF', eligiblePositions: ['LF'] })),
      makeDraftable(makeCard({ playerId: 'b4', primaryPosition: 'RF', eligiblePositions: ['RF'] })),
    ];

    // Picking SP satisfies a mandatory need: 4SP + 4RP = 8, remaining after = 7, mandatory = 7
    const result = wouldViolateComposition(
      roster,
      { card: makePitcherCard('SP', { playerId: 'sp1' }), ops: 0, sb: 0 },
    );
    expect(result.allowed).toBe(true);
  });

  it('rejects when bench is full but mandatory positions remain unfilled', () => {
    // 20 picks made: 9 starters, 4 bench, 4 SP, 3 RP = 20 players
    // Need 1 more RP. Last pick MUST be RP/CL.
    const roster: DraftablePlayer[] = [
      makeDraftable(makeCard({ playerId: 'c', primaryPosition: 'C', eligiblePositions: ['C'] })),
      makeDraftable(makeCard({ playerId: '1b', primaryPosition: '1B', eligiblePositions: ['1B'] })),
      makeDraftable(makeCard({ playerId: '2b', primaryPosition: '2B', eligiblePositions: ['2B'] })),
      makeDraftable(makeCard({ playerId: 'ss', primaryPosition: 'SS', eligiblePositions: ['SS'] })),
      makeDraftable(makeCard({ playerId: '3b', primaryPosition: '3B', eligiblePositions: ['3B'] })),
      makeDraftable(makeCard({ playerId: 'lf', primaryPosition: 'LF', eligiblePositions: ['LF'] })),
      makeDraftable(makeCard({ playerId: 'cf', primaryPosition: 'CF', eligiblePositions: ['CF'] })),
      makeDraftable(makeCard({ playerId: 'rf', primaryPosition: 'RF', eligiblePositions: ['RF'] })),
      makeDraftable(makeCard({ playerId: 'dh', primaryPosition: 'DH', eligiblePositions: ['DH'] })),
      makeDraftable(makeCard({ playerId: 'b1', primaryPosition: '1B', eligiblePositions: ['1B'] })),
      makeDraftable(makeCard({ playerId: 'b2', primaryPosition: '2B', eligiblePositions: ['2B'] })),
      makeDraftable(makeCard({ playerId: 'b3', primaryPosition: 'LF', eligiblePositions: ['LF'] })),
      makeDraftable(makeCard({ playerId: 'b4', primaryPosition: 'RF', eligiblePositions: ['RF'] })),
      { card: makePitcherCard('SP', { playerId: 'sp1' }), ops: 0, sb: 0 },
      { card: makePitcherCard('SP', { playerId: 'sp2' }), ops: 0, sb: 0 },
      { card: makePitcherCard('SP', { playerId: 'sp3' }), ops: 0, sb: 0 },
      { card: makePitcherCard('SP', { playerId: 'sp4' }), ops: 0, sb: 0 },
      { card: makePitcherCard('RP', { playerId: 'rp1' }), ops: 0, sb: 0 },
      { card: makePitcherCard('RP', { playerId: 'rp2' }), ops: 0, sb: 0 },
      { card: makePitcherCard('CL', { playerId: 'cl1' }), ops: 0, sb: 0 },
    ];

    // 1 pick remaining, 1 RP needed. Picking a batter -> 0 remaining, 1 mandatory -> reject
    const resultBatter = wouldViolateComposition(
      roster,
      makeDraftable(makeCard({ playerId: 'extra', primaryPosition: '1B', eligiblePositions: ['1B'] })),
    );
    expect(resultBatter.allowed).toBe(false);

    // Picking an RP -> 0 remaining, 0 mandatory -> allow
    const resultRP = wouldViolateComposition(
      roster,
      { card: makePitcherCard('RP', { playerId: 'rp3' }), ops: 0, sb: 0 },
    );
    expect(resultRP.allowed).toBe(true);
  });
});
