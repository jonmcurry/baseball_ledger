/**
 * Game Summary Prompt Builder
 *
 * Builds the Claude prompt for post-game newspaper recap generation.
 *
 * Layer 2: API infrastructure.
 */

import type { GameSummaryRequest } from '@lib/types/ai';
import type { ClaudeRequest } from '../claude-client';

export function buildGameSummaryPrompt(request: GameSummaryRequest): ClaudeRequest {
  const winner = request.homeScore > request.awayScore
    ? request.homeTeamName
    : request.awayTeamName;
  const loser = request.homeScore > request.awayScore
    ? request.awayTeamName
    : request.homeTeamName;

  const keyPlaysText = request.keyPlays.length > 0
    ? request.keyPlays.map((p) => `- Inning ${p.inning}: ${p.description}`).join('\n')
    : 'No notable key plays.';

  const highlightsText = request.playerHighlights.length > 0
    ? request.playerHighlights.map((h) => `- ${h.playerName}: ${h.statLine}`).join('\n')
    : 'No standout individual performances.';

  return {
    system: 'You are a veteran baseball sportswriter. Write a concise post-game recap in newspaper style. Output TWO lines separated by a newline: Line 1 is the headline (under 80 chars). Line 2 is the summary paragraph (2-4 sentences).',
    prompt: [
      `Final Score: ${request.awayTeamName} ${request.awayScore}, ${request.homeTeamName} ${request.homeScore}`,
      `Innings: ${request.innings}`,
      `Winner: ${winner} | Loser: ${loser}`,
      `Winning Pitcher: ${request.winningPitcherName}`,
      `Losing Pitcher: ${request.losingPitcherName}`,
      request.savePitcherName ? `Save: ${request.savePitcherName}` : '',
      ``,
      `Key Plays:`,
      keyPlaysText,
      ``,
      `Player Highlights:`,
      highlightsText,
      ``,
      `Box Score: ${request.awayTeamName} ${request.boxScore.awayHits}H ${request.boxScore.awayErrors}E | ${request.homeTeamName} ${request.boxScore.homeHits}H ${request.boxScore.homeErrors}E`,
    ].filter(Boolean).join('\n'),
    maxTokens: 300,
  };
}
