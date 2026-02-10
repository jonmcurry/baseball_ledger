// @vitest-environment jsdom
/**
 * Tests for useManagerExplanations hook
 *
 * REQ-AI-006: Manager decision explanations with template-first pattern.
 * REQ-AI-007: AI enhancement is opt-in per decision.
 * REQ-AI-008: Graceful degradation to template fallback.
 */

const { mockExplainManagerDecision } = vi.hoisted(() => ({
  mockExplainManagerDecision: vi.fn(),
}));

vi.mock('@services/ai-service', () => ({
  explainManagerDecision: mockExplainManagerDecision,
}));

import { renderHook, act } from '@testing-library/react';
import { useManagerExplanations } from '@hooks/useManagerExplanations';
import type { DetectedDecision } from '@lib/ai/decision-detector';

const mockDecisions: DetectedDecision[] = [
  { type: 'intentional_walk', playIndex: 10, inning: 7, outs: 1, scoreDiff: -1 },
  { type: 'pull_pitcher', playIndex: 25, inning: 8, outs: 0, scoreDiff: 2 },
];

describe('useManagerExplanations', () => {
  beforeEach(() => {
    mockExplainManagerDecision.mockReset();
  });

  it('generates template explanations for all decisions', () => {
    const { result } = renderHook(() =>
      useManagerExplanations(mockDecisions, 'balanced', 'Joe Manager'),
    );

    expect(result.current.explanations).toHaveLength(2);
    expect(result.current.explanations[0].source).toBe('template');
    expect(result.current.explanations[1].source).toBe('template');
    expect(result.current.explanations[0].explanation).toBeTruthy();
  });

  it('returns empty array when no decisions', () => {
    const { result } = renderHook(() =>
      useManagerExplanations([], 'balanced', 'Joe Manager'),
    );

    expect(result.current.explanations).toEqual([]);
  });

  it('enhanceDecision calls AI service and updates specific entry', async () => {
    mockExplainManagerDecision.mockResolvedValue({
      data: {
        explanation: 'AI analysis: the IBB was strategically sound.',
        source: 'claude',
      },
      meta: { requestId: 'req-1', timestamp: '2023-01-01T00:00:00Z' },
    });

    const { result } = renderHook(() =>
      useManagerExplanations(mockDecisions, 'balanced', 'Joe Manager'),
    );

    await act(async () => {
      await result.current.enhanceDecision(0);
    });

    expect(mockExplainManagerDecision).toHaveBeenCalledTimes(1);
    expect(result.current.explanations[0].source).toBe('claude');
    expect(result.current.explanations[0].explanation).toBe(
      'AI analysis: the IBB was strategically sound.',
    );
    // Second decision should still be template
    expect(result.current.explanations[1].source).toBe('template');
  });

  it('enhanceDecision handles failure gracefully', async () => {
    mockExplainManagerDecision.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() =>
      useManagerExplanations(mockDecisions, 'balanced', 'Joe Manager'),
    );

    const original = result.current.explanations[0].explanation;

    await act(async () => {
      await result.current.enhanceDecision(0);
    });

    expect(result.current.explanations[0].source).toBe('template');
    expect(result.current.explanations[0].explanation).toBe(original);
  });

  it('enhanceDecision ignores out-of-range index', async () => {
    const { result } = renderHook(() =>
      useManagerExplanations(mockDecisions, 'balanced', 'Joe Manager'),
    );

    await act(async () => {
      await result.current.enhanceDecision(99);
    });

    expect(mockExplainManagerDecision).not.toHaveBeenCalled();
  });
});
