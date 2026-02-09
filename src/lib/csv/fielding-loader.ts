import type {
  RawFieldingRow,
  FieldingSeasonRecord,
  CsvParseResult,
} from './csv-types';
import { parseCsvStream, safeParseInt } from './parser';

/**
 * Map Lahman CSV POS value to domain position string.
 * Returns null for non-fielding entries (PH, PR) which should be skipped.
 * OF maps to RF as default outfield primary position.
 * P maps to SP.
 */
export function mapFieldingPosition(csvPos: string): string | null {
  switch (csvPos) {
    case 'C': return 'C';
    case '1B': return '1B';
    case '2B': return '2B';
    case '3B': return '3B';
    case 'SS': return 'SS';
    case 'OF': return 'RF';  // Default outfield -> RF
    case 'LF': return 'LF';
    case 'CF': return 'CF';
    case 'RF': return 'RF';
    case 'DH': return 'DH';
    case 'P': return 'SP';
    case 'PH': return null;  // Not a fielding position
    case 'PR': return null;  // Not a fielding position
    default: return null;
  }
}

/**
 * Transform a raw Fielding.csv row to a FieldingSeasonRecord.
 * Returns null if the row should be skipped (missing playerID, PH/PR position).
 */
export function transformFieldingRow(raw: RawFieldingRow): FieldingSeasonRecord | null {
  if (!raw.playerID || raw.playerID.trim() === '') return null;

  const position = mapFieldingPosition(raw.POS);
  if (position === null) return null;

  return {
    playerID: raw.playerID,
    yearID: safeParseInt(raw.yearID),
    position,
    G: safeParseInt(raw.G),
    GS: safeParseInt(raw.GS),
    InnOuts: safeParseInt(raw.InnOuts),
    PO: safeParseInt(raw.PO),
    A: safeParseInt(raw.A),
    E: safeParseInt(raw.E),
    DP: safeParseInt(raw.DP),
  };
}

/**
 * Parse Fielding.csv and return records grouped by playerID.
 * Filters out PH and PR rows.
 * Aggregates same-position stints for the same player-year.
 */
export function loadFielding(
  csvString: string,
  yearRange?: { start: number; end: number },
): CsvParseResult<Map<string, FieldingSeasonRecord[]>> {
  // Accumulate: playerID -> (yearID-position key) -> stints[]
  const accumulator = new Map<string, Map<string, FieldingSeasonRecord[]>>();
  let rowsSkipped = 0;
  const errors: string[] = [];

  const result = parseCsvStream<RawFieldingRow>(
    csvString,
    (row) => {
      const transformed = transformFieldingRow(row);
      if (!transformed) {
        rowsSkipped++;
        return;
      }

      if (yearRange) {
        if (transformed.yearID < yearRange.start || transformed.yearID > yearRange.end) {
          return;
        }
      }

      let playerMap = accumulator.get(transformed.playerID);
      if (!playerMap) {
        playerMap = new Map();
        accumulator.set(transformed.playerID, playerMap);
      }

      const key = `${transformed.yearID}-${transformed.position}`;
      let stints = playerMap.get(key);
      if (!stints) {
        stints = [];
        playerMap.set(key, stints);
      }

      stints.push(transformed);
    },
    (error, idx) => {
      errors.push(`Row ${idx}: ${error}`);
    },
  );

  // Aggregate same-position stints
  const data = new Map<string, FieldingSeasonRecord[]>();
  for (const [playerID, posMap] of accumulator) {
    const records: FieldingSeasonRecord[] = [];
    for (const [, stints] of posMap) {
      if (stints.length === 1) {
        records.push(stints[0]);
      } else {
        const first = stints[0];
        records.push({
          playerID: first.playerID,
          yearID: first.yearID,
          position: first.position,
          G: stints.reduce((sum, s) => sum + s.G, 0),
          GS: stints.reduce((sum, s) => sum + s.GS, 0),
          InnOuts: stints.reduce((sum, s) => sum + s.InnOuts, 0),
          PO: stints.reduce((sum, s) => sum + s.PO, 0),
          A: stints.reduce((sum, s) => sum + s.A, 0),
          E: stints.reduce((sum, s) => sum + s.E, 0),
          DP: stints.reduce((sum, s) => sum + s.DP, 0),
        });
      }
    }
    records.sort((a, b) => a.yearID - b.yearID || a.position.localeCompare(b.position));
    data.set(playerID, records);
  }

  return {
    data,
    errors,
    rowsProcessed: result.rowsProcessed,
    rowsSkipped: rowsSkipped + result.rowsSkipped,
  };
}
