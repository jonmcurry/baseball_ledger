/**
 * Tests for buildTradeEvalRequest
 *
 * REQ-RST-005, REQ-AI-006: Builds a TradeEvaluationRequest from roster data
 * and team metadata for CPU trade evaluation.
 */

import { buildTradeEvalRequest } from '../../../../src/lib/transforms/trade-eval-request-builder';
import type { RosterEntry } from '../../../../src/lib/types/roster';
import type { PlayerCard } from '../../../../src/lib/types/player';

function makeCard(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    playerId: 'test01',
    nameFirst: 'Test',
    nameLast: 'Player',
    seasonYear: 1927,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: 'SS',
    eligiblePositions: ['SS'],
    isPitcher: false,
    card: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    powerRating: 17,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.5,
    power: 0.5,
    discipline: 0.5,
    contactRate: 0.5,
    fieldingPct: 0.95,
    range: 0.5,
    arm: 0.5,
    ...overrides,
  };
}

function makeRosterEntry(overrides: Partial<RosterEntry> & { playerId: string }): RosterEntry {
  return {
    id: `roster-${overrides.playerId}`,
    playerId: overrides.playerId,
    playerCard: makeCard({ playerId: overrides.playerId, ...overrides.playerCard as Partial<PlayerCard> }),
    rosterSlot: 'starter',
    lineupOrder: null,
    lineupPosition: null,
    ...overrides,
  } as RosterEntry;
}

