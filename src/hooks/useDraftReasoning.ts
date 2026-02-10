/**
 * useDraftReasoning Hook
 *
 * Generates template draft reasoning immediately (REQ-AI-008 fallback).
 * Optional fetchAiReasoning() calls Claude API (REQ-AI-007 opt-in).
 *
 * Layer 5: Hook. Composes template engine + AI service.
 */

import { useMemo, useCallback, useState } from 'react';
import type { DraftReasoningRequest, AiSource } from '@lib/types/ai';
import { generateDraftReasoningTemplate } from '@lib/ai/template-draft-reasoning';
import { generateDraftReasoning } from '@services/ai-service';

export interface UseDraftReasoningReturn {
  reasoning: string | null;
  source: AiSource | null;
  fetchAiReasoning: () => Promise<void>;
}

export function useDraftReasoning(
  request: DraftReasoningRequest | null,
): UseDraftReasoningReturn {
  const [aiOverride, setAiOverride] = useState<{
    reasoning: string;
    source: AiSource;
  } | null>(null);

  const template = useMemo(() => {
    if (!request) return null;
    return generateDraftReasoningTemplate(request);
  }, [request]);

  const reasoning = aiOverride?.reasoning ?? template?.reasoning ?? null;
  const source = aiOverride?.source ?? template?.source ?? null;

  const fetchAiReasoning = useCallback(async () => {
    if (!request) return;

    try {
      const response = await generateDraftReasoning(request);
      setAiOverride({
        reasoning: response.data.reasoning,
        source: response.data.source,
      });
    } catch {
      // REQ-AI-008: Graceful degradation -- keep template on failure
    }
  }, [request]);

  return { reasoning, source, fetchAiReasoning };
}
