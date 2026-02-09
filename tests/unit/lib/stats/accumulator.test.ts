/**
 * Tests for Stats Accumulator (REQ-STS-001)
 *
 * Accumulates per-game BattingLine/PitchingLine into season totals.
 */

import type { BattingLine, PitchingLine } from '@lib/types/game';
import type { BattingStats, PitchingStats } from '@lib/types/stats';
import {
  createEmptyBattingStats,
  createEmptyPitchingStats,
  accumulateBatting,
  accumulatePitching,
  accumulateGameStats,
} from '@lib/stats/accumulator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBattingLine(overrides: Partial<BattingLine> = {}): BattingLine {
  return {
    playerId: 'batter01',
    AB: 4, R: 1, H: 2, doubles: 1, triples: 0, HR: 0,
    RBI: 1, BB: 0, SO: 1, SB: 0, CS: 0, HBP: 0, SF: 0,
    ...overrides,
  };
}

function makePitchingLine(overrides: Partial<PitchingLine> = {}): PitchingLine {
  return {
    playerId: 'pitcher01',
    IP: 6.0, H: 5, R: 2, ER: 2, BB: 2, SO: 7, HR: 1, BF: 25,
    decision: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createEmptyBattingStats / createEmptyPitchingStats
// ---------------------------------------------------------------------------

describe('createEmptyBattingStats', () => {
  it('returns all zeros', () => {
    const stats = createEmptyBattingStats();
    expect(stats.G).toBe(0);
    expect(stats.AB).toBe(0);
    expect(stats.H).toBe(0);
    expect(stats.HR).toBe(0);
    expect(stats.BA).toBe(0);
    expect(stats.OPS).toBe(0);
  });
});

describe('createEmptyPitchingStats', () => {
  it('returns all zeros', () => {
    const stats = createEmptyPitchingStats();
    expect(stats.G).toBe(0);
    expect(stats.W).toBe(0);
    expect(stats.IP).toBe(0);
    expect(stats.ERA).toBe(0);
    expect(stats.WHIP).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// accumulateBatting
// ---------------------------------------------------------------------------

describe('accumulateBatting', () => {
  it('accumulates a single game line into empty stats', () => {
    const season = createEmptyBattingStats();
    const line = makeBattingLine({ AB: 4, H: 2, HR: 1, RBI: 3, BB: 1 });
    const result = accumulateBatting(season, line);
    expect(result.G).toBe(1);
    expect(result.AB).toBe(4);
    expect(result.H).toBe(2);
    expect(result.HR).toBe(1);
    expect(result.RBI).toBe(3);
    expect(result.BB).toBe(1);
  });

  it('accumulates multiple games', () => {
    let stats = createEmptyBattingStats();
    stats = accumulateBatting(stats, makeBattingLine({ AB: 4, H: 1 }));
    stats = accumulateBatting(stats, makeBattingLine({ AB: 3, H: 2 }));
    expect(stats.G).toBe(2);
    expect(stats.AB).toBe(7);
    expect(stats.H).toBe(3);
  });

  it('recomputes derived stats after accumulation', () => {
    const season = createEmptyBattingStats();
    const line = makeBattingLine({ AB: 4, H: 2, doubles: 1, triples: 0, HR: 0, BB: 1, HBP: 0, SF: 0 });
    const result = accumulateBatting(season, line);
    expect(result.BA).toBeCloseTo(2 / 4, 3);
    expect(result.OBP).toBeGreaterThan(0);
    expect(result.SLG).toBeGreaterThan(0);
  });

  it('does not mutate the input stats object', () => {
    const season = createEmptyBattingStats();
    accumulateBatting(season, makeBattingLine({ AB: 4, H: 2 }));
    expect(season.G).toBe(0);
    expect(season.AB).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// accumulatePitching
// ---------------------------------------------------------------------------

describe('accumulatePitching', () => {
  it('accumulates a single game line', () => {
    const season = createEmptyPitchingStats();
    const line = makePitchingLine({ IP: 7.0, H: 5, ER: 2, SO: 8 });
    const result = accumulatePitching(season, line, true);
    expect(result.G).toBe(1);
    expect(result.GS).toBe(1);
    expect(result.IP).toBeCloseTo(7.0, 1);
    expect(result.H).toBe(5);
    expect(result.ER).toBe(2);
    expect(result.SO).toBe(8);
  });

  it('tracks GS only for starters', () => {
    const season = createEmptyPitchingStats();
    const line = makePitchingLine();
    const asStarter = accumulatePitching(season, line, true);
    expect(asStarter.GS).toBe(1);
    const asReliever = accumulatePitching(season, line, false);
    expect(asReliever.GS).toBe(0);
  });

  it('maps W decision', () => {
    const season = createEmptyPitchingStats();
    const line = makePitchingLine({ decision: 'W' });
    const result = accumulatePitching(season, line, true);
    expect(result.W).toBe(1);
    expect(result.L).toBe(0);
  });

  it('maps L decision', () => {
    const season = createEmptyPitchingStats();
    const line = makePitchingLine({ decision: 'L' });
    const result = accumulatePitching(season, line, true);
    expect(result.L).toBe(1);
  });

  it('maps SV decision', () => {
    const season = createEmptyPitchingStats();
    const line = makePitchingLine({ decision: 'SV' });
    const result = accumulatePitching(season, line, false);
    expect(result.SV).toBe(1);
  });

  it('maps HLD decision', () => {
    const season = createEmptyPitchingStats();
    const line = makePitchingLine({ decision: 'HLD' });
    const result = accumulatePitching(season, line, false);
    expect(result.HLD).toBe(1);
  });

  it('maps BS decision', () => {
    const season = createEmptyPitchingStats();
    const line = makePitchingLine({ decision: 'BS' });
    const result = accumulatePitching(season, line, false);
    expect(result.BS).toBe(1);
  });

  it('handles null decision', () => {
    const season = createEmptyPitchingStats();
    const line = makePitchingLine({ decision: null });
    const result = accumulatePitching(season, line, false);
    expect(result.W).toBe(0);
    expect(result.L).toBe(0);
    expect(result.SV).toBe(0);
  });

  it('adds IP correctly with thirds carry', () => {
    let stats = createEmptyPitchingStats();
    stats = accumulatePitching(stats, makePitchingLine({ IP: 6.2 }), true);
    stats = accumulatePitching(stats, makePitchingLine({ IP: 5.1 }), true);
    // 6.2 + 5.1 = 12.0
    expect(stats.IP).toBeCloseTo(12.0, 1);
  });

  it('recomputes ERA after accumulation', () => {
    const season = createEmptyPitchingStats();
    const line = makePitchingLine({ IP: 9.0, ER: 3 });
    const result = accumulatePitching(season, line, true);
    expect(result.ERA).toBeCloseTo(3.00, 2);
  });

  it('does not mutate the input stats object', () => {
    const season = createEmptyPitchingStats();
    accumulatePitching(season, makePitchingLine(), true);
    expect(season.G).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// accumulateGameStats
// ---------------------------------------------------------------------------

describe('accumulateGameStats', () => {
  it('processes a full game with multiple batters and pitchers', () => {
    const batting = new Map<string, BattingStats>();
    const pitching = new Map<string, PitchingStats>();

    const battingLines: BattingLine[] = [
      makeBattingLine({ playerId: 'bat01', AB: 4, H: 2 }),
      makeBattingLine({ playerId: 'bat02', AB: 3, H: 1 }),
    ];
    const pitchingLines: PitchingLine[] = [
      makePitchingLine({ playerId: 'pit01', IP: 7.0, decision: 'W' }),
      makePitchingLine({ playerId: 'pit02', IP: 2.0, decision: 'SV' }),
    ];

    const result = accumulateGameStats(
      batting, pitching, battingLines, pitchingLines, new Set(['pit01']),
    );

    expect(result.batting.get('bat01')!.H).toBe(2);
    expect(result.batting.get('bat02')!.H).toBe(1);
    expect(result.pitching.get('pit01')!.W).toBe(1);
    expect(result.pitching.get('pit01')!.GS).toBe(1);
    expect(result.pitching.get('pit02')!.SV).toBe(1);
    expect(result.pitching.get('pit02')!.GS).toBe(0);
  });

  it('creates new entries for first-time players', () => {
    const result = accumulateGameStats(
      new Map(), new Map(),
      [makeBattingLine({ playerId: 'newbat' })],
      [makePitchingLine({ playerId: 'newpit' })],
      new Set(['newpit']),
    );
    expect(result.batting.has('newbat')).toBe(true);
    expect(result.pitching.has('newpit')).toBe(true);
  });

  it('accumulates into existing player entries', () => {
    const existing = new Map<string, BattingStats>();
    const firstLine = makeBattingLine({ playerId: 'bat01', AB: 4, H: 2 });
    existing.set('bat01', accumulateBatting(createEmptyBattingStats(), firstLine));

    const result = accumulateGameStats(
      existing, new Map(),
      [makeBattingLine({ playerId: 'bat01', AB: 3, H: 1 })],
      [], new Set(),
    );

    expect(result.batting.get('bat01')!.G).toBe(2);
    expect(result.batting.get('bat01')!.AB).toBe(7);
    expect(result.batting.get('bat01')!.H).toBe(3);
  });

  it('does not mutate original maps', () => {
    const batting = new Map<string, BattingStats>();
    const pitching = new Map<string, PitchingStats>();
    accumulateGameStats(
      batting, pitching,
      [makeBattingLine({ playerId: 'bat01' })],
      [makePitchingLine({ playerId: 'pit01' })],
      new Set(),
    );
    expect(batting.size).toBe(0);
    expect(pitching.size).toBe(0);
  });
});
