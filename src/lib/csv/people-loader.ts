import type { PersonRecord, RawPeopleRow, CsvParseResult } from './csv-types';
import { parseCsvStream, safeParseInt } from './parser';

/**
 * Map Lahman CSV 'bats' value to domain type.
 * CSV uses 'B' for switch hitters; domain uses 'S'.
 */
export function mapBattingHand(csvValue: string): 'L' | 'R' | 'S' {
  if (csvValue === 'B') return 'S';
  if (csvValue === 'L') return 'L';
  if (csvValue === 'R') return 'R';
  return 'R'; // default for empty/unknown
}

/**
 * Map Lahman CSV 'throws' value to domain type.
 * CSV has 'B' (ambidextrous) and 'S' -- both default to 'R'.
 */
export function mapThrowingHand(csvValue: string): 'L' | 'R' {
  if (csvValue === 'L') return 'L';
  return 'R'; // R, B, S, empty all map to R
}

/**
 * Extract year from a 'YYYY-MM-DD' date string, or null if empty.
 */
function extractYear(dateStr: string): number | null {
  if (!dateStr || dateStr.length < 4) return null;
  const year = safeParseInt(dateStr.substring(0, 4));
  return year > 0 ? year : null;
}

/**
 * Transform a raw People.csv row into a PersonRecord.
 * Returns null if the row is invalid (missing playerID).
 */
export function transformPeopleRow(raw: RawPeopleRow): PersonRecord | null {
  if (!raw.playerID || raw.playerID.trim() === '') return null;

  return {
    playerID: raw.playerID,
    nameFirst: raw.nameFirst ?? '',
    nameLast: raw.nameLast ?? '',
    birthYear: safeParseInt(raw.birthYear),
    battingHand: mapBattingHand(raw.bats),
    throwingHand: mapThrowingHand(raw.throws),
    debutYear: extractYear(raw.debut),
    finalYear: extractYear(raw.finalGame),
  };
}

/**
 * Parse People.csv content and return a Map keyed by playerID.
 */
export function loadPeople(
  csvString: string,
): CsvParseResult<Map<string, PersonRecord>> {
  const data = new Map<string, PersonRecord>();
  let rowsSkipped = 0;
  const errors: string[] = [];

  const result = parseCsvStream<RawPeopleRow>(
    csvString,
    (row, idx) => {
      const person = transformPeopleRow(row);
      if (person) {
        data.set(person.playerID, person);
      } else {
        rowsSkipped++;
        errors.push(`Row ${idx}: missing or empty playerID`);
      }
    },
    (error, idx) => {
      errors.push(`Row ${idx}: ${error}`);
    },
  );

  return {
    data,
    errors,
    rowsProcessed: result.rowsProcessed,
    rowsSkipped: rowsSkipped + result.rowsSkipped,
  };
}
