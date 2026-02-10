import type {
  RawPitchingRow,
  PitchingSeasonRecord,
  CsvParseResult,
} from './csv-types';
import { parseCsvStream, safeParseInt } from './parser';

interface PitchingStintRow {
  playerID: string;
  yearID: number;
  teamID: string;
  lgID: string;
  W: number;
  L: number;
  G: number;
  GS: number;
  CG: number;
  SHO: number;
  SV: number;
  ipouts: number;  // Raw IPouts -- convert to IP only after aggregation
  H: number;
  R: number;
  ER: number;
  HR: number;
  BB: number;
  SO: number;
  HBP: number;
  BF: number;
  WP: number;
  BK: number;
  IBB: number;
  GF: number;
  SH: number;
  SF: number;
  GIDP: number;
}

/**
 * Convert IPouts (total outs recorded) to IP (baseball notation).
 * Baseball notation: .1 = 1/3 inning, .2 = 2/3 inning.
 * Example: 936 IPouts -> 312.0, 478 -> 159.1, 479 -> 159.2
 */
export function ipoutsToIP(ipouts: number): number {
  const fullInnings = Math.floor(ipouts / 3);
  const remainder = ipouts % 3;
  return fullInnings + remainder * 0.1;
}

/**
 * Convert IPouts to true decimal IP for rate stat calculations.
 * Example: 936 -> 312.0, 478 -> 159.333..., 479 -> 159.667...
 */
function ipoutsToDecimalIP(ipouts: number): number {
  return ipouts / 3;
}

/**
 * Compute derived pitching stats (ERA, WHIP, FIP) from raw counting stats.
 * Uses true decimal IP internally for accurate calculations.
 */
export function computePitchingDerived(stats: {
  ER: number;
  ipouts: number;
  H: number;
  BB: number;
  HR: number;
  HBP: number;
  SO: number;
}): { ERA: number; WHIP: number; FIP: number } {
  const decimalIP = ipoutsToDecimalIP(stats.ipouts);

  if (decimalIP === 0) {
    return { ERA: 99.99, WHIP: 99.99, FIP: 99.99 };
  }

  const ERA = (9 * stats.ER) / decimalIP;
  const WHIP = (stats.H + stats.BB) / decimalIP;
  const FIP = ((13 * stats.HR) + (3 * (stats.BB + stats.HBP)) - (2 * stats.SO)) / decimalIP + 3.15;

  return { ERA, WHIP, FIP };
}

/**
 * Transform a raw Pitching.csv row to numeric values.
 * Returns null if playerID is missing.
 */
export function transformPitchingRow(raw: RawPitchingRow): PitchingStintRow | null {
  if (!raw.playerID || raw.playerID.trim() === '') return null;

  return {
    playerID: raw.playerID,
    yearID: safeParseInt(raw.yearID),
    teamID: raw.teamID ?? '',
    lgID: raw.lgID ?? '',
    W: safeParseInt(raw.W),
    L: safeParseInt(raw.L),
    G: safeParseInt(raw.G),
    GS: safeParseInt(raw.GS),
    CG: safeParseInt(raw.CG),
    SHO: safeParseInt(raw.SHO),
    SV: safeParseInt(raw.SV),
    ipouts: safeParseInt(raw.IPouts),
    H: safeParseInt(raw.H),
    R: safeParseInt(raw.R),
    ER: safeParseInt(raw.ER),
    HR: safeParseInt(raw.HR),
    BB: safeParseInt(raw.BB),
    SO: safeParseInt(raw.SO),
    HBP: safeParseInt(raw.HBP),
    BF: safeParseInt(raw.BFP),  // CSV column BFP -> domain field BF
    WP: safeParseInt(raw.WP),
    BK: safeParseInt(raw.BK),
    IBB: safeParseInt(raw.IBB),
    GF: safeParseInt(raw.GF),
    SH: safeParseInt(raw.SH),
    SF: safeParseInt(raw.SF),
    GIDP: safeParseInt(raw.GIDP),
  };
}

/**
 * Aggregate multiple stint rows for the same pitcher-year into a single record.
 * Sums all counting stats including IPouts. Converts to IP and computes derived stats.
 */
export function aggregatePitchingStints(
  stints: PitchingStintRow[],
): PitchingSeasonRecord {
  const first = stints[0];
  const teamIDs = stints.map((s) => s.teamID);

  const G = stints.reduce((sum, s) => sum + s.G, 0);
  const GS = stints.reduce((sum, s) => sum + s.GS, 0);
  const W = stints.reduce((sum, s) => sum + s.W, 0);
  const L = stints.reduce((sum, s) => sum + s.L, 0);
  const SV = stints.reduce((sum, s) => sum + s.SV, 0);
  const totalIpouts = stints.reduce((sum, s) => sum + s.ipouts, 0);
  const H = stints.reduce((sum, s) => sum + s.H, 0);
  const R = stints.reduce((sum, s) => sum + s.R, 0);
  const ER = stints.reduce((sum, s) => sum + s.ER, 0);
  const HR = stints.reduce((sum, s) => sum + s.HR, 0);
  const BB = stints.reduce((sum, s) => sum + s.BB, 0);
  const SO = stints.reduce((sum, s) => sum + s.SO, 0);
  const HBP = stints.reduce((sum, s) => sum + s.HBP, 0);
  const BF = stints.reduce((sum, s) => sum + s.BF, 0);
  const WP = stints.reduce((sum, s) => sum + s.WP, 0);
  const BK = stints.reduce((sum, s) => sum + s.BK, 0);
  const CG = stints.reduce((sum, s) => sum + s.CG, 0);
  const SHO = stints.reduce((sum, s) => sum + s.SHO, 0);

  const IP = ipoutsToIP(totalIpouts);
  const derived = computePitchingDerived({ ER, ipouts: totalIpouts, H, BB, HR, HBP, SO });

  return {
    playerID: first.playerID,
    yearID: first.yearID,
    teamIDs,
    lgID: first.lgID,
    stats: {
      G, GS, W, L, SV, IP, H, R, ER, HR, BB, SO, HBP, BF, WP, BK,
      CG, SHO,
      HLD: 0,  // Not in Lahman CSV
      BS: 0,   // Not in Lahman CSV
      ...derived,
    },
  };
}

/**
 * Parse Pitching.csv, aggregate multi-stint rows, return records grouped by playerID.
 */
export function loadPitching(
  csvString: string,
  yearRange?: { start: number; end: number },
): CsvParseResult<Map<string, PitchingSeasonRecord[]>> {
  const accumulator = new Map<string, Map<number, PitchingStintRow[]>>();
  const errors: string[] = [];

  const result = parseCsvStream<RawPitchingRow>(
    csvString,
    (row) => {
      const transformed = transformPitchingRow(row);
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

  const data = new Map<string, PitchingSeasonRecord[]>();
  for (const [playerID, yearMap] of accumulator) {
    const seasons: PitchingSeasonRecord[] = [];
    for (const [, stints] of yearMap) {
      seasons.push(aggregatePitchingStints(stints));
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
