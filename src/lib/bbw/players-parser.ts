/**
 * PLAYERS.DAT Binary Parser
 *
 * Parses APBA BBW PLAYERS.DAT files (146 bytes per player record).
 * Extracts player names, metadata, the 35-byte simulation card, and position string.
 *
 * Binary format documented in docs/APBA_REVERSE_ENGINEERING.md Section 2.
 */

import type { BbwPlayerRecord } from './types';
import {
  PLAYERS_RECORD_SIZE,
  CARD_BLOCK_SIZE,
  CARD_BLOCK_OFFSET,
  POSITION_STR_OFFSET,
  POSITION_STR_SIZE,
} from './types';

/**
 * Read a length-prefixed Pascal-style string from the buffer.
 * Byte at `offset` is the string length, followed by up to `maxLen` ASCII bytes.
 * Returns trimmed string.
 */
function readPascalString(view: DataView, offset: number, maxLen: number): string {
  const len = Math.min(view.getUint8(offset), maxLen);
  const bytes: number[] = [];
  for (let i = 0; i < len; i++) {
    bytes.push(view.getUint8(offset + 1 + i));
  }
  return String.fromCharCode(...bytes).trim();
}

/**
 * Read a fixed-length ASCII string from the buffer. Trims trailing spaces/nulls.
 */
function readFixedString(view: DataView, offset: number, len: number): string {
  const bytes: number[] = [];
  for (let i = 0; i < len; i++) {
    const b = view.getUint8(offset + i);
    if (b === 0) break;
    bytes.push(b);
  }
  return String.fromCharCode(...bytes).trim();
}

/**
 * Parse a PLAYERS.DAT binary buffer into typed player records.
 *
 * @param buffer - Raw binary content of PLAYERS.DAT
 * @returns Array of parsed player records
 * @throws Error if buffer size is not a multiple of 146
 */
export function parsePlayers(buffer: ArrayBuffer): BbwPlayerRecord[] {
  if (buffer.byteLength % PLAYERS_RECORD_SIZE !== 0) {
    throw new Error(
      `PLAYERS.DAT size ${buffer.byteLength} is not a multiple of ${PLAYERS_RECORD_SIZE}`
    );
  }

  const recordCount = buffer.byteLength / PLAYERS_RECORD_SIZE;
  const view = new DataView(buffer);
  const records: BbwPlayerRecord[] = [];

  for (let i = 0; i < recordCount; i++) {
    const base = i * PLAYERS_RECORD_SIZE;

    // Name fields: Pascal strings with length prefix byte
    const lastName = readPascalString(view, base + 0x00, 15);
    const firstName = readPascalString(view, base + 0x10, 15);

    // Meta block: 32 bytes at offset 0x20
    const metaBlock = new Uint8Array(buffer, base + 0x20, 32);

    // Card block: 35 bytes at offset 0x40
    const card: number[] = [];
    for (let j = 0; j < CARD_BLOCK_SIZE; j++) {
      card.push(view.getUint8(base + CARD_BLOCK_OFFSET + j));
    }

    // Extended block: 36 bytes at offset 0x63
    const extendedBlock = new Uint8Array(buffer, base + 0x63, 36);

    // Position string: 11 bytes at offset 0x87
    const positionString = readFixedString(view, base + POSITION_STR_OFFSET, POSITION_STR_SIZE);

    records.push({
      index: i,
      lastName,
      firstName,
      metaBlock: new Uint8Array(metaBlock),
      card,
      extendedBlock: new Uint8Array(extendedBlock),
      positionString,
    });
  }

  return records;
}
