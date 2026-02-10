// @vitest-environment jsdom
/**
 * Tests for useGameSummary hook
 *
 * REQ-AI-006: Game summary with template-first pattern.
 * REQ-AI-007: AI enhancement is opt-in.
 * REQ-AI-008: Graceful degradation to template fallback.
 */

const { mockGenerateGameSummary } = vi.hoisted(() => ({
  mockGenerateGameSummary: vi.fn(),
}));

vi.mock('@services/ai-service', () => ({
  generateGameSummary: mockGenerateGameSummary,
}));

import { renderHook, act } from '@testing-library/react';
import { useGameSummary } from '@hooks/useGameSummary';
import type { GameSummaryRequest } from '@lib/types/ai';

const mockRequest: GameSummaryRequest = {
  homeTeamName: 'New York Yankees',
  awayTeamName: 'Boston Red Sox',
  homeScore: 5,
  awayScore: 3,
  innings: 9,
  winningPitcherName: 'Ace Johnson',
  losingPitcherName: 'Bad Luck Pete',
  savePitcherName: 'Closer Smith',
  keyPlays: [
    { inning: 3, description: 'Three-run homer by Jones' },
    { inning: 7, description: 'Double play ends the threat' },
  ],
  boxScore: {
    lineScore: { away: [0, 1, 0, 2, 0, 0, 0, 0, 0], home: [1, 0, 3, 0, 0, 0, 1, 0, 0] },
    awayHits: 7,
    homeHits: 10,
    awayErrors: 1,
    homeErrors: 0,
  },
  playerHighlights: [
    { playerName: 'Jones', statLine: '2-4, HR, 3 RBI' },
  ],
};

describe('useGameSummary', () => {
  beforeEach(() => {
    mockGenerateGameSummary.mockReset();
  });

  it('generates template summary immediately', () => {
    const { result } = renderHook(() => useGameSummary(mockRequest));

    expect(result.current.headline).toBeTruthy();
    expect(result.current.summary).toBeTruthy();
    expect(result.current.source).toBe('template');
  });

  it('headline reflects game outcome', () => {
    const { result } = renderHook(() => useGameSummary(mockRequest));

    // Template headline should mention the winning team
    expect(result.current.headline).toContain('Yankees');
  });

  it('summary includes key information', () => {
    const { result } = renderHook(() => useGameSummary(mockRequest));

    // Template summary should mention score and/or teams
    expect(result.current.summary).toBeTruthy();
    expect(result.current.summary.length).toBeGreaterThan(20);
  });

  it('returns null headline and summary when request is null', () => {
    const { result } = renderHook(() => useGameSummary(null));

    expect(result.current.headline).toBeNull();
    expect(result.current.summary).toBeNull();
    expect(result.current.source).toBeNull();
  });

  it('fetchAiSummary calls AI service and updates state', async () => {
    mockGenerateGameSummary.mockResolvedValue({
      data: {
        headline: 'AI: Yankees Power Past Red Sox',
        summary: 'In a thrilling contest at Yankee Stadium...',
        source: 'claude',
      },
      meta: { requestId: 'req-1', timestamp: '2023-01-01T00:00:00Z' },
    });

    const { result } = renderHook(() => useGameSummary(mockRequest));

    expect(result.current.source).toBe('template');

    await act(async () => {
      await result.current.fetchAiSummary();
    });

    expect(mockGenerateGameSummary).toHaveBeenCalledWith(mockRequest);
    expect(result.current.headline).toBe('AI: Yankees Power Past Red Sox');
    expect(result.current.summary).toBe('In a thrilling contest at Yankee Stadium...');
    expect(result.current.source).toBe('claude');
  });

  it('fetchAiSummary handles failure gracefully (keeps template)', async () => {
    mockGenerateGameSummary.mockRejectedValue(new Error('API timeout'));

    const { result } = renderHook(() => useGameSummary(mockRequest));

    const originalHeadline = result.current.headline;

    await act(async () => {
      await result.current.fetchAiSummary();
    });

    expect(result.current.source).toBe('template');
    expect(result.current.headline).toBe(originalHeadline);
  });

  it('fetchAiSummary is no-op when request is null', async () => {
    const { result } = renderHook(() => useGameSummary(null));

    await act(async () => {
      await result.current.fetchAiSummary();
    });

    expect(mockGenerateGameSummary).not.toHaveBeenCalled();
  });
});
