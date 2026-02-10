/**
 * useCommentary Hook
 *
 * Generates template commentary for all plays (REQ-AI-008 fallback).
 * Optional enhancePlay(index) calls Claude API (REQ-AI-007 opt-in).
 *
 * Layer 5: Hook. Composes template engine + AI service.
 */

import { useMemo, useCallback, useState } from 'react';
import type { PlayByPlayEntry } from '@lib/types/game';
import type { CommentaryRequest, CommentaryStyle, AiSource } from '@lib/types/ai';
import { generateTemplateCommentary } from '@lib/ai/template-commentary';
import { generateCommentary } from '@services/ai-service';

export interface CommentaryEntryData {
  readonly text: string;
  readonly source: AiSource;
  readonly inning: number;
}

export interface UseCommentaryReturn {
  entries: CommentaryEntryData[];
  enhancePlay: (index: number) => Promise<void>;
}

function buildRequest(
  play: PlayByPlayEntry,
  playerNames: Record<string, string>,
  style: CommentaryStyle,
): CommentaryRequest {
  const scoreAfter = play.scoreAfter ?? { home: 0, away: 0 };
  const scoreDiff = scoreAfter.home - scoreAfter.away;
  const bases = play.basesAfter ?? { first: null, second: null, third: null };
  const runnersOn = (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0);

  return {
    batterId: play.batterId,
    batterName: playerNames[play.batterId] ?? 'Unknown',
    pitcherId: play.pitcherId,
    pitcherName: playerNames[play.pitcherId] ?? 'Unknown',
    outcome: play.outcome,
    inning: play.inning,
    halfInning: play.halfInning,
    outs: play.outs,
    scoreDiff,
    runnersOn,
    style,
  };
}

export function useCommentary(
  plays: readonly PlayByPlayEntry[],
  playerNames: Record<string, string>,
  style: CommentaryStyle,
): UseCommentaryReturn {
  const [overrides, setOverrides] = useState<Map<number, CommentaryEntryData>>(new Map());

  const templateEntries = useMemo(() => {
    return plays.map((play): CommentaryEntryData => {
      const request = buildRequest(play, playerNames, style);
      const response = generateTemplateCommentary(request);
      return {
        text: response.text,
        source: response.source,
        inning: play.inning,
      };
    });
  }, [plays, playerNames, style]);

  const entries = useMemo(() => {
    return templateEntries.map((entry, i) => overrides.get(i) ?? entry);
  }, [templateEntries, overrides]);

  const enhancePlay = useCallback(async (index: number) => {
    if (index < 0 || index >= plays.length) return;

    const play = plays[index];
    const request = buildRequest(play, playerNames, style);

    try {
      const response = await generateCommentary(request);
      setOverrides((prev) => {
        const next = new Map(prev);
        next.set(index, {
          text: response.data.text,
          source: response.data.source,
          inning: play.inning,
        });
        return next;
      });
    } catch {
      // REQ-AI-008: Graceful degradation -- keep template on failure
    }
  }, [plays, playerNames, style]);

  return { entries, enhancePlay };
}
