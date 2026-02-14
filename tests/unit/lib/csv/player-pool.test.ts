import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildPlayerPool,
  computeLeagueAverages,
  qualifiesAsBatter,
  qualifiesAsPitcher,
} from '@lib/csv/player-pool';
import { loadPeople } from '@lib/csv/people-loader';
import { loadBatting } from '@lib/csv/batting-loader';
import { loadPitching } from '@lib/csv/pitching-loader';
import { loadFielding } from '@lib/csv/fielding-loader';
import type { BattingSeasonRecord, PitchingSeasonRecord } from '@lib/csv/csv-types';
import type { BattingStats, PitchingStats } from '@lib/types';

const fixtureDir = resolve(__dirname, '../../../fixtures/mini-lahman');
const peopleCsv = readFileSync(resolve(fixtureDir, 'People.csv'), 'utf-8');
const battingCsv = readFileSync(resolve(fixtureDir, 'Batting.csv'), 'utf-8');
const pitchingCsv = readFileSync(resolve(fixtureDir, 'Pitching.csv'), 'utf-8');
const fieldingCsv = readFileSync(resolve(fixtureDir, 'Fielding.csv'), 'utf-8');

function makeBattingStats(overrides: Partial<BattingStats> = {}): BattingStats {
  return {
    G: 0, AB: 0, R: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0,
    SB: 0, CS: 0, BB: 0, SO: 0, IBB: 0, HBP: 0, SH: 0, SF: 0, GIDP: 0,
    BA: 0, OBP: 0, SLG: 0, OPS: 0,
    ...overrides,
  };
}

function makePitchingStats(overrides: Partial<PitchingStats> = {}): PitchingStats {
  return {
    G: 0, GS: 0, W: 0, L: 0, SV: 0, IP: 0, H: 0, R: 0, ER: 0, HR: 0,
    BB: 0, SO: 0, HBP: 0, BF: 0, WP: 0, BK: 0, CG: 0, SHO: 0, HLD: 0, BS: 0,
    ERA: 0, WHIP: 0, FIP: 0,
    ...overrides,
  };
}

describe('qualifiesAsBatter', () => {
  it('returns true for AB >= 200', () => {
    const record: BattingSeasonRecord = {
      playerID: 'test01', yearID: 1971, teamIDs: ['TEA'], lgID: 'AL',
      stats: makeBattingStats({ AB: 200 }),
    };
    expect(qualifiesAsBatter(record)).toBe(true);
  });

  it('returns false for AB < 200', () => {
    const record: BattingSeasonRecord = {
      playerID: 'test01', yearID: 1971, teamIDs: ['TEA'], lgID: 'AL',
      stats: makeBattingStats({ AB: 199 }),
    };
    expect(qualifiesAsBatter(record)).toBe(false);
  });

  it('returns false for AB = 0', () => {
    const record: BattingSeasonRecord = {
      playerID: 'test01', yearID: 1971, teamIDs: ['TEA'], lgID: 'AL',
      stats: makeBattingStats({ AB: 0 }),
    };
    expect(qualifiesAsBatter(record)).toBe(false);
  });
});

describe('qualifiesAsPitcher', () => {
  it('returns true for IP >= 50', () => {
    const record: PitchingSeasonRecord = {
      playerID: 'test01', yearID: 1971, teamIDs: ['TEA'], lgID: 'AL',
      stats: makePitchingStats({ IP: 50 }),
    };
    expect(qualifiesAsPitcher(record)).toBe(true);
  });

  it('returns false for IP < 50 (49.2 in baseball notation = 49.667 decimal)', () => {
    // IP 49.2 in baseball notation = 49 + 2/3 = 49.667 true IP
    // But we check the stored IP field which uses baseball notation
    // 49.2 >= 50 is false
    const record: PitchingSeasonRecord = {
      playerID: 'test01', yearID: 1971, teamIDs: ['TEA'], lgID: 'AL',
      stats: makePitchingStats({ IP: 49.2 }),
    };
    expect(qualifiesAsPitcher(record)).toBe(false);
  });

  it('returns false for IP = 0', () => {
    const record: PitchingSeasonRecord = {
      playerID: 'test01', yearID: 1971, teamIDs: ['TEA'], lgID: 'AL',
      stats: makePitchingStats({ IP: 0 }),
    };
    expect(qualifiesAsPitcher(record)).toBe(false);
  });
});

