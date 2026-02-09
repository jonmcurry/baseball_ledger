/**
 * Template Game Summary Tests
 */

import type { GameSummaryRequest } from '../../../../src/lib/types/ai';
import { generateTemplateSummary } from '../../../../src/lib/ai/template-game-summary';

function makeRequest(overrides: Partial<GameSummaryRequest> = {}): GameSummaryRequest {
  return {
    homeTeamName: 'New York Sluggers',
    awayTeamName: 'Boston Aces',
    homeScore: 5,
    awayScore: 3,
    innings: 9,
    winningPitcherName: 'John Smith',
    losingPitcherName: 'Bob Jones',
    savePitcherName: null,
    keyPlays: [],
    boxScore: {
      lineScore: { away: [0, 1, 0, 0, 2, 0, 0, 0, 0], home: [1, 0, 2, 0, 0, 1, 0, 1, 0] },
      awayHits: 7,
      homeHits: 10,
      awayErrors: 1,
      homeErrors: 0,
    },
    playerHighlights: [],
    ...overrides,
  };
}

describe('generateTemplateSummary', () => {
  it('returns source "template"', () => {
    const result = generateTemplateSummary(makeRequest());
    expect(result.source).toBe('template');
  });

  it('headline contains winner team name', () => {
    const result = generateTemplateSummary(makeRequest());
    expect(result.headline).toContain('Sluggers');
  });

  it('headline contains score', () => {
    const result = generateTemplateSummary(makeRequest());
    expect(result.headline).toContain('5');
    expect(result.headline).toContain('3');
  });

  it('headline uses "Rout" for 7+ run differential', () => {
    const result = generateTemplateSummary(makeRequest({ homeScore: 12, awayScore: 2 }));
    expect(result.headline).toContain('Rout');
  });

  it('headline uses "Cruise" for 4-6 run differential', () => {
    const result = generateTemplateSummary(makeRequest({ homeScore: 8, awayScore: 3 }));
    expect(result.headline).toContain('Cruise');
  });

  it('headline uses "Nip" for 1-run differential', () => {
    const result = generateTemplateSummary(makeRequest({ homeScore: 3, awayScore: 2 }));
    expect(result.headline).toContain('Nip');
  });

  it('headline mentions extra innings', () => {
    const result = generateTemplateSummary(makeRequest({ innings: 12 }));
    expect(result.headline).toContain('12 Innings');
  });

  it('summary includes winning pitcher', () => {
    const result = generateTemplateSummary(makeRequest());
    expect(result.summary).toContain('John Smith');
    expect(result.summary).toContain('earned the win');
  });

  it('summary includes losing pitcher', () => {
    const result = generateTemplateSummary(makeRequest());
    expect(result.summary).toContain('Bob Jones');
    expect(result.summary).toContain('took the loss');
  });

  it('summary includes save pitcher when present', () => {
    const result = generateTemplateSummary(makeRequest({ savePitcherName: 'Tom Closer' }));
    expect(result.summary).toContain('Tom Closer');
    expect(result.summary).toContain('save');
  });

  it('summary omits save when none', () => {
    const result = generateTemplateSummary(makeRequest());
    expect(result.summary).not.toContain('save');
  });

  it('summary includes key plays', () => {
    const result = generateTemplateSummary(makeRequest({
      keyPlays: [{ inning: 3, description: 'a grand slam by Rodriguez' }],
    }));
    expect(result.summary).toContain('3rd');
    expect(result.summary).toContain('grand slam by Rodriguez');
  });

  it('summary includes player highlights', () => {
    const result = generateTemplateSummary(makeRequest({
      playerHighlights: [{ playerName: 'Ken Griffey', statLine: '3-for-4 with 2 RBI' }],
    }));
    expect(result.summary).toContain('Ken Griffey');
    expect(result.summary).toContain('3-for-4 with 2 RBI');
  });

  it('summary includes line score', () => {
    const result = generateTemplateSummary(makeRequest());
    expect(result.summary).toContain('10H');
    expect(result.summary).toContain('0E');
  });

  it('away team wins when away score is higher', () => {
    const result = generateTemplateSummary(makeRequest({ homeScore: 2, awayScore: 7 }));
    expect(result.headline).toContain('Aces');
    expect(result.headline).toContain('Cruise');
  });

  it('handles ordinals correctly (11th, 12th, 13th)', () => {
    const result = generateTemplateSummary(makeRequest({
      keyPlays: [
        { inning: 11, description: 'a walk-off' },
        { inning: 12, description: 'a strikeout' },
        { inning: 13, description: 'a home run' },
      ],
    }));
    expect(result.summary).toContain('11th');
    expect(result.summary).toContain('12th');
    expect(result.summary).toContain('13th');
  });
});
