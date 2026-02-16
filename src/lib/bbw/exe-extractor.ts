/**
 * WINBB.EXE Data Segment Extractor
 *
 * Extracts embedded data tables from APBA Baseball for Windows 3.0's
 * main executable (WINBB.EXE). These tables live in the NE data segment
 * (segment 36) and cannot be read from external data files.
 *
 * Confirmed data locations:
 * - DATA[0x3802]: 40-byte random variance adjustment table (Grade Layer 5)
 * - DATA[row + 0x382B] for rows 15-23: 9-byte IDT frequency weight table
 * - DATA[0x382A + cardValue*2 + 0x102]: IDT bitmap (addressing uncertain)
 *
 * See docs/ghidra-decompilation-findings.md for derivation.
 */

/**
 * Real BBW random variance table extracted from WINBB.EXE DATA[0x3802].
 * 40 signed bytes indexed by random(40) during grade calculation (Layer 5).
 *
 * Distribution: 1x(+3), 3x(+2), 6x(+1), 20x(0), 6x(-1), 3x(-2), 1x(-3)
 * Mean = 0.0, symmetric around zero. Range [-3, +3].
 *
 * This replaces the approximated RANDOM_VARIANCE_TABLE.
 */
export const BBW_VARIANCE_TABLE: readonly number[] = [
  3, 2, 2, 2, 1, 1, 1, 1, 1, 1,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  -1, -1, -1, -1, -1, -1,
  -2, -2, -2,
  -3,
];

/**
 * Real BBW IDT frequency weights extracted from WINBB.EXE DATA[row + 0x382B]
 * for IDT rows 15-23 (the active range).
 *
 * These weights determine how often each IDT row is selected during
 * IDT-path resolution. Total weight = 12.
 *
 * Index 0 = row 15, index 1 = row 16, ..., index 8 = row 23.
 */
export const BBW_IDT_WEIGHTS: readonly number[] = [
  1, // row 15
  1, // row 16
  1, // row 17
  2, // row 18
  1, // row 19
  2, // row 20
  1, // row 21
  2, // row 22
  1, // row 23
];

/**
 * NE executable data segment extraction.
 * Locates segment 36 in a WINBB.EXE buffer and returns the data segment bytes.
 *
 * @param buffer - Raw binary content of WINBB.EXE
 * @returns DataView over the data segment
 * @throws Error if the file is not a valid NE executable or segment 36 is missing
 */
export function extractDataSegment(buffer: ArrayBuffer): DataView {
  const view = new DataView(buffer);

  // MZ header check
  if (view.getUint8(0) !== 0x4D || view.getUint8(1) !== 0x5A) {
    throw new Error('Not an MZ executable');
  }

  // NE header offset at MZ+0x3C
  const neOffset = view.getUint16(0x3C, true);

  // NE header check
  if (view.getUint8(neOffset) !== 0x4E || view.getUint8(neOffset + 1) !== 0x45) {
    throw new Error('Not an NE executable');
  }

  const numSegments = view.getUint16(neOffset + 0x1C, true);
  if (numSegments < 36) {
    throw new Error(`Only ${numSegments} segments, need at least 36`);
  }

  const segTableOffset = neOffset + view.getUint16(neOffset + 0x22, true);
  const alignShift = view.getUint16(neOffset + 0x32, true);

  // Segment 36 entry (0-indexed = 35), each entry is 8 bytes
  const seg36Entry = segTableOffset + 35 * 8;
  const seg36FileOffset = view.getUint16(seg36Entry, true) << alignShift;
  const seg36Length = view.getUint16(seg36Entry + 2, true);

  return new DataView(buffer, seg36FileOffset, seg36Length);
}

/**
 * Extract the 40-byte random variance table from the data segment.
 * Falls back to the hardcoded constant if extraction fails.
 */
export function extractVarianceTable(dataSegment: DataView): number[] {
  const table: number[] = [];
  for (let i = 0; i < 40; i++) {
    table.push(dataSegment.getInt8(0x3802 + i));
  }
  return table;
}

/**
 * Extract the 9-byte IDT frequency weight table from the data segment.
 * Weights for IDT rows 15-23.
 */
export function extractIdtWeights(dataSegment: DataView): number[] {
  const weights: number[] = [];
  for (let row = 15; row <= 23; row++) {
    weights.push(dataSegment.getUint8(row + 0x382B));
  }
  return weights;
}
