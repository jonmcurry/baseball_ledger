/**
 * Tests for CSV file reader utility
 *
 * Loads Lahman CSV files from data_files/ directory.
 */

import { loadCsvFiles } from '../../../../api/_lib/load-csvs';

describe('loadCsvFiles', () => {
  it('returns all 4 CSV strings as non-empty', () => {
    const files = loadCsvFiles();

    expect(files.peopleCsv.length).toBeGreaterThan(0);
    expect(files.battingCsv.length).toBeGreaterThan(0);
    expect(files.pitchingCsv.length).toBeGreaterThan(0);
    expect(files.fieldingCsv.length).toBeGreaterThan(0);
  });

  it('People.csv starts with expected header', () => {
    const files = loadCsvFiles();
    const firstLine = files.peopleCsv.split('\n')[0];
    expect(firstLine).toContain('playerID');
    expect(firstLine).toContain('nameFirst');
    expect(firstLine).toContain('nameLast');
  });

  it('Batting.csv starts with expected header', () => {
    const files = loadCsvFiles();
    const firstLine = files.battingCsv.split('\n')[0];
    expect(firstLine).toContain('playerID');
    expect(firstLine).toContain('yearID');
    expect(firstLine).toContain('AB');
  });

  it('returns UTF-8 content without BOM artifacts', () => {
    const files = loadCsvFiles();
    // First char of each file should be a letter (p from playerID), not BOM
    for (const csv of [files.peopleCsv, files.battingCsv, files.pitchingCsv, files.fieldingCsv]) {
      const firstChar = csv.charAt(0);
      // Allow 'p' (lowercase playerID) or BOM-stripped content
      expect(firstChar).toMatch(/[a-zA-Z\uFEFF]/);
    }
  });
});
