// @vitest-environment jsdom
/**
 * Tests for useCommentary hook
 *
 * REQ-AI-006: Play-by-play commentary with template-first pattern.
 * REQ-AI-007: No bulk AI calls; opt-in per play.
 * REQ-AI-008: Graceful degradation to template fallback.
 */

const { mockGenerateCommentary } = vi.hoisted(() => ({
  mockGenerateCommentary: vi.fn(),
}));

vi.mock('@services/ai-service', () => ({
  generateCommentary: mockGenerateCommentary,
}));

vi.mock('@lib/ai/template-commentary', async (importOriginal) => {
  const original = await importOriginal<typeof import('@lib/ai/template-commentary')>();
  return {
    ...original,
    generateTemplateCommentary: vi.fn(original.generateTemplateCommentary),
  };
});

import { renderHook, act } from '@testing-library/react';
import { useCommentary } from '@hooks/useCommentary';
import type { PlayByPlayEntry } from '@lib/types/game';
import { OutcomeCategory } from '@lib/types/game';
import type { CommentaryStyle } from '@lib/types/ai';

function createPlay(overrides?: Partial<PlayByPlayEntry>): PlayByPlayEntry {
  return {
    inning: 1,
    halfInning: 'top',
    outs: 0,
    batterId: 'batter-1',
    pitcherId: 'pitcher-1',
    cardPosition: 7,
    cardValue: 8,
    outcomeTableRow: 15,
    outcome: OutcomeCategory.SINGLE_CLEAN,
    description: 'Smith: SINGLE_CLEAN',
    basesAfter: { first: 'batter-1', second: null, third: null },
    scoreAfter: { home: 0, away: 0 },
    ...overrides,
  };
}

const mockPlayerNames: Record<string, string> = {
  'batter-1': 'John Smith',
  'batter-2': 'Mike Jones',
  'pitcher-1': 'Bob Johnson',
  'pitcher-2': 'Dave Wilson',
};

describe('useCommentary', () => {
  beforeEach(() => {
    mockGenerateCommentary.mockReset();
  });

  it('returns empty entries when plays is empty', () => {
    const { result } = renderHook(() =>
      useCommentary([], mockPlayerNames, 'newspaper'),
    );

    expect(result.current.entries).toEqual([]);
  });

  it('generates template commentary for each play', () => {
    const plays = [
      createPlay({ batterId: 'batter-1', pitcherId: 'pitcher-1', outcome: OutcomeCategory.SINGLE_CLEAN }),
      createPlay({ batterId: 'batter-2', pitcherId: 'pitcher-1', outcome: OutcomeCategory.HOME_RUN, inning: 3 }),
    ];

    const { result } = renderHook(() =>
      useCommentary(plays, mockPlayerNames, 'newspaper'),
    );

    expect(result.current.entries).toHaveLength(2);
    expect(result.current.entries[0].source).toBe('template');
    expect(result.current.entries[1].source).toBe('template');
    // Template text should contain player names (interpolated)
    expect(result.current.entries[0].text).toBeTruthy();
    expect(result.current.entries[1].text).toBeTruthy();
  });

  it('includes inning info in each entry', () => {
    const plays = [
      createPlay({ inning: 1 }),
      createPlay({ inning: 5 }),
    ];

    const { result } = renderHook(() =>
      useCommentary(plays, mockPlayerNames, 'newspaper'),
    );

    expect(result.current.entries[0].inning).toBe(1);
    expect(result.current.entries[1].inning).toBe(5);
  });

  it('uses the provided commentary style', () => {
    const plays = [createPlay()];

    const { result: result1 } = renderHook(() =>
      useCommentary(plays, mockPlayerNames, 'newspaper'),
    );
    const { result: result2 } = renderHook(() =>
      useCommentary(plays, mockPlayerNames, 'radio'),
    );

    // Both should produce template commentary (different styles may produce different text)
    expect(result1.current.entries[0].source).toBe('template');
    expect(result2.current.entries[0].source).toBe('template');
  });

  it('falls back to description when player name is missing', () => {
    const plays = [createPlay({ batterId: 'unknown-player' })];
    const sparseNames = { 'pitcher-1': 'Bob Johnson' };

    const { result } = renderHook(() =>
      useCommentary(plays, sparseNames, 'newspaper'),
    );

    // Should still produce an entry (template uses "Unknown" or similar fallback)
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].text).toBeTruthy();
  });

  it('enhancePlay calls AI service and updates entry', async () => {
    mockGenerateCommentary.mockResolvedValue({
      data: { text: 'AI-enhanced commentary about a brilliant single!', source: 'claude' },
      meta: { requestId: 'req-1', timestamp: '2023-01-01T00:00:00Z' },
    });

    const plays = [createPlay()];

    const { result } = renderHook(() =>
      useCommentary(plays, mockPlayerNames, 'newspaper'),
    );

    expect(result.current.entries[0].source).toBe('template');

    await act(async () => {
      await result.current.enhancePlay(0);
    });

    expect(mockGenerateCommentary).toHaveBeenCalledTimes(1);
    expect(result.current.entries[0].source).toBe('claude');
    expect(result.current.entries[0].text).toBe('AI-enhanced commentary about a brilliant single!');
  });

  it('enhancePlay sends correct CommentaryRequest', async () => {
    mockGenerateCommentary.mockResolvedValue({
      data: { text: 'Enhanced', source: 'claude' },
      meta: { requestId: 'req-1', timestamp: '2023-01-01T00:00:00Z' },
    });

    const plays = [createPlay({
      batterId: 'batter-1',
      pitcherId: 'pitcher-1',
      outcome: OutcomeCategory.HOME_RUN,
      inning: 7,
      halfInning: 'bottom',
      outs: 2,
      scoreAfter: { home: 3, away: 5 },
    })];

    const { result } = renderHook(() =>
      useCommentary(plays, mockPlayerNames, 'radio'),
    );

    await act(async () => {
      await result.current.enhancePlay(0);
    });

    expect(mockGenerateCommentary).toHaveBeenCalledWith(
      expect.objectContaining({
        batterId: 'batter-1',
        batterName: 'John Smith',
        pitcherId: 'pitcher-1',
        pitcherName: 'Bob Johnson',
        outcome: OutcomeCategory.HOME_RUN,
        inning: 7,
        halfInning: 'bottom',
        outs: 2,
        style: 'radio',
      }),
    );
  });

  it('enhancePlay handles API failure gracefully (keeps template)', async () => {
    mockGenerateCommentary.mockRejectedValue(new Error('Network error'));

    const plays = [createPlay()];

    const { result } = renderHook(() =>
      useCommentary(plays, mockPlayerNames, 'newspaper'),
    );

    const originalText = result.current.entries[0].text;

    await act(async () => {
      await result.current.enhancePlay(0);
    });

    // Should keep original template text on failure
    expect(result.current.entries[0].source).toBe('template');
    expect(result.current.entries[0].text).toBe(originalText);
  });

  it('enhancePlay ignores out-of-range index', async () => {
    const plays = [createPlay()];

    const { result } = renderHook(() =>
      useCommentary(plays, mockPlayerNames, 'newspaper'),
    );

    await act(async () => {
      await result.current.enhancePlay(99);
    });

    expect(mockGenerateCommentary).not.toHaveBeenCalled();
  });
});
