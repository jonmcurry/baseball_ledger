/**
 * useTradeEvaluation Hook
 *
 * Generates template trade evaluation immediately (REQ-AI-008 fallback).
 * Optional fetchAiEval() calls Claude API (REQ-AI-007 opt-in).
 *
 * Layer 5: Hook. Composes template engine + AI service.
 */

import { useMemo, useCallback, useState } from 'react';
import type { TradeEvaluationRequest, AiSource, PlayerBreakdown } from '@lib/types/ai';
import { evaluateTradeTemplate } from '@lib/ai/template-trade-eval';
import { evaluateTrade } from '@services/ai-service';

export interface UseTradeEvaluationReturn {
  recommendation: 'accept' | 'reject' | 'counter' | null;
  reasoning: string | null;
  valueDiff: number;
  source: AiSource | null;
  playerBreakdowns: ReadonlyArray<PlayerBreakdown> | undefined;
  fetchAiEval: () => Promise<void>;
}

export function useTradeEvaluation(
  request: TradeEvaluationRequest | null,
): UseTradeEvaluationReturn {
  const [aiOverride, setAiOverride] = useState<{
    recommendation: 'accept' | 'reject' | 'counter';
    reasoning: string;
    valueDiff: number;
    source: AiSource;
  } | null>(null);

  const template = useMemo(() => {
    if (!request) return null;
    return evaluateTradeTemplate(request);
  }, [request]);

  const recommendation = aiOverride?.recommendation ?? template?.recommendation ?? null;
  const reasoning = aiOverride?.reasoning ?? template?.reasoning ?? null;
  const valueDiff = aiOverride?.valueDiff ?? template?.valueDiff ?? 0;
  const source = aiOverride?.source ?? template?.source ?? null;
  const playerBreakdowns = template?.playerBreakdowns;

  const fetchAiEval = useCallback(async () => {
    if (!request) return;

    try {
      const response = await evaluateTrade(request);
      setAiOverride({
        recommendation: response.data.recommendation,
        reasoning: response.data.reasoning,
        valueDiff: response.data.valueDiff,
        source: response.data.source,
      });
    } catch {
      // REQ-AI-008: Graceful degradation -- keep template on failure
    }
  }, [request]);

  return { recommendation, reasoning, valueDiff, source, playerBreakdowns, fetchAiEval };
}
