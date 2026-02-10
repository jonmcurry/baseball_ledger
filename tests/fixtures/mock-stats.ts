/**
 * Mock Stats Fixtures
 *
 * Factory functions for creating mock batting/pitching leaders and team stats.
 */

import type { BattingLeaderEntry, PitchingLeaderEntry, TeamAggregateStats } from '@lib/stats/leaders';

export function createMockBattingLeader(
  overrides?: Partial<BattingLeaderEntry>,
): BattingLeaderEntry {
  return {
    playerId: 'p-1',
    teamId: 'al-e1',
    leagueDivision: 'AL',
    stats: {
      G: 150, AB: 580, R: 90, H: 175, doubles: 30, triples: 5, HR: 25,
      RBI: 85, SB: 20, CS: 5, BB: 60, SO: 100, IBB: 3, HBP: 5,
      SH: 2, SF: 4, GIDP: 10, BA: 0.302, OBP: 0.370, SLG: 0.510, OPS: 0.880,
    },
    ...overrides,
  };
}

export function createMockBattingLeaders(): BattingLeaderEntry[] {
  return [
    createMockBattingLeader({ playerId: 'p-1', teamId: 'al-e1', stats: { G: 155, AB: 600, R: 100, H: 200, doubles: 35, triples: 8, HR: 40, RBI: 120, SB: 30, CS: 5, BB: 80, SO: 90, IBB: 10, HBP: 5, SH: 0, SF: 6, GIDP: 8, BA: 0.333, OBP: 0.415, SLG: 0.620, OPS: 1.035 } }),
    createMockBattingLeader({ playerId: 'p-2', teamId: 'al-e2', stats: { G: 150, AB: 580, R: 90, H: 190, doubles: 32, triples: 3, HR: 35, RBI: 105, SB: 15, CS: 8, BB: 65, SO: 110, IBB: 5, HBP: 3, SH: 1, SF: 5, GIDP: 12, BA: 0.328, OBP: 0.395, SLG: 0.580, OPS: 0.975 } }),
    createMockBattingLeader({ playerId: 'p-3', teamId: 'nl-e1', leagueDivision: 'NL', stats: { G: 148, AB: 560, R: 85, H: 180, doubles: 28, triples: 2, HR: 30, RBI: 95, SB: 10, CS: 4, BB: 55, SO: 120, IBB: 4, HBP: 8, SH: 3, SF: 4, GIDP: 9, BA: 0.321, OBP: 0.390, SLG: 0.540, OPS: 0.930 } }),
  ];
}

export function createMockPitchingLeader(
  overrides?: Partial<PitchingLeaderEntry>,
): PitchingLeaderEntry {
  return {
    playerId: 'pp-1',
    teamId: 'al-e1',
    leagueDivision: 'AL',
    stats: {
      G: 33, GS: 33, W: 18, L: 6, SV: 0, IP: 220.1, H: 180, R: 70,
      ER: 60, HR: 15, BB: 45, SO: 210, HBP: 5, BF: 880, WP: 3, BK: 0,
      CG: 4, SHO: 2, HLD: 0, BS: 0, ERA: 2.45, WHIP: 1.02, FIP: 2.80,
    },
    ...overrides,
  };
}

export function createMockPitchingLeaders(): PitchingLeaderEntry[] {
  return [
    createMockPitchingLeader({ playerId: 'pp-1', teamId: 'nl-e1', leagueDivision: 'NL', stats: { G: 35, GS: 35, W: 20, L: 4, SV: 0, IP: 240.2, H: 170, R: 55, ER: 48, HR: 10, BB: 35, SO: 250, HBP: 3, BF: 920, WP: 2, BK: 0, CG: 6, SHO: 3, HLD: 0, BS: 0, ERA: 1.80, WHIP: 0.85, FIP: 1.60 } }),
    createMockPitchingLeader({ playerId: 'pp-2', teamId: 'al-e1', stats: { G: 33, GS: 33, W: 18, L: 6, SV: 0, IP: 220.1, H: 180, R: 70, ER: 60, HR: 15, BB: 45, SO: 210, HBP: 5, BF: 880, WP: 3, BK: 0, CG: 4, SHO: 2, HLD: 0, BS: 0, ERA: 2.45, WHIP: 1.02, FIP: 2.80 } }),
    createMockPitchingLeader({ playerId: 'pp-3', teamId: 'al-w1', stats: { G: 32, GS: 32, W: 15, L: 8, SV: 0, IP: 210.0, H: 190, R: 80, ER: 72, HR: 18, BB: 50, SO: 195, HBP: 4, BF: 870, WP: 5, BK: 1, CG: 2, SHO: 1, HLD: 0, BS: 0, ERA: 3.09, WHIP: 1.14, FIP: 3.25 } }),
  ];
}

export function createMockTeamStats(): TeamAggregateStats[] {
  return [
    {
      teamId: 'al-e1',
      runsScored: 800,
      runsAllowed: 650,
      runDifferential: 150,
      totalHR: 200,
      totalSB: 100,
      totalErrors: 80,
      teamBA: 0.270,
      teamOBP: 0.345,
      teamSLG: 0.440,
      teamERA: 3.20,
      pythagoreanWinPct: 0.590,
    },
    {
      teamId: 'nl-e1',
      runsScored: 750,
      runsAllowed: 600,
      runDifferential: 150,
      totalHR: 180,
      totalSB: 120,
      totalErrors: 70,
      teamBA: 0.265,
      teamOBP: 0.340,
      teamSLG: 0.430,
      teamERA: 2.95,
      pythagoreanWinPct: 0.600,
    },
  ];
}
