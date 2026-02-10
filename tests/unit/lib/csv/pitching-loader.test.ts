import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  loadPitching,
  transformPitchingRow,
  aggregatePitchingStints,
  ipoutsToIP,
  computePitchingDerived,
} from '@lib/csv/pitching-loader';
import type { RawPitchingRow } from '@lib/csv/csv-types';

const miniPitchingCsv = readFileSync(
  resolve(__dirname, '../../../fixtures/mini-lahman/Pitching.csv'),
  'utf-8',
);

describe('ipoutsToIP', () => {
  it('converts full innings correctly (477 -> 159.0)', () => {
    expect(ipoutsToIP(477)).toBe(159);
  });

  it('converts 1 extra out to .1 (478 -> 159.1)', () => {
    expect(ipoutsToIP(478)).toBeCloseTo(159.1, 5);
  });

  it('converts 2 extra outs to .2 (479 -> 159.2)', () => {
    expect(ipoutsToIP(479)).toBeCloseTo(159.2, 5);
  });

  it('handles 0', () => {
    expect(ipoutsToIP(0)).toBe(0);
  });

  it('handles 1 out', () => {
    expect(ipoutsToIP(1)).toBeCloseTo(0.1, 5);
  });

  it('handles 2 outs', () => {
    expect(ipoutsToIP(2)).toBeCloseTo(0.2, 5);
  });

  it('handles 3 outs (1 full inning)', () => {
    expect(ipoutsToIP(3)).toBe(1);
  });

  // Vida Blue 1971: 936 IPouts = 312 innings exactly
  it('handles Vida Blue 1971 (936 IPouts -> 312.0)', () => {
    expect(ipoutsToIP(936)).toBe(312);
  });
});

describe('computePitchingDerived', () => {
  it('computes ERA = 9 * ER / IP', () => {
    // Vida Blue 1971: 63 ER, 936 IPouts -> 312 IP -> ERA = 9*63/312 = 1.817
    const d = computePitchingDerived({ ER: 63, ipouts: 936, H: 209, BB: 88, HR: 14, HBP: 3, SO: 301 });
    expect(d.ERA).toBeCloseTo(1.817, 2);
  });

  it('computes WHIP = (H + BB) / IP', () => {
    // Vida Blue: (209 + 88) / 312 = 0.952
    const d = computePitchingDerived({ ER: 63, ipouts: 936, H: 209, BB: 88, HR: 14, HBP: 3, SO: 301 });
    expect(d.WHIP).toBeCloseTo(0.952, 2);
  });

  it('computes FIP = ((13*HR) + (3*(BB+HBP)) - (2*SO)) / IP + 3.15', () => {
    // Vida Blue: ((13*14) + (3*(88+3)) - (2*301)) / 312 + 3.15
    // = (182 + 273 - 602) / 312 + 3.15 = -147/312 + 3.15 = -0.4712 + 3.15 = 2.679
    const d = computePitchingDerived({ ER: 63, ipouts: 936, H: 209, BB: 88, HR: 14, HBP: 3, SO: 301 });
    expect(d.FIP).toBeCloseTo((182 + 273 - 602) / 312 + 3.15, 2);
  });

  it('caps ERA at 99.99 when IP is 0', () => {
    const d = computePitchingDerived({ ER: 5, ipouts: 0, H: 3, BB: 2, HR: 1, HBP: 0, SO: 0 });
    expect(d.ERA).toBe(99.99);
  });

  it('caps WHIP at 99.99 when IP is 0', () => {
    const d = computePitchingDerived({ ER: 0, ipouts: 0, H: 3, BB: 2, HR: 0, HBP: 0, SO: 0 });
    expect(d.WHIP).toBe(99.99);
  });

  it('caps FIP at 99.99 when IP is 0', () => {
    const d = computePitchingDerived({ ER: 0, ipouts: 0, H: 3, BB: 2, HR: 1, HBP: 0, SO: 5 });
    expect(d.FIP).toBe(99.99);
  });

  it('returns 0 ERA when ER is 0 and IP > 0', () => {
    const d = computePitchingDerived({ ER: 0, ipouts: 27, H: 5, BB: 2, HR: 0, HBP: 0, SO: 9 });
    expect(d.ERA).toBe(0);
  });
});

describe('transformPitchingRow', () => {
  it('transforms a valid raw row to numeric values', () => {
    const raw: RawPitchingRow = {
      playerID: 'bluevi01', yearID: '1971', stint: '1', teamID: 'OAK',
      lgID: 'AL', W: '24', L: '8', G: '39', GS: '39',
      CG: '24', SHO: '8', SV: '0', IPouts: '936',
      H: '209', ER: '63', HR: '19', BB: '88', SO: '301',
      BAOpp: '0.189', ERA: '1.82',
      IBB: '3', WP: '10', HBP: '4', BK: '1',
      BFP: '1207', GF: '0', R: '73',
      SH: '9', SF: '3', GIDP: '',
    };
    const result = transformPitchingRow(raw);

    expect(result).not.toBeNull();
    expect(result!.playerID).toBe('bluevi01');
    expect(result!.W).toBe(24);
    expect(result!.ipouts).toBe(936);
    expect(result!.SO).toBe(301);
    expect(result!.BF).toBe(1207); // BFP -> BF
    expect(result!.GIDP).toBe(0); // empty -> 0
  });

  it('returns null for missing playerID', () => {
    const raw: RawPitchingRow = {
      playerID: '', yearID: '1971', stint: '1', teamID: 'TEA',
      lgID: 'AL', W: '0', L: '0', G: '1', GS: '0',
      CG: '0', SHO: '0', SV: '0', IPouts: '3',
      H: '0', ER: '0', HR: '0', BB: '0', SO: '0',
      BAOpp: '', ERA: '',
      IBB: '0', WP: '0', HBP: '0', BK: '0',
      BFP: '3', GF: '0', R: '0',
      SH: '0', SF: '0', GIDP: '0',
    };
    expect(transformPitchingRow(raw)).toBeNull();
  });
});

