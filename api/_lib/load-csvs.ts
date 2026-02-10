/**
 * CSV File Reader
 *
 * Reads the 4 Lahman CSV files from the data_files/ directory.
 * This is the ONLY module that touches the filesystem for CSV loading.
 *
 * Layer 2: API utility. Used by league creation endpoint.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface CsvFiles {
  readonly peopleCsv: string;
  readonly battingCsv: string;
  readonly pitchingCsv: string;
  readonly fieldingCsv: string;
}

/**
 * Load all 4 Lahman CSV files from data_files/ directory.
 * Throws structured error if any file is missing or unreadable.
 */
export function loadCsvFiles(): CsvFiles {
  const dataDir = resolve(process.cwd(), 'data_files');

  try {
    return {
      peopleCsv: readFileSync(resolve(dataDir, 'People.csv'), 'utf-8'),
      battingCsv: readFileSync(resolve(dataDir, 'Batting.csv'), 'utf-8'),
      pitchingCsv: readFileSync(resolve(dataDir, 'Pitching.csv'), 'utf-8'),
      fieldingCsv: readFileSync(resolve(dataDir, 'Fielding.csv'), 'utf-8'),
    };
  } catch (err) {
    throw {
      category: 'DATA',
      code: 'CSV_LOAD_FAILED',
      message: `Failed to load CSV files from ${dataDir}: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