describe('buildTradeEvalRequest', () => {
  const rosterA: RosterEntry[] = [
    makeRosterEntry({
      playerId: 'ruth01',
      playerCard: { nameFirst: 'Babe', nameLast: 'Ruth', eligiblePositions: ['RF'], card: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10] } as Partial<PlayerCard>,
    }),
    makeRosterEntry({
      playerId: 'gehrig01',
      playerCard: { nameFirst: 'Lou', nameLast: 'Gehrig', eligiblePositions: ['1B'], card: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8] } as Partial<PlayerCard>,
    }),
  ];

  const rosterB: RosterEntry[] = [
    makeRosterEntry({
      playerId: 'cobb01',
      playerCard: { nameFirst: 'Ty', nameLast: 'Cobb', eligiblePositions: ['CF'], card: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9] } as Partial<PlayerCard>,
    }),
    makeRosterEntry({
      playerId: 'speaker01',
      playerCard: { nameFirst: 'Tris', nameLast: 'Speaker', eligiblePositions: ['CF'], card: [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7] } as Partial<PlayerCard>,
    }),
  ];

  it('builds request with correct player names and values', () => {
    const result = buildTradeEvalRequest({
      managerStyle: 'balanced',
      managerName: 'Johnny McCoy',
      teamName: 'New York Yankees',
      rosterA,
      rosterB,
      playersFromA: ['ruth01'],
      playersFromB: ['cobb01'],
    });

    expect(result.managerStyle).toBe('balanced');
    expect(result.managerName).toBe('Johnny McCoy');
    expect(result.teamName).toBe('New York Yankees');
    // playersOffered = players from A (the proposing team)
    expect(result.playersOffered).toHaveLength(1);
    expect(result.playersOffered[0].name).toBe('Babe Ruth');
    expect(result.playersOffered[0].position).toBe('RF');
    // Without MLB stats, falls back to card byte sum: 10 * 35 = 350
    expect(result.playersOffered[0].value).toBe(350);
    // playersRequested = players from B (the target team)
    expect(result.playersRequested).toHaveLength(1);
    expect(result.playersRequested[0].name).toBe('Ty Cobb');
    expect(result.playersRequested[0].position).toBe('CF');
    expect(result.playersRequested[0].value).toBe(315); // 9 * 35
  });

  it('uses OPS-based valuation for batters with MLB stats', () => {
    const batterWithStats = makeRosterEntry({
      playerId: 'batter01',
      playerCard: {
        nameFirst: 'Mike',
        nameLast: 'Trout',
        isPitcher: false,
        eligiblePositions: ['CF'],
        mlbBattingStats: {
          G: 140, AB: 500, R: 100, H: 170, doubles: 30, triples: 5,
          HR: 40, RBI: 100, SB: 20, CS: 5, BB: 90, SO: 120,
          BA: 0.340, OBP: 0.450, SLG: 0.650, OPS: 1.100,
        },
        fieldingPct: 0.990,
      } as Partial<PlayerCard>,
    });

    const result = buildTradeEvalRequest({
      managerStyle: 'balanced',
      managerName: 'Johnny McCoy',
      teamName: 'Test Team',
      rosterA: [batterWithStats],
      rosterB: [],
      playersFromA: ['batter01'],
      playersFromB: [],
    });

    // OPS * 100 + SB * 0.5 + fieldingPct * 20 = 110 + 10 + 19.8 = 139.8
    expect(result.playersOffered[0].value).toBeCloseTo(139.8, 1);
  });

  it('uses ERA/K9-based valuation for pitchers with stats', () => {
    const pitcherWithStats = makeRosterEntry({
      playerId: 'pitcher01',
      playerCard: {
        nameFirst: 'Sandy',
        nameLast: 'Koufax',
        isPitcher: true,
        eligiblePositions: ['SP'],
        pitching: {
          role: 'SP', grade: 12, stamina: 7.0,
          era: 2.50, whip: 1.00, k9: 10.0, bb9: 2.0, hr9: 0.5,
          usageFlags: [], isReliever: false,
        },
      } as Partial<PlayerCard>,
    });

    const result = buildTradeEvalRequest({
      managerStyle: 'balanced',
      managerName: 'Johnny McCoy',
      teamName: 'Test Team',
      rosterA: [pitcherWithStats],
      rosterB: [],
      playersFromA: ['pitcher01'],
      playersFromB: [],
    });

    // (4.50 - 2.50) * 30 + 10.0 * 5 = 60 + 50 = 110
    expect(result.playersOffered[0].value).toBeCloseTo(110, 1);
  });

  it('falls back to defaults for missing card data', () => {
    const sparseEntry = makeRosterEntry({
      playerId: 'unknown01',
      playerCard: {
        nameFirst: 'Unknown',
        nameLast: 'Player',
        eligiblePositions: [],
        card: [],
      } as Partial<PlayerCard>,
    });

    const result = buildTradeEvalRequest({
      managerStyle: 'aggressive',
      managerName: 'Duke Robinson',
      teamName: 'Detroit Tigers',
      rosterA: [sparseEntry],
      rosterB: [],
      playersFromA: ['unknown01'],
      playersFromB: ['nonexistent01'],
    });

    // Player found but card is empty -> value 0, position fallback 'UT'
    expect(result.playersOffered[0].name).toBe('Unknown Player');
    expect(result.playersOffered[0].position).toBe('UT');
    expect(result.playersOffered[0].value).toBe(0);
    // Player not found in roster -> defaults
    expect(result.playersRequested[0].name).toBe('nonexistent01');
    expect(result.playersRequested[0].position).toBe('UT');
    expect(result.playersRequested[0].value).toBe(0);
  });

  it('computes team needs from roster gaps', () => {
    // rosterB has 2 CF players but no C, SS, SP, etc.
    const result = buildTradeEvalRequest({
      managerStyle: 'analytical',
      managerName: 'Larry Pepper',
      teamName: 'Cleveland Indians',
      rosterA,
      rosterB,
      playersFromA: ['ruth01'],
      playersFromB: ['cobb01'],
    });

    // Target team (rosterB) only has CF. They need C, 1B, 2B, 3B, SS, LF, RF, SP
    expect(result.teamNeeds).toContain('C');
    expect(result.teamNeeds).toContain('SS');
    expect(result.teamNeeds).toContain('SP');
    expect(result.teamNeeds).not.toContain('CF');
  });

  it('returns empty arrays when no players selected', () => {
    const result = buildTradeEvalRequest({
      managerStyle: 'conservative',
      managerName: 'Cap Spalding',
      teamName: 'Boston Red Sox',
      rosterA,
      rosterB,
      playersFromA: [],
      playersFromB: [],
    });

    expect(result.playersOffered).toEqual([]);
    expect(result.playersRequested).toEqual([]);
  });
});
