/**
 * Game Summary Prompt Builder Tests
 */

import type { GameSummaryRequest } from '../../../../../src/lib/types/ai';
import { buildGameSummaryPrompt } from '../../../../../api/_lib/prompts/game-summary-prompt';

function makeRequest(overrides: Partial<GameSummaryRequest> = {}): GameSummaryRequest {
  return {
    homeTeamName: 'Sluggers',
    awayTeamName: 'Aces',
    homeScore: 5,
    awayScore: 3,
    innings: 9,
    winningPitcherName: 'John Smith',
    losingPitcherName: 'Bob Jones',
    savePitcherName: null,
    keyPlays: [],
    boxScore: { lineScore: { away: [], home: [] }, awayHits: 7, homeHits: 10, awayErrors: 1, homeErrors: 0 },
    playerHighlights: [],
    ...overrides,
  };
}

describe('buildGameSummaryPrompt', () => {
  it('returns system prompt mentioning sportswriter', () => {
    const result = buildGameSummaryPrompt(makeRequest());
    expect(result.system).toContain('sportswriter');
  });

  it('includes final score in prompt', () => {
    const result = buildGameSummaryPrompt(makeRequest());
    expect(result.prompt).toContain('5');
    expect(result.prompt).toContain('3');
  });

  it('includes pitcher names', () => {
    const result = buildGameSummaryPrompt(makeRequest());
    expect(result.prompt).toContain('John Smith');
    expect(result.prompt).toContain('Bob Jones');
  });

  it('includes save pitcher when present', () => {
    const result = buildGameSummaryPrompt(makeRequest({ savePitcherName: 'Tom Closer' }));
    expect(result.prompt).toContain('Tom Closer');
  });

  it('includes key plays text', () => {
    const result = buildGameSummaryPrompt(makeRequest({
      keyPlays: [{ inning: 3, description: 'grand slam by Rodriguez' }],
    }));
    expect(result.prompt).toContain('grand slam');
  });

  it('sets maxTokens to 300', () => {
    const result = buildGameSummaryPrompt(makeRequest());
    expect(result.maxTokens).toBe(300);
  });
});
