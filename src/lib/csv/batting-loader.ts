import type {
  RawBattingRow,
  BattingSeasonRecord,
  CsvParseResult,
} from './csv-types';
import { parseCsvStream, safeParseInt } from './parser';

interface BattingStintRow {
  playerID: string;
  yearID: number;
  teamID: string;
  lgID: string;
  G: number;
  AB: number;
  R: number;
  H: number;
  doubles: number;
  triples: number;
  HR: number;
  RBI: number;
  SB: number;
  CS: number;
  BB: number;
  SO: number;
  IBB: number;
  HBP: number;
  SH: number;
  SF: number;
  GIDP: number;
}

/**
 * Compute derived batting stats (BA, OBP, SLG, OPS) from counting stats.
 */
export function computeBattingDerived(stats: {
  AB: number;
  H: number;
  BB: number;
  HBP: number;
  SF: number;
  doubles: number;
  triples: number;
  HR: number;
}): { BA: number; OBP: number; SLG: number; OPS: number } {
  const { AB, H, BB, HBP, SF, doubles, triples, HR } = stats;

  if (AB === 0) {
    return { BA: 0, OBP: 0, SLG: 0, OPS: 0 };
  }

  const BA = H / AB;
  const obpDenom = AB + BB + HBP + SF;
  const OBP = obpDenom > 0 ? (H + BB + HBP) / obpDenom : 0;
  const TB = H + doubles + 2 * triples + 3 * HR;
  const SLG = TB / AB;
  const OPS = OBP + SLG;

  return { BA, OBP, SLG, OPS };
}

/**
 * Transform a raw Batting.csv row to numeric values.
 * Returns null if playerID is missing.
 */
export function transformBattingRow(raw: RawBattingRow): BattingStintRow | null {
  if (!raw.playerID || raw.playerID.trim() === '') return null;

  return {
    playerID: raw.playerID,
    yearID: safeParseInt(raw.yearID),
    teamID: raw.teamID ?? '',
    lgID: raw.lgID ?? '',
    G: safeParseInt(raw.G),
    AB: safeParseInt(raw.AB),
    R: safeParseInt(raw.R),
    H: safeParseInt(raw.H),
    doubles: safeParseInt(raw['2B']),
    triples: safeParseInt(raw['3B']),
    HR: safeParseInt(raw.HR),
    RBI: safeParseInt(raw.RBI),
    SB: safeParseInt(raw.SB),
    CS: safeParseInt(raw.CS),
    BB: safeParseInt(raw.BB),
    SO: safeParseInt(raw.SO),
    IBB: safeParseInt(raw.IBB),
    HBP: safeParseInt(raw.HBP),
    SH: safeParseInt(raw.SH),
    SF: safeParseInt(raw.SF),
    GIDP: safeParseInt(raw.GIDP),
  };
}

/**
 * Aggregate multiple stint rows for the same player-year into a single record.
 * Sums counting stats, computes derived stats from totals.
 */
export function aggregateBattingStints(
  stints: BattingStintRow[],
): BattingSeasonRecord {
  const first = stints[0];
  const teamIDs = stints.map((s) => s.teamID);

  const G = stints.reduce((sum, s) => sum + s.G, 0);
  const AB = stints.reduce((sum, s) => sum + s.AB, 0);
  const R = stints.reduce((sum, s) => sum + s.R, 0);
  const H = stints.reduce((sum, s) => sum + s.H, 0);
  const doubles = stints.reduce((sum, s) => sum + s.doubles, 0);
  const triples = stints.reduce((sum, s) => sum + s.triples, 0);
  const HR = stints.reduce((sum, s) => sum + s.HR, 0);
  const RBI = stints.reduce((sum, s) => sum + s.RBI, 0);
  const SB = stints.reduce((sum, s) => sum + s.SB, 0);
  const CS = stints.reduce((sum, s) => sum + s.CS, 0);
  const BB = stints.reduce((sum, s) => sum + s.BB, 0);
  const SO = stints.reduce((sum, s) => sum + s.SO, 0);
  const IBB = stints.reduce((sum, s) => sum + s.IBB, 0);
  const HBP = stints.reduce((sum, s) => sum + s.HBP, 0);
  const SH = stints.reduce((sum, s) => sum + s.SH, 0);
  const SF = stints.reduce((sum, s) => sum + s.SF, 0);
  const GIDP = stints.reduce((sum, s) => sum + s.GIDP, 0);

  const derived = computeBattingDerived({ AB, H, BB, HBP, SF, doubles, triples, HR });

  return {
    playerID: first.playerID,
    yearID: first.yearID,
    teamIDs,
    lgID: first.lgID,
    stats: {
      G, AB, R, H, doubles, triples, HR, RBI,
      SB, CS, BB, SO, IBB, HBP, SH, SF, GIDP,
      ...derived,
    },
  };
}

/**
 * Parse Batting.csv, aggregate multi-stint rows, return records grouped by playerID.
 * Optional yearRange filters rows to [start, end] inclusive.
 */
export function loadBatting(
  csvString: string,
  yearRange?: { start: number; end: number },
): CsvParseResult<Map<string, BattingSeasonRecord[]>> {
  // Accumulate: playerID -> yearID -> stints[]
  const accumulator = new Map<string, Map<number, BattingStintRow[]>>();
  const errors: string[] = [];

  const result = parseCsvStream<RawBattingRow>(
    csvString,
    (row) => {
      const transformed = transformBattingRow(row);
      if (!transformed) return;

      if (yearRange) {
        if (transformed.yearID < yearRange.start || transformed.yearID > yearRange.end) {
          return;
        }
      }

      let playerYears = accumulator.get(transformed.playerID);
      if (!playerYears) {
        playerYears = new Map();
        accumulator.set(transformed.playerID, playerYears);
      }

      let yearStints = playerYears.get(transformed.yearID);
      if (!yearStints) {
        yearStints = [];
        playerYears.set(transformed.yearID, yearStints);
      }

      yearStints.push(transformed);
    },
    (error, idx) => {
      errors.push(`Row ${idx}: ${error}`);
    },
  );

  // Aggregate stints into season records
  const data = new Map<string, BattingSeasonRecord[]>();
  for (const [playerID, yearMap] of accumulator) {
    const seasons: BattingSeasonRecord[] = [];
    for (const [, stints] of yearMap) {
      seasons.push(aggregateBattingStints(stints));
    }
    seasons.sort((a, b) => a.yearID - b.yearID);
    data.set(playerID, seasons);
  }

  return {
    data,
    errors,
    rowsProcessed: result.rowsProcessed,
    rowsSkipped: result.rowsSkipped,
  };
}
