/**
 * GameSummaryPanel
 *
 * Displays game summary headline + text with optional AI enhancement.
 * Template-first pattern: template summary renders immediately,
 * "Generate AI Recap" button calls Claude (REQ-AI-007 opt-in).
 *
 * Layer 7: Feature composition. Composes hook + presentational elements.
 */

import type { GameSummaryRequest } from '@lib/types/ai';
import { useGameSummary } from '@hooks/useGameSummary';

export interface GameSummaryPanelProps {
  readonly request: GameSummaryRequest | null;
}

export function GameSummaryPanel({ request }: GameSummaryPanelProps) {
  const { headline, summary, source, fetchAiSummary } = useGameSummary(request);

  if (!headline) return null;

  return (
    <div className="rounded-card border border-sandstone bg-old-lace/50 px-gutter py-3">
      <h3 className="font-headline text-sm font-bold text-ballpark">Game Summary</h3>
      <p className="mt-1 font-headline text-base font-bold text-ink">{headline}</p>
      {summary && (
        <p className="mt-1 text-xs leading-relaxed text-muted">{summary}</p>
      )}
      {source === 'template' && (
        <button
          type="button"
          className="mt-2 text-xs text-ballpark underline hover:text-ink"
          onClick={fetchAiSummary}
        >
          Generate AI Recap
        </button>
      )}
    </div>
  );
}

export default GameSummaryPanel;
