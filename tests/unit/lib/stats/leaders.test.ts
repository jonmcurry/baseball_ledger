/**
 * Tests for League Leaders (REQ-STS-003, REQ-STS-004)
 *
 * Qualification rules, ranking, and team aggregate stats.
 */

import type { BattingStats, PitchingStats } from '@lib/types/stats';
import {
  isBattingQualified,
  isPitchingQualified,
  getBattingLeaders,
  getPitchingLeaders,
  filterByLeague,
  computeTeamAggregateStats,
  type BattingLeaderEntry,
  type PitchingLeaderEntry,
} from '@lib/stats/leaders';
import { createEmptyBattingStats, createEmptyPitchingStats } from '@lib/stats/accumulator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBattingEntry(
  playerId: string,
  league: 'AL' | 'NL',
  overrides: Partial<BattingStats> = {},
): BattingLeaderEntry {
  return {
    playerId,
    teamId: `team-${playerId}`,
    leagueDivision: league,
    stats: { ...createEmptyBattingStats(), ...overrides },
  };
}

function makePitchingEntry(
  playerId: string,
  league: 'AL' | 'NL',
  overrides: Partial<PitchingStats> = {},
): PitchingLeaderEntry {
  return {
    playerId,
    teamId: `team-${playerId}`,
    leagueDivision: league,
    stats: { ...createEmptyPitchingStats(), ...overrides },
  };
}

// ---------------------------------------------------------------------------
// isBattingQualified
// ---------------------------------------------------------------------------