describe('buildPlayerPool (mini-lahman)', () => {
  const people = loadPeople(peopleCsv).data;
  const batting = loadBatting(battingCsv).data;
  const pitching = loadPitching(pitchingCsv).data;
  const fielding = loadFielding(fieldingCsv).data;
  const yearRange = { start: 1971, end: 1971 };

  it('returns a non-empty pool', () => {
    const result = buildPlayerPool(people, batting, pitching, fielding, yearRange);

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it('only includes qualifying player-seasons', () => {
    const result = buildPlayerPool(people, batting, pitching, fielding, yearRange);

    for (const entry of result.data) {
      expect(entry.qualifiesAsBatter || entry.qualifiesAsPitcher).toBe(true);
    }
  });

  it('excludes players below both thresholds', () => {
    const result = buildPlayerPool(people, batting, pitching, fielding, yearRange);

    // Players with < 200 AB and no pitching should be excluded
    // (unless they have >= 50 IP)
    for (const entry of result.data) {
      if (entry.battingStats) {
        const hasBatQual = entry.battingStats.AB >= 200;
        const hasPitchQual = entry.pitchingStats !== null && entry.pitchingStats.IP >= 50;
        expect(hasBatQual || hasPitchQual).toBe(true);
      }
    }
  });

  it('includes batting stats for qualifying batters', () => {
    const result = buildPlayerPool(people, batting, pitching, fielding, yearRange);
    // Sandy Alomar: 689 AB, should qualify
    const alomar = result.data.find((e) => e.playerID === 'alomasa01');

    expect(alomar).toBeDefined();
    expect(alomar!.qualifiesAsBatter).toBe(true);
    expect(alomar!.battingStats).not.toBeNull();
    expect(alomar!.battingStats!.AB).toBe(689);
  });

  it('includes pitching stats for qualifying pitchers', () => {
    const result = buildPlayerPool(people, batting, pitching, fielding, yearRange);
    const blue = result.data.find((e) => e.playerID === 'bluevi01');

    expect(blue).toBeDefined();
    expect(blue!.qualifiesAsPitcher).toBe(true);
    expect(blue!.pitchingStats).not.toBeNull();
    expect(blue!.pitchingStats!.W).toBe(24);
  });

  it('includes fielding records', () => {
    const result = buildPlayerPool(people, batting, pitching, fielding, yearRange);
    const alomar = result.data.find((e) => e.playerID === 'alomasa01');

    expect(alomar).toBeDefined();
    expect(alomar!.fieldingRecords.length).toBeGreaterThanOrEqual(2);
  });

  it('populates player identity from People data', () => {
    const result = buildPlayerPool(people, batting, pitching, fielding, yearRange);
    const blue = result.data.find((e) => e.playerID === 'bluevi01');

    expect(blue).toBeDefined();
    expect(blue!.nameFirst).toBe('Vida');
    expect(blue!.nameLast).toBe('Blue');
    expect(blue!.throwingHand).toBe('L');
    expect(blue!.seasonYear).toBe(1971);
  });

  it('marks two-way players correctly', () => {
    const result = buildPlayerPool(people, batting, pitching, fielding, yearRange);

    // Any player who qualifies as both batter and pitcher is two-way
    for (const entry of result.data) {
      if (entry.qualifiesAsBatter && entry.qualifiesAsPitcher) {
        expect(entry.isTwoWay).toBe(true);
      }
    }
  });
});

describe('computeLeagueAverages', () => {
  const people = loadPeople(peopleCsv).data;
  const batting = loadBatting(battingCsv).data;
  const pitching = loadPitching(pitchingCsv).data;
  const fielding = loadFielding(fieldingCsv).data;
  const yearRange = { start: 1971, end: 1971 };

  it('computes reasonable batting averages', () => {
    const pool = buildPlayerPool(people, batting, pitching, fielding, yearRange).data;
    const avgs = computeLeagueAverages(pool);

    // 1971 was a pitcher-friendly era, league BA was around .245-.255
    expect(avgs.BA).toBeGreaterThan(0.200);
    expect(avgs.BA).toBeLessThan(0.350);
  });

  it('computes non-zero rate stats', () => {
    const pool = buildPlayerPool(people, batting, pitching, fielding, yearRange).data;
    const avgs = computeLeagueAverages(pool);

    expect(avgs.hrPerPA).toBeGreaterThan(0);
    expect(avgs.bbPerPA).toBeGreaterThan(0);
    expect(avgs.soPerPA).toBeGreaterThan(0);
    expect(avgs.ISO).toBeGreaterThan(0);
    expect(avgs.BABIP).toBeGreaterThan(0);
  });

  it('computes reasonable pitching averages', () => {
    const pool = buildPlayerPool(people, batting, pitching, fielding, yearRange).data;
    const avgs = computeLeagueAverages(pool);

    // ERA should be in reasonable range (2.0 - 5.0 for 1971)
    expect(avgs.ERA).toBeGreaterThan(1.0);
    expect(avgs.ERA).toBeLessThan(6.0);
    expect(avgs.k9).toBeGreaterThan(0);
    expect(avgs.bb9).toBeGreaterThan(0);
  });

  it('handles empty pool gracefully', () => {
    const avgs = computeLeagueAverages([]);

    expect(avgs.BA).toBe(0);
    expect(avgs.ERA).toBe(0);
    expect(avgs.ISO).toBe(0);
    expect(avgs.BABIP).toBe(0);
  });
});

describe('buildPlayerPool excludeLeagues filter', () => {
  // Synthetic data: 3 players across AL, NNL, and NAL leagues
  const people = new Map<string, import('@lib/csv/csv-types').PersonRecord>([
    ['playerAL01', { playerID: 'playerAL01', nameFirst: 'Al', nameLast: 'Kaline', birthYear: 1934, battingHand: 'R', throwingHand: 'R', debutYear: 1953, finalYear: 1974 }],
    ['playerNNL01', { playerID: 'playerNNL01', nameFirst: 'Josh', nameLast: 'Gibson', birthYear: 1911, battingHand: 'R', throwingHand: 'R', debutYear: 1930, finalYear: 1946 }],
    ['playerNAL01', { playerID: 'playerNAL01', nameFirst: 'Satchel', nameLast: 'Paige', birthYear: 1906, battingHand: 'R', throwingHand: 'R', debutYear: 1926, finalYear: 1965 }],
  ]);

  const batting = new Map<string, BattingSeasonRecord[]>([
    ['playerAL01', [{ playerID: 'playerAL01', yearID: 1960, teamIDs: ['DET'], lgID: 'AL', stats: makeBattingStats({ AB: 500, H: 150, HR: 20, BB: 50, SO: 40, HBP: 3, SF: 5, SH: 2, doubles: 25, triples: 5 }) }]],
    ['playerNNL01', [{ playerID: 'playerNNL01', yearID: 1940, teamIDs: ['HGR'], lgID: 'NNL', stats: makeBattingStats({ AB: 400, H: 160, HR: 35, BB: 30, SO: 20, HBP: 2, SF: 3, SH: 1, doubles: 20, triples: 3 }) }]],
  ]);

  const pitching = new Map<string, PitchingSeasonRecord[]>([
    ['playerNAL01', [{ playerID: 'playerNAL01', yearID: 1940, teamIDs: ['KCM'], lgID: 'NAL', stats: makePitchingStats({ IP: 200, W: 20, L: 5, ER: 30, SO: 180, BB: 40, H: 100, HR: 5, HBP: 3, BF: 800, GS: 30, G: 35 }) }]],
  ]);

  const fielding = new Map<string, import('@lib/csv/csv-types').FieldingSeasonRecord[]>();

  it('returns all players when no excludeLeagues is passed', () => {
    const result = buildPlayerPool(people, batting, pitching, fielding, { start: 1930, end: 1970 });
    expect(result.data).toHaveLength(3);
  });

  it('filters out NNL and NAL players when excludeLeagues contains those codes', () => {
    const exclude = new Set(['NNL', 'NN2', 'NAL', 'ECL', 'NSL', 'ANL', 'NAC']);
    const result = buildPlayerPool(people, batting, pitching, fielding, { start: 1930, end: 1970 }, exclude);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].playerID).toBe('playerAL01');
  });

  it('keeps AL/NL players when excluding Negro League codes', () => {
    const exclude = new Set(['NNL']);
    const result = buildPlayerPool(people, batting, pitching, fielding, { start: 1930, end: 1970 }, exclude);
    // Should exclude NNL player (Gibson) but keep AL (Kaline) and NAL (Paige)
    expect(result.data).toHaveLength(2);
    const ids = result.data.map((e) => e.playerID);
    expect(ids).toContain('playerAL01');
    expect(ids).toContain('playerNAL01');
    expect(ids).not.toContain('playerNNL01');
  });

  it('returns empty pool when all players are excluded', () => {
    const exclude = new Set(['AL', 'NNL', 'NAL']);
    const result = buildPlayerPool(people, batting, pitching, fielding, { start: 1930, end: 1970 }, exclude);
    expect(result.data).toHaveLength(0);
  });
});
