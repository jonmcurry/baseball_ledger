/**
 * BBW Binary Data Module
 *
 * Public API for loading APBA Baseball for Windows 3.0 season data
 * from binary .WDD directory files.
 */

export { parsePlayers } from './players-parser';
export { parseNstat } from './nstat-parser';
export { parsePstat } from './pstat-parser';
export {
  PLAYERS_RECORD_SIZE,
  NSTAT_RECORD_SIZE,
  PSTAT_RECORD_SIZE,
} from './types';
export type {
  BbwPlayerRecord,
  BbwBattingStats,
  BbwPitchingStats,
  BbwSeason,
} from './types';
export {
  BBW_SEASON_MAP,
  getBbwSeasonYears,
  detectBbwYearsInRange,
  runBbwPipeline,
} from './bbw-pipeline';
