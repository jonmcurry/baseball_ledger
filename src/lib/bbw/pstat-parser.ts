/**
 * PSTAT.DAT Binary Parser
 *
 * Parses APBA BBW PSTAT.DAT files (22 bytes per pitcher record).
 * One record per pitcher only (subset of PLAYERS.DAT).
 *
 * Binary format documented in docs/APBA_REVERSE_ENGINEERING.md Section 3.
 */

import type { BbwPitchingStats } from './types';
import { PSTAT_RECORD_SIZE } from './types';

/**
 * Parse a PSTAT.DAT binary buffer into typed pitching stat records.
 *
 * @param buffer - Raw binary content of PSTAT.DAT
 * @returns Array of parsed pitching stat records
 * @throws Error if buffer size is not a multiple of 22
 */
export function parsePstat(buffer: ArrayBuffer): BbwPitchingStats[] {
  if (buffer.byteLength % PSTAT_RECORD_SIZE !== 0) {
    throw new Error(
      `PSTAT.DAT size ${buffer.byteLength} is not a multiple of ${PSTAT_RECORD_SIZE}`
    );
  }

  const recordCount = buffer.byteLength / PSTAT_RECORD_SIZE;
  const view = new DataView(buffer);
  const records: BbwPitchingStats[] = [];

  for (let i = 0; i < recordCount; i++) {
    const base = i * PSTAT_RECORD_SIZE;

    // uint16 fields (little-endian)
    const outs = view.getUint16(base + 0x00, true);
    const H = view.getUint16(base + 0x02, true);
    const R = view.getUint16(base + 0x04, true);
    const ER = view.getUint16(base + 0x06, true);
    const BB = view.getUint16(base + 0x08, true);
    const SO = view.getUint16(base + 0x0A, true);

    // uint8 fields
    const W = view.getUint8(base + 0x0C);
    const L = view.getUint8(base + 0x0D);
    const SV = view.getUint8(base + 0x0E);
    const G = view.getUint8(base + 0x0F);
    const GS = view.getUint8(base + 0x10);
    const HRA = view.getUint8(base + 0x11);
    const CG = view.getUint8(base + 0x12);
    const SHO = view.getUint8(base + 0x13);

    records.push({
      index: i,
      outs,
      IP: outs / 3,
      H,
      R,
      ER,
      BB,
      SO,
      W,
      L,
      SV,
      G,
      GS,
      HRA,
      CG,
      SHO,
    });
  }

  return records;
}
