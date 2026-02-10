/**
 * useGameSummary Hook
 *
 * Generates template game summary immediately (REQ-AI-008 fallback).
 * Optional fetchAiSummary() calls Claude API (REQ-AI-007 opt-in).
 *
 * Layer 5: Hook. Composes template engine + AI service.
 */

import { useMemo, useCallback, useState } from 'react';
import type { GameSummaryRequest, AiSource } from '@lib/types/ai';
import { generateTemplateSummary } from '@lib/ai/template-game-summary';
import { generateGameSummary } from '@services/ai-service';

export interface UseGameSummaryReturn {
  headline: string | null;
  summary: string | null;
  source: AiSource | null;
  fetchAiSummary: () => Promise<void>;
}

export function useGameSummary(request: GameSummaryRequest | null): UseGameSummaryReturn {
  const [aiOverride, setAiOverride] = useState<{
    headline: string;
    summary: string;
    source: AiSource;
  } | null>(null);

  const template = useMemo(() => {
    if (!request) return null;
    return generateTemplateSummary(request);
  }, [request]);

  const headline = aiOverride?.headline ?? template?.headline ?? null;
  const summary = aiOverride?.summary ?? template?.summary ?? null;
  const source = aiOverride?.source ?? template?.source ?? null;

  const fetchAiSummary = useCallback(async () => {
    if (!request) return;

    try {
      const response = await generateGameSummary(request);
      setAiOverride({
        headline: response.data.headline,
        summary: response.data.summary,
        source: response.data.source,
      });
    } catch {
      // REQ-AI-008: Graceful degradation -- keep template on failure
    }
  }, [request]);

  return { headline, summary, source, fetchAiSummary };
}
