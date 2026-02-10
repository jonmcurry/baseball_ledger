// @vitest-environment jsdom
/**
 * Tests for useDraftReasoning hook
 *
 * REQ-AI-006: Draft reasoning with template-first pattern.
 * REQ-AI-007: AI enhancement is opt-in.
 * REQ-AI-008: Graceful degradation to template fallback.
 */

const { mockGenerateDraftReasoning } = vi.hoisted(() => ({
  mockGenerateDraftReasoning: vi.fn(),
}));

vi.mock('@services/ai-service', () => ({
  generateDraftReasoning: mockGenerateDraftReasoning,
}));

import { renderHook, act } from '@testing-library/react';
import { useDraftReasoning } from '@hooks/useDraftReasoning';
import type { DraftReasoningRequest } from '@lib/types/ai';

const mockRequest: DraftReasoningRequest = {
  round: 1,
  managerStyle: 'balanced',
  managerName: 'Joe Manager',
  teamName: 'New York Yankees',
  pickedPlayerName: 'Star Player',
  pickedPlayerPosition: 'SS',
  pickedPlayerValue: 85,
  alternativePlayers: [
    { name: 'Alt Player 1', position: 'CF', value: 80 },
    { name: 'Alt Player 2', position: 'SP', value: 78 },
  ],
  teamNeeds: ['SS', 'CF'],
};

describe('useDraftReasoning', () => {
  beforeEach(() => {
    mockGenerateDraftReasoning.mockReset();
  });

  it('generates template reasoning immediately', () => {
    const { result } = renderHook(() => useDraftReasoning(mockRequest));

    expect(result.current.reasoning).toBeTruthy();
    expect(result.current.source).toBe('template');
  });

  it('returns null fields when request is null', () => {
    const { result } = renderHook(() => useDraftReasoning(null));

    expect(result.current.reasoning).toBeNull();
    expect(result.current.source).toBeNull();
  });

  it('fetchAiReasoning calls AI service and updates state', async () => {
    mockGenerateDraftReasoning.mockResolvedValue({
      data: {
        reasoning: 'AI analysis: Star Player fills SS need perfectly.',
        source: 'claude',
      },
      meta: { requestId: 'req-1', timestamp: '2023-01-01T00:00:00Z' },
    });

    const { result } = renderHook(() => useDraftReasoning(mockRequest));

    expect(result.current.source).toBe('template');

    await act(async () => {
      await result.current.fetchAiReasoning();
    });

    expect(mockGenerateDraftReasoning).toHaveBeenCalledWith(mockRequest);
    expect(result.current.reasoning).toBe('AI analysis: Star Player fills SS need perfectly.');
    expect(result.current.source).toBe('claude');
  });

  it('fetchAiReasoning handles failure gracefully', async () => {
    mockGenerateDraftReasoning.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useDraftReasoning(mockRequest));

    const originalReasoning = result.current.reasoning;

    await act(async () => {
      await result.current.fetchAiReasoning();
    });

    expect(result.current.source).toBe('template');
    expect(result.current.reasoning).toBe(originalReasoning);
  });

  it('fetchAiReasoning is no-op when request is null', async () => {
    const { result } = renderHook(() => useDraftReasoning(null));

    await act(async () => {
      await result.current.fetchAiReasoning();
    });

    expect(mockGenerateDraftReasoning).not.toHaveBeenCalled();
  });
});
