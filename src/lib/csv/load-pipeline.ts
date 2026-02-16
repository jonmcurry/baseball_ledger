/**
 * CSV Pipeline Orchestrator
 *
 * Wires together CSV loaders, player pool builder, league averages calculator,
 * and card generator into a single pure function (REQ-DATA-002, REQ-DATA-005, REQ-DATA-006).
 *
 * Layer 1: Pure logic. No I/O, no side effects. Accepts raw CSV strings.
 */

import type { PlayerPoolEntry, LeagueAverages } from './csv-types';
import type { PlayerCard } from '../types/player';
import { loadPeople } from './people-loader';
import { loadBatting } from './batting-loader';
import { loadPitching } from './pitching-loader';
import { loadFielding } from './fielding-loader';
import { buildPlayerPool, computeLeagueAverages, NEGRO_LEAGUE_CODES } from './player-pool';
import { generateAllCards } from '../card-generator/generator';

export interface CsvPipelineInput {
  readonly peopleCsv: string;
  readonly battingCsv: string;
  readonly pitchingCsv: string;
  readonly fieldingCsv: string;
  readonly yearRangeStart: number;
  readonly yearRangeEnd: number;
  readonly negroLeaguesEnabled?: boolean;
  /** Years to exclude from formula card generation (e.g., BBW-covered years). */
  readonly excludeYears?: readonly number[];
}

export interface CsvPipelineResult {
  readonly pool: PlayerPoolEntry[];
  readonly leagueAverages: LeagueAverages;
  readonly playerNameCache: Record<string, string>;
  readonly cards: PlayerCard[];
  readonly errors: string[];
}

/**
 * Orchestrate CSV loading -> pool building -> card generation.
 *
 * 1. Parse 4 CSV files into typed records
 * 2. Build player pool filtered by year range (REQ-DATA-002)
 * 3. Compute league averages for normalization (REQ-DATA-006)
 * 4. Generate PlayerCards for all pool entries (REQ-DATA-005)
 * 5. Build playerID -> name cache (REQ-DATA-003)
 */
export function runCsvPipeline(input: CsvPipelineInput): CsvPipelineResult {
  const errors: string[] = [];
  const yearRange = { start: input.yearRangeStart, end: input.yearRangeEnd };

  // Step 1: Parse all CSV files
  const peopleResult = loadPeople(input.peopleCsv);
  const battingResult = loadBatting(input.battingCsv, yearRange);
  const pitchingResult = loadPitching(input.pitchingCsv, yearRange);
  const fieldingResult = loadFielding(input.fieldingCsv, yearRange);

  errors.push(...peopleResult.errors);
  errors.push(...battingResult.errors);
  errors.push(...pitchingResult.errors);
  errors.push(...fieldingResult.errors);

  // Step 2: Build player pool (optionally excluding Negro League records and BBW years)
  const excludeLeagues = input.negroLeaguesEnabled === false
    ? new Set<string>(NEGRO_LEAGUE_CODES)
    : undefined;
  const excludeYears = input.excludeYears && input.excludeYears.length > 0
    ? new Set<number>(input.excludeYears)
    : undefined;

  const poolResult = buildPlayerPool(
    peopleResult.data,
    battingResult.data,
    pitchingResult.data,
    fieldingResult.data,
    yearRange,
    excludeLeagues,
    excludeYears,
  );
  errors.push(...poolResult.errors);
  const pool = poolResult.data;

  // Step 3: Compute league averages
  const leagueAverages = computeLeagueAverages(pool);

  // Step 4: Generate cards
  const cards = pool.length > 0 ? generateAllCards(pool, leagueAverages) : [];

  // Step 5: Build player name cache
  const playerNameCache: Record<string, string> = {};
  for (const entry of pool) {
    if (!playerNameCache[entry.playerID]) {
      playerNameCache[entry.playerID] = `${entry.nameFirst} ${entry.nameLast}`;
    }
  }

  return {
    pool,
    leagueAverages,
    playerNameCache,
    cards,
    errors,
  };
}