describe('isBattingQualified', () => {
  it('qualifies with 3.1+ PA per team game', () => {
    // 100 team games * 3.1 = 310 PA needed
    // PA = AB + BB + HBP + SF + SH
    const stats = { ...createEmptyBattingStats(), AB: 300, BB: 10, HBP: 2, SF: 1, SH: 0 };
    // PA = 313 >= 310
    expect(isBattingQualified(stats, 100)).toBe(true);
  });

  it('does not qualify below threshold', () => {
    const stats = { ...createEmptyBattingStats(), AB: 200, BB: 5 };
    // PA = 205 < 310
    expect(isBattingQualified(stats, 100)).toBe(false);
  });

  it('qualifies at exact threshold', () => {
    // 10 games * 3.1 = 31 PA
    const stats = { ...createEmptyBattingStats(), AB: 28, BB: 2, HBP: 1 };
    // PA = 31 >= 31
    expect(isBattingQualified(stats, 10)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isPitchingQualified
// ---------------------------------------------------------------------------

describe('isPitchingQualified', () => {
  it('qualifies with 1+ IP per team game', () => {
    const stats = { ...createEmptyPitchingStats(), IP: 162.0 };
    expect(isPitchingQualified(stats, 162)).toBe(true);
  });

  it('does not qualify below threshold', () => {
    const stats = { ...createEmptyPitchingStats(), IP: 100.0 };
    expect(isPitchingQualified(stats, 162)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getBattingLeaders
// ---------------------------------------------------------------------------

describe('getBattingLeaders', () => {
  const players: BattingLeaderEntry[] = [
    makeBattingEntry('p1', 'AL', { AB: 500, H: 180, HR: 35, RBI: 100, BB: 50, HBP: 3, SF: 4, BA: 0.360, OBP: 0.420, SLG: 0.600, OPS: 1.020 }),
    makeBattingEntry('p2', 'AL', { AB: 480, H: 150, HR: 20, RBI: 80, BB: 60, HBP: 2, SF: 3, BA: 0.313, OBP: 0.390, SLG: 0.480, OPS: 0.870 }),
    makeBattingEntry('p3', 'NL', { AB: 450, H: 160, HR: 45, RBI: 120, BB: 40, HBP: 5, SF: 5, BA: 0.356, OBP: 0.410, SLG: 0.650, OPS: 1.060 }),
  ];

  it('sorts HR leaders by descending HR count', () => {
    const leaders = getBattingLeaders(players, 'HR', 162, 10);
    expect(leaders[0].playerId).toBe('p3'); // 45 HR
    expect(leaders[1].playerId).toBe('p1'); // 35 HR
    expect(leaders[2].playerId).toBe('p2'); // 20 HR
  });

  it('assigns rank correctly', () => {
    const leaders = getBattingLeaders(players, 'HR', 162, 10);
    expect(leaders[0].rank).toBe(1);
    expect(leaders[1].rank).toBe(2);
    expect(leaders[2].rank).toBe(3);
  });

  it('applies qualification filter for rate stats (BA)', () => {
    const withUnqualified: BattingLeaderEntry[] = [
      ...players,
      // Unqualified: only 100 AB, not enough PA
      makeBattingEntry('p4', 'AL', { AB: 100, H: 50, BA: 0.500 }),
    ];
    const leaders = getBattingLeaders(withUnqualified, 'BA', 162, 10);
    // p4 should be excluded (PA too low for 162 games)
    expect(leaders.every((l) => l.playerId !== 'p4')).toBe(true);
  });

  it('does not apply qualification for counting stats (HR)', () => {
    const withFewAB: BattingLeaderEntry[] = [
      ...players,
      makeBattingEntry('p4', 'AL', { AB: 50, HR: 50 }),
    ];
    const leaders = getBattingLeaders(withFewAB, 'HR', 162, 10);
    expect(leaders[0].playerId).toBe('p4'); // 50 HR, even with few AB
  });

  it('respects limit parameter', () => {
    const leaders = getBattingLeaders(players, 'HR', 162, 2);
    expect(leaders).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getPitchingLeaders
// ---------------------------------------------------------------------------

describe('getPitchingLeaders', () => {
  const pitchers: PitchingLeaderEntry[] = [
    makePitchingEntry('sp1', 'AL', { IP: 200.0, W: 18, SO: 250, ER: 60, BB: 40, H: 170, ERA: 2.70, WHIP: 1.05 }),
    makePitchingEntry('sp2', 'NL', { IP: 190.0, W: 15, SO: 220, ER: 55, BB: 50, H: 160, ERA: 2.61, WHIP: 1.11 }),
    makePitchingEntry('sp3', 'AL', { IP: 180.0, W: 12, SO: 200, ER: 80, BB: 60, H: 180, ERA: 4.00, WHIP: 1.33 }),
  ];

  it('sorts ERA ascending (lower is better)', () => {
    const leaders = getPitchingLeaders(pitchers, 'ERA', 162, 10);
    expect(leaders[0].playerId).toBe('sp2'); // 2.61
    expect(leaders[1].playerId).toBe('sp1'); // 2.70
    expect(leaders[2].playerId).toBe('sp3'); // 4.00
  });

  it('sorts WHIP ascending (lower is better)', () => {
    const leaders = getPitchingLeaders(pitchers, 'WHIP', 162, 10);
    expect(leaders[0].playerId).toBe('sp1'); // 1.05
  });

  it('sorts W descending (higher is better)', () => {
    const leaders = getPitchingLeaders(pitchers, 'W', 162, 10);
    expect(leaders[0].playerId).toBe('sp1'); // 18 W
  });

  it('sorts SO descending', () => {
    const leaders = getPitchingLeaders(pitchers, 'SO', 162, 10);
    expect(leaders[0].playerId).toBe('sp1'); // 250 SO
  });

  it('applies qualification for rate stats (ERA)', () => {
    const withUnqualified = [
      ...pitchers,
      makePitchingEntry('sp4', 'AL', { IP: 50.0, ER: 5, ERA: 0.90 }),
    ];
    const leaders = getPitchingLeaders(withUnqualified, 'ERA', 162, 10);
    expect(leaders.every((l) => l.playerId !== 'sp4')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// filterByLeague
// ---------------------------------------------------------------------------

describe('filterByLeague', () => {
  const entries: BattingLeaderEntry[] = [
    makeBattingEntry('al1', 'AL'),
    makeBattingEntry('nl1', 'NL'),
    makeBattingEntry('al2', 'AL'),
  ];

  it('filters AL only', () => {
    const filtered = filterByLeague(entries, 'AL');
    expect(filtered).toHaveLength(2);
    expect(filtered.every((e) => e.leagueDivision === 'AL')).toBe(true);
  });

  it('filters NL only', () => {
    const filtered = filterByLeague(entries, 'NL');
    expect(filtered).toHaveLength(1);
  });

  it('returns all for combined', () => {
    const filtered = filterByLeague(entries, 'combined');
    expect(filtered).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// computeTeamAggregateStats
// ---------------------------------------------------------------------------

describe('computeTeamAggregateStats', () => {
  it('computes team aggregate stats', () => {
    const batters: BattingStats[] = [
      { ...createEmptyBattingStats(), AB: 300, H: 90, doubles: 20, triples: 3, HR: 15, SB: 10, BB: 30, HBP: 2, SF: 3 },
      { ...createEmptyBattingStats(), AB: 280, H: 80, doubles: 15, triples: 1, HR: 10, SB: 5, BB: 25, HBP: 1, SF: 2 },
    ];
    const pitchers: PitchingStats[] = [
      { ...createEmptyPitchingStats(), IP: 200.0, ER: 60, BB: 50, H: 170 },
    ];

    const result = computeTeamAggregateStats('team1', batters, pitchers, 700, 600, 50);
    expect(result.teamId).toBe('team1');
    expect(result.runsScored).toBe(700);
    expect(result.runsAllowed).toBe(600);
    expect(result.runDifferential).toBe(100);
    expect(result.totalHR).toBe(25);
    expect(result.totalSB).toBe(15);
    expect(result.totalErrors).toBe(50);
    expect(result.teamBA).toBeGreaterThan(0);
    expect(result.teamERA).toBeGreaterThan(0);
    expect(result.pythagoreanWinPct).toBeGreaterThan(0.5);
  });

  it('handles empty rosters', () => {
    const result = computeTeamAggregateStats('team1', [], [], 0, 0, 0);
    expect(result.teamBA).toBe(0);
    expect(result.teamERA).toBe(0);
    expect(result.pythagoreanWinPct).toBeCloseTo(0.5, 3);
  });
});
