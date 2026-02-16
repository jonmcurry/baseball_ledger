/**
 * BBW Binary File Reader
 *
 * Reads BBW season data from binary .WDD directories.
 * This is the ONLY module that touches the filesystem for BBW binary loading.
 *
 * Layer 2: API utility. Used by league creation endpoint alongside load-csvs.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parsePlayers } from '../../src/lib/bbw/players-parser';
import { parseNstat } from '../../src/lib/bbw/nstat-parser';
import { parsePstat } from '../../src/lib/bbw/pstat-parser';
import type { BbwSeason } from '../../src/lib/bbw/types';
import { BBW_SEASON_MAP } from '../../src/lib/bbw/bbw-pipeline';

/**
 * Load BBW binary season data for a specific year.
 * Returns undefined if no BBW data exists for that year or files are missing.
 */
export function loadBbwSeason(year: number): BbwSeason | undefined {
  const dirName = BBW_SEASON_MAP[year];
  if (!dirName) return undefined;

  const bbwDir = resolve(process.cwd(), 'BBW', dirName);

  const playersPath = resolve(bbwDir, 'PLAYERS.DAT');
  const nstatPath = resolve(bbwDir, 'NSTAT.DAT');
  const pstatPath = resolve(bbwDir, 'PSTAT.DAT');

  if (!existsSync(playersPath) || !existsSync(nstatPath) || !existsSync(pstatPath)) {
    return undefined;
  }

  try {
    const playersBuffer = readFileSync(playersPath).buffer;
    const nstatBuffer = readFileSync(nstatPath).buffer;
    const pstatBuffer = readFileSync(pstatPath).buffer;

    return {
      players: parsePlayers(playersBuffer),
      battingStats: parseNstat(nstatBuffer),
      pitchingStats: parsePstat(pstatBuffer),
    };
  } catch (err) {
    console.error(`Failed to load BBW data for ${year} (${dirName}):`, err);
    return undefined;
  }
}
