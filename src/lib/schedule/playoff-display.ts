/**
 * Playoff Display Helpers
 *
 * Pure formatting functions for playoff round names and game result messages.
 *
 * Layer 1: Pure logic. No I/O, no React, no store imports.
 */

import type { PlayoffRoundName } from '../types/schedule';

/**
 * Human-readable round name from PascalCase enum.
 * 'WildCard' -> 'Wild Card', 'WorldSeries' -> 'World Series'
 */
export function formatPlayoffRoundName(round: PlayoffRoundName | string): string {
  return round.replace(/([A-Z])/g, ' $1').trim();
}

export interface PlayoffGameMessageInput {
  round: string;
  gameNumber: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  isPlayoffsComplete?: boolean;
}

/**
 * Build a notification message for a completed playoff game.
 * Example: "Championship Series Game 3: Hawks 3, Eagles 5"
 */
export function buildPlayoffGameMessage(input: PlayoffGameMessageInput): string {
  const roundLabel = formatPlayoffRoundName(input.round);
  const base = `${roundLabel} Game ${input.gameNumber}: ${input.awayTeamName} ${input.awayScore}, ${input.homeTeamName} ${input.homeScore}`;
  if (input.isPlayoffsComplete) {
    return `${base} -- Season complete!`;
  }
  return base;
}
