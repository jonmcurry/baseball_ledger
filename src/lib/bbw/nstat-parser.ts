/**
 * NSTAT.DAT Binary Parser
 *
 * Parses APBA BBW NSTAT.DAT files (32 bytes per batter record).
 * One record per player, indexed in same order as PLAYERS.DAT.
 *
 * Binary format documented in docs/APBA_REVERSE_ENGINEERING.md Section 3.
 */

import type { BbwBattingStats } from './types';
import { NSTAT_RECORD_SIZE } from './types';

/**
 * Parse a NSTAT.DAT binary buffer into typed batting stat records.
 *
 * @param buffer - Raw binary content of NSTAT.DAT
 * @returns Array of parsed batting stat records
 * @throws Error if buffer size is not a multiple of 32
 */
export function parseNstat(buffer: ArrayBuffer): BbwBattingStats[] {
  if (buffer.byteLength % NSTAT_RECORD_SIZE !== 0) {
    throw new Error(
      `NSTAT.DAT size ${buffer.byteLength} is not a multiple of ${NSTAT_RECORD_SIZE}`
    );
  }

  const recordCount = buffer.byteLength / NSTAT_RECORD_SIZE;
  const view = new DataView(buffer);
  const records: BbwBattingStats[] = [];

  for (let i = 0; i < recordCount; i++) {
    const base = i * NSTAT_RECORD_SIZE;

    // uint16 fields (little-endian)
    const id = view.getUint16(base + 0x00, true);
    const G = view.getUint16(base + 0x02, true);
    const AB = view.getUint16(base + 0x04, true);
    const R = view.getUint16(base + 0x06, true);
    const H = view.getUint16(base + 0x08, true);
    const RBI = view.getUint16(base + 0x0A, true);
    const SO = view.getUint16(base + 0x0C, true);
    const BB = view.getUint16(base + 0x0E, true);
    const HBP = view.getUint16(base + 0x10, true);

    // uint8 fields
    const doubles = view.getUint8(base + 0x12);
    const triples = view.getUint8(base + 0x13);
    const HR = view.getUint8(base + 0x14);
    const SB = view.getUint8(base + 0x15);

    records.push({
      index: i,
      id,
      G,
      AB,
      R,
      H,
      RBI,
      SO,
      BB,
      HBP,
      doubles,
      triples,
      HR,
      SB,
    });
  }

  return records;
}
