/**
 * DraftReasoningPanel
 *
 * Displays AI reasoning for the last draft pick.
 * Template-first pattern with optional Claude enhancement (REQ-AI-007).
 *
 * Layer 7: Feature composition. Composes hook + presentational elements.
 */

import type { DraftReasoningRequest } from '@lib/types/ai';
import { useDraftReasoning } from '@hooks/useDraftReasoning';

export interface DraftReasoningPanelProps {
  readonly request: DraftReasoningRequest | null;
}

export function DraftReasoningPanel({ request }: DraftReasoningPanelProps) {
  const { reasoning, source, fetchAiReasoning } = useDraftReasoning(request);

  if (!reasoning) return null;

  return (
    <div className="rounded-card border border-sandstone bg-old-lace/50 px-gutter py-3">
      <div className="flex items-center gap-2">
        <h4 className="font-headline text-xs font-bold text-ballpark">Pick Reasoning</h4>
        <span className="rounded-button bg-sandstone px-1.5 py-0.5 text-[10px] font-medium text-muted">
          {source}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{reasoning}</p>
      {source === 'template' && (
        <button
          type="button"
          className="mt-2 text-xs text-ballpark underline hover:text-ink"
          onClick={fetchAiReasoning}
        >
          Get AI Reasoning
        </button>
      )}
    </div>
  );
}

export default DraftReasoningPanel;
