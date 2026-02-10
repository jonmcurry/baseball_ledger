// @vitest-environment jsdom
/**
 * Tests for useTradeEvaluation hook
 *
 * REQ-AI-006: Trade evaluation with template-first pattern.
 * REQ-AI-007: AI enhancement is opt-in.
 * REQ-AI-008: Graceful degradation to template fallback.
 */

const { mockEvaluateTrade } = vi.hoisted(() => ({
  mockEvaluateTrade: vi.fn(),
}));

vi.mock('@services/ai-service', () => ({
  evaluateTrade: mockEvaluateTrade,
}));

import { renderHook, act } from '@testing-library/react';
import { useTradeEvaluation } from '@hooks/useTradeEvaluation';
import type { TradeEvaluationRequest } from '@lib/types/ai';

const mockRequest: TradeEvaluationRequest = {
  managerStyle: 'balanced',
  managerName: 'Joe Manager',
  teamName: 'New York Yankees',
  playersOffered: [
    { name: 'Player A', position: 'SS', value: 70 },
  ],
  playersRequested: [
    { name: 'Player B', position: 'SP', value: 80 },
  ],
  teamNeeds: ['SP', 'CF'],
};

describe('useTradeEvaluation', () => {
  beforeEach(() => {
    mockEvaluateTrade.mockReset();
  });

  it('generates template evaluation immediately', () => {
    const { result } = renderHook(() => useTradeEvaluation(mockRequest));

    expect(result.current.recommendation).toBeTruthy();
    expect(result.current.reasoning).toBeTruthy();
    expect(result.current.source).toBe('template');
    expect(typeof result.current.valueDiff).toBe('number');
  });

  it('returns null fields when request is null', () => {
    const { result } = renderHook(() => useTradeEvaluation(null));

    expect(result.current.recommendation).toBeNull();
    expect(result.current.reasoning).toBeNull();
    expect(result.current.source).toBeNull();
  });

  it('fetchAiEval calls AI service and updates state', async () => {
    mockEvaluateTrade.mockResolvedValue({
      data: {
        recommendation: 'accept',
        reasoning: 'AI says great trade!',
        valueDiff: 15,
        source: 'claude',
      },
      meta: { requestId: 'req-1', timestamp: '2023-01-01T00:00:00Z' },
    });

    const { result } = renderHook(() => useTradeEvaluation(mockRequest));

    expect(result.current.source).toBe('template');

    await act(async () => {
      await result.current.fetchAiEval();
    });

    expect(mockEvaluateTrade).toHaveBeenCalledWith(mockRequest);
    expect(result.current.recommendation).toBe('accept');
    expect(result.current.reasoning).toBe('AI says great trade!');
    expect(result.current.source).toBe('claude');
  });

  it('fetchAiEval handles failure gracefully', async () => {
    mockEvaluateTrade.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTradeEvaluation(mockRequest));

    const originalRec = result.current.recommendation;

    await act(async () => {
      await result.current.fetchAiEval();
    });

    expect(result.current.source).toBe('template');
    expect(result.current.recommendation).toBe(originalRec);
  });

  it('fetchAiEval is no-op when request is null', async () => {
    const { result } = renderHook(() => useTradeEvaluation(null));

    await act(async () => {
      await result.current.fetchAiEval();
    });

    expect(mockEvaluateTrade).not.toHaveBeenCalled();
  });

  it('template evaluates based on manager style threshold', () => {
    const aggressiveRequest = { ...mockRequest, managerStyle: 'aggressive' as const };
    const conservativeRequest = { ...mockRequest, managerStyle: 'conservative' as const };

    const { result: aggressive } = renderHook(() => useTradeEvaluation(aggressiveRequest));
    const { result: conservative } = renderHook(() => useTradeEvaluation(conservativeRequest));

    // Both should produce evaluations with the template
    expect(aggressive.current.recommendation).toBeTruthy();
    expect(conservative.current.recommendation).toBeTruthy();
  });
});
