import type { BattingStats, PitchingStats } from '../types';

// ---------------------------------------------------------------------------
// Raw CSV row types -- match Lahman CSV column headers exactly.
// All fields are string because PapaParse with header:true returns strings.
// ---------------------------------------------------------------------------

export interface RawPeopleRow {
  playerID: string;
  nameFirst: string;
  nameLast: string;
  birthYear: string;
  bats: string;       // 'B' (switch) | 'L' | 'R'
  throws: string;     // 'B' | 'L' | 'R' | 'S'
  debut: string;      // 'YYYY-MM-DD' or empty
  finalGame: string;  // 'YYYY-MM-DD' or empty
}

export interface RawBattingRow {
  playerID: string;
  yearID: string;
  stint: string;
  teamID: string;
  lgID: string;
  G: string;
  AB: string;
  R: string;
  H: string;
  '2B': string;
  '3B': string;
  HR: string;
  RBI: string;
  SB: string;
  CS: string;
  BB: string;
  SO: string;
  IBB: string;
  HBP: string;
  SH: string;
  SF: string;
  GIDP: string;
}

export interface RawPitchingRow {
  playerID: string;
  yearID: string;
  stint: string;
  teamID: string;
  lgID: string;
  W: string;
  L: string;
  G: string;
  GS: string;
  CG: string;
  SHO: string;
  SV: string;
  IPouts: string;
  H: string;
  ER: string;
  HR: string;
  BB: string;
  SO: string;
  BAOpp: string;
  ERA: string;
  IBB: string;
  WP: string;
  HBP: string;
  BK: string;
  BFP: string;
  GF: string;
  R: string;
  SH: string;
  SF: string;
  GIDP: string;
}

export interface RawFieldingRow {
  playerID: string;
  yearID: string;
  stint: string;
  teamID: string;
  lgID: string;
  POS: string;
  G: string;
  GS: string;
  InnOuts: string;
  PO: string;
  A: string;
  E: string;
  DP: string;
  PB: string;
  WP: string;
  SB: string;
  CS: string;
  ZR: string;
}

// ---------------------------------------------------------------------------
// Parsed domain records -- numeric, aggregated, ready for consumption
// ---------------------------------------------------------------------------

export interface PersonRecord {
  playerID: string;
  nameFirst: string;
  nameLast: string;
  birthYear: number;
  battingHand: 'L' | 'R' | 'S';
  throwingHand: 'L' | 'R';
  debutYear: number | null;
  finalYear: number | null;
}

export interface BattingSeasonRecord {
  playerID: string;
  yearID: number;
  teamIDs: string[];
  lgID: string;
  stats: BattingStats;
}

export interface PitchingSeasonRecord {
  playerID: string;
  yearID: number;
  teamIDs: string[];
  lgID: string;
  stats: PitchingStats;
}

export interface FieldingSeasonRecord {
  playerID: string;
  yearID: number;
  position: string;
  G: number;
  GS: number;
  InnOuts: number;
  PO: number;
  A: number;
  E: number;
  DP: number;
}

// ---------------------------------------------------------------------------
// Player pool assembly types
// ---------------------------------------------------------------------------

export interface PlayerPoolEntry {
  playerID: string;
  nameFirst: string;
  nameLast: string;
  seasonYear: number;
  battingHand: 'L' | 'R' | 'S';
  throwingHand: 'L' | 'R';
  battingStats: BattingStats | null;
  pitchingStats: PitchingStats | null;
  fieldingRecords: FieldingSeasonRecord[];
  qualifiesAsBatter: boolean;
  qualifiesAsPitcher: boolean;
  isTwoWay: boolean;
}

export interface LeagueAverages {
  BA: number;
  hrPerPA: number;
  bbPerPA: number;
  soPerPA: number;
  ERA: number;
  k9: number;
  bb9: number;
  ISO: number;
  BABIP: number;
}

export interface CsvParseResult<T> {
  data: T;
  errors: string[];
  rowsProcessed: number;
  rowsSkipped: number;
}
