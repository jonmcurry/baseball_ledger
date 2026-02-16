import type {
  PersonRecord,
  BattingSeasonRecord,
  PitchingSeasonRecord,
  FieldingSeasonRecord,
  PlayerPoolEntry,
  LeagueAverages,
  CsvParseResult,
} from './csv-types';

/**
 * Check if a batting season qualifies (REQ-DATA-002a: >= 200 AB).
 */
export function qualifiesAsBatter(batting: BattingSeasonRecord): boolean {
  return batting.stats.AB >= 200;
}

/**
 * Check if a pitching season qualifies (REQ-DATA-002a: >= 50 IP).
 * IP is stored in baseball notation (e.g., 49.2 = 49 and 2/3 innings).
 * We compare directly: 50.0 IP in baseball notation means exactly 50 innings.
 */
export function qualifiesAsPitcher(pitching: PitchingSeasonRecord): boolean {
  return pitching.stats.IP >= 50;
}

/**
 * Assemble the player pool from loaded CSV data (REQ-DATA-002).
 * Every qualifying season for a player is a separate draftable entity.
 * Qualification: batter >= 200 AB, pitcher >= 50 IP, two-way = EITHER.
 */
/**
 * Negro League lgID codes from the Lahman database.
 */
export const NEGRO_LEAGUE_CODES = ['NNL', 'NN2', 'NAL', 'ECL', 'NSL', 'ANL', 'NAC'] as const;

export function buildPlayerPool(
  people: Map<string, PersonRecord>,
  batting: Map<string, BattingSeasonRecord[]>,
  pitching: Map<string, PitchingSeasonRecord[]>,
  fielding: Map<string, FieldingSeasonRecord[]>,
  yearRange: { start: number; end: number },
  excludeLeagues?: Set<string>,
  excludeYears?: Set<number>,
): CsvParseResult<PlayerPoolEntry[]> {
  const pool: PlayerPoolEntry[] = [];
  const errors: string[] = [];

  // Collect all unique (playerID, yearID) pairs from batting and pitching
  const playerYears = new Map<string, Set<number>>();

  for (const [playerID, seasons] of batting) {
    for (const season of seasons) {
      if (season.yearID < yearRange.start || season.yearID > yearRange.end) continue;
      if (excludeLeagues && excludeLeagues.has(season.lgID)) continue;
      if (excludeYears && excludeYears.has(season.yearID)) continue;
      let years = playerYears.get(playerID);
      if (!years) {
        years = new Set();
        playerYears.set(playerID, years);
      }
      years.add(season.yearID);
    }
  }

  for (const [playerID, seasons] of pitching) {
    for (const season of seasons) {
      if (season.yearID < yearRange.start || season.yearID > yearRange.end) continue;
      if (excludeLeagues && excludeLeagues.has(season.lgID)) continue;
      if (excludeYears && excludeYears.has(season.yearID)) continue;
      let years = playerYears.get(playerID);
      if (!years) {
        years = new Set();
        playerYears.set(playerID, years);
      }
      years.add(season.yearID);
    }
  }

  // Build pool entries
  for (const [playerID, years] of playerYears) {
    const person = people.get(playerID);
    if (!person) {
      errors.push(`Player ${playerID} not found in People data`);
      continue;
    }

    const playerBatting = batting.get(playerID) ?? [];
    const playerPitching = pitching.get(playerID) ?? [];
    const playerFielding = fielding.get(playerID) ?? [];

    for (const yearID of years) {
      const battingSeason = playerBatting.find((s) => s.yearID === yearID) ?? null;
      const pitchingSeason = playerPitching.find((s) => s.yearID === yearID) ?? null;
      const fieldingRecords = playerFielding.filter((f) => f.yearID === yearID);

      const isBatterQual = battingSeason !== null && qualifiesAsBatter(battingSeason);
      const isPitcherQual = pitchingSeason !== null && qualifiesAsPitcher(pitchingSeason);

      // Must meet at least one threshold
      if (!isBatterQual && !isPitcherQual) continue;

      pool.push({
        playerID,
        nameFirst: person.nameFirst,
        nameLast: person.nameLast,
        seasonYear: yearID,
        battingHand: person.battingHand,
        throwingHand: person.throwingHand,
        battingStats: battingSeason?.stats ?? null,
        pitchingStats: pitchingSeason?.stats ?? null,
        fieldingRecords,
        qualifiesAsBatter: isBatterQual,
        qualifiesAsPitcher: isPitcherQual,
        isTwoWay: isBatterQual && isPitcherQual,
      });
    }
  }

  // Sort by playerID, then seasonYear for deterministic order
  pool.sort((a, b) =>
    a.playerID.localeCompare(b.playerID) || a.seasonYear - b.seasonYear,
  );

  return {
    data: pool,
    errors,
    rowsProcessed: pool.length,
    rowsSkipped: 0,
  };
}

