/**
 * BBW Binary Data Types
 *
 * Type definitions for data parsed from APBA Baseball for Windows 3.0
 * binary files (PLAYERS.DAT, NSTAT.DAT, PSTAT.DAT).
 *
 * All formats documented in docs/APBA_REVERSE_ENGINEERING.md.
 */

/** Record size constants matching BBW binary formats. */
export const PLAYERS_RECORD_SIZE = 146;
export const NSTAT_RECORD_SIZE = 32;
export const PSTAT_RECORD_SIZE = 22;
export const CARD_BLOCK_SIZE = 35;
export const CARD_BLOCK_OFFSET = 0x40;
export const POSITION_STR_OFFSET = 0x87;
export const POSITION_STR_SIZE = 11;

/**
 * Player record from PLAYERS.DAT (146 bytes).
 * Contains identity, metadata, the 35-byte simulation card, and position string.
 */
export interface BbwPlayerRecord {
  /** 0-based index within the file */
  index: number;
  /** Last name (trimmed ASCII) */
  lastName: string;
  /** First name (trimmed ASCII) */
  firstName: string;
  /** 32-byte metadata block (offsets 0x20-0x3F) */
  metaBlock: Uint8Array;
  /** The 35-byte simulation card (offsets 0x40-0x62) */
  card: number[];
  /** 36-byte extended block (offsets 0x63-0x86) */
  extendedBlock: Uint8Array;
  /** Position string (offsets 0x87-0x91), e.g. "OF  2 B 17" or "L 14     Z" */
  positionString: string;
}

/**
 * Batting statistics from NSTAT.DAT (32 bytes per record).
 * One record per player, indexed in same order as PLAYERS.DAT.
 */
export interface BbwBattingStats {
  /** 0-based index within the file */
  index: number;
  id: number;
  G: number;
  AB: number;
  R: number;
  H: number;
  RBI: number;
  SO: number;
  BB: number;
  HBP: number;
  doubles: number;
  triples: number;
  HR: number;
  SB: number;
}

/**
 * Pitching statistics from PSTAT.DAT (22 bytes per record).
 * One record per pitcher only (subset of PLAYERS.DAT).
 */
export interface BbwPitchingStats {
  /** 0-based index within the file */
  index: number;
  /** Innings pitched (stored as outs = IP * 3) */
  outs: number;
  IP: number;
  H: number;
  R: number;
  ER: number;
  BB: number;
  SO: number;
  W: number;
  L: number;
  SV: number;
  G: number;
  GS: number;
  HRA: number;
  CG: number;
  SHO: number;
}

/**
 * Complete BBW season data loaded from a .WDD directory.
 */
export interface BbwSeason {
  players: BbwPlayerRecord[];
  battingStats: BbwBattingStats[];
  pitchingStats: BbwPitchingStats[];
}
