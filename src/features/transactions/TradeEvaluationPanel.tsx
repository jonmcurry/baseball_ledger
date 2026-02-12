/**
 * TradeEvaluationPanel
 *
 * Displays trade evaluation: recommendation badge, reasoning, value diff.
 * Template-first pattern with optional AI enhancement (REQ-AI-007).
 *
 * Layer 7: Feature composition. Composes hook + presentational elements.
 */

import type { TradeEvaluationRequest } from '@lib/types/ai';
import { useTradeEvaluation } from '@hooks/useTradeEvaluation';

export interface TradeEvaluationPanelProps {
  readonly request: TradeEvaluationRequest | null;
}

const BADGE_COLORS: Record<string, string> = {
  accept: 'bg-green-700 text-ink',
  reject: 'bg-red-800 text-ink',
  counter: 'bg-amber-700 text-ink',
};

export function TradeEvaluationPanel({ request }: TradeEvaluationPanelProps) {
  const { recommendation, reasoning, valueDiff, source, fetchAiEval } =
    useTradeEvaluation(request);

  if (!recommendation) return null;

  const badgeColor = BADGE_COLORS[recommendation] ?? 'bg-sandstone text-ink';
  const diffLabel = valueDiff >= 0 ? `+${valueDiff}` : `${valueDiff}`;

  return (
    <div className="rounded-card border border-sandstone bg-old-lace/50 px-gutter py-3">
      <h4 className="font-headline text-xs font-bold text-muted">Trade Evaluation</h4>

      <div className="mt-2 flex items-center gap-2">
        <span
          className={`rounded-button px-2 py-0.5 text-xs font-bold uppercase ${badgeColor}`}
        >
          {recommendation}
        </span>
        <span className="font-stat text-xs text-muted">Value: {diffLabel}</span>
      </div>

      {reasoning && (
        <p className="mt-2 text-xs leading-relaxed text-muted">{reasoning}</p>
      )}

      {source === 'template' && (
        <button
          type="button"
          className="mt-2 text-xs text-ballpark underline hover:text-ink"
          onClick={fetchAiEval}
        >
          Get AI Evaluation
        </button>
      )}
    </div>
  );
}

export default TradeEvaluationPanel;
