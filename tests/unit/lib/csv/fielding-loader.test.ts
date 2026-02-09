import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  loadFielding,
  transformFieldingRow,
  mapFieldingPosition,
} from '@lib/csv/fielding-loader';
import type { RawFieldingRow } from '@lib/csv/csv-types';

const miniFieldingCsv = readFileSync(
  resolve(__dirname, '../../../fixtures/mini-lahman/Fielding.csv'),
  'utf-8',
);

describe('mapFieldingPosition', () => {
  it('maps standard positions through unchanged', () => {
    expect(mapFieldingPosition('C')).toBe('C');
    expect(mapFieldingPosition('1B')).toBe('1B');
    expect(mapFieldingPosition('2B')).toBe('2B');
    expect(mapFieldingPosition('3B')).toBe('3B');
    expect(mapFieldingPosition('SS')).toBe('SS');
  });

  it('maps OF to RF as default outfield primary', () => {
    expect(mapFieldingPosition('OF')).toBe('RF');
  });

  it('maps P to SP', () => {
    expect(mapFieldingPosition('P')).toBe('SP');
  });

  it('returns null for PH (not a real fielding position)', () => {
    expect(mapFieldingPosition('PH')).toBeNull();
  });

  it('returns null for PR (not a real fielding position)', () => {
    expect(mapFieldingPosition('PR')).toBeNull();
  });

  it('maps DH to DH', () => {
    expect(mapFieldingPosition('DH')).toBe('DH');
  });
});

describe('transformFieldingRow', () => {
  it('transforms a valid raw row', () => {
    const raw: RawFieldingRow = {
      playerID: 'alomasa01', yearID: '1971', stint: '1', teamID: 'CAL',
      lgID: 'AL', POS: '2B', G: '137', GS: '134',
      InnOuts: '3681', PO: '350', A: '432', E: '9', DP: '100',
      PB: '', WP: '', SB: '', CS: '', ZR: '',
    };
    const result = transformFieldingRow(raw);

    expect(result).not.toBeNull();
    expect(result!.playerID).toBe('alomasa01');
    expect(result!.yearID).toBe(1971);
    expect(result!.position).toBe('2B');
    expect(result!.G).toBe(137);
    expect(result!.PO).toBe(350);
    expect(result!.A).toBe(432);
    expect(result!.E).toBe(9);
  });

  it('returns null for PH position', () => {
    const raw: RawFieldingRow = {
      playerID: 'test01', yearID: '1971', stint: '1', teamID: 'TEA',
      lgID: 'AL', POS: 'PH', G: '5', GS: '0',
      InnOuts: '0', PO: '0', A: '0', E: '0', DP: '0',
      PB: '', WP: '', SB: '', CS: '', ZR: '',
    };
    expect(transformFieldingRow(raw)).toBeNull();
  });

  it('returns null for PR position', () => {
    const raw: RawFieldingRow = {
      playerID: 'test01', yearID: '1971', stint: '1', teamID: 'TEA',
      lgID: 'AL', POS: 'PR', G: '3', GS: '0',
      InnOuts: '0', PO: '0', A: '0', E: '0', DP: '0',
      PB: '', WP: '', SB: '', CS: '', ZR: '',
    };
    expect(transformFieldingRow(raw)).toBeNull();
  });

  it('returns null for missing playerID', () => {
    const raw: RawFieldingRow = {
      playerID: '', yearID: '1971', stint: '1', teamID: 'TEA',
      lgID: 'AL', POS: 'SS', G: '10', GS: '10',
      InnOuts: '270', PO: '20', A: '30', E: '2', DP: '5',
      PB: '', WP: '', SB: '', CS: '', ZR: '',
    };
    expect(transformFieldingRow(raw)).toBeNull();
  });

  it('maps OF position to RF', () => {
    const raw: RawFieldingRow = {
      playerID: 'test01', yearID: '1971', stint: '1', teamID: 'TEA',
      lgID: 'AL', POS: 'OF', G: '100', GS: '90',
      InnOuts: '2700', PO: '200', A: '5', E: '3', DP: '1',
      PB: '', WP: '', SB: '', CS: '', ZR: '',
    };
    const result = transformFieldingRow(raw);
    expect(result!.position).toBe('RF');
  });
});

describe('loadFielding (mini-lahman)', () => {
  it('loads fielding records from fixture', () => {
    const result = loadFielding(miniFieldingCsv);

    // 75 rows, but some may be PH/PR (skipped)
    expect(result.data.size).toBeGreaterThan(30);
    expect(result.rowsProcessed).toBe(75);
    expect(result.errors).toHaveLength(0);
  });

  it('player with multiple positions has multiple records', () => {
    const result = loadFielding(miniFieldingCsv);
    // Sandy Alomar played 2B and SS in 1971
    const alomar = result.data.get('alomasa01');

    expect(alomar).toBeDefined();
    expect(alomar!.length).toBeGreaterThanOrEqual(2);
    const positions = alomar!.map((r) => r.position);
    expect(positions).toContain('2B');
    expect(positions).toContain('SS');
  });

  it('filters out PH and PR rows', () => {
    const result = loadFielding(miniFieldingCsv);

    // No record should have PH or PR position
    for (const [, records] of result.data) {
      for (const record of records) {
        expect(record.position).not.toBe('PH');
        expect(record.position).not.toBe('PR');
      }
    }
  });

  it('applies year range filter', () => {
    const result = loadFielding(miniFieldingCsv, { start: 1970, end: 1970 });
    expect(result.data.size).toBe(0);
  });

  it('aggregates same-position stints', () => {
    const result = loadFielding(miniFieldingCsv);
    // Felipe Alou: stint 1 (OAK, OF) + stint 2 (NYA, 1B + OF)
    const alou = result.data.get('aloufe01');

    expect(alou).toBeDefined();
    // Should have records for distinct positions (1B and RF after OF->RF mapping)
    const positions = alou!.map((r) => r.position);
    expect(positions).toContain('1B');
    expect(positions).toContain('RF');
  });
});
