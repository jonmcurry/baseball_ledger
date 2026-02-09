/**
 * Template Game Summary
 *
 * Generates post-game newspaper-style summaries from structured data (REQ-AI-008).
 *
 * Layer 1: Pure logic, no I/O, no side effects.
 */

import type { GameSummaryRequest, GameSummaryResponse } from '../types/ai';

/**
 * Build headline from game result.
 */
function buildHeadline(request: GameSummaryRequest): string {
  const { homeTeamName, awayTeamName, homeScore, awayScore, innings } = request;
  const scoreDiff = Math.abs(homeScore - awayScore);
  const winner = homeScore > awayScore ? homeTeamName : awayTeamName;
  const loser = homeScore > awayScore ? awayTeamName : homeTeamName;
  const winScore = Math.max(homeScore, awayScore);
  const loseScore = Math.min(homeScore, awayScore);

  if (innings > 9) {
    return `${winner} Edge ${loser} ${winScore}-${loseScore} in ${innings} Innings`;
  }
  if (scoreDiff >= 7) {
    return `${winner} Rout ${loser} ${winScore}-${loseScore}`;
  }
  if (scoreDiff >= 4) {
    return `${winner} Cruise Past ${loser} ${winScore}-${loseScore}`;
  }
  if (scoreDiff === 1) {
    return `${winner} Nip ${loser} ${winScore}-${loseScore}`;
  }
  return `${winner} Top ${loser} ${winScore}-${loseScore}`;
}

/**
 * Build the lead paragraph with pitching recap.
 */
function buildLeadParagraph(request: GameSummaryRequest): string {
  const { winningPitcherName, losingPitcherName, savePitcherName } = request;
  const winner = request.homeScore > request.awayScore
    ? request.homeTeamName
    : request.awayTeamName;

  const parts: string[] = [];

  parts.push(
    `${winningPitcherName} earned the win as the ${winner} prevailed.`,
  );

  parts.push(
    `${losingPitcherName} took the loss.`,
  );

  if (savePitcherName) {
    parts.push(`${savePitcherName} picked up the save.`);
  }

  return parts.join(' ');
}

/**
 * Build highlights section from key plays and player highlights.
 */
function buildHighlights(request: GameSummaryRequest): string {
  const parts: string[] = [];

  if (request.keyPlays.length > 0) {
    const topPlays = request.keyPlays.slice(0, 3);
    for (const play of topPlays) {
      parts.push(`In the ${ordinal(play.inning)}, ${play.description}`);
    }
  }

  if (request.playerHighlights.length > 0) {
    const topPlayers = request.playerHighlights.slice(0, 3);
    for (const player of topPlayers) {
      parts.push(`${player.playerName} went ${player.statLine}.`);
    }
  }

  return parts.join(' ');
}

/**
 * Convert inning number to ordinal string.
 */
function ordinal(inning: number): string {
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  const suffix = (inning >= 11 && inning <= 13)
    ? 'th'
    : suffixes[inning % 10] ?? 'th';
  return `${inning}${suffix}`;
}

/**
 * Build line score summary.
 */
function buildLineScore(request: GameSummaryRequest): string {
  const { homeTeamName, awayTeamName, homeScore, awayScore, boxScore } = request;
  return `${awayTeamName} ${awayScore} (${boxScore.awayHits}H, ${boxScore.awayErrors}E) - ${homeTeamName} ${homeScore} (${boxScore.homeHits}H, ${boxScore.homeErrors}E)`;
}

/**
 * Generate a template-based game summary.
 */
export function generateTemplateSummary(request: GameSummaryRequest): GameSummaryResponse {
  const headline = buildHeadline(request);
  const lead = buildLeadParagraph(request);
  const highlights = buildHighlights(request);
  const lineScore = buildLineScore(request);

  const summaryParts = [lead];
  if (highlights) summaryParts.push(highlights);
  summaryParts.push(lineScore);

  return {
    headline,
    summary: summaryParts.join('\n\n'),
    source: 'template',
  };
}
