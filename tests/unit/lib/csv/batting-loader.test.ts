import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  loadBatting,
  transformBattingRow,
  aggregateBattingStints,
  computeBattingDerived,
} from '@lib/csv/batting-loader';
import type { RawBattingRow } from '@lib/csv/csv-types';

const miniBattingCsv = readFileSync(
  resolve(__dirname, '../../../fixtures/mini-lahman/Batting.csv'),
  'utf-8',
);

describe('computeBattingDerived', () => {
  it('computes BA = H / AB', () => {
    const d = computeBattingDerived({
      AB: 500, H: 150, BB: 50, HBP: 5, SF: 3,
      doubles: 30, triples: 5, HR: 20,
    });
    expect(d.BA).toBeCloseTo(0.300, 3);
  });

  it('computes OBP correctly', () => {
    // OBP = (H + BB + HBP) / (AB + BB + HBP + SF)
    const d = computeBattingDerived({
      AB: 500, H: 150, BB: 50, HBP: 5, SF: 3,
      doubles: 30, triples: 5, HR: 20,
    });
    const expectedOBP = (150 + 50 + 5) / (500 + 50 + 5 + 3);
    expect(d.OBP).toBeCloseTo(expectedOBP, 3);
  });

  it('computes SLG correctly', () => {
    // SLG = TB / AB, TB = H + 2B + 2*3B + 3*HR (since singles=H-2B-3B-HR contribute 1 base already in H)
    // Actually: TB = (H - 2B - 3B - HR) + 2*2B + 3*3B + 4*HR = H + 2B + 2*3B + 3*HR
    const d = computeBattingDerived({
      AB: 500, H: 150, BB: 50, HBP: 5, SF: 3,
      doubles: 30, triples: 5, HR: 20,
    });
    const tb = 150 + 30 + 2 * 5 + 3 * 20;
    expect(d.SLG).toBeCloseTo(tb / 500, 3);
  });

  it('computes OPS = OBP + SLG', () => {
    const d = computeBattingDerived({
      AB: 500, H: 150, BB: 50, HBP: 5, SF: 3,
      doubles: 30, triples: 5, HR: 20,
    });
    expect(d.OPS).toBeCloseTo(d.OBP + d.SLG, 3);
  });

  it('returns 0 for all when AB is 0', () => {
    const d = computeBattingDerived({
      AB: 0, H: 0, BB: 0, HBP: 0, SF: 0,
      doubles: 0, triples: 0, HR: 0,
    });
    expect(d.BA).toBe(0);
    expect(d.OBP).toBe(0);
    expect(d.SLG).toBe(0);
    expect(d.OPS).toBe(0);
  });
});

describe('transformBattingRow', () => {
  it('transforms a valid raw row to numeric values', () => {
    const raw: RawBattingRow = {
      playerID: 'ruthba01', yearID: '1927', stint: '1', teamID: 'NYA',
      lgID: 'AL', G: '151', AB: '540', R: '158', H: '192',
      '2B': '29', '3B': '8', HR: '60', RBI: '164',
      SB: '7', CS: '6', BB: '137', SO: '89',
      IBB: '', HBP: '0', SH: '0', SF: '', GIDP: '5',
    };
    const result = transformBattingRow(raw);

    expect(result).not.toBeNull();
    expect(result!.playerID).toBe('ruthba01');
    expect(result!.yearID).toBe(1927);
    expect(result!.HR).toBe(60);
    expect(result!.doubles).toBe(29);
    expect(result!.triples).toBe(8);
    expect(result!.IBB).toBe(0); // empty -> 0
    expect(result!.SF).toBe(0); // empty -> 0
  });

  it('returns null for missing playerID', () => {
    const raw: RawBattingRow = {
      playerID: '', yearID: '1971', stint: '1', teamID: 'NYA',
      lgID: 'AL', G: '10', AB: '30', R: '5', H: '10',
      '2B': '2', '3B': '0', HR: '1', RBI: '5',
      SB: '0', CS: '0', BB: '3', SO: '5',
      IBB: '0', HBP: '0', SH: '0', SF: '0', GIDP: '0',
    };
    expect(transformBattingRow(raw)).toBeNull();
  });
});

describe('aggregateBattingStints', () => {
  it('sums counting stats from multiple stints', () => {
    const stints = [
      {
        playerID: 'aloufe01', yearID: 1971, teamID: 'OAK', lgID: 'AL',
        G: 2, AB: 8, R: 0, H: 2, doubles: 1, triples: 0, HR: 0, RBI: 0,
        SB: 0, CS: 0, BB: 0, SO: 1, IBB: 0, HBP: 0, SH: 1, SF: 0, GIDP: 0,
      },
      {
        playerID: 'aloufe01', yearID: 1971, teamID: 'NYA', lgID: 'AL',
        G: 131, AB: 461, R: 52, H: 133, doubles: 20, triples: 6, HR: 8, RBI: 69,
        SB: 5, CS: 5, BB: 32, SO: 24, IBB: 3, HBP: 2, SH: 1, SF: 5, GIDP: 15,
      },
    ];
    const result = aggregateBattingStints(stints);

    expect(result.playerID).toBe('aloufe01');
    expect(result.yearID).toBe(1971);
    expect(result.teamIDs).toEqual(['OAK', 'NYA']);
    expect(result.stats.G).toBe(133);
    expect(result.stats.AB).toBe(469);
    expect(result.stats.H).toBe(135);
    expect(result.stats.HR).toBe(8);
    expect(result.stats.doubles).toBe(21);
    expect(result.stats.triples).toBe(6);
  });

  it('computes derived stats from aggregated totals', () => {
    const stints = [
      {
        playerID: 'test01', yearID: 1971, teamID: 'TEA', lgID: 'AL',
        G: 100, AB: 400, R: 60, H: 120, doubles: 20, triples: 5, HR: 15, RBI: 60,
        SB: 10, CS: 5, BB: 40, HBP: 3, SH: 2, SF: 4, SO: 80, IBB: 5, GIDP: 10,
      },
    ];
    const result = aggregateBattingStints(stints);

    expect(result.stats.BA).toBeCloseTo(0.300, 3);
    const expectedOBP = (120 + 40 + 3) / (400 + 40 + 3 + 4);
    expect(result.stats.OBP).toBeCloseTo(expectedOBP, 3);
  });
});

describe('loadBatting (mini-lahman)', () => {
  it('loads all players from fixture', () => {
    const result = loadBatting(miniBattingCsv);

    expect(result.data.size).toBeGreaterThan(40);
    expect(result.rowsProcessed).toBe(56);
    expect(result.errors).toHaveLength(0);
  });

  it('aggregates multi-stint player (Felipe Alou: 2 stints)', () => {
    const result = loadBatting(miniBattingCsv);
    const alou = result.data.get('aloufe01');

    expect(alou).toBeDefined();
    expect(alou).toHaveLength(1); // 1 season record (aggregated)
    expect(alou![0].teamIDs).toContain('OAK');
    expect(alou![0].teamIDs).toContain('NYA');
    expect(alou![0].stats.G).toBe(133); // 2 + 131
    expect(alou![0].stats.AB).toBe(469); // 8 + 461
  });

  it('applies year range filter', () => {
    const result = loadBatting(miniBattingCsv, { start: 1970, end: 1970 });

    // All fixture data is from 1971, so nothing should match 1970
    expect(result.data.size).toBe(0);
  });

  it('includes all data within year range', () => {
    const result = loadBatting(miniBattingCsv, { start: 1971, end: 1971 });

    expect(result.data.size).toBeGreaterThan(40);
  });
});
