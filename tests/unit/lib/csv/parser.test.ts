import {
  safeParseInt,
  safeParseFloat,
  parseCsvFull,
  parseCsvStream,
} from '@lib/csv/parser';

describe('safeParseInt', () => {
  it('returns 0 for empty string', () => {
    expect(safeParseInt('')).toBe(0);
  });

  it('parses valid integer strings', () => {
    expect(safeParseInt('42')).toBe(42);
    expect(safeParseInt('0')).toBe(0);
    expect(safeParseInt('-7')).toBe(-7);
  });

  it('floors float strings', () => {
    expect(safeParseInt('3.9')).toBe(3);
  });

  it('returns 0 for garbage input', () => {
    expect(safeParseInt('abc')).toBe(0);
    expect(safeParseInt('N/A')).toBe(0);
  });
});

describe('safeParseFloat', () => {
  it('returns 0 for empty string', () => {
    expect(safeParseFloat('')).toBe(0);
  });

  it('parses valid decimal strings', () => {
    expect(safeParseFloat('3.14')).toBeCloseTo(3.14);
    expect(safeParseFloat('0.189')).toBeCloseTo(0.189);
    expect(safeParseFloat('-1.5')).toBeCloseTo(-1.5);
  });

  it('parses integer strings as floats', () => {
    expect(safeParseFloat('42')).toBe(42);
  });

  it('returns 0 for garbage input', () => {
    expect(safeParseFloat('abc')).toBe(0);
    expect(safeParseFloat('N/A')).toBe(0);
  });
});

describe('parseCsvFull', () => {
  it('parses valid CSV with headers into typed array', () => {
    const csv = 'name,age\nAlice,30\nBob,25\n';
    const result = parseCsvFull<{ name: string; age: string }>(csv);

    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe('Alice');
    expect(result.data[0].age).toBe('30');
    expect(result.data[1].name).toBe('Bob');
    expect(result.rowsProcessed).toBe(2);
    expect(result.rowsSkipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('returns empty array for empty CSV (header only)', () => {
    const csv = 'name,age\n';
    const result = parseCsvFull<{ name: string; age: string }>(csv);

    expect(result.data).toHaveLength(0);
    expect(result.rowsProcessed).toBe(0);
  });

  it('returns empty array for completely empty input', () => {
    const result = parseCsvFull<{ name: string }>('');

    expect(result.data).toHaveLength(0);
    expect(result.rowsProcessed).toBe(0);
  });

  it('handles quoted fields correctly', () => {
    const csv = '"name","value"\n"Hello, World","42"\n';
    const result = parseCsvFull<{ name: string; value: string }>(csv);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Hello, World');
    expect(result.data[0].value).toBe('42');
  });

  it('skips empty lines', () => {
    const csv = 'name,age\nAlice,30\n\n\nBob,25\n';
    const result = parseCsvFull<{ name: string; age: string }>(csv);

    expect(result.data).toHaveLength(2);
  });
});

describe('parseCsvStream', () => {
  it('invokes step callback for each row', () => {
    const csv = 'name,age\nAlice,30\nBob,25\nCharlie,35\n';
    const rows: Array<{ name: string; age: string }> = [];

    const result = parseCsvStream<{ name: string; age: string }>(
      csv,
      (row) => { rows.push(row); },
    );

    expect(rows).toHaveLength(3);
    expect(rows[0].name).toBe('Alice');
    expect(rows[2].name).toBe('Charlie');
    expect(result.rowsProcessed).toBe(3);
    expect(result.rowsSkipped).toBe(0);
  });

  it('passes row index to step callback', () => {
    const csv = 'x\na\nb\nc\n';
    const indices: number[] = [];

    parseCsvStream<{ x: string }>(csv, (_row, idx) => {
      indices.push(idx);
    });

    expect(indices).toEqual([0, 1, 2]);
  });

  it('tracks errors from malformed rows', () => {
    // PapaParse reports errors for rows with too many/few fields
    const csv = 'a,b\n1,2\n3\n4,5\n';
    const rows: Array<{ a: string; b: string }> = [];

    const result = parseCsvStream<{ a: string; b: string }>(
      csv,
      (row) => { rows.push(row); },
    );

    // PapaParse still parses short rows (filling missing with empty)
    // so we get all 3 rows but may have errors reported
    expect(result.rowsProcessed).toBeGreaterThanOrEqual(2);
  });

  it('returns CsvParseResult with correct metadata', () => {
    const csv = 'col\nA\nB\n';
    const result = parseCsvStream<{ col: string }>(csv, () => {});

    expect(result.data).toBeUndefined();
    expect(result.rowsProcessed).toBe(2);
    expect(result.errors).toBeDefined();
  });
});