/**
 * Compute league averages across all qualifying player-seasons (REQ-DATA-006).
 */
export function computeLeagueAverages(pool: PlayerPoolEntry[]): LeagueAverages {
  if (pool.length === 0) {
    return { BA: 0, hrPerPA: 0, bbPerPA: 0, soPerPA: 0, ERA: 0, k9: 0, bb9: 0, ISO: 0, BABIP: 0 };
  }

  // Batting averages: across all qualifying batter-seasons
  const batters = pool.filter((e) => e.qualifiesAsBatter && e.battingStats);
  let totalAB = 0;
  let totalH = 0;
  let totalHR = 0;
  let totalBB = 0;
  let totalSO = 0;
  let totalHBP = 0;
  let totalSF = 0;
  let totalSH = 0;
  let totalDoubles = 0;
  let totalTriples = 0;

  for (const entry of batters) {
    const s = entry.battingStats!;
    totalAB += s.AB;
    totalH += s.H;
    totalHR += s.HR;
    totalBB += s.BB;
    totalSO += s.SO;
    totalHBP += s.HBP;
    totalSF += s.SF;
    totalSH += s.SH;
    totalDoubles += s.doubles;
    totalTriples += s.triples;
  }

  const totalPA = totalAB + totalBB + totalHBP + totalSH + totalSF;
  const BA = totalAB > 0 ? totalH / totalAB : 0;
  const hrPerPA = totalPA > 0 ? totalHR / totalPA : 0;
  const bbPerPA = totalPA > 0 ? totalBB / totalPA : 0;
  const soPerPA = totalPA > 0 ? totalSO / totalPA : 0;

  // ISO = SLG - BA
  const totalTB = totalH + totalDoubles + 2 * totalTriples + 3 * totalHR;
  const SLG = totalAB > 0 ? totalTB / totalAB : 0;
  const ISO = SLG - BA;

  // BABIP = (H - HR) / (AB - SO - HR + SF)
  const babipDenom = totalAB - totalSO - totalHR + totalSF;
  const BABIP = babipDenom > 0 ? (totalH - totalHR) / babipDenom : 0;

  // Pitching averages: across all qualifying pitcher-seasons
  const pitchers = pool.filter((e) => e.qualifiesAsPitcher && e.pitchingStats);
  let totalER = 0;
  let totalPitchingIP = 0;
  let totalPitchingSO = 0;
  let totalPitchingBB = 0;

  for (const entry of pitchers) {
    const s = entry.pitchingStats!;
    // Convert baseball notation IP to decimal for calculations
    const fullInnings = Math.floor(s.IP);
    const partialOuts = Math.round((s.IP - fullInnings) * 10);
    const decimalIP = fullInnings + partialOuts / 3;

    totalER += s.ER;
    totalPitchingIP += decimalIP;
    totalPitchingSO += s.SO;
    totalPitchingBB += s.BB;
  }

  const ERA = totalPitchingIP > 0 ? (9 * totalER) / totalPitchingIP : 0;
  const k9 = totalPitchingIP > 0 ? (9 * totalPitchingSO) / totalPitchingIP : 0;
  const bb9 = totalPitchingIP > 0 ? (9 * totalPitchingBB) / totalPitchingIP : 0;

  return { BA, hrPerPA, bbPerPA, soPerPA, ERA, k9, bb9, ISO, BABIP };
}
