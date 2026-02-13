/**
 * Tests for trade-validator
 *
 * REQ-RST-005, REQ-RST-006: Trade validation ensures both rosters
 * remain valid (21 players, correct composition) after swap.
 */

import { validateTradeRosters } from '@lib/draft/trade-validator';
import type { RosterEntry } from '@lib/types/roster';
import type { PlayerCard } from '@lib/types/player';

function mockCard(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    playerId: 'p-1',
    nameFirst: 'Test',
    nameLast: 'Player',
    seasonYear: 1993,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: 'CF',
    eligiblePositions: ['CF'],
    isPitcher: false,
    card: [],
    powerRating: 17,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.5,
    power: 0.5,
    discipline: 0.5,
    contactRate: 0.5,
    fieldingPct: 0.97,
    range: 0.6,
    arm: 0.6,
    ...overrides,
  };
}

function mockEntry(id: string, pos: string, isPitcher = false, pitchingRole?: 'SP' | 'RP' | 'CL'): RosterEntry {
  return {
    id,
    playerId: id,
    playerCard: mockCard({
      playerId: id,
      primaryPosition: pos,
      isPitcher,
      ...(isPitcher && pitchingRole ? {
        pitching: { role: pitchingRole, grade: 5, stamina: 6, era: 3.50, whip: 1.20, k9: 7, bb9: 3, hr9: 1, usageFlags: [], isReliever: pitchingRole !== 'SP' },
      } : {}),
    }),
    rosterSlot: isPitcher ? (pitchingRole === 'SP' ? 'rotation' : 'bullpen') : 'starter',
    lineupOrder: null,
    lineupPosition: null,
  };
}

function buildFullRoster(teamPrefix: string): RosterEntry[] {
  return [
    // 9 starters
    mockEntry(`${teamPrefix}-c`, 'C'),
    mockEntry(`${teamPrefix}-1b`, '1B'),
    mockEntry(`${teamPrefix}-2b`, '2B'),
    mockEntry(`${teamPrefix}-ss`, 'SS'),
    mockEntry(`${teamPrefix}-3b`, '3B'),
    mockEntry(`${teamPrefix}-lf`, 'LF'),
    mockEntry(`${teamPrefix}-cf`, 'CF'),
    mockEntry(`${teamPrefix}-rf`, 'RF'),
    mockEntry(`${teamPrefix}-dh`, 'DH'),
    // 4 bench
    mockEntry(`${teamPrefix}-b1`, 'LF'),
    mockEntry(`${teamPrefix}-b2`, 'RF'),
    mockEntry(`${teamPrefix}-b3`, 'SS'),
    mockEntry(`${teamPrefix}-b4`, '1B'),
    // 4 SP
    mockEntry(`${teamPrefix}-sp1`, 'P', true, 'SP'),
    mockEntry(`${teamPrefix}-sp2`, 'P', true, 'SP'),
    mockEntry(`${teamPrefix}-sp3`, 'P', true, 'SP'),
    mockEntry(`${teamPrefix}-sp4`, 'P', true, 'SP'),
    // 3 RP
    mockEntry(`${teamPrefix}-rp1`, 'P', true, 'RP'),
    mockEntry(`${teamPrefix}-rp2`, 'P', true, 'RP'),
    mockEntry(`${teamPrefix}-rp3`, 'P', true, 'RP'),
    // 1 CL
    mockEntry(`${teamPrefix}-cl`, 'P', true, 'CL'),
  ];
}

describe('validateTradeRosters', () => {
  it('returns valid for a balanced 1-for-1 trade', () => {
    const rosterA = buildFullRoster('a');
    const rosterB = buildFullRoster('b');
    // Trade: Team A gives bench OF -> Team B gives bench OF
    const result = validateTradeRosters(
      rosterA, rosterB,
      [rosterA[9].playerId],   // a-b1 (bench LF)
      [rosterB[9].playerId],   // b-b1 (bench LF)
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error when trade would leave team with wrong roster size', () => {
    const rosterA = buildFullRoster('a');
    const rosterB = buildFullRoster('b');
    // Trade: Team A gives 2 players, Team B gives 1 -> Team A has 20
    const result = validateTradeRosters(
      rosterA, rosterB,
      [rosterA[9].playerId, rosterA[10].playerId], // give 2 bench
      [rosterB[9].playerId],                        // get 1 bench
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('21'))).toBe(true);
  });

  it('returns error when trade removes last catcher from a team', () => {
    const rosterA = buildFullRoster('a');
    const rosterB = buildFullRoster('b');
    // Trade: Team A gives C, gets bench OF
    const result = validateTradeRosters(
      rosterA, rosterB,
      [rosterA[0].playerId],   // a-c (only catcher)
      [rosterB[9].playerId],   // b-b1 (bench OF)
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('C'))).toBe(true);
  });

  it('returns error for empty trade (no players exchanged)', () => {
    const rosterA = buildFullRoster('a');
    const rosterB = buildFullRoster('b');
    const result = validateTradeRosters(rosterA, rosterB, [], []);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('empty'))).toBe(true);
  });

  it('returns error when same player is on both sides of the trade', () => {
    const rosterA = buildFullRoster('a');
    const rosterB = buildFullRoster('b');
    const result = validateTradeRosters(
      rosterA, rosterB,
      [rosterA[9].playerId],
      [rosterA[9].playerId],  // same player from team A listed as coming from B
    );
    expect(result.valid).toBe(false);
  });

  it('returns valid when swapping same-position players preserves composition', () => {
    const rosterA = buildFullRoster('a');
    const rosterB = buildFullRoster('b');
    // SP for SP trade
    const result = validateTradeRosters(
      rosterA, rosterB,
      [rosterA[13].playerId],   // a-sp1
      [rosterB[13].playerId],   // b-sp1
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error when trade removes last SP from a team', () => {
    const rosterA = buildFullRoster('a');
    // Remove 3 SPs from team A so it only has 1
    rosterA.splice(14, 3); // remove sp2, sp3, sp4
    // Add 3 bench players to keep at 21
    rosterA.push(mockEntry('a-b5', 'LF'));
    rosterA.push(mockEntry('a-b6', 'RF'));
    rosterA.push(mockEntry('a-b7', 'CF'));
    const rosterB = buildFullRoster('b');

    // Trade away the last SP
    const result = validateTradeRosters(
      rosterA, rosterB,
      [rosterA[13].playerId],   // a-sp1 (the only SP left)
      [rosterB[9].playerId],    // b-b1 (bench OF)
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('SP'))).toBe(true);
  });
});
