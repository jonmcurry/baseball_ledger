import Papa from 'papaparse';
import type { CsvParseResult } from './csv-types';

/**
 * Safely parse a string to integer, defaulting to 0 for empty/NaN.
 */
export function safeParseInt(value: string): number {
  if (value === '' || value === undefined || value === null) return 0;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Safely parse a string to float, defaulting to 0 for empty/NaN.
 */
export function safeParseFloat(value: string): number {
  if (value === '' || value === undefined || value === null) return 0;
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Parse CSV string row-by-row via PapaParse streaming (step callback).
 * Per REQ-NFR-011, uses step mode to avoid building full result array.
 * Returns void in data -- accumulation is the caller's responsibility.
 */
export function parseCsvStream<T>(
  csvString: string,
  onRow: (row: T, rowIndex: number) => void,
  onError?: (error: string, rowIndex: number) => void,
): CsvParseResult<undefined> {
  let rowsProcessed = 0;
  let rowsSkipped = 0;
  const errors: string[] = [];

  Papa.parse<T>(csvString, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    step(results) {
      if (results.errors.length > 0) {
        for (const err of results.errors) {
          const msg = `Row ${rowsProcessed}: ${err.message}`;
          errors.push(msg);
          onError?.(err.message, rowsProcessed);
        }
        rowsSkipped++;
      }
      if (results.data) {
        onRow(results.data, rowsProcessed);
      }
      rowsProcessed++;
    },
  });

  return { data: undefined, errors, rowsProcessed, rowsSkipped };
}

/**
 * Parse entire CSV string at once. Convenience wrapper for small files.
 * Returns all rows as a typed array.
 */
export function parseCsvFull<T>(
  csvString: string,
): CsvParseResult<T[]> {
  const result = Papa.parse<T>(csvString, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const errors = result.errors.map(
    (e) => `Row ${e.row ?? '?'}: ${e.message}`,
  );
  const rowsSkipped = result.errors.filter(
    (e) => e.type === 'FieldMismatch',
  ).length;

  return {
    data: result.data,
    errors,
    rowsProcessed: result.data.length,
    rowsSkipped,
  };
}
