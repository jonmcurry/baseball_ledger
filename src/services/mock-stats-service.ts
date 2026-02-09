/**
 * Mock Stats Service
 *
 * Layer 3 stub that provides hardcoded stats data for development.
 */

import type { BattingLeaderEntry, PitchingLeaderEntry, TeamAggregateStats } from '@lib/stats/leaders';

const MOCK_BATTING_LEADERS: BattingLeaderEntry[] = [
  { playerId: 'p-griffey', teamId: 'al-e1', leagueDivision: 'AL', stats: { G: 155, AB: 600, R: 100, H: 200, doubles: 35, triples: 8, HR: 40, RBI: 120, SB: 30, CS: 5, BB: 80, SO: 90, IBB: 10, HBP: 5, SH: 0, SF: 6, GIDP: 8, BA: 0.333, OBP: 0.415, SLG: 0.620, OPS: 1.035 } },
  { playerId: 'p-bonds', teamId: 'nl-w1', leagueDivision: 'NL', stats: { G: 150, AB: 550, R: 110, H: 185, doubles: 30, triples: 2, HR: 46, RBI: 130, SB: 25, CS: 6, BB: 100, SO: 80, IBB: 20, HBP: 3, SH: 0, SF: 5, GIDP: 6, BA: 0.336, OBP: 0.440, SLG: 0.680, OPS: 1.120 } },
  { playerId: 'p-thomas', teamId: 'al-e1', leagueDivision: 'AL', stats: { G: 148, AB: 570, R: 95, H: 190, doubles: 32, triples: 1, HR: 38, RBI: 115, SB: 3, CS: 2, BB: 90, SO: 85, IBB: 12, HBP: 8, SH: 0, SF: 7, GIDP: 14, BA: 0.333, OBP: 0.430, SLG: 0.610, OPS: 1.040 } },
];

const MOCK_PITCHING_LEADERS: PitchingLeaderEntry[] = [
  { playerId: 'p-maddux', teamId: 'nl-e1', leagueDivision: 'NL', stats: { G: 35, GS: 35, W: 20, L: 4, SV: 0, IP: 240.2, H: 170, R: 55, ER: 48, HR: 10, BB: 35, SO: 250, HBP: 3, BF: 920, WP: 2, BK: 0, CG: 6, SHO: 3, HLD: 0, BS: 0, ERA: 1.80, WHIP: 0.85 } },
  { playerId: 'p-johnson', teamId: 'al-w1', leagueDivision: 'AL', stats: { G: 33, GS: 33, W: 18, L: 6, SV: 0, IP: 220.1, H: 180, R: 70, ER: 60, HR: 15, BB: 45, SO: 310, HBP: 5, BF: 880, WP: 8, BK: 0, CG: 4, SHO: 2, HLD: 0, BS: 0, ERA: 2.45, WHIP: 1.02 } },
  { playerId: 'p-clemens', teamId: 'al-e2', leagueDivision: 'AL', stats: { G: 32, GS: 32, W: 17, L: 7, SV: 0, IP: 215.0, H: 175, R: 68, ER: 62, HR: 14, BB: 50, SO: 220, HBP: 4, BF: 870, WP: 3, BK: 1, CG: 3, SHO: 1, HLD: 0, BS: 0, ERA: 2.60, WHIP: 1.05 } },
];

const MOCK_TEAM_STATS: TeamAggregateStats[] = [
  { teamId: 'al-e1', runsScored: 480, runsAllowed: 380, runDifferential: 100, totalHR: 150, totalSB: 80, totalErrors: 60, teamBA: 0.272, teamOBP: 0.350, teamSLG: 0.450, teamERA: 3.10, pythagoreanWinPct: 0.601 },
  { teamId: 'nl-e1', runsScored: 510, runsAllowed: 350, runDifferential: 160, totalHR: 140, totalSB: 90, totalErrors: 55, teamBA: 0.268, teamOBP: 0.345, teamSLG: 0.435, teamERA: 2.80, pythagoreanWinPct: 0.639 },
];

export async function fetchBattingLeaders(): Promise<BattingLeaderEntry[]> {
  return [...MOCK_BATTING_LEADERS];
}

export async function fetchPitchingLeaders(): Promise<PitchingLeaderEntry[]> {
  return [...MOCK_PITCHING_LEADERS];
}

export async function fetchTeamStats(): Promise<TeamAggregateStats[]> {
  return [...MOCK_TEAM_STATS];
}
