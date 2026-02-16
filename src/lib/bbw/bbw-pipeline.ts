/**
 * BBW Season Pipeline
 *
 * Converts a complete BBW binary season (PLAYERS.DAT + NSTAT.DAT + PSTAT.DAT)
 * into PlayerCard[] objects. The card bytes come directly from the binary data,
 * producing identical simulation behavior to the original BBW game.
 *
 * Layer 1: Pure logic. No I/O, no side effects.
 */

import type { PlayerCard } from '../types/player';
import type { BbwPlayerRecord, BbwBattingStats, BbwPitchingStats } from './types';
import { generateCardFromBbw } from '../card-generator/generator';

/**
 * Known BBW season directories and their corresponding years.
 * OT (Old-Timer) seasons are all-time curated rosters, not tied to a specific year.
 */
export const BBW_SEASON_MAP: Readonly<Record<number, string>> = {
  1921: '1921S.WDD',
  1943: '1943S.WDD',
  1971: '1971S.WDD',
};

/**
 * Get the list of real-year seasons that have BBW binary data available.
 */
export function getBbwSeasonYears(): number[] {
  return Object.keys(BBW_SEASON_MAP).map(Number);
}

/**
 * Detect which BBW season years fall within a given year range.
 */
export function detectBbwYearsInRange(yearStart: number, yearEnd: number): number[] {
  return getBbwSeasonYears().filter((y) => y >= yearStart && y <= yearEnd);
}

/**
 * Convert a complete BBW season into PlayerCard[].
 *
 * Pitcher-to-PSTAT matching: PSTAT records are assigned sequentially to
 * pitchers in PLAYERS.DAT order. The Nth pitcher encountered in PLAYERS.DAT
 * corresponds to the Nth record in PSTAT.DAT.
 *
 * @param players - All player records from PLAYERS.DAT
 * @param battingStats - All batting records from NSTAT.DAT (1:1 with PLAYERS)
 * @param pitchingStats - Pitcher-only records from PSTAT.DAT (sequential match)
 * @param seasonYear - The season year
 */
export function runBbwPipeline(
  players: BbwPlayerRecord[],
  battingStats: BbwBattingStats[],
  pitchingStats: BbwPitchingStats[],
  seasonYear: number,
): { cards: PlayerCard[]; playerNameCache: Record<string, string> } {
  // Compute all pitcher ERAs for grade percentile calculation
  const allPitcherERAs = pitchingStats
    .filter((p) => p.outs > 0)
    .map((p) => (p.ER * 27) / p.outs);

  const cards: PlayerCard[] = [];
  const playerNameCache: Record<string, string> = {};
  let pstatIdx = 0;

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const batting = battingStats[i];

    // Detect pitcher from position string: starts with L/R followed by space and grade number
    const isPitcher = /^[LR]\s+\d+/.test(player.positionString.trim());
    const pitching = isPitcher && pstatIdx < pitchingStats.length
      ? pitchingStats[pstatIdx++]
      : undefined;

    const card = generateCardFromBbw(player, batting, pitching, seasonYear, allPitcherERAs);
    cards.push(card);

    // Build name cache using the same format as CSV pipeline
    playerNameCache[card.playerId] = `${card.nameFirst} ${card.nameLast}`;
  }

  return { cards, playerNameCache };
}