describe('aggregatePitchingStints', () => {
  it('sums counting stats and IPouts from multiple stints', () => {
    // Dave Boswell 1971: 2 stints (DET: 13 IPouts, BAL: 74 IPouts)
    const stints = [
      {
        playerID: 'bosweda01', yearID: 1971, teamID: 'DET', lgID: 'AL',
        W: 0, L: 0, G: 3, GS: 0, CG: 0, SHO: 0, SV: 0,
        ipouts: 13, H: 3, R: 3, ER: 3, HR: 0, BB: 6, SO: 3,
        HBP: 0, BF: 22, WP: 0, BK: 0, IBB: 0, GF: 1,
        SH: 0, SF: 1, GIDP: 0,
      },
      {
        playerID: 'bosweda01', yearID: 1971, teamID: 'BAL', lgID: 'AL',
        W: 1, L: 2, G: 15, GS: 1, CG: 0, SHO: 0, SV: 0,
        ipouts: 74, H: 32, R: 16, ER: 12, HR: 4, BB: 15, SO: 14,
        HBP: 0, BF: 121, WP: 1, BK: 0, IBB: 1, GF: 6,
        SH: 0, SF: 1, GIDP: 0,
      },
    ];
    const result = aggregatePitchingStints(stints);

    expect(result.playerID).toBe('bosweda01');
    expect(result.teamIDs).toEqual(['DET', 'BAL']);
    expect(result.stats.G).toBe(18);
    expect(result.stats.W).toBe(1);
    expect(result.stats.L).toBe(2);
    // IP should be computed from total IPouts (13+74=87), not summed IP
    // 87 / 3 = 29.0 innings
    expect(result.stats.IP).toBe(29);
    expect(result.stats.BF).toBe(143);
    expect(result.stats.HLD).toBe(0); // not in CSV, defaults to 0
    expect(result.stats.BS).toBe(0);  // not in CSV, defaults to 0
  });

  it('computes derived stats from aggregated IPouts', () => {
    const stints = [
      {
        playerID: 'test01', yearID: 1971, teamID: 'TEA', lgID: 'AL',
        W: 10, L: 5, G: 25, GS: 25, CG: 5, SHO: 2, SV: 0,
        ipouts: 450, H: 140, R: 60, ER: 50, HR: 12, BB: 45, SO: 120,
        HBP: 3, BF: 620, WP: 5, BK: 0, IBB: 2, GF: 0,
        SH: 5, SF: 3, GIDP: 10,
      },
    ];
    const result = aggregatePitchingStints(stints);

    // IP = 450 / 3 = 150.0
    expect(result.stats.IP).toBe(150);
    // ERA = 9 * 50 / 150 = 3.00
    expect(result.stats.ERA).toBeCloseTo(3.0, 2);
    // WHIP = (140 + 45) / 150 = 1.233
    expect(result.stats.WHIP).toBeCloseTo(1.233, 2);
  });
});

describe('loadPitching (mini-lahman)', () => {
  it('loads all pitchers from fixture', () => {
    const result = loadPitching(miniPitchingCsv);

    // 17 rows in pitching CSV, but some are multi-stint
    expect(result.data.size).toBeGreaterThan(5);
    expect(result.rowsProcessed).toBe(17);
    expect(result.errors).toHaveLength(0);
  });

  it('aggregates multi-stint pitcher (bosweda01: 2 stints)', () => {
    const result = loadPitching(miniPitchingCsv);
    const boswell = result.data.get('bosweda01');

    expect(boswell).toBeDefined();
    expect(boswell).toHaveLength(1);
    expect(boswell![0].teamIDs).toContain('DET');
    expect(boswell![0].teamIDs).toContain('BAL');
    expect(boswell![0].stats.G).toBe(18); // 3 + 15
  });

  it('loads Vida Blue with correct stats', () => {
    const result = loadPitching(miniPitchingCsv);
    const blue = result.data.get('bluevi01');

    expect(blue).toBeDefined();
    expect(blue).toHaveLength(1);
    expect(blue![0].stats.W).toBe(24);
    expect(blue![0].stats.SO).toBe(301);
    expect(blue![0].stats.IP).toBe(312); // 936 / 3
    expect(blue![0].stats.ERA).toBeCloseTo(1.82, 1);
  });

  it('applies year range filter', () => {
    const result = loadPitching(miniPitchingCsv, { start: 1970, end: 1970 });
    expect(result.data.size).toBe(0);
  });
});
