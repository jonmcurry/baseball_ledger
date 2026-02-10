/**
 * useManagerExplanations Hook
 *
 * Generates template explanations for detected manager decisions (REQ-AI-008).
 * Optional enhanceDecision(index) calls Claude API (REQ-AI-007 opt-in).
 *
 * Layer 5: Hook. Composes template engine + AI service.
 */

import { useMemo, useCallback, useState } from 'react';
import type { ManagerDecisionType, AiSource } from '@lib/types/ai';
import type { ManagerStyle } from '@lib/simulation/manager-profiles';
import type { DetectedDecision } from '@lib/ai/decision-detector';
import { generateManagerExplanationTemplate } from '@lib/ai/template-manager-explanation';
import { explainManagerDecision } from '@services/ai-service';

export interface ExplanationEntry {
  readonly type: ManagerDecisionType;
  readonly inning: number;
  readonly explanation: string;
  readonly source: AiSource;
}

export interface UseManagerExplanationsReturn {
  explanations: ExplanationEntry[];
  enhanceDecision: (index: number) => Promise<void>;
}

export function useManagerExplanations(
  decisions: readonly DetectedDecision[],
  managerStyle: ManagerStyle,
  managerName: string,
): UseManagerExplanationsReturn {
  const [overrides, setOverrides] = useState<Map<number, ExplanationEntry>>(new Map());

  const templateEntries = useMemo(() => {
    return decisions.map((d): ExplanationEntry => {
      const response = generateManagerExplanationTemplate({
        managerName,
        managerStyle,
        decision: d.type,
        inning: d.inning,
        outs: d.outs,
        scoreDiff: d.scoreDiff,
        gameContext: '',
      });
      return {
        type: d.type,
        inning: d.inning,
        explanation: response.explanation,
        source: response.source,
      };
    });
  }, [decisions, managerStyle, managerName]);

  const explanations = useMemo(() => {
    return templateEntries.map((entry, i) => overrides.get(i) ?? entry);
  }, [templateEntries, overrides]);

  const enhanceDecision = useCallback(async (index: number) => {
    if (index < 0 || index >= decisions.length) return;

    const d = decisions[index];

    try {
      const response = await explainManagerDecision({
        managerName,
        managerStyle,
        decision: d.type,
        inning: d.inning,
        outs: d.outs,
        scoreDiff: d.scoreDiff,
        gameContext: '',
      });

      setOverrides((prev) => {
        const next = new Map(prev);
        next.set(index, {
          type: d.type,
          inning: d.inning,
          explanation: response.data.explanation,
          source: response.data.source,
        });
        return next;
      });
    } catch {
      // REQ-AI-008: Graceful degradation -- keep template on failure
    }
  }, [decisions, managerStyle, managerName]);

  return { explanations, enhanceDecision };
}
